from utility.assignment import generate_assignments

def test_optimal_returns_size():
    players = [
        {"tag": f"#P{i}", "name": f"P{i}", "th": 16 - (i // 3), "trophies": 5000 - i * 10, "heroes": [{"name": "King", "level": 80 - i}]}
        for i in range(20)
    ]
    res = generate_assignments(players, war_size=15, algorithm='optimal')
    assert len(res) == 15
    # Slots should be unique and start at 1..15
    slots = sorted(a['slot'] for a in res)
    assert slots == list(range(1, 16))


def test_optimal_fallback_strength_equivalence_small():
    # With homogeneous weights, optimal should not crash and produce deterministic slots
    players = [
        {"tag": f"#X{i}", "name": f"X{i}", "th": 15, "trophies": 3000, "heroes": [{"name": "Queen", "level": 80}]}
        for i in range(10)
    ]
    res = generate_assignments(players, war_size=10, algorithm='optimal')
    assert len(res) == 10
    assert sorted(a['slot'] for a in res) == list(range(1, 11))
