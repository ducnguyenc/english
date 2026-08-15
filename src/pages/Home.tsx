import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVisibleItems, subscribeContent } from '../lib/content'
import { ensureItemsTracked, loadProgress, subscribeProgress } from '../lib/progress'
import { isHard } from '../lib/leitner'
import { MASTERED_DAY } from '../types'

const TIERS = [1, 2, 3, 4, 5] as const

export default function Home() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const off1 = subscribeContent(() => setTick((t) => t + 1))
    const off2 = subscribeProgress(() => setTick((t) => t + 1))
    return () => {
      off1()
      off2()
    }
  }, [])

  const items = getVisibleItems()

  useEffect(() => {
    ensureItemsTracked(items.map((i) => i.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  const progress = loadProgress()

  const byTier = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, [MASTERED_DAY]: 0 }
    for (const item of items) {
      const p = progress.items[item.id]
      const day = p?.day ?? 1
      map[day] = (map[day] ?? 0) + 1
    }
    return map
  }, [items, progress])

  const hardCount = items.filter((i) => {
    const p = progress.items[i.id]
    return p && isHard(p)
  }).length

  const masteredCount = byTier[MASTERED_DAY] ?? 0
  const total = items.length
  const masteredPct = total ? Math.round((masteredCount / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm opacity-90">🔥 Streak</div>
          <div className="text-2xl font-bold">{progress.streak} ngày</div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">Đã thuộc</div>
          <div className="text-2xl font-bold">
            {masteredCount}/{total} ({masteredPct}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TIERS.map((day) => {
          const count = byTier[day] ?? 0
          return (
            <div
              key={day}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2 bg-white dark:bg-slate-900"
            >
              <div className="text-sm text-slate-500 dark:text-slate-400">Day {day}</div>
              <div className="text-3xl font-bold">{count}</div>
              <div className="mt-auto flex gap-1.5">
                <Link
                  to={`/day/${day}`}
                  className="flex-1 text-sm rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Xem
                </Link>
                <Link
                  to={`/review/${day}`}
                  className="flex-1 text-sm rounded-lg bg-indigo-600 text-white px-2 py-1.5 text-center hover:bg-indigo-700 transition"
                >
                  Ôn ngay
                </Link>
              </div>
            </div>
          )
        })}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 p-4 flex flex-col gap-2 bg-emerald-50 dark:bg-emerald-950">
          <div className="text-sm text-emerald-600 dark:text-emerald-400">✅ Đã thuộc</div>
          <div className="text-3xl font-bold">{masteredCount}</div>
          <Link
            to="/mastered"
            className="mt-auto text-sm rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-center hover:bg-emerald-700 transition"
          >
            Ôn lại kho
          </Link>
        </div>
      </div>

      {hardCount > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">🔥 Từ khó ({hardCount})</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Sai nhiều lần — nên luyện tập trung.</div>
          </div>
          <Link
            to="/hard"
            className="text-sm rounded-lg bg-orange-600 text-white px-3 py-1.5 hover:bg-orange-700 transition"
          >
            Luyện tập trung
          </Link>
        </div>
      )}

      {total === 0 && (
        <div className="text-center text-slate-500 dark:text-slate-400 py-10">
          Chưa có nội dung nào.{' '}
          <Link to="/admin" className="text-indigo-600 underline">
            Thêm từ vựng ở trang Admin
          </Link>
          .
        </div>
      )}
    </div>
  )
}
