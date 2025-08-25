"""Assignment algorithm utilities (Phase 2)

Current goal: Provide a lightweight, rule-based assignment generator that mirrors
the JavaScript API logic so the bot can generate /assign-war previews locally
without depending on the API service. Later we can introduce a Hungarian /
Munkres optimal variant (scipy optional) and a dynamic scaling strategy.

Design Notes:
- Inputs: list of player dicts { tag, name, town_hall, trophies, heroes: [ { name, level } ] }
- Output: list of assignments [{ slot, tag, name, th, weight }]
- Weight heuristic matches API (keep constants aligned to avoid drift)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence

TH_BASE_STEP = 1000  # must match API TH_BASE_STEP default
HERO_COEFF = 0.4     # must match API HERO_COEFF
TROPHY_COEFF = 0.01  # must match API TROPHY_COEFF


@dataclass(slots=True)
class PlayerProfile:
    tag: str
    name: str
    th: int
    trophies: int = 0
    heroes: Sequence[dict] | None = None

    @property
    def weight(self) -> int:
        hero_sum = 0
        if self.heroes:
            hero_sum = sum(int(h.get("level", 0) or 0) for h in self.heroes)
        return int(self.th * TH_BASE_STEP + hero_sum * HERO_COEFF + self.trophies * TROPHY_COEFF)


def _normalize(players: Iterable[dict]) -> List[PlayerProfile]:
    norm: List[PlayerProfile] = []
    for p in players:
        th = p.get("th") or p.get("town_hall") or p.get("townHallLevel") or p.get("townhallLevel") or 0
        norm.append(
            PlayerProfile(
                tag=p.get("tag"),
                name=p.get("name", "?"),
                th=int(th or 0),
                trophies=int(p.get("trophies") or 0),
                heroes=p.get("heroes") or [],
            )
        )
    return norm


def assign_strength(players: Iterable[dict], war_size: int) -> List[dict]:
    profs = _normalize(players)
    profs.sort(key=lambda p: p.weight, reverse=True)
    selected = profs[:war_size]
    return [
        {"slot": i + 1, "tag": p.tag, "name": p.name, "th": p.th, "weight": p.weight}
        for i, p in enumerate(selected)
    ]


def assign_mirror(players: Iterable[dict], war_size: int) -> List[dict]:
    # For now identical to strength; later could sort strictly by TH then trophies
    return assign_strength(players, war_size)


def assign_optimal(players: Iterable[dict], war_size: int) -> List[dict]:
    # Implement a lightweight Hungarian algorithm on a synthetic target curve similar to API logic.
    profs = _normalize(players)
    profs.sort(key=lambda p: p.weight, reverse=True)
    selected = profs[:war_size]
    if not selected:
        return []
    # Build ideal target weights spaced linearly from max to min
    max_w = selected[0].weight
    min_w = selected[-1].weight
    if war_size == 1:
        return [{"slot": 1, "tag": selected[0].tag, "name": selected[0].name, "th": selected[0].th, "weight": selected[0].weight}]
    targets = [int(max_w - (max_w - min_w) * (i / (war_size - 1))) for i in range(war_size)]

    # Cost matrix: absolute difference between player weight and target slot weight
    cost = [[abs(p.weight - t) for t in targets] for p in selected]

    # Hungarian algorithm (O(n^3)) simplified for square matrix (n = war_size)
    n = war_size
    # Pad if selected shorter (shouldn't happen) but guard
    for row in cost:
        if len(row) < n:
            row.extend([row[-1]] * (n - len(row)))

    # Step 1: Row reduction
    for i in range(n):
        rmin = min(cost[i])
        cost[i] = [c - rmin for c in cost[i]]
    # Step 2: Column reduction
    for j in range(n):
        cmin = min(cost[i][j] for i in range(n))
        for i in range(n):
            cost[i][j] -= cmin

    # Helper structures
    assigned_col = [-1] * n  # row -> col
    assigned_row = [-1] * n  # col -> row

    def try_assign(row: int, seen_cols: set[int]) -> bool:
        for col in range(n):
            if cost[row][col] == 0 and col not in seen_cols:
                seen_cols.add(col)
                if assigned_row[col] == -1 or try_assign(assigned_row[col], seen_cols):
                    assigned_col[row] = col
                    assigned_row[col] = row
                    return True
        return False

    # Greedy augmenting path search over zero matrix; if incomplete, fallback
    match_count = 0
    for r in range(n):
        if try_assign(r, set()):
            match_count += 1

    if match_count < n:  # Fallback to strength ordering if perfect matching not found
        return assign_strength(players, war_size)

    # Build assignments by slot=col order
    slot_map = [None] * n
    for row, col in enumerate(assigned_col):
        p = selected[row]
        slot_map[col] = {"slot": col + 1, "tag": p.tag, "name": p.name, "th": p.th, "weight": p.weight}
    # Ensure no None
    return [s for s in slot_map if s]


ALGORITHMS = {
    "strength": assign_strength,
    "mirror": assign_mirror,
    "optimal": assign_optimal,
}


def generate_assignments(players: Iterable[dict], war_size: int = 15, algorithm: str = "strength") -> List[dict]:
    war_size = max(5, min(int(war_size or 15), 50))
    algo = ALGORITHMS.get(algorithm.lower(), assign_strength)
    return algo(players, war_size)


if __name__ == "__main__":  # quick smoke test
    sample = [
        {"tag": f"#P{i}", "name": f"Player{i}", "th": 16 - (i // 3), "trophies": 5000 - i * 30, "heroes": [{"name": "King", "level": 80 - i}]}  # type: ignore
        for i in range(20)
    ]
    out = generate_assignments(sample, war_size=15, algorithm="strength")
    from pprint import pprint

    pprint(out)
