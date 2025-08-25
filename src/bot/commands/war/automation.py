"""Automation tasks for war prep & assignments.

Uses a simple loop (can be replaced by APScheduler) to periodically refresh
prep stats and generate assignments during war preparation phase, emitting
an internal event for downstream listeners.
"""
from __future__ import annotations

import asyncio
from disnake.ext import commands
import coc

from classes.bot import CustomClient
from utility.assignment import generate_assignments
from utility.prep_stats import fetch_prep_stats

REFRESH_INTERVAL = 900  # seconds (15m)


class WarAutomation(commands.Cog):
    def __init__(self, bot: CustomClient):
        self.bot = bot
        self.task = bot.loop.create_task(self._runner())

    def cog_unload(self):
        if self.task and not self.task.done():
            self.task.cancel()

    async def _runner(self):
        await self.bot.wait_until_ready()
        while not self.bot.is_closed():
            try:
                await self.tick()
            except Exception:
                pass
            await asyncio.sleep(REFRESH_INTERVAL)

    async def tick(self):
        clan_tags = await self.bot.clan_db.distinct('tag')
        if not clan_tags:
            return
        api_base = getattr(self.bot, 'api_base', None) or 'http://localhost:3001/api'
        for tag in clan_tags[:10]:  # safety cap
            try:
                war = await self.bot.get_clanwar(tag)
                if not war or war.state != 'preparation':
                    continue
                data = await fetch_prep_stats(api_base, tag, include_heroes=False)
                members = war.clan.members
                tags = [m.tag for m in members]
                players = []
                async for p in self.bot.coc_client.get_players(tags):
                    if p is None:
                        continue
                    players.append({'tag': p.tag,'name': p.name,'th': p.town_hall,'trophies': p.trophies,'heroes': [{'name':h.name,'level':h.level} for h in p.heroes]})
                assigns = generate_assignments(players, war_size=min(len(players), war.team_size), algorithm='strength')
                self.bot.dispatch('war_prep_snapshot', tag, data, assigns)
            except coc.NotFound:
                continue
            except Exception:
                continue


def setup(bot: CustomClient):
    bot.add_cog(WarAutomation(bot))
