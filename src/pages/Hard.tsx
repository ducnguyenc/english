import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVisibleItems, subscribeContent } from '../lib/content'
import { loadProgress, subscribeProgress, updateItemProgress } from '../lib/progress'
import { applyHardnessOnly, hardLevel, isHard } from '../lib/leitner'
import { checkFillAnswer, firstMeaning, isWord, shuffle } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import { openWordDetail } from '../lib/wordDetail'
import type { Word } from '../types'

// Cùng 3 dạng câu hỏi như trang Luyện tập bình thường (xem Review.tsx):
//   showEn  (hiện từ tiếng Anh) -> điền tiếng Việt
//   speakEn (nói tiếng Anh)     -> điền tiếng Anh (nghe & viết lại chính tả)
//   showVi  (hiện từ tiếng Việt)-> điền tiếng Anh
type InputMode = 'showEn' | 'speakEn' | 'showVi'

interface QueueEntry {
  word: Word
  questionMode: InputMode
}

type HardOrder = 'sequential' | 'shuffled'

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

  const [order, setOrder] = useState<HardOrder>('sequential')
  const [inputShowEnglish, setInputShowEnglish] = useState(true)
  const [inputSpeakEnglish, setInputSpeakEnglish] = useState(true)
  const [inputShowVietnamese, setInputShowVietnamese] = useState(false)

  const enabledModes: InputMode[] = [
    ...(inputShowEnglish ? (['showEn'] as const) : []),
    ...(inputSpeakEnglish ? (['speakEn'] as const) : []),
    ...(inputShowVietnamese ? (['showVi'] as const) : []),
  ]

  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [canAdvance, setCanAdvance] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedback) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [feedback])

  function pickQuestionMode(): InputMode {
    return enabledModes[Math.floor(Math.random() * enabledModes.length)]
  }

  useEffect(() => {
    if (queue !== null) return
    let entries: QueueEntry[] = hardWords.map((word) => ({ word, questionMode: pickQuestionMode() }))
    if (order === 'shuffled') entries = shuffle(entries)
    setQueue(entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardWords.length, order, inputShowEnglish, inputSpeakEnglish, inputShowVietnamese])

  function resetRound() {
    setQueue(null)
    setIdx(0)
  }

  function changeOrder(next: HardOrder) {
    if (next === order) return
    setOrder(next)
    resetRound()
  }

  function toggleInput(which: InputMode) {
    const checkedCount = Number(inputShowEnglish) + Number(inputSpeakEnglish) + Number(inputShowVietnamese)
    let isCurrentlyChecked = inputShowVietnamese
    if (which === 'showEn') isCurrentlyChecked = inputShowEnglish
    else if (which === 'speakEn') isCurrentlyChecked = inputSpeakEnglish
    if (isCurrentlyChecked && checkedCount <= 1) return // phải giữ lại ít nhất 1 lựa chọn
    if (which === 'showEn') setInputShowEnglish((v) => !v)
    else if (which === 'speakEn') setInputSpeakEnglish((v) => !v)
    else setInputShowVietnamese((v) => !v)
    resetRound()
  }

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

  const current = queue?.[idx % Math.max(queue.length, 1)]

  if (!current) return null

  const word = current.word

  function submit(correct: boolean) {
    // Chỉ cập nhật mức độ khó — đúng thì bỏ khỏi mục Từ khó nhưng KHÔNG đổi Day/tầng đang học.
    updateItemProgress(word.id, (p) => applyHardnessOnly(p, correct, Date.now()))
    setFeedback(correct ? 'correct' : 'wrong')
    setCanAdvance(false)
    setTimeout(() => setCanAdvance(true), 400)
  }

  /** Chuyển sang từ khó tiếp theo — gọi khi người dùng chủ động bấm/Enter sau khi đã thấy feedback. */
  function advance() {
    if (!canAdvance) return
    setFeedback(null)
    setUserInput('')
    setIdx((i) => i + 1)
  }

  function handleSubmit() {
    if (feedback) {
      advance()
      return
    }
    const correct =
      current!.questionMode === 'showEn'
        ? checkFillAnswer(userInput, word.vietnamese)
        : checkFillAnswer(userInput, word.english)
    submit(correct)
  }

  /** Bỏ thẳng từ này ra khỏi mục Từ khó (không cần trả lời đúng) — reset mức độ khó về 0. */
  function handleDismiss() {
    if (!confirm(`Bỏ "${word.english}" ra khỏi mục Từ khó?`)) return
    updateItemProgress(word.id, (p) => ({ ...p, wrongCount: 0 }))
    setFeedback(null)
    setUserInput('')
  }

  const progressPct = queue ? Math.round(((idx % Math.max(queue.length, 1)) / queue.length) * 100) : 0

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">🔥 Luyện tập trung từ khó ({hardWords.length})</h1>
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 p-1 w-fit text-sm">
          <button
            type="button"
            className={`px-3 py-1 rounded-md transition ${
              order === 'sequential' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
            onClick={() => changeOrder('sequential')}
            title="Ôn theo thứ tự"
          >
            🔢 Thứ tự
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-md transition ${
              order === 'shuffled' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
            onClick={() => changeOrder('shuffled')}
            title="Xáo trộn ngẫu nhiên thứ tự câu hỏi"
          >
            🔀 Xáo trộn
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm flex-wrap">
          <span className="text-slate-400">Đầu vào (đề bài hiện):</span>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={inputShowEnglish} onChange={() => toggleInput('showEn')} />
            Hiện từ tiếng Anh
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={inputSpeakEnglish} onChange={() => toggleInput('speakEn')} />
            Nói tiếng Anh
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={inputShowVietnamese} onChange={() => toggleInput('showVi')} />
            Hiện từ tiếng Việt
          </label>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-orange-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="relative rounded-2xl border border-orange-200 dark:border-orange-800 p-6 bg-orange-50/50 dark:bg-orange-950/30 text-center space-y-4">
        <button
          type="button"
          className="absolute top-3 right-3 btn-icon"
          title="Xem chi tiết"
          onClick={() => openWordDetail(word)}
        >
          ℹ️
        </button>
        <button
          type="button"
          className="absolute top-3 left-3 btn-icon"
          title="Bỏ khỏi mục Từ khó"
          onClick={handleDismiss}
        >
          ✅
        </button>
        <QuestionBody word={word} questionMode={current.questionMode} />
        {progress.items[word.id] && (
          <div className="text-xs text-orange-600 dark:text-orange-400">
            Mức độ khó: {'🔥'.repeat(hardLevel(progress.items[word.id]))} ({hardLevel(progress.items[word.id])}/3)
          </div>
        )}
        <input
          autoFocus
          className="input text-center text-lg"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          readOnly={!!feedback}
          placeholder={current.questionMode === 'showEn' ? 'Gõ nghĩa tiếng Việt...' : 'Type in English...'}
        />
        <button
          className="rounded-lg bg-orange-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          onClick={handleSubmit}
          disabled={feedback ? !canAdvance : !userInput.trim()}
        >
          {feedback ? 'Tiếp theo →' : 'Kiểm tra'}
        </button>
        {feedback === 'correct' && <p className="text-emerald-600 font-medium">✅ Chính xác!</p>}
        {feedback === 'wrong' && (
          <p className="text-red-600">
            Đáp án: {current.questionMode === 'showEn' ? word.vietnamese : word.english}
          </p>
        )}
        {feedback && (
          <div ref={detailRef}>
            <InlineWordDetail word={word} />
          </div>
        )}
      </div>
    </div>
  )
}

function InlineWordDetail({ word }: Readonly<{ word: Word }>) {
  return (
    <div className="text-left border-t border-orange-200 dark:border-orange-800 pt-3 mt-3 space-y-1.5">
      <div className="font-medium">{word.vietnamese}</div>
      {word.ipa && <div className="text-sm text-slate-500 dark:text-slate-400">{word.ipa}</div>}
      {word.type && <div className="text-xs text-slate-400">Loại từ: {word.type}</div>}
      {word.example && (
        <div className="text-sm text-slate-600 dark:text-slate-300 italic flex items-center gap-2">
          "{word.example}"
          <button type="button" onClick={() => speak(word.example, 'en-US')}>
            🔊
          </button>
        </div>
      )}
      {word.exampleVi && <div className="text-sm text-slate-400">{word.exampleVi}</div>}
      {word.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {word.note}</div>}
      {word.collocations && word.collocations.length > 0 && (
        <div className="text-xs text-slate-500">Collocations: {word.collocations.join(', ')}</div>
      )}
    </div>
  )
}

function QuestionBody({ word, questionMode }: Readonly<{ word: Word; questionMode: InputMode }>) {
  useEffect(() => {
    if (questionMode === 'speakEn' || questionMode === 'showEn') speak(word.english, 'en-US')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, questionMode])

  const typeTag = word.type && <div className="text-xs text-slate-400">Loại từ: {word.type}</div>

  if (questionMode === 'speakEn') {
    return (
      <div className="space-y-2">
        <WordImage image={word.image} className="w-16 h-16 mx-auto" />
        <button onClick={() => speak(word.english, 'en-US')} className="text-4xl">
          🔊
        </button>
        <div className="text-xs text-slate-400">(Nghe & viết lại chính xác từ đã nghe)</div>
        {typeTag}
      </div>
    )
  }
  if (questionMode === 'showVi') {
    return (
      <div className="space-y-2">
        <WordImage image={word.image} className="w-16 h-16 mx-auto" />
        <div className="text-2xl font-bold">{firstMeaning(word.vietnamese)}</div>
        {typeTag}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <WordImage image={word.image} className="w-16 h-16 mx-auto" />
      <div className="text-2xl font-bold flex items-center justify-center gap-2">
        {word.english}
        <button onClick={() => speak(word.english, 'en-US')} className="text-lg">
          🔊
        </button>
      </div>
      <div className="text-slate-500 dark:text-slate-400">{word.ipa}</div>
      {typeTag}
    </div>
  )
}
