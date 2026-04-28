import json, httpx
r = httpx.post('http://localhost:8000/api/compatibility/analyze', json={
    'person1': {'name': '김은우', 'gender': 'male', 'year': 1970, 'month': 1, 'day': 14, 'hour': 3, 'minute': 10, 'is_lunar': True},
    'person2': {'name': '쫑', 'gender': 'female', 'year': 1973, 'month': 2, 'day': 9, 'hour': 11, 'minute': 0, 'is_lunar': False},
    'use_llm': False,
})
stages = r.json()['data']['stages']
for s in stages:
    print(f"\n=== Stage {s['stage']}: {s['title']} ({s['score']}pts) ===")
    for d in s['details'][:3]:
        if d:
            print(f"  {d[:60]}...")
with open('all_stages.json', 'w', encoding='utf-8') as f:
    json.dump(r.json()['data']['stages'], f, ensure_ascii=False, indent=2)
print('\ndone')
