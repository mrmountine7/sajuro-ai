export interface Profile {
  id: string
  user_id: string
  device_id?: string
  name: string
  birth_date: string
  birth_time: string
  is_lunar: boolean
  gender: 'male' | 'female'
  location?: string
  relation?: 'self' | 'lover' | 'family' | 'friend' | 'other'
  is_primary?: boolean
  is_favorite?: boolean
  display_order?: number
  created_at: string
  updated_at?: string
}

export interface AnalysisResult {
  id: string
  user_id: string
  profile_id: string
  analysis_type: string
  title: string
  summary: string
  sections: AnalysisSection[]
  keywords: string[]
  classics_refs?: string[]
  created_at: string
}

export interface AnalysisSection {
  title: string
  icon?: string
  content: string
  items?: string[]
}

export interface RecordItem {
  id: string
  title: string
  date: string
  summary: string
  tags: string[]
  type: 'analysis' | 'compatibility' | 'qa' | 'saved'
  question_count?: number
  profile_names?: string[]
  highlight?: string
  qa_summary?: string
  expert_note?: string
}

export interface QAThread {
  id: string
  result_id: string
  question: string
  answer: string
  created_at: string
}

export type AnalysisCategory = 'all' | 'saju' | 'theme' | 'match' | 'life' | 'image'

export interface AnalysisMenuItem {
  id: string
  title: string
  description: string
  icon: string
  badge?: 'free' | 'free-now' | 'premium' | 'coming-soon' | 'recommend' | 'popular'
  category: AnalysisCategory
  route: string
}
