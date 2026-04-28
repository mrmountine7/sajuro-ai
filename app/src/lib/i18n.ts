/**
 * 언어 설정 유틸리티
 * 현재는 localStorage 저장만 담당.
 * 이후 i18next 라이브러리 연동 시 이 파일만 교체하면 됩니다.
 */

export interface LangOption {
  code: string
  label: string   // 해당 언어로 표기된 이름
  flag: string
}

export const LANGUAGES: LangOption[] = [
  { code: 'ko', label: '한국어',    flag: '🇰🇷' },
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
  { code: 'ja', label: '日本語',    flag: '🇯🇵' },
  { code: 'vi', label: 'Tiếng Việt',flag: '🇻🇳' },
]

const KEY = 'saju_lang'

export function getLang(): string {
  return localStorage.getItem(KEY) || 'ko'
}

export function setLang(code: string): void {
  localStorage.setItem(KEY, code)
  // TODO: i18next 연동 후 → i18n.changeLanguage(code)
}
