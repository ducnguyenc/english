import { MASTERED_DAY, type ItemProgress, type LeitnerDay } from '../types'

export const HARD_THRESHOLD = 3 // wrongCount >= 3 -> gắn nhãn "Từ khó 🔥"

export function isHard(p: ItemProgress): boolean {
  return p.wrongCount >= HARD_THRESHOLD
}

export function makeInitialProgress(itemId: string, startDay: LeitnerDay = 1): ItemProgress {
  return {
    itemId,
    day: startDay,
    correctStreak: 0,
    wrongCount: 0,
    lastReviewedAt: null,
    history: [],
  }
}

/** Áp dụng luật Leitner khi item đang ở tầng 1..5 (vòng ôn hàng ngày). */
export function applyAnswer(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  const history = [...p.history, { at: now, correct }].slice(-50)
  if (!correct) {
    return { ...p, wrongCount: p.wrongCount + 1, correctStreak: 0, lastReviewedAt: now, history }
  }
  const nextDay: LeitnerDay = p.day >= 5 ? MASTERED_DAY : ((p.day + 1) as LeitnerDay)
  return { ...p, day: nextDay, correctStreak: p.correctStreak + 1, lastReviewedAt: now, history }
}

/** Áp dụng khi ôn lại trong kho "Đã thuộc" (day === MASTERED_DAY). Sai -> rớt về Day 5. */
export function applyAnswerMastered(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  const history = [...p.history, { at: now, correct }].slice(-50)
  if (correct) return { ...p, lastReviewedAt: now, history }
  return { ...p, day: 5, correctStreak: 0, wrongCount: p.wrongCount + 1, lastReviewedAt: now, history }
}

export function applyAnswerAny(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  return p.day === MASTERED_DAY ? applyAnswerMastered(p, correct, now) : applyAnswer(p, correct, now)
}

/**
 * Sắp thứ tự hàng đợi ôn cho 1 tầng: từ khó 🔥 trước, rồi lastReviewedAt cũ nhất,
 * rồi từ chưa ôn lần nào (null coi là cũ nhất).
 */
export function buildQueue(progresses: ItemProgress[]): ItemProgress[] {
  return [...progresses].sort((a, b) => {
    const hardA = isHard(a) ? 1 : 0
    const hardB = isHard(b) ? 1 : 0
    if (hardA !== hardB) return hardB - hardA
    const ta = a.lastReviewedAt ?? -Infinity
    const tb = b.lastReviewedAt ?? -Infinity
    return ta - tb
  })
}
