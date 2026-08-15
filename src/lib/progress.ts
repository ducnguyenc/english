import { api } from './api'
import type { ItemProgress, LeitnerDay, ProgressState } from '../types'
import { makeInitialProgress } from './leitner'

type Listener = () => void
const listeners = new Set<Listener>()

let cache: ProgressState = { items: {}, streak: 0, lastStudyDate: null }
let loaded = false
let error: string | null = null

export function getProgressError(): string | null {
  return error
}

export function isProgressLoaded(): boolean {
  return loaded
}

function notify() {
  listeners.forEach((fn) => fn())
}

async function refresh() {
  try {
    cache = await api.get<ProgressState>('/api/progress')
    error = null
  } catch (err) {
    error = (err as Error).message
    console.error('Không tải được tiến độ từ server:', err)
  } finally {
    loaded = true
    notify()
  }
}

refresh()

function todayStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function loadProgress(): ProgressState {
  return cache
}

export function subscribeProgress(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Đảm bảo mọi itemId đều có progress (từ mới thêm ở Admin -> Day 1). */
export function ensureItemsTracked(itemIds: string[]): ProgressState {
  const missing = itemIds.filter((id) => !cache.items[id])
  if (missing.length > 0) {
    for (const id of missing) cache.items[id] = makeInitialProgress(id)
    notify()
    api.post('/api/progress/ensure', { ids: missing }).catch((err) => console.error('ensure lỗi:', err))
  }
  return cache
}

export function getItemProgress(id: string): ItemProgress | undefined {
  return cache.items[id]
}

export function updateItemProgress(id: string, updater: (p: ItemProgress) => ItemProgress) {
  const current = cache.items[id] ?? makeInitialProgress(id)
  const next = updater(current)
  cache = { ...cache, items: { ...cache.items, [id]: next } }
  notify() // optimistic update ngay để UI phản hồi nhanh
  api.post(`/api/progress/${id}`, next).catch((err) => console.error('Lưu progress lỗi:', err))
}

/** Chuyển 1 từ/cấu trúc sang bất kỳ ngày (tầng) nào, không qua quiz. */
export function setItemDay(id: string, day: LeitnerDay) {
  updateItemProgress(id, (p) => ({ ...p, day }))
}

/** Cập nhật streak: gọi mỗi khi hoàn thành 1 lượt ôn. */
export async function bumpStreak(now: Date) {
  const today = todayStr(now)
  if (cache.lastStudyDate === today) return
  try {
    const result = await api.post<{ ok: true; streak: number }>('/api/progress/streak/bump', { today })
    cache = { ...cache, streak: result.streak, lastStudyDate: today }
    notify()
  } catch (err) {
    console.error('bumpStreak lỗi:', err)
  }
}

export async function resetAllProgress() {
  await api.post('/api/progress/reset')
  await refresh()
}
