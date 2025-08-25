import os
from os import getenv
from typing import Any, Dict

import requests

from classes.config import Config
try:  # for type checking only; avoid circular import at runtime
    from classes.bot import CustomClient  # noqa: F401
except Exception:  # pragma: no cover
    CustomClient = None  # type: ignore


def get_portainer_token(config: 'Config'):
    url = 'https://hosting.clashk.ing/api/auth'
    payload = {
        'Username': config.portainer_user,
        'Password': config.portainer_pw,
    }
    headers = {'Content-Type': 'application/json'}

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        raise Exception(f'Failed to authenticate with Portainer: {response.text}')

    # Extract the JWT token from the response
    token = response.json().get('jwt')
    if not token:
        raise Exception('Failed to retrieve Portainer token')

    return token


def get_cluster_breakdown(config: 'Config'):
    cluster_kwargs = {'shard_count': None}
    if config.is_main:

        CURRENT_CLUSTER = config.cluster_id + 1

        def calculate_shard_distribution(total_shards, total_clusters):
            base_shard_count = total_shards // total_clusters
            extra_shards = total_shards % total_clusters

            shard_distribution = [base_shard_count] * total_clusters

            # Distribute the extra shards to the first few clusters
            for i in range(extra_shards):
                shard_distribution[i] += 1

            return shard_distribution

        TOTAL_SHARDS = config.total_clusters * 3

        shard_distribution = calculate_shard_distribution(TOTAL_SHARDS, config.total_clusters)

        # Determine the start and end of shards for the current cluster
        start_shard = sum(shard_distribution[: CURRENT_CLUSTER - 1])
        end_shard = start_shard + shard_distribution[CURRENT_CLUSTER - 1]

        # Generate shard_ids for the current cluster
        shard_ids = list(range(start_shard, end_shard))

        cluster_kwargs = {
            'shard_ids': shard_ids,
            'shard_count': TOTAL_SHARDS,
        }

    return cluster_kwargs


def _env_bool(name: str, default: bool = False) -> bool:
    val = getenv(name)
    if val is None:
        return default
    return val.lower() in {"1", "true", "yes", "on"}


def create_config() -> 'Config':
    """Create a Config object with local fallback.

    Precedence:
      1. If FEAST_LOCAL/LOCAL_FEAST_CONFIG true -> build from env.
      2. Else try remote; on failure fallback to env.
    """

    DISCORD_BOT_TOKEN = getenv('DISCORD_BOT_TOKEN') or ''
    CLUSTER_ID = int(getenv('CLUSTER_ID', '0'))

    local_mode = _env_bool('FEAST_LOCAL') or _env_bool('LOCAL_FEAST_CONFIG')
    remote_settings: Dict[str, Any] | None = None

    if not local_mode and DISCORD_BOT_TOKEN:
        try:
            bot_config_url = getenv('FEAST_REMOTE_CONFIG_URL', 'https://api.clashk.ing/bot/config')
            resp = requests.get(bot_config_url, timeout=5, headers={'bot-token': DISCORD_BOT_TOKEN})
            if resp.status_code == 200:
                remote_settings = resp.json()
            else:
                local_mode = True
        except Exception:
            local_mode = True
    else:
        local_mode = True

    if local_mode:
        static_db = getenv('STATIC_MONGODB_URI', 'mongodb://mongo:27017/static')
        stats_db = getenv('STATS_MONGODB_URI', 'mongodb://mongo:27017/stats')
        redis_host = getenv('REDIS_HOST', 'redis')
        redis_pw = getenv('REDIS_PASSWORD')
        link_api_user = getenv('LINK_API_USER', '')
        link_api_pw = getenv('LINK_API_PASSWORD', '')
        sentry_dsn = getenv('SENTRY_DSN', '')

        remote_settings = {
            'static_db': static_db,
            'stats_db': stats_db,
            'redis_ip': redis_host,
            'redis_pw': redis_pw,
            'link_api_user': link_api_user,
            'link_api_pw': link_api_pw,
            'sentry_dsn': sentry_dsn,
            'is_beta': _env_bool('FEAST_IS_BETA'),
            'is_custom': _env_bool('FEAST_IS_CUSTOM'),
            'is_main': _env_bool('FEAST_IS_MAIN'),
            'total_clusters': int(getenv('FEAST_TOTAL_CLUSTERS', '1')),
            'clashofstats_user_agent': getenv('CLASHOFSTATS_USER_AGENT', 'FeastLocal/1.0'),
            'emoji_version': getenv('EMOJI_ASSET_VERSION', '1'),
            'websocket_url': getenv('FEAST_WEBSOCKET_URL', ''),
        }

    config = Config(remote_settings=remote_settings)
    config.bot_token = DISCORD_BOT_TOKEN
    config.cluster_id = CLUSTER_ID
    return config


async def fetch_emoji_dict(bot):
    config = bot._config

    # Fetch the desired emoji definitions
    response = requests.get(config.emoji_url).json()

    original_name_map = {}
    full_emoji_dict = {}

    # Convert keys to a normalized form, just like your original code
    for emoji_type, emoji_dict in response.items():
        hold_dict = emoji_dict.copy()
        for key, value in emoji_dict.items():
            prev_value = hold_dict.pop(key)
            prev_key = key.replace('.', '').replace(' ', '').lower()
            if prev_key.isnumeric():
                prev_key = f'{prev_key}xx'
            original_name_map[prev_key] = key
            hold_dict[prev_key] = prev_value
        full_emoji_dict = full_emoji_dict | hold_dict

    current_emoji = discord_get(f'https://discord.com/api/v10/applications/{bot.application_id}/emojis', bot_token=config.bot_token).get('items', [])

    combined_emojis = {}
    for emoji in current_emoji:
        is_animated = emoji.get('animated')
        start = '<:' if not is_animated else '<a:'
        # Map back to original name if available
        real_name = original_name_map.get(emoji['name'], emoji['name'])

        # Convert numeric name to int if needed
        if isinstance(real_name, str) and real_name.isnumeric():
            real_name = int(real_name)

        combined_emojis[real_name] = f'{start}{emoji["name"]}:{emoji["id"]}>'

    return combined_emojis


def discord_get(url, bot_token):
    headers = {'Authorization': f'Bot {bot_token}'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


def load_cogs(disallowed: set):
    file_list = []
    for root, _, files in os.walk('commands'):
        for filename in files:
            if filename.endswith('.py') and filename.split('.')[0] in [
                'commands',
                'buttons',
            ]:
                path = os.path.join(root, filename)[len('commands/') :][:-3].replace(os.path.sep, '.')
                if path.split('.')[0] in disallowed:
                    continue
                file_list.append(f'commands.{path}')
    return file_list


def sentry_filter(event, hint):
    try:
        if (
            'unclosed client session' in str(event['logentry']['message']).lower()
            or 'unclosed connector' in str(event['logentry']['message']).lower()
        ):
            return None
    except:
        pass
    return event
