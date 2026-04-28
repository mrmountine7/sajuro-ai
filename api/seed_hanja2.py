# -*- coding: utf-8 -*-
"""
한자 DB 시딩 v2 - chr(코드포인트)로 인코딩 문제 완전 제거
"""
from supabase import create_client

sb = create_client(
    "https://lszgmmdvpldazzstlewf.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzemdtbWR2cGxkYXp6c3RsZXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjc4NTEsImV4cCI6MjA4NTY0Mzg1MX0.cQIHx5ZGSVfnOgIWMYDpoXKFD6KPUSp9lOgojXhEUlU"
)

def h(code): return chr(code)

# ─────────────────────────────────────────
# 성씨 한자: (hangul, hanja, strokes, element)
# ─────────────────────────────────────────
SURNAMES = [
    ("강", h(0x59DC), 9,  "토"),  # 姜
    ("고", h(0x9AD8), 10, "토"),  # 高
    ("공", h(0x5B54), 4,  "수"),  # 孔
    ("곽", h(0x90ED), 15, "화"),  # 郭
    ("구", h(0x5177), 8,  "목"),  # 具
    ("기", h(0x5947), 8,  "목"),  # 奇
    ("김", h(0x91D1), 8,  "금"),  # 金 ★
    ("노", h(0x76E7), 16, "화"),  # 盧
    ("도", h(0x90FD), 11, "토"),  # 都
    ("류", h(0x67F3), 9,  "목"),  # 柳
    ("류", h(0x5289), 15, "금"),  # 劉
    ("마", h(0x99AC), 10, "화"),  # 馬
    ("문", h(0x6587), 4,  "수"),  # 文
    ("민", h(0x9591), 12, "목"),  # 閔
    ("박", h(0x6734), 6,  "목"),  # 朴
    ("반", h(0x6F58), 15, "수"),  # 潘
    ("배", h(0x88F5), 14, "화"),  # 裵
    ("백", h(0x767D), 5,  "금"),  # 白
    ("방", h(0x65B9), 4,  "수"),  # 方
    ("서", h(0x5F90), 10, "금"),  # 徐
    ("성", h(0x6210), 6,  "토"),  # 成
    ("손", h(0x5B6B), 10, "목"),  # 孫
    ("송", h(0x5B8B), 7,  "목"),  # 宋
    ("신", h(0x7533), 5,  "금"),  # 申
    ("심", h(0x6C88), 7,  "수"),  # 沈
    ("안", h(0x5B89), 6,  "목"),  # 安
    ("양", h(0x6881), 11, "목"),  # 梁
    ("오", h(0x5433), 7,  "수"),  # 吳
    ("우", h(0x79B9), 9,  "토"),  # 禹
    ("위", h(0x9B4F), 18, "화"),  # 魏
    ("은", h(0x6BB7), 10, "화"),  # 殷
    ("이", h(0x674E), 7,  "목"),  # 李
    ("임", h(0x6797), 8,  "목"),  # 林
    ("장", h(0x5F35), 11, "목"),  # 張
    ("전", h(0x5168), 6,  "금"),  # 全
    ("전", h(0x7530), 5,  "토"),  # 田
    ("정", h(0x912D), 15, "토"),  # 鄭
    ("조", h(0x8D99), 14, "토"),  # 趙
    ("주", h(0x6731), 6,  "목"),  # 朱
    ("진", h(0x9673), 16, "토"),  # 陳
    ("차", h(0x8ECA), 7,  "화"),  # 車
    ("채", h(0x8521), 15, "목"),  # 蔡
    ("천", h(0x5343), 3,  "금"),  # 千
    ("최", h(0x5D14), 11, "토"),  # 崔
    ("탁", h(0x5349), 8,  "화"),  # 卓
    ("하", h(0x6CB3), 8,  "수"),  # 河
    ("한", h(0x97D3), 17, "목"),  # 韓
    ("허", h(0x8A31), 11, "화"),  # 許
    ("홍", h(0x6D2A), 9,  "수"),  # 洪
    ("황", h(0x9EC3), 12, "토"),  # 黃
    ("유", h(0x67F3), 9,  "목"),  # 柳(유)
    ("유", h(0x5289), 15, "금"),  # 劉(유)
    ("윤", h(0x5C39), 4,  "금"),  # 尹
    ("남", h(0x5357), 9,  "화"),  # 南
]

