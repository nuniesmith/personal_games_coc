from classes.new_roster import Roster


def test_roster_summary():
    roster = Roster(clan_tag="#CLAN")
    roster.bulk_load([
        {"tag": "#A", "name": "One", "townHallLevel": 16},
        {"tag": "#B", "name": "Two", "townHallLevel": 15},
        {"tag": "#C", "name": "Three", "townHallLevel": 16},
    ])
    summary = roster.summary()
    assert summary["player_count"] == 3
    assert summary["town_hall_distribution"][16] == 2
