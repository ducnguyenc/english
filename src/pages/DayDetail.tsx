import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteItem, getVisibleItems, subscribeContent } from '../lib/content'
import { loadProgress, subscribeProgress } from '../lib/progress'
import { isPattern, isPhrase, isSentence, isWord } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from '../components/WordImage'
import DayPicker from '../components/DayPicker'
import { openWordDetail } from '../lib/wordDetail'
import type { ContentItem, LeitnerDay, Pattern, Phrase, Sentence, Word } from '../types'

type Tab = 'words' | 'patterns' | 'sentences' | 'phrases' | 'flashcard'

/** Chữ chính hiển thị cho 1 item bất kỳ (English/formula/phrase/chunk) — dùng ở Flashcard nơi 4 kind trộn lẫn. */
function itemHeadline(item: ContentItem): string {
  if (isWord(item)) return item.english
  if (isPattern(item)) return item.formula
  if (isSentence(item)) return item.phrase
  return item.chunk
}

export default function DayDetail() {
  const { day: dayParam } = useParams<{ day: string }>()
  const day = Number(dayParam) as LeitnerDay
  const [tab, setTab] = useState<Tab>('words')

  const [, setTick] = useState(0)
  useEffect(() => {
    const off1 = subscribeContent(() => setTick((t) => t + 1))
    const off2 = subscribeProgress(() => setTick((t) => t + 1))
    return () => {
      off1()
      off2()
    }
  }, [])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function handleDelete(id: string) {
    if (!confirm('Xoá mục này khỏi kho từ vựng?')) return
    deleteItem(id)
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(list: { id: string }[]) {
    setSelectedIds((prev) => {
      const allSelected = list.length > 0 && list.every((i) => prev.has(i.id))
      if (allSelected) return new Set()
      return new Set(list.map((i) => i.id))
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Xoá ${selectedIds.size} mục đã chọn khỏi kho từ vựng?`)) return
    for (const id of selectedIds) deleteItem(id)
    setSelectedIds(new Set())
  }

  const items = getVisibleItems()
  const progress = loadProgress()

  const tierItems = useMemo(
    () => items.filter((i) => (progress.items[i.id]?.day ?? 1) === day),
    [items, day], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const words = tierItems.filter(isWord) as Word[]
  const patterns = tierItems.filter(isPattern) as Pattern[]
  const sentences = tierItems.filter(isSentence) as Sentence[]
  const phrases = tierItems.filter(isPhrase) as Phrase[]

  const [flashIdx, setFlashIdx] = useState(0)
  const flashItems = [...words, ...patterns, ...sentences, ...phrases]
  const flashCurrent = flashItems[flashIdx % Math.max(flashItems.length, 1)]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Day {day}</h1>
        <Link to={`/review/${day}`} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm">
          🎯 Ôn tập (Quiz)
        </Link>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 flex-wrap">
        {(['words', 'patterns', 'sentences', 'phrases', 'flashcard'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 transition ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            {t === 'words'
              ? `Từ vựng (${words.length})`
              : t === 'patterns'
                ? `Cấu trúc (${patterns.length})`
                : t === 'sentences'
                  ? `Câu (${sentences.length})`
                  : t === 'phrases'
                    ? `Cụm từ (${phrases.length})`
                    : 'Flashcard'}
          </button>
        ))}
      </div>

      {tab === 'words' && (
        <div className="space-y-3">
          {words.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={words.every((w) => selectedIds.has(w.id))}
                  onChange={() => toggleSelectAll(words)}
                />
                Chọn tất cả ({selectedIds.size} đã chọn)
              </label>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Xoá {selectedIds.size} mục đã chọn
                </button>
              )}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {words.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-white dark:bg-slate-900 cursor-pointer"
                onClick={() => openWordDetail(w)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="shrink-0"
                    checked={selectedIds.has(w.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelected(w.id)}
                  />
                  <WordImage image={w.image} className="w-12 h-12" />
                  <div className="flex-1">
                    <div className="font-bold text-lg flex items-center gap-2">
                      {w.english}
                      <button onClick={(e) => { e.stopPropagation(); speak(w.english, 'en-US') }}>🔊</button>
                    </div>
                    <div className="text-sm text-slate-500">{w.ipa}</div>
                  </div>
                  <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                    <DayPicker itemId={w.id} currentDay={progress.items[w.id]?.day ?? 1} />
                    <Link to={`/admin?edit=${w.id}`} className="btn-icon" title="Sửa">
                      ✏️
                    </Link>
                    <button type="button" className="btn-icon" title="Xoá" onClick={() => handleDelete(w.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="font-medium">{w.vietnamese}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 italic">"{w.example}"</div>
                {w.exampleVi && <div className="text-sm text-slate-400">{w.exampleVi}</div>}
                {w.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {w.note}</div>}
              </div>
            ))}
            {words.length === 0 && <div className="text-slate-500 text-sm col-span-2">Không có từ vựng ở tầng này.</div>}
          </div>
        </div>
      )}

      {tab === 'patterns' && (
        <div className="space-y-3">
          {patterns.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={patterns.every((p) => selectedIds.has(p.id))}
                  onChange={() => toggleSelectAll(patterns)}
                />
                Chọn tất cả ({selectedIds.size} đã chọn)
              </label>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Xoá {selectedIds.size} mục đã chọn
                </button>
              )}
            </div>
          )}
          {patterns.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-white dark:bg-slate-900 cursor-pointer"
              onClick={() => openWordDetail(p)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={selectedIds.has(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelected(p.id)}
                />
                <WordImage image={p.image} className="w-10 h-10" />
                <div className="font-bold text-lg flex-1">{p.formula}</div>
                <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                  <DayPicker itemId={p.id} currentDay={progress.items[p.id]?.day ?? 1} />
                  <Link to={`/admin?edit=${p.id}`} className="btn-icon" title="Sửa">
                    ✏️
                  </Link>
                  <button type="button" className="btn-icon" title="Xoá" onClick={() => handleDelete(p.id)}>
                    🗑️
                  </button>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400">{p.meaningVi}</div>
              <ul className="space-y-1 text-sm">
                {p.examples.map((ex, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button onClick={() => speak(ex.en, 'en-US')}>🔊</button>
                    <span className="italic">"{ex.en}"</span>
                    <span className="text-slate-400">— {ex.vi}</span>
                  </li>
                ))}
              </ul>
              {p.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {p.note}</div>}
            </div>
          ))}
          {patterns.length === 0 && <div className="text-slate-500 text-sm">Không có cấu trúc câu ở tầng này.</div>}
        </div>
      )}

      {tab === 'sentences' && (
        <div className="space-y-3">
          {sentences.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sentences.every((s) => selectedIds.has(s.id))}
                  onChange={() => toggleSelectAll(sentences)}
                />
                Chọn tất cả ({selectedIds.size} đã chọn)
              </label>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Xoá {selectedIds.size} mục đã chọn
                </button>
              )}
            </div>
          )}
          {sentences.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-white dark:bg-slate-900 cursor-pointer"
              onClick={() => openWordDetail(s)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={selectedIds.has(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelected(s.id)}
                />
                <WordImage image={s.image} className="w-10 h-10" />
                <div className="flex-1">
                  <div className="font-bold text-lg flex items-center gap-2">
                    {s.phrase}
                    <button onClick={(e) => { e.stopPropagation(); speak(s.phrase, 'en-US') }}>🔊</button>
                  </div>
                  {s.ipa && <div className="text-sm text-slate-500">{s.ipa}</div>}
                </div>
                <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                  <DayPicker itemId={s.id} currentDay={progress.items[s.id]?.day ?? 1} />
                  <Link to={`/admin?edit=${s.id}`} className="btn-icon" title="Sửa">
                    ✏️
                  </Link>
                  <button type="button" className="btn-icon" title="Xoá" onClick={() => handleDelete(s.id)}>
                    🗑️
                  </button>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400">{s.meaningVn}</div>
              {s.subType && <div className="text-xs text-slate-400">{s.subType}</div>}
              {s.linkedInfo?.reusablePattern && (
                <div className="text-xs text-indigo-500">🔁 {s.linkedInfo.reusablePattern}</div>
              )}
              {s.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {s.note}</div>}
            </div>
          ))}
          {sentences.length === 0 && <div className="text-slate-500 text-sm">Không có câu nào ở tầng này.</div>}
        </div>
      )}

      {tab === 'phrases' && (
        <div className="space-y-3">
          {phrases.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={phrases.every((p) => selectedIds.has(p.id))}
                  onChange={() => toggleSelectAll(phrases)}
                />
                Chọn tất cả ({selectedIds.size} đã chọn)
              </label>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm"
                  onClick={handleBulkDelete}
                >
                  🗑️ Xoá {selectedIds.size} mục đã chọn
                </button>
              )}
            </div>
          )}
          {phrases.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-white dark:bg-slate-900 cursor-pointer"
              onClick={() => openWordDetail(p)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={selectedIds.has(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelected(p.id)}
                />
                <WordImage image={p.image} className="w-10 h-10" />
                <div className="flex-1">
                  <div className="font-bold text-lg flex items-center gap-2">
                    {p.chunk}
                    <button onClick={(e) => { e.stopPropagation(); speak(p.chunk, 'en-US') }}>🔊</button>
                  </div>
                  {p.ipa && <div className="text-sm text-slate-500">{p.ipa}</div>}
                </div>
                <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                  <DayPicker itemId={p.id} currentDay={progress.items[p.id]?.day ?? 1} />
                  <Link to={`/admin?edit=${p.id}`} className="btn-icon" title="Sửa">
                    ✏️
                  </Link>
                  <button type="button" className="btn-icon" title="Xoá" onClick={() => handleDelete(p.id)}>
                    🗑️
                  </button>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400">{p.meaningVn}</div>
              {p.slotType && <div className="text-xs text-slate-400">{p.slotType}</div>}
              {p.canPluginInto && <div className="text-xs text-indigo-500">🔁 {p.canPluginInto}</div>}
              {p.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {p.note}</div>}
            </div>
          ))}
          {phrases.length === 0 && <div className="text-slate-500 text-sm">Không có cụm từ nào ở tầng này.</div>}
        </div>
      )}

      {tab === 'flashcard' && (
        <div className="max-w-md mx-auto space-y-4">
          {flashItems.length === 0 ? (
            <div className="text-slate-500 text-sm text-center">Không có mục nào ở tầng này.</div>
          ) : (
            <>
              <div
                onClick={() => openWordDetail(flashCurrent)}
                className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 p-8 min-h-[220px] flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 select-none"
              >
                <WordImage image={flashCurrent.image} className="w-16 h-16 mb-3" />
                <div className="text-2xl font-bold flex items-center gap-2">
                  {itemHeadline(flashCurrent)}
                  {isWord(flashCurrent) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        speak(flashCurrent.english, 'en-US')
                      }}
                    >
                      🔊
                    </button>
                  )}
                </div>
                {isWord(flashCurrent) && <div className="text-slate-500 mt-1">{flashCurrent.ipa}</div>}
                <div className="text-xs text-slate-400 mt-4">(Bấm để xem chi tiết)</div>
              </div>
              <div className="flex justify-between items-center">
                <button
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  onClick={() => setFlashIdx((i) => (i - 1 + flashItems.length) % flashItems.length)}
                >
                  ← Trước
                </button>
                <span className="text-sm text-slate-400">
                  {(flashIdx % flashItems.length) + 1}/{flashItems.length}
                </span>
                <button
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  onClick={() => setFlashIdx((i) => (i + 1) % flashItems.length)}
                >
                  Tiếp →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
