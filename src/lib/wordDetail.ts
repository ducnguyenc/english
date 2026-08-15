import type { ContentItem } from '../types'

type Listener = () => void
const listeners = new Set<Listener>()
let current: ContentItem | null = null

export function openWordDetail(item: ContentItem) {
  current = item
  listeners.forEach((fn) => fn())
}

export function closeWordDetail() {
  current = null
  listeners.forEach((fn) => fn())
}

export function getWordDetail(): ContentItem | null {
  return current
}

export function subscribeWordDetail(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
