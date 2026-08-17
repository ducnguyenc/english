import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  deleteItem,
  exportContentJson,
  fileToResizedDataUrl,
  getVisibleItems,
  importContentJson,
  resetCustomContent,
  subscribeContent,
  upsertItem,
} from '../lib/content'
import { speak } from '../lib/speech'
import { loadProgress, subscribeProgress } from '../lib/progress'
import WordImage from '../components/WordImage'
import SpeakButton from '../components/SpeakButton'
import DayPicker from '../components/DayPicker'
import { openWordDetail } from '../lib/wordDetail'
import type { ContentItem, Word, Pattern, WordType } from '../types'

type Kind = 'word' | 'pattern'

function emptyWord(): Word {
  return {
    id: '',
    kind: 'word',
    english: '',
    ipa: '',
    vietnamese: '',
    type: 'noun',
    example: '',
    exampleVi: '',
    image: '',
    note: '',
    topic: '',
  }
}

function emptyPattern(): Pattern {
  return {
    id: '',
    kind: 'pattern',
    formula: '',
    meaningVi: '',
    examples: [{ en: '', vi: '' }],
    image: '',
    note: '',
    topic: '',
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const SAMPLE_IMPORT: ContentItem[] = [
  {
    id: 'w-sample-example',
    kind: 'word',
    english: 'example',
    ipa: '/ɪɡˈzæmpəl/',
    vietnamese: 'ví dụ; mẫu',
    type: 'noun',
    example: 'This is just an example.',
    exampleVi: 'Đây chỉ là một ví dụ.',
    image: '📝',
    note: 'for example = ví dụ như',
    collocations: ['for example', 'set an example'],
    topic: 'General',
  },
  {
    id: 'p-sample-pattern',
    kind: 'pattern',
    formula: 'S + have/has + been + V-ing + for/since + time',
    meaningVi: 'diễn tả hành động đang diễn ra liên tục từ 1 điểm mốc trong quá khứ',
    examples: [
      { en: "I've been learning English for 3 months.", vi: 'Tôi đã học tiếng Anh được 3 tháng.' },
      { en: 'She has been waiting since 8 AM.', vi: 'Cô ấy đã chờ từ 8 giờ sáng.' },
    ],
    image: '⏱️',
    note: 'Present Perfect Continuous',
    topic: 'Grammar',
  },
]

export default function Admin() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const off1 = subscribeContent(() => setTick((t) => t + 1))
    const off2 = subscribeProgress(() => setTick((t) => t + 1))
    return () => {
      off1()
      off2()
    }
  }, [])
  const [searchParams, setSearchParams] = useSearchParams()

  const items = getVisibleItems()
  const progress = loadProgress()

  const [kind, setKind] = useState<Kind>('word')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [wordForm, setWordForm] = useState<Word>(emptyWord())
  const [patternForm, setPatternForm] = useState<Pattern>(emptyPattern())
  const [filterTopic, setFilterTopic] = useState<string>('')
  const [importText, setImportText] = useState('')
  const [etymologyText, setEtymologyText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const topics = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => i.topic && set.add(i.topic))
    return [...set].sort()
  }, [items])

  const filtered = filterTopic ? items.filter((i) => i.topic === filterTopic) : items

  function flash(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }

  function markSaved() {
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function resetForm() {
    setEditingId(null)
    setWordForm(emptyWord())
    setPatternForm(emptyPattern())
    setEtymologyText('')
    setJustSaved(false)
  }

  function startEdit(item: ContentItem) {
    setEditingId(item.id)
    setKind(item.kind)
    if (item.kind === 'word') {
      setWordForm(item)
      setEtymologyText(item.etymology ? JSON.stringify(item.etymology, null, 2) : '')
    } else {
      setPatternForm(item)
    }
    setJustSaved(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyEtymology() {
    if (!etymologyText.trim()) {
      setWordForm((f) => ({ ...f, etymology: undefined }))
      flash('Đã xoá từ nguyên.')
      return
    }
    try {
      const parsed = JSON.parse(etymologyText)
      // Cho phép dán cả JSON đầy đủ (có kèm "word") — chỉ lấy các trường từ nguyên.
      const { word: _ignored, ...etymology } = parsed
      setWordForm((f) => ({ ...f, etymology }))
      flash('Đã áp dụng từ nguyên.')
    } catch (err) {
      flash('JSON từ nguyên không hợp lệ: ' + (err as Error).message)
    }
  }

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    const item = items.find((i) => i.id === editId)
    if (item) startEdit(item)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('edit')
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchParams])

  function saveWord() {
    if (!wordForm.english.trim() || !wordForm.vietnamese.trim()) {
      flash('Cần điền English và Tiếng Việt.')
      return
    }
    // Từ nguyên luôn được đồng bộ theo đúng nội dung ô JSON hiện tại — thay thế hoàn toàn,
    // không cần bấm "Áp dụng từ nguyên" riêng, và không giữ lại dữ liệu cũ nếu JSON đã đổi.
    let etymology = wordForm.etymology
    if (etymologyText.trim()) {
      try {
        const parsed = JSON.parse(etymologyText)
        const { word: _ignored, ...rest } = parsed
        etymology = rest
      } catch (err) {
        flash('JSON từ nguyên không hợp lệ: ' + (err as Error).message)
        return
      }
    } else {
      etymology = undefined
    }
    const id = editingId ?? `w-${slugify(wordForm.english)}-${Date.now().toString(36)}`
    upsertItem({ ...wordForm, etymology, id, kind: 'word' })
    flash(editingId ? 'Đã cập nhật từ.' : 'Đã thêm từ mới.')
    markSaved()
    setEditingId(id)
    setWordForm((f) => ({ ...f, id, etymology }))
  }

  function savePattern() {
    if (!patternForm.formula.trim() || !patternForm.meaningVi.trim()) {
      flash('Cần điền công thức và nghĩa tiếng Việt.')
      return
    }
    const id = editingId ?? `p-${slugify(patternForm.formula)}-${Date.now().toString(36)}`
    upsertItem({ ...patternForm, id, kind: 'pattern' })
    flash(editingId ? 'Đã cập nhật cấu trúc.' : 'Đã thêm cấu trúc mới.')
    markSaved()
    setEditingId(id)
    setPatternForm((f) => ({ ...f, id }))
  }

  function handleDelete(id: string) {
    if (!confirm('Xoá mục này? Tiến độ ôn tập của từ này cũng sẽ không còn ý nghĩa.')) return
    deleteItem(id)
    if (editingId === id) resetForm()
    flash('Đã xoá.')
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const allSelected = filtered.length > 0 && filtered.every((i) => prev.has(i.id))
      if (allSelected) return new Set()
      return new Set(filtered.map((i) => i.id))
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Xoá ${selectedIds.size} mục đã chọn? Tiến độ ôn tập của các từ này cũng sẽ không còn ý nghĩa.`)) return
    for (const id of selectedIds) {
      deleteItem(id)
      if (editingId === id) resetForm()
    }
    flash(`Đã xoá ${selectedIds.size} mục.`)
    setSelectedIds(new Set())
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      setWordForm((f) => ({ ...f, image: dataUrl }))
    } catch {
      flash('Không đọc được ảnh, thử ảnh khác.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleExport() {
    downloadJson(exportContentJson(), 'english5-content.json')
  }

  function handleDownloadSample() {
    downloadJson(JSON.stringify(SAMPLE_IMPORT, null, 2), 'english5-import-mau.json')
  }

  async function handleImport() {
    try {
      const { count } = await importContentJson(importText)
      flash(`Đã nhập ${count} mục.`)
      setImportText('')
    } catch (err) {
      flash('JSON không hợp lệ: ' + (err as Error).message)
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const { count } = await importContentJson(reader.result as string)
        flash(`Đã nhập ${count} mục từ file.`)
      } catch (err) {
        flash('File JSON không hợp lệ: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Trang Admin — Thêm nội dung</h1>

      {message && (
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {/* FORM */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-sm ${kind === 'word' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
            onClick={() => {
              setKind('word')
              resetForm()
            }}
          >
            Từ vựng
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-sm ${kind === 'pattern' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
            onClick={() => {
              setKind('pattern')
              resetForm()
            }}
          >
            Cấu trúc câu
          </button>
          {editingId && (
            <span className="text-xs text-orange-600 ml-2">Đang sửa: {editingId}</span>
          )}
        </div>

        {kind === 'word' ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="English *">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={wordForm.english}
                  onChange={(e) => setWordForm((f) => ({ ...f, english: e.target.value }))}
                  placeholder="grateful"
                />
                <button className="btn-icon" onClick={() => speak(wordForm.english, 'en-US')} type="button">
                  🔊
                </button>
              </div>
            </Field>
            <Field label="IPA">
              <input
                className="input"
                value={wordForm.ipa}
                onChange={(e) => setWordForm((f) => ({ ...f, ipa: e.target.value }))}
                placeholder="/ˈɡreɪtfəl/"
              />
            </Field>
            <Field label="Tiếng Việt * (nhiều nghĩa: dùng ;)">
              <input
                className="input"
                value={wordForm.vietnamese}
                onChange={(e) => setWordForm((f) => ({ ...f, vietnamese: e.target.value }))}
                placeholder="biết ơn; cảm kích"
              />
            </Field>
            <Field label="Loại từ">
              <select
                className="input"
                value={wordForm.type}
                onChange={(e) => setWordForm((f) => ({ ...f, type: e.target.value as WordType }))}
              >
                {(['noun', 'verb', 'adj', 'adv', 'phrase'] as WordType[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Example (English)">
              <input
                className="input"
                value={wordForm.example}
                onChange={(e) => setWordForm((f) => ({ ...f, example: e.target.value }))}
                placeholder="I'm grateful for your help."
              />
            </Field>
            <Field label="Example (Tiếng Việt)">
              <input
                className="input"
                value={wordForm.exampleVi ?? ''}
                onChange={(e) => setWordForm((f) => ({ ...f, exampleVi: e.target.value }))}
                placeholder="Tôi biết ơn sự giúp đỡ của bạn."
              />
            </Field>
            <Field label="Note (mẹo/lỗi hay gặp)">
              <input
                className="input"
                value={wordForm.note ?? ''}
                onChange={(e) => setWordForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="grateful TO người, FOR việc"
              />
            </Field>
            <Field label="Topic (chủ đề, tuỳ chọn)">
              <input
                className="input"
                value={wordForm.topic ?? ''}
                onChange={(e) => setWordForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="Food, Travel..."
              />
            </Field>
            <Field label="Ảnh (emoji / URL / upload)" className="sm:col-span-2">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  className="input flex-1 min-w-[160px]"
                  value={wordForm.image ?? ''}
                  onChange={(e) => setWordForm((f) => ({ ...f, image: e.target.value }))}
                  placeholder="🙏 hoặc https://..."
                />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
                {wordForm.image && <WordImage image={wordForm.image} className="w-12 h-12" />}
              </div>
            </Field>
            <Field label="Từ nguyên & gia đình từ (dán JSON, tuỳ chọn)" className="sm:col-span-2">
              <div className="space-y-2">
                <textarea
                  className="input h-40 font-mono text-xs"
                  value={etymologyText}
                  onChange={(e) => setEtymologyText(e.target.value)}
                  placeholder='{"root": {...}, "word_family": [...], ...}'
                />
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={applyEtymology}>
                    Áp dụng từ nguyên
                  </button>
                  {wordForm.etymology && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Đã có từ nguyên</span>
                  )}
                </div>
              </div>
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Công thức *">
              <input
                className="input"
                value={patternForm.formula}
                onChange={(e) => setPatternForm((f) => ({ ...f, formula: e.target.value }))}
                placeholder="S + would like + to V"
              />
            </Field>
            <Field label="Nghĩa tiếng Việt *">
              <input
                className="input"
                value={patternForm.meaningVi}
                onChange={(e) => setPatternForm((f) => ({ ...f, meaningVi: e.target.value }))}
                placeholder="muốn làm gì (lịch sự)"
              />
            </Field>
            <div className="space-y-2">
              <label className="label">Ví dụ</label>
              {patternForm.examples.map((ex, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="input"
                    value={ex.en}
                    placeholder="English example"
                    onChange={(e) => {
                      const examples = [...patternForm.examples]
                      examples[idx] = { ...examples[idx], en: e.target.value }
                      setPatternForm((f) => ({ ...f, examples }))
                    }}
                  />
                  <input
                    className="input"
                    value={ex.vi}
                    placeholder="Nghĩa tiếng Việt"
                    onChange={(e) => {
                      const examples = [...patternForm.examples]
                      examples[idx] = { ...examples[idx], vi: e.target.value }
                      setPatternForm((f) => ({ ...f, examples }))
                    }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() =>
                      setPatternForm((f) => ({ ...f, examples: f.examples.filter((_, i) => i !== idx) }))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-indigo-600"
                onClick={() => setPatternForm((f) => ({ ...f, examples: [...f.examples, { en: '', vi: '' }] }))}
              >
                + Thêm ví dụ
              </button>
            </div>
            <Field label="Note">
              <input
                className="input"
                value={patternForm.note ?? ''}
                onChange={(e) => setPatternForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Field>
            <Field label="Topic">
              <input
                className="input"
                value={patternForm.topic ?? ''}
                onChange={(e) => setPatternForm((f) => ({ ...f, topic: e.target.value }))}
              />
            </Field>
            <Field label="Ảnh (emoji / URL)">
              <input
                className="input"
                value={patternForm.image ?? ''}
                onChange={(e) => setPatternForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="☕"
              />
            </Field>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700 transition"
            onClick={kind === 'word' ? saveWord : savePattern}
          >
            {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
          {editingId && (
            <button className="rounded-lg border px-4 py-2 text-sm" onClick={resetForm}>
              Hủy
            </button>
          )}
          {justSaved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
              ✅ Đã lưu
            </span>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Danh sách ({filtered.length})</h2>
          {topics.length > 0 && (
            <select className="input w-auto" value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
              <option value="">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))}
              onChange={toggleSelectAllFiltered}
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
        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 bg-white dark:bg-slate-900 cursor-pointer"
              onClick={() => openWordDetail(item)}
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={selectedIds.has(item.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelected(item.id)}
              />
              <WordImage image={item.image} className="w-10 h-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1">
                  {item.kind === 'word' ? item.english : item.formula}
                  {item.kind === 'word' && <SpeakButton text={item.english} className="w-6 h-6 text-base shrink-0" />}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {item.kind === 'word' ? item.vietnamese : item.meaningVi}
                </div>
              </div>
              <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                <DayPicker itemId={item.id} currentDay={progress.items[item.id]?.day ?? 1} />
                <button className="btn-icon" onClick={() => startEdit(item)}>
                  ✏️
                </button>
                <button className="btn-icon" onClick={() => handleDelete(item.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-slate-500 text-sm">Chưa có mục nào.</div>}
        </div>
      </div>

      {/* EXPORT / IMPORT */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
        <h2 className="font-semibold">Export / Import</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Import sẽ <strong>thêm mới</strong> các mục trong file, đè lại theo <code>id</code> nếu trùng —
          không xoá nội dung đang có. Chấp nhận cả mảng <code>ContentItem[]</code>, hoặc JSON phân tích
          từ nguyên dạng <code>{'{ word, root, word_family, ..., flashcards: [...] }'}</code> — tự lấy{' '}
          <code>flashcards</code> để import và gắn từ nguyên vào đúng từ gốc.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={handleExport}>
            ⬇ Export JSON
          </button>
          <label className="rounded-lg border px-3 py-1.5 text-sm cursor-pointer">
            ⬆ Import từ file (thêm mới)
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
          </label>
          <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={handleDownloadSample}>
            📄 Tải file mẫu
          </button>
          <button
            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm"
            onClick={() => {
              if (confirm('Xoá toàn bộ nội dung tự thêm và quay về dữ liệu mẫu?')) {
                resetCustomContent()
                flash('Đã xoá nội dung tự thêm.')
              }
            }}
          >
            Xoá toàn bộ nội dung tự thêm
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Dán JSON để import trực tiếp (thêm mới)</summary>
          <textarea
            className="input mt-2 h-32 font-mono text-xs"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='[{"id": "...", "kind": "word", ...}]'
          />
          <button className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm mt-2" onClick={handleImport}>
            Import
          </button>
        </details>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
