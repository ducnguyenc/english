import { Link, Outlet, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import WordDetailModal from './WordDetailModal'

const NAV = [
  { to: '/', label: 'Trang chủ' },
  { to: '/mastered', label: 'Đã thuộc' },
  { to: '/hard', label: 'Từ khó 🔥' },
  { to: '/admin', label: 'Admin' },
]

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold text-lg flex items-center gap-2">
            <span>📚</span> English 5 Days
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded-full transition ${
                  pathname === n.to
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <WordDetailModal />
    </div>
  )
}
