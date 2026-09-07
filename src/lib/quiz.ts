import type { ContentItem, LeitnerDay, Pattern, Phrase, QuizDirection, Sentence, Word } from '../types'

export function isWord(item: ContentItem): item is Word {
  return item.kind === 'word'
}

export function isPattern(item: ContentItem): item is Pattern {
  return item.kind === 'pattern'
}

export function isSentence(item: ContentItem): item is Sentence {
  return item.kind === 'sentence'
}

export function isPhrase(item: ContentItem): item is Phrase {
  return item.kind === 'phrase'
}

/** Ngày 1: EN->VI. Ngày 2: VI->EN. Ngày 3-5 & Đã thuộc: random mỗi câu. */
export function pickDirection(day: LeitnerDay, rand: () => number = Math.random): QuizDirection {
  if (day === 1) return 'en-to-vi'
  if (day === 2) return 'vi-to-en'
  return rand() < 0.5 ? 'en-to-vi' : 'vi-to-en'
}

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?"'’;:]/g, '')
    .replace(/\s+/g, ' ')
}

/** Từ có thể có nhiều nghĩa tiếng Việt phân tách bằng ";" — đúng 1 trong các nghĩa là được. */
export function checkFillAnswer(userInput: string, correctRaw: string): boolean {
  const user = normalizeAnswer(userInput)
  const options = correctRaw.split(';').map((s) => normalizeAnswer(s))
  return options.includes(user)
}

/**
 * Chuẩn hoá phiên âm IPA để so sánh — bỏ dấu / bao quanh, dấu trọng âm (ˈ ˌ hoặc ' thường),
 * dấu chấm ngăn âm tiết (.), chỉ so khớp phần ký tự phiên âm.
 */
export function normalizeIpa(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replaceAll('/', '')
    .replace(/[ˈˌ'’.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkIpaAnswer(userInput: string, correctIpa: string): boolean {
  return normalizeIpa(userInput) === normalizeIpa(correctIpa)
}

export function firstMeaning(vietnamese: string): string {
  return vietnamese.split(';')[0].trim()
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Sinh 3 phương án nhiễu (nghĩa của các word khác) cho câu hỏi trắc nghiệm. */
export function buildMcqOptions(
  correct: string,
  pool: string[],
  count = 3,
  rand: () => number = Math.random,
): string[] {
  const distractors = shuffle(pool.filter((p) => p !== correct), rand).slice(0, count)
  return shuffle([correct, ...distractors], rand)
}
