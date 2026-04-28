import json
from saju_core import calculate_saju
from compatibility_engine import analyze_compatibility

s1 = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True)
s2 = calculate_saju('쫑', 'female', 1973, 2, 9, 11, 0, is_lunar=False)

result = {
    '김은우_현재대운': s1.current_daeun,
    '쫑_현재대운': s2.current_daeun,
}

r = analyze_compatibility(s1, s2)
stage5 = next((s for s in r.stages if s.stage == 5), None)
if stage5:
    result['stage5'] = {'title': stage5.title, 'score': stage5.score, 'tags': stage5.tags, 'details': stage5.details}

result['overall'] = r.overall_score
result['outer'] = r.outer_score
result['inner'] = r.inner_score

with open('daeun_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print('done')
