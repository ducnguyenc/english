import { useEffect, useState } from 'react'

const KEY = 'en5:theme'

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    applyTheme(dark)
    localStorage.setItem(KEY, dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label="Đổi giao diện sáng/tối"
      className="rounded-full w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition text-lg"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