# ─────────────────────────────────────────
# 이름 한자: (hangul, hanja, strokes, element, meaning, gender, is_common, order)
# ─────────────────────────────────────────
NAMES = [
    ("가", h(0x4F73), 8,  "목", "아름다울 가", "female",  True,  1),  # 佳
    ("가", h(0x5609), 14, "목", "아름다울 가", "neutral", True,  2),  # 嘉
    ("강", h(0x525B), 10, "금", "굳셀 강",     "male",    True,  1),  # 剛
    ("강", h(0x5EB7), 11, "수", "편안할 강",   "neutral", True,  2),  # 康
    ("강", h(0x6C5F), 6,  "수", "강 강",       "male",    True,  3),  # 江
    ("건", h(0x5EFA), 9,  "목", "세울 건",     "male",    True,  1),  # 建
    ("건", h(0x5065), 11, "목", "건강할 건",   "male",    True,  2),  # 健
    ("건", h(0x4E7E), 11, "목", "하늘 건",     "male",    True,  3),  # 乾
    ("건", h(0x8654), 10, "화", "경건할 건",   "neutral", True,  4),  # 虔
    ("겸", h(0x8B19), 17, "금", "겸손할 겸",   "neutral", True,  1),  # 謙
    ("경", h(0x656C), 13, "목", "공경할 경",   "neutral", True,  1),  # 敬
    ("경", h(0x666F), 12, "화", "경치 경",     "neutral", True,  2),  # 景
    ("경", h(0x4EAC), 8,  "화", "서울 경",     "neutral", True,  3),  # 京
    ("경", h(0x6176), 15, "수", "경사 경",     "neutral", True,  4),  # 慶
    ("계", h(0x6842), 10, "목", "계수나무 계", "female",  True,  1),  # 桂
    ("계", h(0x555F), 11, "화", "열 계",       "male",    True,  2),  # 啓
    ("광", h(0x5149), 6,  "화", "빛 광",       "male",    True,  1),  # 光
    ("광", h(0x5EE3), 15, "목", "넓을 광",     "male",    True,  2),  # 廣
    ("광", h(0x7396), 11, "금", "옥빛 광",     "neutral", True,  3),  # 珖
    ("규", h(0x5949), 9,  "목", "별이름 규",   "male",    True,  1),  # 奎
    ("규", h(0x572D), 6,  "토", "홀 규",       "neutral", True,  2),  # 圭
    ("규", h(0x73EA), 11, "금", "홀 규",       "neutral", True,  3),  # 珪
    ("기", h(0x57FA), 11, "토", "터 기",       "male",    True,  1),  # 基
    ("기", h(0x7426), 13, "금", "아름다운옥 기","neutral", True,  2),  # 琦
    ("기", h(0x5947), 8,  "목", "기이할 기",   "neutral", True,  3),  # 奇
    ("길", h(0x5409), 6,  "목", "길할 길",     "neutral", True,  1),  # 吉
    ("나", h(0x5A1C), 10, "목", "아름다울 나", "female",  True,  1),  # 娜
    ("낙", h(0x6D1B), 9,  "수", "강이름 낙",   "neutral", True,  1),  # 洛
    ("낙", h(0x6A02), 15, "목", "즐거울 낙",   "neutral", True,  2),  # 樂
    ("남", h(0x6960), 13, "목", "녹나무 남",   "male",    True,  1),  # 楠
    ("단", h(0x7AEF), 14, "목", "바를 단",     "neutral", True,  1),  # 端
    ("단", h(0x4E39), 4,  "화", "붉을 단",     "female",  True,  2),  # 丹
    ("달", h(0x8FBE), 13, "토", "통달할 달",   "male",    True,  1),  # 達
    ("도", h(0x9053), 13, "토", "길 도",       "male",    True,  1),  # 道
    ("도", h(0x9676), 16, "토", "질그릇 도",   "neutral", True,  2),  # 陶
    ("도", h(0x6843), 10, "목", "복숭아 도",   "female",  True,  3),  # 桃
    ("동", h(0x6771), 8,  "목", "동녘 동",     "male",    True,  1),  # 東
    ("동", h(0x68DF), 12, "목", "마룻대 동",   "male",    True,  2),  # 棟
    ("란", h(0x862D), 23, "목", "난초 란",     "female",  True,  1),  # 蘭
    ("랑", h(0x6717), 11, "화", "밝을 랑",     "neutral", True,  1),  # 朗
    ("려", h(0x9E97), 19, "화", "고울 려",     "female",  True,  1),  # 麗
    ("련", h(0x84EE), 17, "목", "연꽃 련",     "female",  True,  1),  # 蓮
    ("렬", h(0x70C8), 10, "화", "빛날 렬",     "male",    True,  1),  # 烈
    ("령", h(0x73B2), 9,  "금", "옥소리 령",   "female",  True,  1),  # 玲
    ("령", h(0x4EE4), 5,  "수", "명령 령",     "neutral", True,  2),  # 令
    ("록", h(0x797F), 13, "목", "복 록",       "male",    True,  1),  # 祿
    ("룡", h(0x9F8D), 16, "토", "용 룡",       "male",    True,  1),  # 龍
    ("린", h(0x9E9F), 23, "토", "기린 린",     "male",    True,  1),  # 麟
    ("린", h(0x7498), 17, "금", "아름다운옥 린","neutral", True,  2),  # 璘
    ("명", h(0x660E), 8,  "화", "밝을 명",     "neutral", True,  1),  # 明
    ("명", h(0x547D), 8,  "화", "목숨 명",     "neutral", False, 2),  # 命
    ("명", h(0x9298), 14, "금", "새길 명",     "male",    False, 3),  # 銘
    ("민", h(0x73C9), 10, "금", "아름다운돌 민","neutral", True,  1),  # 珉
    ("민", h(0x65FC), 8,  "목", "화할 민",     "neutral", True,  2),  # 旼
    ("민", h(0x654F), 11, "금", "민첩할 민",   "neutral", True,  3),  # 敏
    ("민", h(0x6C11), 5,  "수", "백성 민",     "neutral", False, 4),  # 民
    ("민", h(0x9591), 12, "목", "근심할 민",   "neutral", False, 5),  # 閔
    ("민", h(0x739F), 9,  "금", "옥돌 민",     "neutral", True,  6),  # 玟
    ("박", h(0x535A), 12, "수", "넓을 박",     "male",    True,  1),  # 博
    ("범", h(0x7BC4), 15, "목", "법 범",       "male",    True,  1),  # 範
    ("범", h(0x6C5B), 6,  "수", "넓을 범",     "male",    False, 2),  # 汎
    ("병", h(0x70B3), 9,  "화", "빛날 병",     "male",    True,  1),  # 炳
    ("병", h(0x79C9), 8,  "화", "잡을 병",     "male",    True,  2),  # 秉
    ("보", h(0x4FDD), 9,  "수", "지킬 보",     "neutral", True,  1),  # 保
    ("보", h(0x5B9D), 20, "금", "보배 보",     "neutral", True,  2),  # 寶
    ("보", h(0x666E), 12, "화", "넓을 보",     "neutral", True,  3),  # 普
    ("보", h(0x8F14), 14, "화", "도울 보",     "male",    True,  4),  # 輔
    ("복", h(0x798F), 14, "목", "복 복",       "neutral", True,  1),  # 福
    ("복", h(0x99A5), 20, "화", "향기 복",     "female",  True,  2),  # 馥
    ("봉", h(0x5CF0), 10, "토", "봉우리 봉",   "male",    True,  1),  # 峯
    ("봉", h(0x9CF3), 14, "화", "봉황 봉",     "neutral", True,  2),  # 鳳
    ("빈", h(0x5F6C), 11, "목", "빛날 빈",     "male",    True,  1),  # 彬
    ("빈", h(0x6591), 12, "금", "빛날 빈",     "male",    True,  2),  # 斌
    ("빈", h(0x6FF1), 17, "수", "물가 빈",     "neutral", True,  3),  # 濱
    ("상", h(0x7965), 11, "금", "상서로울 상", "neutral", True,  1),  # 祥
    ("상", h(0x5C1A), 8,  "화", "오히려 상",   "male",    True,  2),  # 尙
    ("상", h(0x76F8), 9,  "목", "서로 상",     "male",    False, 3),  # 相
    ("서", h(0x745E), 14, "금", "상서로울 서", "neutral", True,  1),  # 瑞
    ("서", h(0x5E8F), 7,  "목", "차례 서",     "neutral", False, 2),  # 序
    ("서", h(0x66D9), 18, "화", "새벽 서",     "neutral", True,  3),  # 曙
    ("석", h(0x932B), 16, "금", "주석 석",     "male",    True,  1),  # 錫
    ("석", h(0x7855), 14, "금", "클 석",       "male",    True,  2),  # 碩
    ("석", h(0x5948), 15, "화", "클 석",       "male",    False, 3),  # 奭
    ("선", h(0x5584), 12, "목", "착할 선",     "neutral", True,  1),  # 善
    ("선", h(0x5BA3), 9,  "화", "베풀 선",     "neutral", True,  2),  # 宣
    ("선", h(0x4ED9), 5,  "목", "신선 선",     "female",  True,  3),  # 仙
    ("선", h(0x74BF), 19, "금", "아름다운옥 선","neutral", True,  4),  # 璿
    ("성", h(0x661F), 9,  "화", "별 성",       "neutral", True,  1),  # 星
    ("성", h(0x8AA0), 14, "화", "정성 성",     "neutral", True,  2),  # 誠
    ("성", h(0x8056), 13, "화", "성인 성",     "neutral", True,  3),  # 聖
    ("성", h(0x6210), 6,  "토", "이룰 성",     "neutral", True,  4),  # 成
    ("성", h(0x76DB), 11, "화", "성할 성",     "male",    True,  5),  # 盛
    ("세", h(0x4E16), 5,  "목", "인간 세",     "male",    True,  1),  # 世
    ("소", h(0x662D), 9,  "화", "밝을 소",     "female",  True,  1),  # 昭
    ("소", h(0x7D20), 10, "금", "흰 소",       "female",  True,  2),  # 素
    ("소", h(0x97F6), 14, "화", "아름다울 소", "female",  True,  3),  # 韶
    ("수", h(0x79C0), 7,  "화", "빼어날 수",   "neutral", True,  1),  # 秀
    ("수", h(0x58FD), 14, "토", "목숨 수",     "neutral", True,  2),  # 壽
    ("수", h(0x6D19), 9,  "수", "물가 수",     "male",    True,  3),  # 洙
    ("수", h(0x6A39), 16, "목", "나무 수",     "male",    True,  4),  # 樹
    ("수", h(0x4FEE), 10, "금", "닦을 수",     "male",    True,  5),  # 修
    ("수", h(0x7457), 12, "금", "아름다운옥 수","female",  True,  6),  # 琇
    ("수", h(0x7A57), 17, "목", "이삭 수",     "female",  True,  7),  # 穗
    ("순", h(0x6DF3), 11, "수", "순박할 순",   "neutral", True,  1),  # 淳
    ("순", h(0x7D14), 10, "금", "순수할 순",   "neutral", True,  2),  # 純
    ("순", h(0x9806), 12, "수", "순할 순",     "female",  True,  3),  # 順
    ("승", h(0x627F), 8,  "수", "이을 승",     "male",    True,  1),  # 承
    ("승", h(0x6607), 8,  "화", "오를 승",     "male",    True,  2),  # 昇
    ("승", h(0x52DD), 12, "화", "이길 승",     "male",    True,  3),  # 勝
    ("시", h(0x65BD), 9,  "화", "베풀 시",     "neutral", True,  1),  # 施
    ("시", h(0x8A69), 13, "금", "시 시",       "female",  True,  2),  # 詩
    ("신", h(0x4FE1), 9,  "화", "믿을 신",     "neutral", True,  1),  # 信
    ("신", h(0x65B0), 13, "금", "새 신",       "neutral", True,  2),  # 新
    ("아", h(0x96C5), 13, "목", "우아할 아",   "female",  True,  1),  # 雅
    ("아", h(0x5A25), 10, "토", "아름다울 아", "female",  True,  2),  # 娥
    ("양", h(0x4EAE), 9,  "화", "밝을 양",     "male",    True,  1),  # 亮
    ("양", h(0x63DA), 12, "목", "날릴 양",     "male",    True,  2),  # 揚
    ("양", h(0x694A), 13, "목", "버드나무 양", "neutral", True,  3),  # 楊
    ("양", h(0x6D0B), 9,  "수", "큰바다 양",   "male",    True,  4),  # 洋
    ("언", h(0x5F66), 9,  "화", "선비 언",     "male",    True,  1),  # 彦
    ("연", h(0x599D), 7,  "목", "고울 연",     "female",  True,  1),  # 妍
    ("연", h(0x71D5), 16, "화", "제비 연",     "female",  True,  2),  # 燕
    ("연", h(0x6D93), 11, "수", "맑은물 연",   "female",  True,  3),  # 涓
    ("연", h(0x7DE3), 15, "목", "인연 연",     "neutral", True,  4),  # 緣
    ("영", h(0x82F1), 9,  "목", "꽃부리 영",   "neutral", True,  1),  # 英
    ("영", h(0x6620), 9,  "화", "비출 영",     "female",  True,  2),  # 映
    ("영", h(0x69AE), 14, "목", "영화 영",     "neutral", True,  3),  # 榮
    ("영", h(0x6C38), 5,  "수", "길 영",       "neutral", True,  4),  # 永
    ("영", h(0x745B), 13, "금", "아름다운옥 영","female",  True,  5),  # 瑛
    ("예", h(0x85DD), 19, "목", "재주 예",     "neutral", True,  1),  # 藝
    ("예", h(0x53E1), 16, "목", "슬기 예",     "neutral", True,  2),  # 叡
    ("예", h(0x777F), 14, "화", "밝을 예",     "neutral", True,  3),  # 睿
    ("완", h(0x5B8C), 7,  "화", "완전할 완",   "neutral", True,  1),  # 完
    ("완", h(0x5A49), 11, "수", "순할 완",     "female",  True,  2),  # 婉
    ("용", h(0x9F8D), 16, "토", "용 용",       "male",    True,  1),  # 龍
    ("용", h(0x6E67), 12, "수", "솟을 용",     "male",    True,  2),  # 湧
    ("용", h(0x5BB9), 10, "수", "얼굴 용",     "neutral", True,  3),  # 容
    ("우", h(0x5B87), 6,  "수", "집 우",       "male",    True,  1),  # 宇
    ("우", h(0x7FBD), 6,  "화", "깃 우",       "neutral", True,  2),  # 羽
    ("우", h(0x4F51), 7,  "토", "도울 우",     "neutral", True,  3),  # 佑
    ("우", h(0x79B9), 9,  "토", "임금이름 우", "male",    True,  4),  # 禹
    ("우", h(0x7940), 10, "토", "도울 우",     "neutral", True,  5),  # 祐
    ("우", h(0x96E8), 8,  "수", "비 우",       "neutral", True,  6),  # 雨
    ("운", h(0x96F2), 12, "수", "구름 운",     "neutral", True,  1),  # 雲
    ("운", h(0x97FB), 19, "금", "운율 운",     "neutral", True,  2),  # 韻
    ("웅", h(0x96C4), 12, "화", "수컷 웅",     "male",    True,  1),  # 雄
    ("원", h(0x5143), 4,  "목", "으뜸 원",     "male",    True,  1),  # 元
    ("원", h(0x6E90), 14, "수", "근원 원",     "male",    True,  2),  # 源
    ("원", h(0x9060), 14, "목", "멀 원",       "neutral", True,  3),  # 遠
    ("원", h(0x5713), 13, "토", "둥글 원",     "neutral", True,  4),  # 圓
    ("원", h(0x82D1), 9,  "목", "동산 원",     "female",  True,  5),  # 苑
    ("원", h(0x5A9B), 12, "수", "여자 원",     "female",  True,  6),  # 媛
    ("유", h(0x88D5), 12, "토", "넉넉할 유",   "neutral", True,  1),  # 裕
    ("유", h(0x552F), 11, "수", "오직 유",     "neutral", True,  2),  # 唯
    ("유", h(0x7DAD), 14, "목", "맬 유",       "neutral", True,  3),  # 維
    ("윤", h(0x6F64), 15, "수", "윤택할 윤",   "neutral", True,  1),  # 潤
    ("윤", h(0x5141), 4,  "목", "진실 윤",     "neutral", True,  2),  # 允
    ("윤", h(0x73A7), 8,  "금", "아름다운옥 윤","neutral", True,  3),  # 玧
    ("윤", h(0x80E4), 9,  "수", "자손 윤",     "male",    True,  4),  # 胤
    ("은", h(0x6069), 10, "화", "은혜 은",     "female",  True,  1),  # 恩 ★
    ("은", h(0x9280), 14, "금", "은 은",       "female",  True,  2),  # 銀 ★
    ("은", h(0x5800), 9,  "토", "언덕 은",     "neutral", True,  3),  # 垠 ★
    ("은", h(0x6BB7), 10, "화", "은나라 은",   "neutral", False, 4),  # 殷
    ("은", h(0x73E2), 10, "금", "옥돌 은",     "female",  True,  5),  # 珢 ★
    ("의", h(0x7FA9), 13, "목", "옳을 의",     "neutral", True,  1),  # 義
    ("의", h(0x5100), 15, "화", "거동 의",     "neutral", True,  2),  # 儀
    ("의", h(0x5B9C), 8,  "토", "마땅할 의",   "neutral", True,  3),  # 宜
    ("이", h(0x6021), 9,  "화", "기쁠 이",     "female",  True,  1),  # 怡
    ("인", h(0x4EC1), 4,  "목", "어질 인",     "neutral", True,  1),  # 仁
    ("인", h(0x5BC5), 11, "목", "범 인",       "male",    True,  2),  # 寅
    ("일", h(0x9038), 12, "목", "편안할 일",   "male",    True,  1),  # 逸
    ("일", h(0x65E5), 4,  "화", "해 일",       "neutral", False, 2),  # 日
    ("자", h(0x6148), 14, "화", "사랑할 자",   "female",  True,  1),  # 慈
    ("장", h(0x58EF), 7,  "목", "씩씩할 장",   "male",    True,  1),  # 壯
    ("장", h(0x838A), 11, "목", "씩씩할 장",   "male",    True,  2),  # 莊
    ("장", h(0x7487), 15, "금", "홀 장",       "male",    True,  3),  # 璋
    ("재", h(0x8F09), 13, "토", "실을 재",     "male",    True,  1),  # 載
    ("재", h(0x624D), 3,  "목", "재주 재",     "neutral", True,  2),  # 才
    ("재", h(0x5BB0), 10, "금", "주재할 재",   "male",    True,  3),  # 宰
    ("전", h(0x5178), 8,  "화", "법 전",       "neutral", True,  1),  # 典
    ("정", h(0x7CBE), 14, "화", "정밀할 정",   "neutral", True,  1),  # 精
    ("정", h(0x8C9E), 9,  "화", "곧을 정",     "female",  True,  2),  # 貞
    ("정", h(0x5B9A), 8,  "수", "정할 정",     "neutral", True,  3),  # 定
    ("정", h(0x6B63), 5,  "화", "바를 정",     "neutral", True,  4),  # 正
    ("정", h(0x6676), 12, "화", "맑을 정",     "female",  True,  5),  # 晶
    ("정", h(0x7A0B), 13, "화", "길 정",       "neutral", True,  6),  # 程
    ("정", h(0x9759), 16, "수", "고요할 정",   "female",  True,  7),  # 靜
    ("제", h(0x6FDF), 17, "수", "건널 제",     "neutral", True,  1),  # 濟
    ("조", h(0x7167), 13, "화", "비출 조",     "neutral", True,  1),  # 照
    ("조", h(0x671D), 12, "화", "아침 조",     "neutral", True,  2),  # 朝
    ("종", h(0x937E), 17, "금", "쇠북 종",     "male",    True,  1),  # 鍾
    ("종", h(0x5B97), 8,  "목", "마루 종",     "male",    True,  2),  # 宗
    ("주", h(0x73E0), 10, "금", "구슬 주",     "female",  True,  1),  # 珠
    ("주", h(0x67F1), 9,  "목", "기둥 주",     "male",    True,  2),  # 柱
    ("주", h(0x5468), 8,  "토", "두루 주",     "neutral", True,  3),  # 周
    ("주", h(0x5B99), 8,  "수", "집 주",       "male",    True,  4),  # 宙
    ("준", h(0x4FCA), 9,  "목", "준걸 준",     "male",    True,  1),  # 俊
    ("준", h(0x57C8), 10, "토", "높을 준",     "male",    True,  2),  # 埈
    ("준", h(0x5CFB), 10, "목", "높을 준",     "male",    True,  3),  # 峻
    ("준", h(0x6D5A), 10, "수", "깊을 준",     "male",    True,  4),  # 浚
    ("준", h(0x7AE3), 12, "목", "마칠 준",     "male",    True,  5),  # 竣
    ("지", h(0x667A), 12, "화", "지혜 지",     "neutral", True,  1),  # 智
    ("지", h(0x5FD7), 7,  "화", "뜻 지",       "neutral", True,  2),  # 志
    ("지", h(0x77E5), 8,  "화", "알 지",       "neutral", True,  3),  # 知
    ("지", h(0x829D), 7,  "목", "지초 지",     "female",  True,  4),  # 芝
    ("진", h(0x73CD), 9,  "금", "보배 진",     "neutral", True,  1),  # 珍
    ("진", h(0x771F), 10, "목", "참 진",       "neutral", True,  2),  # 眞
    ("진", h(0x632F), 10, "목", "떨칠 진",     "male",    True,  3),  # 振
    ("찬", h(0x71E6), 17, "화", "빛날 찬",     "male",    True,  1),  # 燦
    ("찬", h(0x7480), 17, "금", "빛날 찬",     "neutral", True,  2),  # 璨
    ("창", h(0x660C), 8,  "화", "창성할 창",   "male",    True,  1),  # 昌
    ("창", h(0x5F70), 14, "화", "밝을 창",     "neutral", True,  2),  # 彰
    ("창", h(0x66A2), 14, "목", "통할 창",     "neutral", True,  3),  # 暢
    ("채", h(0x5F69), 11, "화", "채색 채",     "female",  True,  1),  # 彩
    ("천", h(0x5929), 4,  "화", "하늘 천",     "neutral", True,  1),  # 天
    ("천", h(0x6CC9), 9,  "수", "샘 천",       "neutral", True,  2),  # 泉
    ("철", h(0x5586), 12, "화", "밝을 철",     "male",    True,  1),  # 喆
    ("철", h(0x54F2), 10, "화", "밝을 철",     "male",    True,  2),  # 哲
    ("철", h(0x6F88), 16, "수", "맑을 철",     "male",    True,  3),  # 澈
    ("청", h(0x6E05), 11, "수", "맑을 청",     "neutral", True,  1),  # 清
    ("청", h(0x9752), 8,  "목", "푸를 청",     "neutral", True,  2),  # 青
    ("춘", h(0x6625), 9,  "목", "봄 춘",       "neutral", True,  1),  # 春
    ("충", h(0x5FE0), 8,  "화", "충성 충",     "male",    True,  1),  # 忠
    ("태", h(0x6CF0), 10, "수", "클 태",       "neutral", True,  1),  # 泰
    ("태", h(0x592A), 4,  "화", "클 태",       "neutral", True,  2),  # 太
    ("하", h(0x590F), 10, "화", "여름 하",     "neutral", True,  1),  # 夏
    ("하", h(0x971E), 17, "수", "노을 하",     "female",  True,  2),  # 霞
    ("학", h(0x5B78), 16, "수", "배울 학",     "neutral", True,  1),  # 學
    ("학", h(0x9DB4), 22, "화", "학 학",       "neutral", True,  2),  # 鶴
    ("한", h(0x7FF0), 16, "화", "깃 한",       "male",    True,  1),  # 翰
    ("해", h(0x6D77), 10, "수", "바다 해",     "male",    True,  1),  # 海
    ("혁", h(0x8D6B), 14, "화", "빛날 혁",     "male",    True,  1),  # 赫
    ("현", h(0x70AB), 9,  "화", "빛날 현",     "male",    True,  1),  # 炫
    ("현", h(0x8CE2), 15, "목", "어질 현",     "neutral", True,  2),  # 賢
    ("현", h(0x9215), 13, "금", "활줄 현",     "male",    True,  3),  # 鉉
    ("형", h(0x4EA8), 7,  "목", "형통할 형",   "male",    True,  2),  # 亨
    ("형", h(0x70AF), 9,  "화", "빛날 형",     "male",    True,  1),  # 炯
    ("형", h(0x745E), 15, "금", "밝은옥 형",   "female",  True,  3),  # 瑩
    ("형", h(0x99A8), 20, "화", "향기 형",     "neutral", True,  4),  # 馨
    ("호", h(0x660A), 8,  "화", "하늘 호",     "male",    True,  1),  # 昊
    ("호", h(0x9320), 18, "금", "쇠솥 호",     "male",    True,  2),  # 鎬
    ("호", h(0x6D69), 10, "수", "넓을 호",     "male",    True,  3),  # 浩
    ("호", h(0x864E), 8,  "화", "호랑이 호",   "male",    True,  4),  # 虎
    ("호", h(0x7693), 12, "수", "흴 호",       "male",    True,  5),  # 皓
    ("홍", h(0x5F18), 5,  "수", "넓을 홍",     "neutral", True,  1),  # 弘
    ("홍", h(0x6CF3), 8,  "수", "깊을 홍",     "neutral", True,  2),  # 泓
    ("화", h(0x548C), 8,  "목", "화할 화",     "neutral", True,  1),  # 和
    ("화", h(0x82B1), 8,  "목", "꽃 화",       "female",  True,  2),  # 花
    ("화", h(0x83EF), 12, "목", "빛날 화",     "neutral", True,  3),  # 華
    ("환", h(0x6853), 10, "목", "굳셀 환",     "male",    True,  1),  # 桓
    ("환", h(0x714A), 13, "화", "빛날 환",     "male",    True,  2),  # 煥
    ("환", h(0x5950), 9,  "화", "빛날 환",     "neutral", True,  3),  # 奐
    ("효", h(0x5B5D), 7,  "수", "효도 효",     "neutral", True,  1),  # 孝
    ("효", h(0x66C9), 16, "화", "새벽 효",     "neutral", True,  2),  # 曉
    ("후", h(0x5389), 9,  "토", "두터울 후",   "male",    True,  1),  # 厚
    ("훈", h(0x52DB), 12, "화", "공훈 훈",     "male",    True,  1),  # 勛
    ("훈", h(0x85B0), 18, "목", "향풀 훈",     "female",  True,  2),  # 薰
    ("휘", h(0x8F1D), 15, "화", "빛날 휘",     "neutral", True,  1),  # 輝
    ("희", h(0x71D9), 13, "화", "빛날 희",     "neutral", True,  1),  # 熙
    ("희", h(0x59EC), 10, "목", "아가씨 희",   "female",  True,  2),  # 姬
    ("희", h(0x5E0C), 7,  "목", "바랄 희",     "neutral", True,  3),  # 希
    ("희", h(0x559C), 12, "목", "기쁠 희",     "neutral", True,  4),  # 喜
]


