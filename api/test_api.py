import httpx, json

r = httpx.post('http://localhost:8000/api/compatibility/analyze', json={
    'person1': {'name': 'kim', 'gender': 'male', 'year': 1970, 'month': 1, 'day': 14, 'hour': 3, 'minute': 10, 'is_lunar': True},
    'person2': {'name': 'jjong', 'gender': 'female', 'year': 1973, 'month': 2, 'day': 9, 'hour': 11, 'minute': 0, 'is_lunar': False},
    'use_llm': False,
})
d = r.json()['data']
for s in d['stages']:
    print(f"Stage {s['stage']}: {s['title']} = {s['score']}pts  tags={s['tags']}")
print(f"Overall={d['overall_score']}  Outer={d['outer_score']}  Inner={d['inner_score']}")
