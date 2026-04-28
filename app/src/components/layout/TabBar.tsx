import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Bookmark, FileText, User } from 'lucide-react'

const tabs = [
  { id: 'home', path: '/', icon: Home, label: '홈' },
  { id: 'analysis', path: '/analysis', icon: Search, label: '분석' },
  { id: 'vault', path: '/vault', icon: Bookmark, label: '보관소' },
  { id: 'records', path: '/records', icon: FileText, label: '기록' },
  { id: 'mypage', path: '/mypage', icon: User, label: '마이' },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = tabs.find(t => {
    if (t.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(t.path)
  })?.id || 'home'

  return (
    <nav className="s-tabbar">
      {tabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button key={tab.id} onClick={() => navigate(tab.path)} className={`s-tab ${active ? 's-tab-active' : ''}`}>
            <tab.icon size={24} strokeWidth={active ? 2.2 : 1.8} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