def upsert_batch(table, rows, conflict):
    ok = 0
    for i in range(0, len(rows), 30):
        batch = rows[i:i+30]
        try:
            sb.table(table).upsert(batch, on_conflict=conflict).execute()
            ok += len(batch)
            print(f"  {table} {ok}/{len(rows)}")
        except Exception as ex:
            print(f"  ERR: {ex}")
    return ok


if __name__ == "__main__":
    print("Deleting old data...")
    sb.table("hanja_names").delete().neq("id", 0).execute()
    sb.table("hanja_surnames").delete().neq("id", 0).execute()

    # 성씨 중복 제거
    seen = set()
    dedup_surnames = []
    for row in SURNAMES:
        k = (row[0], row[1])
        if k not in seen:
            seen.add(k)
            dedup_surnames.append(row)

    print(f"Inserting {len(dedup_surnames)} surnames...")
    s_rows = [{"hangul": a, "hanja": b, "strokes": c, "element": d, "is_common": True}
              for a, b, c, d in dedup_surnames]
    upsert_batch("hanja_surnames", s_rows, "hangul,hanja")

    # 이름 한자 중복 제거
    seen2 = set()
    dedup_names = []
    for row in NAMES:
        k = (row[0], row[1])
        if k not in seen2:
            seen2.add(k)
            dedup_names.append(row)

    print(f"Inserting {len(dedup_names)} name chars...")
    n_rows = [{"hangul": a, "hanja": b, "strokes": c, "element": d,
               "meaning": e, "gender_pref": f, "is_common": g, "display_order": i}
              for a, b, c, d, e, f, g, i in dedup_names]
    upsert_batch("hanja_names", n_rows, "hangul,hanja")

    # 최종 확인
    sc = sb.table("hanja_surnames").select("*", count="exact").execute()
    nc = sb.table("hanja_names").select("*", count="exact").execute()
    print(f"Result => surnames:{sc.count} names:{nc.count}")

    kim = sb.table("hanja_surnames").select("hangul,hanja,strokes").eq("hangul", "김").execute()
    print(f"김 => {kim.data}")

    eun = sb.table("hanja_names").select("hangul,hanja,strokes,meaning").eq("hangul", "은").execute()
    print(f"은 => {eun.data}")
