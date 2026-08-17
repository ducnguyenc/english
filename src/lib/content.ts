import { api } from './api'
import type { ContentItem } from '../types'

type Listener = () => void
const listeners = new Set<Listener>()

let cache: ContentItem[] = []
let loaded = false
let error: string | null = null

export function getContentError(): string | null {
  return error
}

function notify() {
  listeners.forEach((fn) => fn())
}

async function refresh() {
  try {
    cache = await api.get<ContentItem[]>('/api/items')
    error = null
  } catch (err) {
    error = (err as Error).message
    console.error('Không tải được nội dung từ server:', err)
  } finally {
    loaded = true
    notify()
  }
}

// Tải lần đầu ngay khi module được import.
refresh()

export function isContentLoaded(): boolean {
  return loaded
}

/** Đồng bộ — trả về cache hiện tại. Rỗng cho tới khi lần fetch đầu hoàn tất (subscribe để re-render khi có data). */
export function getAllItems(): ContentItem[] {
  return cache
}

export function getVisibleItems(): ContentItem[] {
  return cache
}

export function getItem(id: string): ContentItem | undefined {
  return cache.find((i) => i.id === id)
}

export function upsertItem(item: ContentItem) {
  const idx = cache.findIndex((i) => i.id === item.id)
  if (idx >= 0) cache = [...cache.slice(0, idx), item, ...cache.slice(idx + 1)]
  else cache = [...cache, item]
  notify() // cập nhật UI ngay (optimistic), rồi lưu DB ở background
  api.post('/api/items', item).catch((err) => console.error('Lưu item lỗi:', err))
}

export function deleteItem(id: string) {
  cache = cache.filter((i) => i.id !== id)
  notify()
  api.del(`/api/items/${id}`).catch((err) => console.error('Xoá item lỗi:', err))
}

export function exportContentJson(): string {
  return JSON.stringify(cache, null, 2)
}

function normalizeWord(s: string): string {
  return s.trim().toLowerCase()
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu (combining diacritical marks sau khi NFD)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Xử lý 1 "entry theo từ" dạng { word, root, word_family, ..., flashcards: ContentItem[] } —
 * tự lấy mảng "flashcards" ra để import, đồng thời gắn các trường từ nguyên (root, word_family,
 * word_formation, common_confusions, additional_notes) vào đúng flashcard "word" trùng với "word" gốc.
 *
 * Lưu ý: etymology chỉ gắn được vào item kind:'word' (Pattern không có field etymology — xem types.ts).
 * Nếu "flashcards" không chứa item "word" nào khớp (vd. "word" là một cụm ngữ pháp và flashcard đi
 * kèm là 1 Pattern, như "stative verbs"), thay vì âm thầm bỏ mất dữ liệu, tự tạo thêm 1 Word tối giản
 * để làm chỗ chứa etymology, để không mất dữ liệu bạn đã bỏ công soạn.
 */
function itemsFromEntry(entry: Record<string, unknown>): ContentItem[] {
  const { flashcards, word, ...etymology } = entry as { flashcards: ContentItem[]; word: string; [k: string]: unknown }
  const hasEtymology = Object.values(etymology).some(
    (v) => (Array.isArray(v) && v.length > 0) || (v && typeof v === 'object' && Object.keys(v as object).length > 0),
  )

  if (!hasEtymology) return flashcards

  const matchIdx = flashcards.findIndex(
    (item) => item.kind === 'word' && normalizeWord(item.english) === normalizeWord(word),
  )
  if (matchIdx >= 0) {
    return flashcards.map((item, i) => (i === matchIdx ? { ...item, etymology } : item))
  }

  // Không có Word nào khớp — tự tạo 1 Word tối giản mang etymology, giữ nguyên các flashcard khác.
  const family = (etymology.word_family as { word: string; phonetic?: string; meaning_vi?: string }[] | undefined)?.find(
    (f) => normalizeWord(f.word) === normalizeWord(word),
  )
  const root = etymology.root as { original_meaning?: string } | undefined
  const firstExample = (etymology.example_sentences as { sentence_en?: string; sentence_vi?: string }[] | undefined)?.[0]
  const synthWord: ContentItem = {
    id: `w-${slugify(word)}`,
    kind: 'word',
    english: word,
    ipa: family?.phonetic ?? '',
    vietnamese: family?.meaning_vi ?? root?.original_meaning ?? '',
    type: undefined,
    example: firstExample?.sentence_en ?? '',
    exampleVi: firstExample?.sentence_vi,
    topic: flashcards[0]?.topic,
    etymology,
  }
  return [synthWord, ...flashcards]
}

/**
 * Chấp nhận 3 dạng:
 * 1) Mảng ContentItem[] thuần (mỗi phần tử đã có id + kind).
 * 2) Object phân tích từ nguyên dạng { word, root, word_family, ..., flashcards: ContentItem[] }.
 * 3) Mảng nhiều entry dạng (2) — vd. xuất từ nhiều từ vựng cùng lúc — sẽ được gộp (flatten)
 *    thành 1 mảng ContentItem[] duy nhất trước khi import.
 */
export async function importContentJson(json: string): Promise<{ count: number }> {
  const parsed = JSON.parse(json)
  let items: ContentItem[]

  if (Array.isArray(parsed)) {
    const isFlatContentItems = parsed.every((el) => el && typeof el === 'object' && 'id' in el && 'kind' in el)
    if (isFlatContentItems) {
      items = parsed
    } else {
      const isEntryArray = parsed.every((el) => el && typeof el === 'object' && Array.isArray(el.flashcards))
      if (!isEntryArray) {
        throw new Error(
          'JSON phải là mảng ContentItem[] (mỗi phần tử có id + kind), hoặc mảng các entry có trường "flashcards"',
        )
      }
      items = parsed.flatMap((entry) => itemsFromEntry(entry))
    }
  } else if (parsed && Array.isArray(parsed.flashcards)) {
    items = itemsFromEntry(parsed)
  } else {
    throw new Error('JSON phải là một mảng ContentItem[], hoặc object có trường "flashcards"')
  }

  const result = await api.post<{ ok: true; count: number }>('/api/items/import', items)
  await refresh()
  return { count: result.count }
}

export async function resetCustomContent() {
  await api.post('/api/items/reset')
  await refresh()
}

export function subscribeContent(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Nén ảnh upload về base64, resize để request/DB không phình to. */
export function fileToResizedDataUrl(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Không đọc được ảnh'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas không khả dụng'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
