import json
from saju_core import calculate_saju, ZH_TO_KO_GAN, ZH_TO_KO_ZHI

print("=== 김은우 (음력 1970/1/14 03:10) ===")
s = calculate_saju('김은우', 'male', 1970, 1, 14, 3, 10, is_lunar=True, use_yajasi=True)
for p in [s.year_pillar, s.month_pillar, s.day_pillar, s.hour_pillar]:
    print(f"  {p.name}: {p.gan}{p.zhi} ({p.gan_ko}{p.zhi_ko}) sipsin:{p.sipsin}")

print()
print("=== 야자시 테스트: 23:30 출생 ===")
s2 = calculate_saju('test', 'male', 1970, 2, 19, 23, 30, is_lunar=False, use_yajasi=True)
for p in [s2.year_pillar, s2.month_pillar, s2.day_pillar, s2.hour_pillar]:
    print(f"  {p.name}: {p.gan}{p.zhi} ({p.gan_ko}{p.zhi_ko})")

print()
print("=== 야자시 미적용 비교: 23:30 ===")
s3 = calculate_saju('test', 'male', 1970, 2, 19, 23, 30, is_lunar=False, use_yajasi=False)
for p in [s3.year_pillar, s3.month_pillar, s3.day_pillar, s3.hour_pillar]:
    print(f"  {p.name}: {p.gan}{p.zhi} ({p.gan_ko}{p.zhi_ko})")
