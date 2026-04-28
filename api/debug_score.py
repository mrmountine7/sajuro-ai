import json
from saju_core import calculate_saju
from compatibility_engine import analyze_compatibility

s1 = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True)
s2 = calculate_saju('쫑', 'female', 1973, 2, 9, 11, 0, is_lunar=False)
r = analyze_compatibility(s1, s2)

result = {
    'overall': r.overall_score,
    'outer': r.outer_score,
    'inner': r.inner_score,
}
for s in r.stages:
    result[f'stage{s.stage}'] = {'title': s.title, 'score': s.score, 'tags': s.tags}

with open('score_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print('done')
