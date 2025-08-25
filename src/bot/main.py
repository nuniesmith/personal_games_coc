import threading
import traceback
import time
import os
from typing import Any

import disnake
import sentry_sdk
import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from pymongo import MongoClient
from pytz import utc

from classes.bot import CustomClient
from utility.startup import create_config, get_cluster_breakdown, load_cogs, sentry_filter
from background.metrics_server import start_metrics_server, observe_ws_latency


scheduler = AsyncIOScheduler(timezone=utc)

config = create_config()

intents = disnake.Intents(guilds=True, members=True, emojis=True, messages=True, message_content=True)

db_client = MongoClient(config.static_mongodb)
cluster_kwargs = get_cluster_breakdown(config=config)

bot = CustomClient(
    command_prefix='??',
    help_command=None,
    intents=intents,
    scheduler=scheduler,
    config=config,
    chunk_guilds_at_startup=(not config.is_main),
    **cluster_kwargs,
)

initial_extensions = [
    'discord.events',
    'discord.autocomplete',
    'discord.converters',
    'background.tasks.background_cache',
    'background.features.link_parsers',
    'background.logs.giveaway',
]

# only the local version can not run
if not config.is_beta:
    initial_extensions += [
        'exceptions.handler',
        'background.logs.autorefresh',
        'background.logs.bans',
        'background.logs.capital',
        'background.logs.donations',
        'background.logs.joinleave',
        'background.logs.legends',
        'background.logs.playerupgrades',
        'background.logs.reddit',
        'background.logs.reminders',
        'background.features.voicestat_loop',
        'background.features.auto_refresh',
        'background.logs.war',
        'background.features.refresh_boards',
    ]
health_app = FastAPI(title="ClashKingBot Internal API", version="1.0")

_started_at = time.time()


@health_app.get('/health')
async def health_check():
    ready = bot.is_ready()
    return {
        'status': 'ok' if ready else 'starting',
        'ready': ready,
        'uptime_sec': round(time.time() - _started_at, 1),
        'guild_count': len(bot.guilds) if ready else 0,
        'latency_ms': round(bot.latency * 1000, 1) if ready else None,
    }


@health_app.get('/bot/info')
async def bot_info():
    ready = bot.is_ready()
    data: dict[str, Any] = {
        'version': getattr(bot, 'VERSION', 'unknown'),
        'ready': ready,
        'uptime_sec': round(time.time() - _started_at, 1),
        'guild_count': len(bot.guilds) if ready else 0,
        'user_count': sum(g.member_count or 0 for g in bot.guilds) if ready else 0,
        'shard_count': bot.shard_count,
    }
    return {'success': True, 'data': data}


@health_app.get('/bot/commands')
async def bot_commands(limit: int = 50, offset: int = 0, q: str | None = None):
    """List command names with optional search & pagination.
    limit capped at 200.
    """
    if not bot.is_ready():
        return {'success': False, 'error': 'bot not ready'}
    names = bot.command_names()
    total = len(names)
    if q:
        q_lower = q.lower()
        names = [n for n in names if q_lower in n.lower()]
    filtered_total = len(names)
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    page = names[offset : offset + limit]
    return {
        'success': True,
        'total': total,
        'filtered': filtered_total,
        'limit': limit,
        'offset': offset,
        'count': len(page),
        'commands': page,
        'query': q,
    }


@health_app.get('/bot/tracked-clans')
async def tracked_clans(limit: int = 50, offset: int = 0, q: str | None = None):
    try:
        result = await bot.user_db.find_one({'username': bot.user_name})
        tracked = result.get('tracked_clans', []) if result else []
        total = len(tracked)
        if q:
            q_lower = q.lower()
            tracked = [t for t in tracked if q_lower in t.lower()]
        filtered_total = len(tracked)
        limit = max(1, min(limit, 200))
        offset = max(0, offset)
        page = tracked[offset : offset + limit]
        return {
            'success': True,
            'total': total,
            'filtered': filtered_total,
            'limit': limit,
            'offset': offset,
            'count': len(page),
            'clans': page,
            'query': q,
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def run_health_check_server():
    uvicorn.run(health_app, host='0.0.0.0', port=8027, log_level='warning')


if __name__ == '__main__':

    # Start FastAPI server in a background thread
    threading.Thread(target=run_health_check_server, daemon=True).start()

    @bot.event
    async def on_connect():  # earliest point with a running loop
        if not scheduler.running:
            try:
                scheduler.start()
            except RuntimeError:
                # Fallback: defer to next loop iteration
                import asyncio
                asyncio.get_event_loop().call_soon(lambda: (not scheduler.running) and scheduler.start())
        # Launch metrics server (idempotent) once we have a loop
        start_metrics_server()

    @bot.event
    async def on_socket_response(msg):  # generic gateway event hook to sample latency occasionally
        try:
            if bot.latency is not None:
                observe_ws_latency(bot.latency)
        except Exception:
            pass

    sentry_sdk.init(
        dsn=config.sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        before_send=sentry_filter,
    )
    initial_extensions += load_cogs(disallowed=set())
    for count, extension in enumerate(initial_extensions):
        try:
            bot.load_extension(extension)
        except Exception as extension:
            traceback.print_exc()
    bot.EXTENSION_LIST.extend(initial_extensions)

    headless_flag = os.getenv('FEAST_HEADLESS', '0') == '1'
    token_present = bool(config.bot_token and config.bot_token.strip())
    if token_present and not headless_flag:
        bot.run(config.bot_token)
    else:
        reason = []
        if not token_present:
            reason.append('no DISCORD_BOT_TOKEN provided')
        if headless_flag:
            reason.append('FEAST_HEADLESS=1')
        print(f"[WARN] Running in headless mode ({', '.join(reason)}). Discord client not started; health endpoint active.")
        # Keep process alive so health server & any background tasks can run (minimal idle loop)
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            print('Headless mode shutdown.')
