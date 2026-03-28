import json

with open('src/data/players.json', encoding='utf-8') as f:
    players = json.load(f)

for batch_num, (start, end) in enumerate([(120, 240), (240, 360)], start=2):
    batch = players[start:end]
    rows = []
    for p in batch:
        id_ = p['id'].replace("'", "''")
        name = p['name'].replace("'", "''")
        pos = p['position']
        rating = p['rating']
        club = p['club'].replace("'", "''")
        img = (p.get('image_url') or '').replace("'", "''")
        rows.append(f"('{id_}','{name}','{pos}',{rating},'{club}','{img}')")

    sql = ('INSERT INTO public.players (id, name, position, rating, club, image_url) VALUES\n'
           + ',\n'.join(rows)
           + '\nON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, position=EXCLUDED.position, rating=EXCLUDED.rating, club=EXCLUDED.club, image_url=EXCLUDED.image_url;')

    out_path = f'scripts/seed_players_batch{batch_num}.sql'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'Batch {batch_num}: {len(rows)} rows -> {out_path}')
