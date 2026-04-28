import json
from saju_core import calculate_saju

results = {}

s = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True)
results['김은우_0310_보정후'] = {
    'day_master': f"{s.day_master}({s.day_pillar.gan_ko})",
    **{p.name: f"{p.gan}{p.zhi}({p.gan_ko}{p.zhi_ko})" for p in [s.year_pillar, s.month_pillar, s.day_pillar, s.hour_pillar]}
}

s2 = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True, apply_minus_30=False)
results['김은우_0310_보정없음'] = {
    'day_master': f"{s2.day_master}({s2.day_pillar.gan_ko})",
    **{p.name: f"{p.gan}{p.zhi}({p.gan_ko}{p.zhi_ko})" for p in [s2.year_pillar, s2.month_pillar, s2.day_pillar, s2.hour_pillar]}
}

with open('minus30_result.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('done')
