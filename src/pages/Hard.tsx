import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVisibleItems, subscribeContent } from '../lib/content'
import { loadProgress, subscribeProgress, updateItemProgress } from '../lib/progress'
import { applyAnswerAny, hardLevel, isHard } from '../lib/leitner'
import { checkFillAnswer, isWord } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import { openWordDetail } from '../lib/wordDetail'
import type { Word } from '../types'

export default function Hard() {
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
  const progress = loadProgress()

  const hardWords = useMemo(() => {
    return items.filter((i) => {
      const p = progress.items[i.id]
      return isWord(i) && p && isHard(p)
    }) as Word[]
  }, [items, progress])

  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const current = hardWords[idx % Math.max(hardWords.length, 1)]

  if (hardWords.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">👍</div>
        <p className="text-slate-500 dark:text-slate-400">Chưa có từ khó nào (sai ≥ 1 lần) — quá ổn!</p>
        <Link to="/" className="text-indigo-600 underline">
          Về trang chủ
        </Link>
      </div>
    )
  }

  function handleSubmit() {
    if (feedback) return
    const correct = checkFillAnswer(input, current.vietnamese)
    setFeedback(correct ? 'correct' : 'wrong')
    updateItemProgress(current.id, (p) => applyAnswerAny(p, correct, Date.now()))
    setTimeout(() => {
      setFeedback(null)
      setInput('')
      setIdx((i) => i + 1)
    }, 1000)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">🔥 Luyện tập trung từ khó ({hardWords.length})</h1>
      <div className="relative rounded-2xl border border-orange-200 dark:border-orange-800 p-6 bg-orange-50/50 dark:bg-orange-950/30 text-center space-y-4">
        <button
          type="button"
          className="absolute top-3 right-3 btn-icon"
          title="Xem chi tiết"
          onClick={() => openWordDetail(current)}
        >
          ℹ️
        </button>
        <WordImage image={current.image} className="w-16 h-16 mx-auto" />
        <div className="text-2xl font-bold flex items-center justify-center gap-2">
          {current.english}
          <button onClick={() => speak(current.english, 'en-US')} className="text-lg">
            🔊
          </button>
        </div>
        <div className="text-slate-500 dark:text-slate-400">{current.ipa}</div>
        {progress.items[current.id] && (
          <div className="text-xs text-orange-600 dark:text-orange-400">
            Mức độ khó: {'🔥'.repeat(hardLevel(progress.items[current.id]))} (
            {hardLevel(progress.items[current.id])}/3)
          </div>
        )}
        {current.note && <div className="text-sm text-orange-700 dark:text-orange-300">💡 {current.note}</div>}
        <input
          autoFocus
          className="input text-center text-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={!!feedback}
          placeholder="Gõ nghĩa tiếng Việt..."
        />
        <button
          className="rounded-lg bg-orange-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!!feedback || !input.trim()}
        >
          Kiểm tra
        </button>
        {feedback === 'correct' && <p className="text-emerald-600 font-medium">✅ Chính xác!</p>}
        {feedback === 'wrong' && <p className="text-red-600">Đáp án: {current.vietnamese}</p>}
        <p className="text-xs text-slate-400">Ví dụ: {current.example}</p>
      </div>
    </div>
  )
}
