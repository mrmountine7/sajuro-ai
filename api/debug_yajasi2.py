import json
from saju_core import calculate_saju

results = {}

s = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True, use_yajasi=True)
results['김은우_0310'] = {p.name: f"{p.gan}{p.zhi}({p.gan_ko}{p.zhi_ko})" for p in [s.year_pillar, s.month_pillar, s.day_pillar, s.hour_pillar]}

# 야자시 23:30 - 적용
s2 = calculate_saju('test', 'male', 1970, 2, 19, 23, 30, is_lunar=False, use_yajasi=True)
results['yajasi_ON_2330'] = {p.name: f"{p.gan}{p.zhi}({p.gan_ko}{p.zhi_ko})" for p in [s2.year_pillar, s2.month_pillar, s2.day_pillar, s2.hour_pillar]}

# 야자시 23:30 - 미적용
s3 = calculate_saju('test', 'male', 1970, 2, 19, 23, 30, is_lunar=False, use_yajasi=False)
results['yajasi_OFF_2330'] = {p.name: f"{p.gan}{p.zhi}({p.gan_ko}{p.zhi_ko})" for p in [s3.year_pillar, s3.month_pillar, s3.day_pillar, s3.hour_pillar]}

with open('yajasi_result.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('done')
