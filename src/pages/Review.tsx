import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVisibleItems } from '../lib/content'
import { ensureItemsTracked, loadProgress, updateItemProgress, bumpStreak } from '../lib/progress'
import { applyAnswer, applyAnswerMastered, buildQueue } from '../lib/leitner'
import { checkFillAnswer, firstMeaning, isWord, pickDirection } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import type { ContentItem, LeitnerDay, QuizMode } from '../types'
import { MASTERED_DAY } from '../types'

const MODES: QuizMode[] = ['fill', 'listen']

interface QueueEntry {
  item: ContentItem
  mode: QuizMode
  direction: 'en-to-vi' | 'vi-to-en'
  repeated?: boolean
}

export default function Review() {
  const params = useParams<{ day: string }>()
  const day = (params.day === 'mastered' ? MASTERED_DAY : Number(params.day)) as LeitnerDay

  const items = getVisibleItems()
  useEffect(() => {
    ensureItemsTracked(items.map((i) => i.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  const progress = loadProgress()

  const tierItems = useMemo(() => {
    // Quiz Leitner chỉ áp dụng cho từ vựng; cấu trúc câu học qua Flashcard ở DayDetail.
    return items.filter((i) => isWord(i) && (progress.items[i.id]?.day ?? 1) === day)
  }, [items, day]) // eslint-disable-line react-hooks/exhaustive-deps

  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [results, setResults] = useState<{ up: number; stay: number }>({ up: 0, stay: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (queue !== null) return
    const progresses = tierItems.map((i) => progress.items[i.id]).filter(Boolean) as NonNullable<
      typeof progress.items[string]
    >[]
    const ordered = buildQueue(progresses)
    const entries: QueueEntry[] = ordered.map((p) => {
      const item = tierItems.find((i) => i.id === p.itemId)!
      const mode = MODES[Math.floor(Math.random() * MODES.length)]
      const direction = pickDirection(day)
      return { item, mode, direction }
    })
    setQueue(entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierItems.length, day])

  const current = queue?.[idx]

  if (!current && !done && queue !== null) {
    setDone(true)
    bumpStreak(new Date())
  }

  if (tierItems.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🎉</div>
        <p className="text-slate-500 dark:text-slate-400">
          Không có từ nào ở {day === MASTERED_DAY ? 'kho Đã thuộc' : `Day ${day}`} để ôn.
        </p>
        <Link to="/" className="text-indigo-600 underline">
          Về trang chủ
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl">🏆</div>
        <h2 className="text-xl font-bold">Hoàn thành lượt ôn!</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {results.up} từ lên tầng tiếp theo · {results.stay} từ ở lại
        </p>
        <div className="flex gap-2 justify-center">
          <Link to="/" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm">
            Về trang chủ
          </Link>
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => {
              setQueue(null)
              setIdx(0)
              setDone(false)
              setResults({ up: 0, stay: 0 })
            }}
          >
            Ôn lại tầng này
          </button>
        </div>
      </div>
    )
  }

  if (!current) return null

  const word = isWord(current.item) ? current.item : null

  function submit(correct: boolean) {
    const now = Date.now()
    updateItemProgress(current!.item.id, (p) =>
      day === MASTERED_DAY ? applyAnswerMastered(p, correct, now) : applyAnswer(p, correct, now),
    )
    setResults((r) => (correct ? { ...r, up: r.up + 1 } : { ...r, stay: r.stay + 1 }))
    setFeedback(correct ? 'correct' : 'wrong')

    setTimeout(() => {
      setFeedback(null)
      setUserInput('')
      setQueue((q) => {
        if (!q) return q
        const rest = q.filter((_, i) => i !== idx)
        if (correct) return rest // đúng -> item đã lên tầng, ra khỏi hàng đợi của lượt này
        // sai -> đưa xuống cuối, gặp lại tối đa 1 lần trong lượt này
        const already = current!.repeated
        if (already) return rest
        return [...rest, { ...current!, repeated: true }]
      })
      // idx giữ nguyên: phần tử tại idx vừa bị xoá khỏi queue nên vị trí idx
      // giờ tự động trỏ vào câu tiếp theo (mảng đã dồn lại một chỗ).
    }, 900)
  }

  function handleFillSubmit() {
    if (feedback) return
    let correct: boolean
    if (word) {
      if (current!.mode === 'listen') {
        // Nghe & gõ lại: đáp án luôn là English, bất kể chiều hỏi là gì
        correct = checkFillAnswer(userInput, word.english)
      } else {
        correct =
          current!.direction === 'en-to-vi'
            ? checkFillAnswer(userInput, word.vietnamese)
            : checkFillAnswer(userInput, word.english)
      }
    } else {
      correct = false
    }
    submit(correct)
  }

  const progressPct = queue ? Math.round((idx / queue.length) * 100) : 0

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {day === MASTERED_DAY ? 'Kho Đã thuộc' : `Day ${day}`} — câu {idx + 1}/{queue?.length}
        </span>
        <span>{progressPct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 text-center space-y-4">
        <QuestionBody current={current} />

        {current.mode === 'fill' && word && (
          <div className="space-y-3 mt-4">
            <input
              autoFocus
              className="input text-center text-lg"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
              disabled={!!feedback}
              placeholder={current.direction === 'en-to-vi' ? 'Gõ nghĩa tiếng Việt...' : 'Type in English...'}
            />
            <button
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              onClick={handleFillSubmit}
              disabled={!!feedback || !userInput.trim()}
            >
              Kiểm tra
            </button>
            {feedback === 'wrong' && (
              <p className="text-sm text-red-600">
                Đáp án đúng: {current.direction === 'en-to-vi' ? word.vietnamese : word.english}
              </p>
            )}
          </div>
        )}

        {current.mode === 'listen' && word && (
          <ListenMode
            word={word}
            direction={current.direction}
            userInput={userInput}
            setUserInput={setUserInput}
            feedback={feedback}
            onSubmit={handleFillSubmit}
          />
        )}

        {feedback === 'correct' && <p className="text-emerald-600 font-medium">✅ Chính xác!</p>}
      </div>
    </div>
  )
}

function QuestionBody({ current }: { current: QueueEntry }) {
  const word = isWord(current.item) ? current.item : null
  if (word) {
    const showEnglish = current.direction === 'en-to-vi'
    return (
      <div className="space-y-2">
        <WordImage image={word.image} className="w-16 h-16 mx-auto" />
        {current.mode !== 'listen' && (
          <>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {showEnglish ? word.english : firstMeaning(word.vietnamese)}
              {showEnglish && (
                <button onClick={() => speak(word.english, 'en-US')} className="text-lg">
                  🔊
                </button>
              )}
            </div>
            {showEnglish && <div className="text-slate-500 dark:text-slate-400">{word.ipa}</div>}
          </>
        )}
      </div>
    )
  }
  const pattern = current.item as import('../types').Pattern
  return (
    <div className="space-y-2">
      <WordImage image={pattern.image} className="w-16 h-16 mx-auto" />
      <div className="text-xl font-bold">{pattern.formula}</div>
      <div className="text-slate-500 dark:text-slate-400">{pattern.meaningVi}</div>
    </div>
  )
}

function ListenMode({
  word,
  direction,
  userInput,
  setUserInput,
  feedback,
  onSubmit,
}: {
  word: import('../types').Word
  direction: 'en-to-vi' | 'vi-to-en'
  userInput: string
  setUserInput: (v: string) => void
  feedback: 'correct' | 'wrong' | null
  onSubmit: () => void
}) {
  const textToSpeak = direction === 'en-to-vi' ? word.english : firstMeaning(word.vietnamese)
  const lang = direction === 'en-to-vi' ? 'en-US' : 'vi-VN'
  const [spokenOk, setSpokenOk] = useState(true)

  function playAudio() {
    const ok = speak(textToSpeak, lang)
    setSpokenOk(ok)
  }

  useEffect(() => {
    playAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textToSpeak])

  return (
    <div className="space-y-3 mt-4">
      <button onClick={playAudio} className="text-4xl">
        🔊
      </button>
      {!spokenOk && <p className="text-xs text-slate-500">Không có giọng đọc tiếng Việt — {textToSpeak}</p>}
      <input
        autoFocus
        className="input text-center text-lg"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        disabled={!!feedback}
        placeholder="Gõ lại từ vừa nghe (English)..."
      />
      <button
        className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
        onClick={onSubmit}
        disabled={!!feedback || !userInput.trim()}
      >
        Kiểm tra
      </button>
      {feedback === 'wrong' && <p className="text-sm text-red-600">Đáp án đúng: {word.english}</p>}
    </div>
  )
}
