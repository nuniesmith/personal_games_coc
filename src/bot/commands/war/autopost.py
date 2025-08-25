"""Autopost war prep snapshots to configured Discord channels.

Listens for the internal `war_prep_snapshot` event dispatched by the automation
loop (see `automation.py`) and posts embeds showing prep stats plus an
assignments summary. Uses environment variable WAR_PREP_AUTOPOST_CHANNEL_IDS
as a comma-separated list of channel IDs. If absent, does nothing.

Future enhancements:
- Per-clan channel mapping stored in DB
- Rate limiting / deduplication (hash last payload)
- Optional algorithm selection for assignment embed
"""
from __future__ import annotations

import os
import json
from pathlib import Path
import disnake
from disnake.ext import commands
from typing import List, Dict, Any

from classes.bot import CustomClient
from utility.prep_stats import build_prep_embeds, build_assignments_embed


def _parse_channel_ids() -> list[int]:
    val = os.getenv('WAR_PREP_AUTOPOST_CHANNEL_IDS') or ''
    ids: list[int] = []
    for part in val.split(','):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            pass
    return ids


class WarPrepAutopost(commands.Cog):
    def __init__(self, bot: CustomClient):
        self.bot = bot
        self.channel_ids = _parse_channel_ids()
    # clan_tag -> signature of last posted snapshot
    self._last_hash: dict[str, str] = {}
        self._dedup_file = os.getenv('WAR_PREP_DEDUP_CACHE_FILE')
        if self._dedup_file:
            self._load_dedup()

    # --------------- Dedup Persistence ---------------
    def _load_dedup(self):
        try:
            p = Path(self._dedup_file)
            if p.exists():
                data = json.loads(p.read_text())
                if isinstance(data, dict):
                    self._last_hash.update({str(k): str(v) for k, v in data.items()})
        except Exception:
            pass

    def _save_dedup(self):
        if not self._dedup_file:
            return
        try:
            Path(self._dedup_file).write_text(json.dumps(self._last_hash))
        except Exception:
            pass

    # --------------- Internal Helpers ---------------
    def _compute_signature(self, clan_tag: str, prep_data: Dict[str, Any], assignments: List[Dict[str, Any]]) -> str:
        th_counts = {}
        for d in (prep_data.get('roster', {}) or {}).get('thDistribution', []):
            th_counts[d.get('townHall')] = d.get('count')
        assign_sig = ','.join(str(a.get('weight')) for a in assignments[:10])
        return f"{sorted(th_counts.items())}:{assign_sig}"

    def _should_post(self, clan_tag: str, prep_data: Dict[str, Any], assignments: List[Dict[str, Any]]) -> bool:
        try:
            sig = self._compute_signature(clan_tag, prep_data, assignments)
            if self._last_hash.get(clan_tag) == sig:
                return False
            self._last_hash[clan_tag] = sig
            self._save_dedup()
            return True
        except Exception:
            return True

    @commands.Cog.listener()
    async def on_war_prep_snapshot(self, clan_tag: str, prep_data: Dict[str, Any], assignments: List[Dict[str, Any]]):
        if not self.channel_ids:
            return
        if not self._should_post(clan_tag, prep_data, assignments):
            return
        embeds = build_prep_embeds(prep_data)
        assigns_embed = build_assignments_embed(assignments, clan_tag)
        if assigns_embed:
            embeds.append(assigns_embed)
        embeds = embeds[:10]
        for cid in self.channel_ids:
            channel = self.bot.get_channel(cid) or await self._fetch_channel_safe(cid)
            if not channel or not isinstance(channel, disnake.TextChannel):
                continue
            try:
                await channel.send(embeds=embeds)
            except Exception:
                continue

    async def _fetch_channel_safe(self, cid: int):
        try:
            return await self.bot.fetch_channel(cid)
        except Exception:
            return None


def setup(bot: CustomClient):
    bot.add_cog(WarPrepAutopost(bot))
