import json
from sajupy import SajuCalculator

calc = SajuCalculator()

# 1) 음력 -> 양력 변환
lunar_result = calc.lunar_to_solar(1970, 1, 14, False)
sy = lunar_result['solar_year']
sm = lunar_result['solar_month']
sd = lunar_result['solar_day']
print(f"음력 1970/1/14 -> 양력 {sy}/{sm:02d}/{sd:02d}")

# 2) 일간 확인
saju_base = calc.calculate_saju(sy, sm, sd, 12, 0)
day_stem = saju_base.get('day_stem', '?')
print(f"일간(day_stem): {day_stem}")
print()

# 3) 시간대별 시주 변화 상세 추적
print("=== 시간대별 시주 변화 (축시~인시 경계) ===")
print(f"{'시간':<10} {'시주천간':<10} {'시주지지':<10} {'시(時)':<15}")
print("-" * 50)

time_labels = {
    (1,0): "축시(丑時) 01:00",
    (1,30): "축시(丑時) 01:30",
    (2,0): "축시(丑時) 02:00",
    (2,30): "축시(丑時) 02:30",
    (2,59): "축시(丑時) 02:59",
    (3,0): "인시(寅時) 03:00",
    (3,10): "인시(寅時) 03:10",
    (3,30): "인시(寅時) 03:30",
    (4,0): "인시(寅時) 04:00",
    (5,0): "묘시(卯時) 05:00",
}

for (h, m), label in time_labels.items():
    s = calc.calculate_saju(sy, sm, sd, h, m)
    hs = s.get('hour_stem', '?')
    hb = s.get('hour_branch', '?')
    print(f"  {h:02d}:{m:02d}      {hs:<10} {hb:<10} {label}")

print()
print("=== 핵심 비교 ===")

# 축시(01-03) = 丁丑 (정축) 이어야 하는지 확인
# 인시(03-05) = 戊寅 (무인) 이 맞는지 확인

# 일간이 庚일 때 시주 배치 (경일 기준):
# 자시(23-01): 丙子
# 축시(01-03): 丁丑
# 인시(03-05): 戊寅
print("경(庚)일 기준 시주 배치표:")
print("  자시(23-01): 丙子(병자)")
print("  축시(01-03): 丁丑(정축)")
print("  인시(03-05): 戊寅(무인)")
print("  묘시(05-07): 己卯(기묘)")
print()

s_0310 = calc.calculate_saju(sy, sm, sd, 3, 10)
print(f"03:10 입력 시 sajupy 결과:")
print(f"  hour_stem={s_0310.get('hour_stem')}  hour_branch={s_0310.get('hour_branch')}")
print()

# 만약 -30분 보정 적용하면?
print("=== -30분 보정 적용 시 (03:10 -> 02:40) ===")
s_0240 = calc.calculate_saju(sy, sm, sd, 2, 40)
print(f"  02:40 -> hour_stem={s_0240.get('hour_stem')}  hour_branch={s_0240.get('hour_branch')}")
