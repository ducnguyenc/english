import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVisibleItems } from '../lib/content'
import { ensureItemsTracked, loadProgress, updateItemProgress, bumpStreak } from '../lib/progress'
import { applyAnswer, applyAnswerMastered, applyHardnessOnly, buildQueue } from '../lib/leitner'
import { checkFillAnswer, checkIpaAnswer, firstMeaning, isWord, shuffle } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import { openWordDetail } from '../lib/wordDetail'
import type { ContentItem, LeitnerDay } from '../types'
import { MASTERED_DAY } from '../types'

// Mỗi kiểu Đầu vào là 1 dạng câu hỏi riêng biệt, với đáp án (Đầu ra) cố định đi kèm — không gộp
// chung nhiều kiểu vào cùng 1 câu:
//   showEn  (hiện từ tiếng Anh) -> điền tiếng Việt (dịch Anh -> Việt)
//   speakEn (nói tiếng Anh)     -> điền tiếng Anh  (nghe & viết lại chính tả)
//   showVi  (hiện từ tiếng Việt)-> điền tiếng Anh  (dịch Việt -> Anh)
type InputMode = 'showEn' | 'speakEn' | 'showVi'
const OUTPUT_LANG_OF: Record<InputMode, 'en' | 'vi'> = { showEn: 'vi', speakEn: 'en', showVi: 'en' }

interface QueueEntry {
  item: ContentItem
  questionMode: InputMode
  // Riêng câu hỏi showEn: nếu true, đáp án là phiên âm IPA thay vì nghĩa tiếng Việt.
  answerIpa: boolean
}

type ReviewMode = 'practice' | 'test'
type ReviewOrder = 'sequential' | 'shuffled'

