export type WordType = 'noun' | 'verb' | 'adj' | 'adv' | 'phrase'

/** Nguồn gốc từ (root/etymology). */
export interface WordRoot {
  origin?: string
  root_word?: string
  original_meaning?: string
  type?: string
  note?: string
}

/** 1 thành viên trong gia đình từ (word family) phái sinh từ cùng gốc. */
export interface WordFamilyEntry {
  part_of_speech?: string
  word: string
  phonetic?: string
  meaning_vi?: string
  /** Cấu tạo từ, khi được nhét kèm ngay trong word_family thay vì để riêng ở word_formation. */
  structure?: string
}

/** Cấu tạo từ: gốc + tiền/hậu tố. */
export interface WordFormationEntry {
  word: string
  structure: string
}

/** 1 điểm dễ nhầm lẫn (trọng âm, vùng miền, phát âm giống nhau...). Chi tiết linh hoạt theo từng loại nhầm lẫn. */
export interface CommonConfusion {
  title: string
  details?: Record<string, string>[]
  examples?: string[]
  note?: string
}

/** 1 câu ví dụ minh hoạ cho 1 dạng/nghĩa cụ thể của từ. */
export interface EtymologyExampleSentence {
  form: string
  sentence_en: string
  sentence_vi: string
}

/** Phân tích từ nguyên & gia đình từ — dữ liệu mở rộng, tuỳ chọn cho 1 từ. */
export interface WordEtymology {
  root?: WordRoot
  word_family?: WordFamilyEntry[]
  word_formation?: WordFormationEntry[]
  common_confusions?: CommonConfusion[]
  example_sentences?: EtymologyExampleSentence[]
  additional_notes?: string[]
}

/** Nội dung tĩnh (do bạn tự thêm ở trang Admin). Không chứa "day" — day là tiến độ, không phải nội dung. */
export interface Word {
  id: string
  kind: 'word'
  english: string
  ipa: string
  /** Có thể chứa nhiều nghĩa phân tách bằng ";" — ví dụ "biết ơn; cảm kích" */
  vietnamese: string
  type?: WordType
  example: string
  exampleVi?: string
  /** emoji "🙏" | URL ảnh | data URI base64 */
  image?: string
  note?: string
  collocations?: string[]
  /** chỉ để nhóm/lọc, không quyết định tầng ôn */
  topic?: string
  /** Phân tích từ nguyên & gia đình từ (tuỳ chọn) — dán JSON ở trang Admin. */
  etymology?: WordEtymology
}

export interface Pattern {
  id: string
  kind: 'pattern'
  formula: string
  meaningVi: string
  examples: { en: string; vi: string }[]
  image?: string
  note?: string
  topic?: string
}

export type ContentItem = Word | Pattern

/** Kho nội dung: mỗi ngày chỉ còn dùng để nhóm mẫu ban đầu trong seed, KHÔNG dùng để quyết định tầng ôn. */
export interface ContentBundle {
  items: ContentItem[]
}

/** Tầng Leitner hiện tại của 1 item. 1..5 = đang ôn ở tầng đó, 6 = Đã thuộc. */
export const MASTERED_DAY = 6
export type LeitnerDay = 1 | 2 | 3 | 4 | 5 | 6

export interface ItemProgress {
  itemId: string
  day: LeitnerDay
  correctStreak: number
  wrongCount: number
  lastReviewedAt: number | null
  history: { at: number; correct: boolean }[]
}

export interface ProgressState {
  items: Record<string, ItemProgress>
  streak: number
  lastStudyDate: string | null // "YYYY-MM-DD"
}

export type QuizMode = 'mcq' | 'fill' | 'listen'
export type QuizDirection = 'en-to-vi' | 'vi-to-en'
