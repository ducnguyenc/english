import { MASTERED_DAY, type ItemProgress, type LeitnerDay } from '../types'

export const MAX_HARD_LEVEL = 3 // 3 mức độ khó: sai 1 lần -> mức 1, 2 lần -> mức 2, 3 lần trở lên -> mức 3

/** Mức độ khó hiện tại (0 = không khó, 1-3 = mức khó). Trả lời đúng sẽ đưa về 0 (xem applyAnswer*). */
export function hardLevel(p: ItemProgress): number {
  return Math.min(p.wrongCount, MAX_HARD_LEVEL)
}

export function isHard(p: ItemProgress): boolean {
  return hardLevel(p) >= 1
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
  // Trả lời đúng -> bỏ khỏi mục "Từ khó" (reset mức độ khó về 0).
  const nextDay: LeitnerDay = p.day >= 5 ? MASTERED_DAY : ((p.day + 1) as LeitnerDay)
  return { ...p, day: nextDay, wrongCount: 0, correctStreak: p.correctStreak + 1, lastReviewedAt: now, history }
}

/** Áp dụng khi ôn lại trong kho "Đã thuộc" (day === MASTERED_DAY). Sai -> rớt về Day 5. */
export function applyAnswerMastered(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  const history = [...p.history, { at: now, correct }].slice(-50)
  // Trả lời đúng -> bỏ khỏi mục "Từ khó" (reset mức độ khó về 0).
  if (correct) return { ...p, wrongCount: 0, lastReviewedAt: now, history }
  return { ...p, day: 5, correctStreak: 0, wrongCount: p.wrongCount + 1, lastReviewedAt: now, history }
}

export function applyAnswerAny(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  return p.day === MASTERED_DAY ? applyAnswerMastered(p, correct, now) : applyAnswer(p, correct, now)
}

/**
 * Chỉ cập nhật mức độ khó (wrongCount) + lịch sử — KHÔNG đổi Day/tầng.
 * Dùng cho chế độ Luyện tập (không chuyển tầng) nhưng vẫn muốn sai vẫn tính vào "Từ khó".
 */
export function applyHardnessOnly(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  const history = [...p.history, { at: now, correct }].slice(-50)
  return { ...p, wrongCount: correct ? 0 : p.wrongCount + 1, lastReviewedAt: now, history }
}

/**
 * Giống applyAnswer/applyAnswerMastered nhưng KHÔNG đụng vào wrongCount (không tính vào "Từ khó").
 * Dùng cho câu hỏi đáp án IPA — sai chính tả IPA không nên bị coi là "từ khó".
 */
export function applyAnswerIgnoreHardness(p: ItemProgress, correct: boolean, now: number): ItemProgress {
  const history = [...p.history, { at: now, correct }].slice(-50)
  if (p.day === MASTERED_DAY) {
    if (correct) return { ...p, lastReviewedAt: now, history }
    return { ...p, day: 5, correctStreak: 0, lastReviewedAt: now, history }
  }
  if (!correct) return { ...p, correctStreak: 0, lastReviewedAt: now, history }
  const nextDay: LeitnerDay = p.day >= 5 ? MASTERED_DAY : ((p.day + 1) as LeitnerDay)
  return { ...p, day: nextDay, correctStreak: p.correctStreak + 1, lastReviewedAt: now, history }
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
