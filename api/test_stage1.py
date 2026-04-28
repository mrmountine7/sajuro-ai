import json, httpx

r = httpx.post('http://localhost:8000/api/compatibility/analyze', json={
    'person1': {'name': '김은우', 'gender': 'male', 'year': 1970, 'month': 1, 'day': 14, 'hour': 3, 'minute': 10, 'is_lunar': True},
    'person2': {'name': '쫑', 'gender': 'female', 'year': 1973, 'month': 2, 'day': 9, 'hour': 11, 'minute': 0, 'is_lunar': False},
    'use_llm': False,
})
s1 = r.json()['data']['stages'][0]
with open('stage1_test.json', 'w', encoding='utf-8') as f:
    json.dump(s1, f, ensure_ascii=False, indent=2)
print('done - title:', s1['title'])
