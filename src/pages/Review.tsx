import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVisibleItems } from '../lib/content'
import { ensureItemsTracked, loadProgress, updateItemProgress, bumpStreak } from '../lib/progress'
import { applyAnswer, applyAnswerMastered, buildQueue } from '../lib/leitner'
import { checkFillAnswer, firstMeaning, isWord, shuffle } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import { openWordDetail } from '../lib/wordDetail'
import type { ContentItem, LeitnerDay, QuizDirection } from '../types'
import { MASTERED_DAY } from '../types'

interface QueueEntry {
  item: ContentItem
  direction: QuizDirection
  repeated?: boolean
}

type ReviewMode = 'practice' | 'test'
type ReviewOrder = 'sequential' | 'shuffled'

export default function Review() {
  const params = useParams<{ day: string }>()
  const day = (params.day === 'mastered' ? MASTERED_DAY : Number(params.day)) as LeitnerDay
  const [mode, setMode] = useState<ReviewMode>('practice')
  const [order, setOrder] = useState<ReviewOrder>('sequential')

  // Đầu ra: yêu cầu điền tiếng Anh và/hoặc tiếng Việt (ít nhất 1 phải được chọn).
  const [outputEnglish, setOutputEnglish] = useState(true)
  const [outputVietnamese, setOutputVietnamese] = useState(true)
  // Đầu vào: đề bài hiện những gì — hiện chữ tiếng Anh / đọc tiếng Anh / hiện chữ tiếng Việt.
  // 3 lựa chọn độc lập, kết hợp tự do (ít nhất 1 phải được chọn).
  const [inputShowEnglish, setInputShowEnglish] = useState(true)
  const [inputSpeakEnglish, setInputSpeakEnglish] = useState(true)
  const [inputShowVietnamese, setInputShowVietnamese] = useState(false)

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

  function pickOutputDirection(): QuizDirection {
    // direction 'en-to-vi' = đề bài tiếng Anh, điền tiếng Việt. 'vi-to-en' = đề bài tiếng Việt, điền tiếng Anh.
    if (outputEnglish && outputVietnamese) return Math.random() < 0.5 ? 'vi-to-en' : 'en-to-vi'
    if (outputEnglish) return 'vi-to-en'
    return 'en-to-vi'
  }

  useEffect(() => {
    if (queue !== null) return
    const progresses = tierItems.map((i) => progress.items[i.id]).filter(Boolean) as NonNullable<
      typeof progress.items[string]
    >[]
    const ordered = buildQueue(progresses)
    let entries: QueueEntry[] = ordered.map((p) => {
      const item = tierItems.find((i) => i.id === p.itemId)!
      return { item, direction: pickOutputDirection() }
    })
    if (order === 'shuffled') entries = shuffle(entries)
    setQueue(entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierItems.length, day, order, outputEnglish, outputVietnamese])

  function resetRound() {
    setQueue(null)
    setIdx(0)
    setDone(false)
    setResults({ up: 0, stay: 0 })
  }

  function changeOrder(next: ReviewOrder) {
    if (next === order) return
    setOrder(next)
    resetRound()
  }

  function toggleOutputEnglish() {
    if (outputEnglish && !outputVietnamese) return // phải giữ lại ít nhất 1 lựa chọn
    setOutputEnglish((v) => !v)
    resetRound()
  }

  function toggleOutputVietnamese() {
    if (outputVietnamese && !outputEnglish) return
    setOutputVietnamese((v) => !v)
    resetRound()
  }

  function toggleInput(which: 'showEn' | 'speakEn' | 'showVi') {
    const checkedCount = Number(inputShowEnglish) + Number(inputSpeakEnglish) + Number(inputShowVietnamese)
    let isCurrentlyChecked = inputShowVietnamese
    if (which === 'showEn') isCurrentlyChecked = inputShowEnglish
    else if (which === 'speakEn') isCurrentlyChecked = inputSpeakEnglish
    if (isCurrentlyChecked && checkedCount <= 1) return // phải giữ lại ít nhất 1 lựa chọn
    if (which === 'showEn') setInputShowEnglish((v) => !v)
    else if (which === 'speakEn') setInputSpeakEnglish((v) => !v)
    else setInputShowVietnamese((v) => !v)
  }

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
          {mode === 'test'
            ? `${results.up} từ lên tầng tiếp theo · ${results.stay} từ ở lại`
            : `${results.up} câu đúng · ${results.stay} câu sai`}
        </p>
        <div className="flex gap-2 justify-center">
          <Link to="/" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm">
            Về trang chủ
          </Link>
          <button className="rounded-lg border px-4 py-2 text-sm" onClick={resetRound}>
            Ôn lại tầng này
          </button>
        </div>
      </div>
    )
  }

  if (!current) return null

  const word = isWord(current.item) ? current.item : null

  function submit(correct: boolean) {
    if (mode === 'test') {
      const now = Date.now()
      updateItemProgress(current!.item.id, (p) =>
        day === MASTERED_DAY ? applyAnswerMastered(p, correct, now) : applyAnswer(p, correct, now),
      )
    }
    setResults((r) => (correct ? { ...r, up: r.up + 1 } : { ...r, stay: r.stay + 1 }))
    setFeedback(correct ? 'correct' : 'wrong')
    // Không tự động chuyển câu — chờ người dùng bấm "Tiếp theo" hoặc Enter lần nữa (xem advance()).
  }

  /** Chuyển sang câu tiếp theo — gọi khi người dùng chủ động bấm/Enter sau khi đã thấy feedback đúng/sai. */
  function advance() {
    const wasCorrect = feedback === 'correct'
    setFeedback(null)
    setUserInput('')
    setQueue((q) => {
      if (!q) return q
      const rest = q.filter((_, i) => i !== idx)
      if (wasCorrect) return rest // đúng -> item đã lên tầng, ra khỏi hàng đợi của lượt này
      // sai -> đưa xuống cuối, gặp lại tối đa 1 lần trong lượt này
      const already = current!.repeated
      if (already) return rest
      return [...rest, { ...current!, repeated: true }]
    })
    // idx giữ nguyên: phần tử tại idx vừa bị xoá khỏi queue nên vị trí idx
    // giờ tự động trỏ vào câu tiếp theo (mảng đã dồn lại một chỗ).
  }

  function handleFillSubmit() {
    if (feedback) {
      advance()
      return
    }
    let correct: boolean
    if (word) {
      correct =
        current!.direction === 'en-to-vi'
          ? checkFillAnswer(userInput, word.vietnamese)
          : checkFillAnswer(userInput, word.english)
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
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 p-1 w-fit text-sm">
          <button
            type="button"
            className={`px-3 py-1 rounded-md transition ${
              mode === 'practice' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
            onClick={() => setMode('practice')}
            title="Chỉ để ôn lại, không chuyển từ sang ngày/tầng khác"
          >
            📖 Luyện tập
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-md transition ${
              mode === 'test' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
            onClick={() => setMode('test')}
            title="Trả lời đúng/sai sẽ chuyển từ sang tầng tiếp theo hoặc giữ lại"
          >
            🎯 Kiểm tra
          </button>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 p-1 w-fit text-sm">
          <button
            type="button"
            className={`px-3 py-1 rounded-md transition ${
              order === 'sequential' ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
            onClick={() => changeOrder('sequential')}
            title="Ôn theo thứ tự ưu tiên (từ khó / lâu chưa ôn trước)"
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
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm">
          <span className="text-slate-400">Đầu ra (yêu cầu điền):</span>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={outputEnglish} onChange={toggleOutputEnglish} />
            Tiếng Anh
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={outputVietnamese} onChange={toggleOutputVietnamese} />
            Tiếng Việt
          </label>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 text-center space-y-4 relative">
        <button
          type="button"
          className="absolute top-3 right-3 btn-icon"
          title="Xem chi tiết"
          onClick={() => openWordDetail(current.item)}
        >
          ℹ️
        </button>
        <QuestionBody
          current={current}
          inputShowEnglish={inputShowEnglish}
          inputSpeakEnglish={inputSpeakEnglish}
          inputShowVietnamese={inputShowVietnamese}
        />

        {word && (
          <div className="space-y-3 mt-4">
            <input
              autoFocus
              className="input text-center text-lg"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
              readOnly={!!feedback}
              placeholder={current.direction === 'en-to-vi' ? 'Gõ nghĩa tiếng Việt...' : 'Type in English...'}
            />
            <button
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              onClick={handleFillSubmit}
              disabled={!feedback && !userInput.trim()}
            >
              {feedback ? 'Tiếp theo →' : 'Kiểm tra'}
            </button>
            {feedback === 'wrong' && (
              <p className="text-sm text-red-600">
                Đáp án đúng: {current.direction === 'en-to-vi' ? word.vietnamese : word.english}
              </p>
            )}
          </div>
        )}

        {feedback === 'correct' && <p className="text-emerald-600 font-medium">✅ Chính xác!</p>}
      </div>
    </div>
  )
}

function QuestionBody({
  current,
  inputShowEnglish,
  inputSpeakEnglish,
  inputShowVietnamese,
}: {
  current: QueueEntry
  inputShowEnglish: boolean
  inputSpeakEnglish: boolean
  inputShowVietnamese: boolean
}) {
  const word = isWord(current.item) ? current.item : null
  // Không phụ thuộc chiều hỏi (direction) — đề bài hiện những gì hoàn toàn theo 3 lựa chọn Đầu vào,
  // độc lập với Đầu ra (yêu cầu điền tiếng Anh/Việt).
  const audioOnly = !inputShowEnglish && !inputShowVietnamese // guard đảm bảo lúc này inputSpeakEnglish = true

  useEffect(() => {
    if (word && inputSpeakEnglish) speak(word.english, 'en-US')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, inputSpeakEnglish])

  if (word) {
    return (
      <div className="space-y-2">
        <WordImage image={word.image} className="w-16 h-16 mx-auto" />
        {audioOnly && (
          <>
            <button onClick={() => speak(word.english, 'en-US')} className="text-4xl">
              🔊
            </button>
            <div className="text-xs text-slate-400">(Nghe & đoán nghĩa)</div>
          </>
        )}
        {inputShowEnglish && (
          <>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {word.english}
              <button onClick={() => speak(word.english, 'en-US')} className="text-lg">
                🔊
              </button>
            </div>
            <div className="text-slate-500 dark:text-slate-400">{word.ipa}</div>
          </>
        )}
        {inputShowVietnamese && (
          <div className={inputShowEnglish ? 'text-base text-slate-500 dark:text-slate-400' : 'text-2xl font-bold'}>
            {firstMeaning(word.vietnamese)}
          </div>
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