export default function Review() {
  const params = useParams<{ day: string }>()
  const day = (params.day === 'mastered' ? MASTERED_DAY : Number(params.day)) as LeitnerDay
  const [mode, setMode] = useState<ReviewMode>('practice')
  const [order, setOrder] = useState<ReviewOrder>('sequential')

  // Đầu vào: đề bài hiện những gì — hiện chữ tiếng Anh / đọc tiếng Anh / hiện chữ tiếng Việt.
  // 3 lựa chọn độc lập, kết hợp tự do (ít nhất 1 phải được chọn). Mỗi lựa chọn được bật là 1 dạng
  // câu hỏi riêng, đáp án (Đầu ra) tự suy ra theo OUTPUT_LANG_OF — không tự chọn Đầu ra được nữa.
  const [inputShowEnglish, setInputShowEnglish] = useState(true)
  const [inputSpeakEnglish, setInputSpeakEnglish] = useState(true)
  const [inputShowVietnamese, setInputShowVietnamese] = useState(false)
  // Riêng cho dạng showEn: nếu bật, đáp án là phiên âm IPA thay vì nghĩa tiếng Việt — checkbox này
  // tự chọn được (không phải suy ra từ Đầu vào như 2 cái Tiếng Anh/Tiếng Việt).
  const [outputIpa, setOutputIpa] = useState(false)

  const enabledModes: InputMode[] = [
    ...(inputShowEnglish ? (['showEn'] as const) : []),
    ...(inputSpeakEnglish ? (['speakEn'] as const) : []),
    ...(inputShowVietnamese ? (['showVi'] as const) : []),
  ]
  // Đầu ra hiện tự động theo Đầu vào đang bật — chỉ để xem, không bấm được (đã disabled ở UI).
  const outputEnglish = enabledModes.some((m) => OUTPUT_LANG_OF[m] === 'en')
  // showEn bình thường -> tiếng Việt, nhưng nếu bật IPA thì thay bằng IPA (không tính là "tiếng Việt" nữa).
  const outputVietnamese = enabledModes.some((m) => OUTPUT_LANG_OF[m] === 'vi') && !outputIpa

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
  // Khoá ngắn ngay sau khi nộp đáp án: chặn Enter/click thứ 2 bấm quá nhanh (do gõ nhanh, giữ phím)
  // vô tình chuyển câu ngay khi vừa thấy feedback — không phải auto-advance theo thời gian.
  const [canAdvance, setCanAdvance] = useState(false)

  function pickQuestionMode(): InputMode {
    return enabledModes[Math.floor(Math.random() * enabledModes.length)]
  }

  useEffect(() => {
    if (queue !== null) return
    const progresses = tierItems.map((i) => progress.items[i.id]).filter(Boolean) as NonNullable<
      typeof progress.items[string]
    >[]
    const ordered = buildQueue(progresses)
    let entries: QueueEntry[] = ordered.map((p) => {
      const item = tierItems.find((i) => i.id === p.itemId)!
      const questionMode = pickQuestionMode()
      return { item, questionMode, answerIpa: questionMode === 'showEn' && outputIpa }
    })
    if (order === 'shuffled') entries = shuffle(entries)
    setQueue(entries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierItems.length, day, order, inputShowEnglish, inputSpeakEnglish, inputShowVietnamese, outputIpa])

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

  function toggleOutputIpa() {
    setOutputIpa((v) => !v)
    resetRound()
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
    const now = Date.now()
    // Sai ở bất kỳ đâu (Luyện tập hay Kiểm tra) đều tăng mức độ khó. Chỉ chế độ Kiểm tra mới đổi
    // Day/tầng; Luyện tập chỉ cập nhật wrongCount, không đụng vào tầng đang học.
    updateItemProgress(current!.item.id, (p) =>
      mode === 'test'
        ? day === MASTERED_DAY
          ? applyAnswerMastered(p, correct, now)
          : applyAnswer(p, correct, now)
        : applyHardnessOnly(p, correct, now),
    )
    setResults((r) => (correct ? { ...r, up: r.up + 1 } : { ...r, stay: r.stay + 1 }))
    setFeedback(correct ? 'correct' : 'wrong')
    // Không tự động chuyển câu — chờ người dùng bấm "Tiếp theo" hoặc Enter lần nữa (xem advance()).
    // Khoá 400ms đầu tiên để 1 cú Enter/click nộp bài + gõ/bấm quá nhanh ngay sau đó không vô tình
    // bị tính là "chuyển câu" khi người dùng chưa kịp nhìn thấy đáp án đúng/sai.
    setCanAdvance(false)
    setTimeout(() => setCanAdvance(true), 400)
  }

  /** Chuyển sang câu tiếp theo — gọi khi người dùng chủ động bấm/Enter sau khi đã thấy feedback đúng/sai. */
  function advance() {
    if (!canAdvance) return
    setFeedback(null)
    setUserInput('')
    // Chỉ 1 vòng: đúng hay sai đều ra khỏi hàng đợi của lượt này, không lặp lại lần 2 (khác từ khó
    // vẫn được ưu tiên xếp đầu ở LƯỢT SAU, xem buildQueue).
    setQueue((q) => (q ? q.filter((_, i) => i !== idx) : q))
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
      // showEn -> đáp án tiếng Việt (hoặc IPA nếu bật); speakEn (nghe & viết chính tả) & showVi -> đáp án tiếng Anh.
      if (current!.answerIpa) {
        correct = checkIpaAnswer(userInput, word.ipa)
      } else {
        correct =
          current!.questionMode === 'showEn'
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
        <div
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm opacity-70"
          title="Tự động suy ra theo Đầu vào đang chọn — không chỉnh được trực tiếp"
        >
          <span className="text-slate-400">Đầu ra (tự động theo Đầu vào):</span>
          <label className="flex items-center gap-1 select-none cursor-not-allowed">
            <input type="checkbox" checked={outputEnglish} disabled readOnly />
            Tiếng Anh
          </label>
          <label className="flex items-center gap-1 select-none cursor-not-allowed">
            <input type="checkbox" checked={outputVietnamese} disabled readOnly />
            Tiếng Việt
          </label>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm"
          title="Áp dụng cho dạng câu hỏi 'Hiện từ tiếng Anh' — thay đáp án tiếng Việt bằng phiên âm IPA"
        >
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={outputIpa} onChange={toggleOutputIpa} />
            IPA (thay cho tiếng Việt ở dạng "Hiện từ tiếng Anh")
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
        <QuestionBody current={current} />

        {word && (
          <div className="space-y-3 mt-4">
            <input
              autoFocus
              className="input text-center text-lg"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
              readOnly={!!feedback}
              placeholder={
                current.answerIpa
                  ? 'Gõ phiên âm IPA...'
                  : current.questionMode === 'showEn'
                    ? 'Gõ nghĩa tiếng Việt...'
                    : 'Type in English...'
              }
            />
            <button
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-50"
              onClick={handleFillSubmit}
              disabled={feedback ? !canAdvance : !userInput.trim()}
            >
              {feedback ? 'Tiếp theo →' : 'Kiểm tra'}
            </button>
            {feedback === 'wrong' && (
              <p className="text-sm text-red-600">
                Đáp án đúng:{' '}
                {current.answerIpa ? word.ipa : current.questionMode === 'showEn' ? word.vietnamese : word.english}
              </p>
            )}
          </div>
        )}

        {feedback === 'correct' && <p className="text-emerald-600 font-medium">✅ Chính xác!</p>}
      </div>
    </div>
  )
}

function QuestionBody({ current }: { current: QueueEntry }) {
  const word = isWord(current.item) ? current.item : null
  const questionMode = current.questionMode

  // speakEn: nghe & viết lại chính tả. showEn: hiện chữ tiếng Anh nhưng cũng tự đọc luôn.
  // Cả 2 đều tự phát âm khi câu hỏi đổi.
  useEffect(() => {
    if (word && (questionMode === 'speakEn' || questionMode === 'showEn')) speak(word.english, 'en-US')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  if (word) {
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
    // showEn — nếu đáp án là IPA thì ẩn IPA khỏi phần hiển thị (tránh lộ đáp án).
    return (
      <div className="space-y-2">
        <WordImage image={word.image} className="w-16 h-16 mx-auto" />
        <div className="text-2xl font-bold flex items-center justify-center gap-2">
          {word.english}
          <button onClick={() => speak(word.english, 'en-US')} className="text-lg">
            🔊
          </button>
        </div>
        {!current.answerIpa && <div className="text-slate-500 dark:text-slate-400">{word.ipa}</div>}
        {typeTag}
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
