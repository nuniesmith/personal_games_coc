"""War Preparation Stats integration with API.

Fetches /war/prep-stats from the Node API and converts the payload into
Discord embeds (summary + optional heroes) for use in /war-prep command.
"""
from __future__ import annotations

import aiohttp
import disnake
from typing import Any, Dict, List


async def fetch_prep_stats(base_url: str, clan_tag: str, include_heroes: bool = False, hero_sample_size: int = 30, token: str | None = None) -> Dict[str, Any]:
    params = {
        'tag': clan_tag,
        'heroes': '1' if include_heroes else '0',
        'heroSampleSize': str(hero_sample_size),
    }
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    url = f"{base_url.rstrip('/')}/war/prep-stats"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, headers=headers, timeout=20) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data.get('data') or data


def build_prep_embeds(data: Dict[str, Any]) -> list[disnake.Embed]:
    roster = data.get('roster', {})
    clan = data.get('clan', {})
    war = data.get('war')
    th_dist = roster.get('thDistribution', [])
    heroes = data.get('heroes') or []

    # Embed 1: Roster + TH distribution
    e1 = disnake.Embed(title=f"War Prep: {clan.get('name','?')}", colour=disnake.Colour.blurple())
    e1.add_field(name='Members', value=str(roster.get('members', 0)))
    if th_dist:
        th_lines = [f"TH{d['townHall']}: {d['count']}" for d in th_dist]
        e1.add_field(name='Town Halls', value=' | '.join(th_lines), inline=False)
    if roster.get('avgTrophies'):
        e1.add_field(name='Avg Trophies', value=str(roster['avgTrophies']))
    if war:
        e1.add_field(name='War State', value=f"{war.get('state')} ({war.get('teamSize')}v{war.get('teamSize')})", inline=False)
    e1.set_footer(text='Generated')

    embeds = [e1]

    # Embed 2: Hero averages (if provided)
    if heroes:
        hero_lines = []
        for h in heroes:
            hero_lines.append(f"{h['name']}: {h['avg']} (max {h['maxObserved']})")
        chunks: list[list[str]] = [hero_lines[i:i+15] for i in range(0, len(hero_lines), 15)]
        for idx, chunk in enumerate(chunks, start=1):
            e = disnake.Embed(title=f"Hero Averages {idx}/{len(chunks)}", colour=disnake.Colour.dark_teal())
            e.description = '\n'.join(chunk)
            embeds.append(e)
    return embeds


def build_assignments_embed(assignments: List[Dict[str, Any]], clan_tag: str | None = None) -> disnake.Embed | None:
    if not assignments:
        return None
    th_counts: Dict[int, int] = {}
    for a in assignments:
        th_counts[a.get('th', 0)] = th_counts.get(a.get('th', 0), 0) + 1
    th_line = ' | '.join(f"TH{k}:{v}" for k, v in sorted(th_counts.items(), reverse=True))
    top = sorted(assignments, key=lambda x: x.get('weight', 0), reverse=True)[:5]
    top_lines = '\n'.join(f"#{i+1} {t['name']} (TH{t['th']} • {t['weight']})" for i, t in enumerate(top))
    e = disnake.Embed(title=f"Assignments Preview {clan_tag or ''}".strip(), colour=disnake.Colour.dark_blue())
    e.add_field(name='TH Spread', value=th_line or 'n/a', inline=False)
    e.add_field(name='Top Weights', value=top_lines or 'n/a', inline=False)
    e.set_footer(text='Auto-generated')
    return e
