import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { FontSizeProvider } from '@/lib/font-size-context'
import { ProfileGuardProvider } from '@/lib/profile-guard-context'
import { supabase } from '@/lib/supabase'
import TabBar from '@/components/layout/TabBar'
import HomeScreen from '@/screens/HomeScreen'
import AnalysisScreen from '@/screens/AnalysisScreen'
import AnalysisEntryScreen from '@/screens/AnalysisEntryScreen'
import VaultScreen from '@/screens/VaultScreen'
import DetailScreen from '@/screens/DetailScreen'
import ResultScreen from '@/screens/ResultScreen'
import CompatibilityResultScreen from '@/screens/CompatibilityResultScreen'
import RecordsScreen from '@/screens/RecordsScreen'
import MyPageScreen from '@/screens/MyPageScreen'
import AddProfileScreen from '@/screens/AddProfileScreen'
import ManseryukScreen from '@/screens/ManseryukScreen'
import DreamScreen from '@/screens/DreamScreen'
import PrecisionResultScreen from '@/screens/PrecisionResultScreen'
import QAHistoryScreen from '@/screens/QAHistoryScreen'
import MarriageResultScreen from '@/screens/MarriageResultScreen'
import DailyFortuneCalendarScreen from '@/screens/DailyFortuneCalendarScreen'
import MonthlyFortuneScreen from '@/screens/MonthlyFortuneScreen'
import DaeunTimelineScreen from '@/screens/DaeunTimelineScreen'
import IdealTypeScreen from '@/screens/IdealTypeScreen'
import SajuCardScreen from '@/screens/SajuCardScreen'
import NameReadingScreen from '@/screens/NameReadingScreen'
import PalmReadingScreen from '@/screens/PalmReadingScreen'
import LifetimeFortuneScreen from '@/screens/LifetimeFortuneScreen'
import FortuneScreen from '@/screens/FortuneScreen'
import FaceReadingScreen from '@/screens/FaceReadingScreen'
import FamilyCompatibilityResultScreen from '@/screens/FamilyCompatibilityResultScreen'
import MonitorScreen from '@/screens/MonitorScreen'

const TAB_PATHS = ['/', '/analysis', '/vault', '/records', '/mypage']

function AppContent() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const showTabBar = TAB_PATHS.includes(pathname)

  // Kakao OAuth 콜백 처리 — URL 해시에 access_token이 있으면 마이페이지로 이동
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // OAuth 리다이렉트 후 마이페이지로 이동 (URL 클린업)
        if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
          nav('/mypage', { replace: true })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [nav])

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/onboarding" element={<HomeScreen forceOnboarding />} />
        <Route path="/analysis" element={<AnalysisScreen />} />
        <Route path="/analysis/manseryuk" element={<ManseryukScreen />} />
        <Route path="/analysis/dream" element={<DreamScreen />} />
        <Route path="/precision-result" element={<PrecisionResultScreen />} />
        <Route path="/analysis/:serviceId" element={<AnalysisEntryScreen />} />
        <Route path="/vault" element={<VaultScreen />} />
        <Route path="/add-profile" element={<AddProfileScreen />} />
        <Route path="/detail/:id" element={<DetailScreen />} />
        <Route path="/result/:id" element={<ResultScreen />} />
        <Route path="/compatibility-result" element={<CompatibilityResultScreen />} />
        <Route path="/records" element={<RecordsScreen />} />
        <Route path="/qa-history" element={<QAHistoryScreen />} />
        <Route path="/marriage-result" element={<MarriageResultScreen />} />
        <Route path="/daily-fortune-calendar" element={<DailyFortuneCalendarScreen />} />
        <Route path="/monthly-fortune" element={<MonthlyFortuneScreen />} />
        <Route path="/daeun-timeline" element={<DaeunTimelineScreen />} />
        <Route path="/ideal-type" element={<IdealTypeScreen />} />
        <Route path="/saju-card" element={<SajuCardScreen />} />
        <Route path="/name-reading" element={<NameReadingScreen />} />
        <Route path="/analysis/palm" element={<PalmReadingScreen />} />
        <Route path="/lifetime-result" element={<LifetimeFortuneScreen />} />
        <Route path="/fortune-result" element={<FortuneScreen />} />
        <Route path="/analysis/face" element={<FaceReadingScreen />} />
        <Route path="/family-result" element={<FamilyCompatibilityResultScreen />} />
        <Route path="/mypage" element={<MyPageScreen />} />
        <Route path="/monitor" element={<MonitorScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
      {showTabBar && <TabBar />}
    </div>
  )
}

export default function App() {
  return (
    <FontSizeProvider>
      <BrowserRouter>
        <ProfileGuardProvider>
          <AppContent />
        </ProfileGuardProvider>
      </BrowserRouter>
    </FontSizeProvider>
  )
}
