"""Roster model placeholder with minimal in-memory structures."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Iterable, Mapping


@dataclass(slots=True)
class PlayerEntry:
	tag: str
	name: str
	town_hall: int
	roles: set[str] = field(default_factory=set)


@dataclass(slots=True)
class Roster:
	clan_tag: str
	players: dict[str, PlayerEntry] = field(default_factory=dict)

	def upsert(self, entry: PlayerEntry) -> None:
		self.players[entry.tag] = entry

	def bulk_load(self, entries: Iterable[Mapping[str, object]]) -> None:
		for e in entries:
			try:
				self.upsert(
					PlayerEntry(
						tag=str(e["tag"]),
						name=str(e.get("name", "?")),
						town_hall=int(e.get("townHallLevel", e.get("th", 0))),
						roles=set(e.get("roles", []) or []),
					)
				)
			except KeyError:
				continue

	def summary(self) -> dict[str, object]:
		th_counts: dict[int, int] = {}
		for p in self.players.values():
			th_counts[p.town_hall] = th_counts.get(p.town_hall, 0) + 1
		return {
			"clan_tag": self.clan_tag,
			"player_count": len(self.players),
			"town_hall_distribution": dict(sorted(th_counts.items(), reverse=True)),
		}


if __name__ == "__main__":
	roster = Roster(clan_tag="#EXAMPLETAG")
	roster.bulk_load([
		{"tag": "#AAA", "name": "Alpha", "townHallLevel": 16, "roles": ["war", "elder"]},
		{"tag": "#BBB", "name": "Beta", "townHallLevel": 13},
	])
	print(roster.summary())

