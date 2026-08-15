import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteItem, getVisibleItems, subscribeContent } from '../lib/content'
import { loadProgress, subscribeProgress } from '../lib/progress'
import { isWord } from '../lib/quiz'
import WordImage from '../components/WordImage'
import SpeakButton from '../components/SpeakButton'
import DayPicker from '../components/DayPicker'
import { openWordDetail } from '../lib/wordDetail'
import { MASTERED_DAY } from '../types'

export default function Mastered() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const off1 = subscribeContent(() => setTick((t) => t + 1))
    const off2 = subscribeProgress(() => setTick((t) => t + 1))
    return () => {
      off1()
      off2()
    }
  }, [])

  function handleDelete(id: string) {
    if (!confirm('Xoá từ này khỏi kho đã thuộc?')) return
    deleteItem(id)
  }

  const items = getVisibleItems()
  const progress = loadProgress()

  const masteredWords = useMemo(
    () => items.filter((i) => isWord(i) && progress.items[i.id]?.day === MASTERED_DAY),
    [items, progress],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">✅ Kho Đã thuộc ({masteredWords.length})</h1>
        {masteredWords.length > 0 && (
          <Link to="/review/mastered" className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm">
            Ôn lại kho
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Sai khi ôn lại kho này sẽ khiến từ rớt về Day 5, không mất từ đầu.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {masteredWords.map((w) => (
          <div
            key={w.id}
            className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-950/30 cursor-pointer"
            onClick={() => openWordDetail(w)}
          >
            <WordImage image={w.image} className="w-10 h-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate flex items-center gap-1">
                {isWord(w) ? w.english : ''}
                {isWord(w) && <SpeakButton text={w.english} className="w-6 h-6 text-base shrink-0" />}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isWord(w) ? w.vietnamese : ''}
              </div>
            </div>
            <div className="flex gap-1 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <DayPicker itemId={w.id} currentDay={progress.items[w.id]?.day ?? MASTERED_DAY} />
              <Link to={`/admin?edit=${w.id}`} className="btn-icon" title="Sửa">
                ✏️
              </Link>
              <button type="button" className="btn-icon" title="Xoá" onClick={() => handleDelete(w.id)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
        {masteredWords.length === 0 && (
          <div className="text-slate-500 text-sm col-span-2 text-center py-10">
            Chưa có từ nào được thuộc. Ôn tập ở các Day 1-5 để tích luỹ nhé!
          </div>
        )}
      </div>
    </div>
  )
}
