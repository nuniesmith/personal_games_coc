from utility.prep_stats import build_assignments_embed


def test_build_assignments_embed_basic():
    assigns = [
        {"slot": 1, "tag": "#A", "name": "One", "th": 16, "weight": 16000},
        {"slot": 2, "tag": "#B", "name": "Two", "th": 15, "weight": 15000},
        {"slot": 3, "tag": "#C", "name": "Three", "th": 16, "weight": 15950},
    ]
    embed = build_assignments_embed(assigns, clan_tag="#CLAN")
    assert embed is not None
    assert 'TH16' in (embed.fields[0].value if embed.fields else '')
    assert 'One' in (embed.fields[1].value if len(embed.fields) > 1 else '')


def test_build_assignments_embed_empty():
    assert build_assignments_embed([], clan_tag="#CLAN") is None
