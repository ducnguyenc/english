import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { pool, pingDb } from './db.js'
import { SEED_ITEMS } from './seed.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' })) // ảnh base64 có thể nặng vài trăm KB

const PORT = process.env.PORT || 4000

// ---------- helpers ----------
function parseJsonCol(v) {
  if (v === null || v === undefined) return undefined
  return typeof v === 'string' ? JSON.parse(v) : v
}

/** Ghép row (cột riêng lẻ) lại thành ContentItem */
function rowToItem(row) {
  const base = { id: row.id, kind: row.kind, topic: row.topic ?? undefined }
  const fields =
    row.kind === 'word'
      ? {
        english: row.english,
        ipa: row.ipa,
        vietnamese: row.vietnamese,
        type: row.word_type ?? undefined,
        example: row.example,
        exampleVi: row.example_vi ?? undefined,
        image: row.image ?? undefined,
        note: row.note ?? undefined,
        collocations: parseJsonCol(row.collocations),
        etymology: parseJsonCol(row.etymology),
      }
      : {
        formula: row.formula,
        meaningVi: row.meaning_vi,
        examples: parseJsonCol(row.examples) ?? [],
        image: row.image ?? undefined,
        note: row.note ?? undefined,
      }
  const item = { ...base, ...fields }
  for (const key of Object.keys(item)) if (item[key] === undefined) delete item[key]
  return item
}

/** Tách ContentItem thành các cột SQL tương ứng (word/pattern) */
function itemToColumns(item) {
  const isWord = item.kind === 'word'
  return {
    english: isWord ? (item.english ?? null) : null,
    ipa: isWord ? (item.ipa ?? null) : null,
    vietnamese: isWord ? (item.vietnamese ?? null) : null,
    word_type: isWord ? (item.type ?? null) : null,
    example: isWord ? (item.example ?? null) : null,
    example_vi: isWord ? (item.exampleVi ?? null) : null,
    collocations: isWord ? JSON.stringify(item.collocations ?? []) : null,
    etymology: isWord && item.etymology ? JSON.stringify(item.etymology) : null,
    formula: isWord ? null : (item.formula ?? null),
    meaning_vi: isWord ? null : (item.meaningVi ?? null),
    examples: isWord ? null : JSON.stringify(item.examples ?? []),
    image: item.image ?? null,
    note: item.note ?? null,
  }
}

// SQLite dùng INSERT OR REPLACE thay vì ON DUPLICATE KEY UPDATE
const UPSERT_ITEM_SQL = `
  INSERT OR REPLACE INTO content_items
    (id, kind, topic, english, ipa, vietnamese, word_type, example, example_vi, note,
     collocations, etymology, formula, meaning_vi, examples, image)
  VALUES (@id, @kind, @topic, @english, @ipa, @vietnamese, @word_type, @example, @example_vi, @note,
          @collocations, @etymology, @formula, @meaning_vi, @examples, @image)
`

const upsertItemStmt = pool.prepare(UPSERT_ITEM_SQL)
const insertProgressStmt = pool.prepare(
  'INSERT OR IGNORE INTO item_progress (item_id, day) VALUES (@item_id, 1)'
)

function upsertItem(item) {
  const c = itemToColumns(item)
  upsertItemStmt.run({
    id: item.id,
    kind: item.kind,
    topic: item.topic ?? null,
    english: c.english,
    ipa: c.ipa,
    vietnamese: c.vietnamese,
    word_type: c.word_type,
    example: c.example,
    example_vi: c.example_vi,
    note: c.note,
    collocations: c.collocations,
    etymology: c.etymology,
    formula: c.formula,
    meaning_vi: c.meaning_vi,
    examples: c.examples,
    image: c.image,
  })
  insertProgressStmt.run({ item_id: item.id })
}

function rowToProgress(row) {
  return {
    itemId: row.item_id,
    day: row.day,
    correctStreak: row.correct_streak,
    wrongCount: row.wrong_count,
    lastReviewedAt: row.last_reviewed_at === null ? null : Number(row.last_reviewed_at),
    history: typeof row.history === 'string' ? JSON.parse(row.history) : row.history,
  }
}

function ensureSeeded() {
  const row = pool.prepare('SELECT COUNT(*) AS c FROM content_items').get()
  if (row.c > 0) return
  const insertMany = pool.transaction((items) => {
    for (const item of items) upsertItem(item)
  })
  insertMany(SEED_ITEMS)
  console.log(`Seeded ${SEED_ITEMS.length} mục mẫu vào content_items.`)
}

// ---------- content_items ----------
app.get('/api/items', (_req, res, next) => {
  try {
    const rows = pool.prepare('SELECT * FROM content_items ORDER BY created_at ASC').all()
    res.json(rows.map(rowToItem))
  } catch (err) {
    next(err)
  }
})

app.post('/api/items', (req, res, next) => {
  try {
    const item = req.body
    if (!item?.id || !item?.kind) return res.status(400).json({ error: 'Thiếu id hoặc kind' })
    upsertItem(item)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.delete('/api/items/:id', (req, res, next) => {
  try {
    pool.prepare('DELETE FROM content_items WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Import JSON hàng loạt — bỏ qua item đã tồn tại (trùng id hoặc trùng từ tiếng Anh) */
app.post('/api/items/import', (req, res, next) => {
  const items = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body phải là mảng ContentItem[]' })
  try {
    const existingIds = new Set(pool.prepare('SELECT id FROM content_items').all().map((r) => r.id))
    const existingWords = new Set(
      pool
        .prepare("SELECT english FROM content_items WHERE kind = 'word' AND english IS NOT NULL")
        .all()
        .map((r) => r.english.trim().toLowerCase()),
    )

    let importedCount = 0
    let skippedCount = 0
    const importMany = pool.transaction((list) => {
      for (const item of list) {
        if (!item?.id || !item?.kind) throw new Error(`Item thiếu id hoặc kind: ${JSON.stringify(item)}`)
        const isDuplicateWord = item.kind === 'word' && existingWords.has((item.english ?? '').trim().toLowerCase())
        if (existingIds.has(item.id) || isDuplicateWord) {
          skippedCount++
          continue
        }
        upsertItem(item)
        existingIds.add(item.id)
        if (item.kind === 'word' && item.english) existingWords.add(item.english.trim().toLowerCase())
        importedCount++
      }
    })
    importMany(items)
    res.json({ ok: true, count: importedCount, skipped: skippedCount })
  } catch (err) {
    next(err)
  }
})

/** Xoá hết nội dung, seed lại từ dữ liệu mẫu ban đầu */
app.post('/api/items/reset', (_req, res, next) => {
  try {
    pool.prepare('DELETE FROM content_items').run()
    ensureSeeded()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ---------- item_progress ----------
app.get('/api/progress', (_req, res, next) => {
  try {
    const progressRows = pool.prepare('SELECT * FROM item_progress').all()
    const state = pool.prepare('SELECT * FROM app_state WHERE id = 1').get()
    const items = {}
    for (const row of progressRows) items[row.item_id] = rowToProgress(row)
    res.json({
      items,
      streak: state?.streak ?? 0,
      lastStudyDate: state?.last_study_date ?? null,
    })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/:itemId', (req, res, next) => {
  try {
    const { itemId } = req.params
    const { day, correctStreak, wrongCount, lastReviewedAt, history } = req.body
    pool.prepare(
      `INSERT OR REPLACE INTO item_progress (item_id, day, correct_streak, wrong_count, last_reviewed_at, history)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(itemId, day, correctStreak, wrongCount, lastReviewedAt, JSON.stringify(history ?? []))
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Đảm bảo mọi itemId đều có 1 dòng progress (mặc định Day 1) */
app.post('/api/progress/ensure', (req, res, next) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Body cần { ids: string[] }' })
    const stmt = pool.prepare('INSERT OR IGNORE INTO item_progress (item_id, day) VALUES (?, 1)')
    const insertAll = pool.transaction((list) => {
      for (const id of list) stmt.run(id)
    })
    insertAll(ids)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/streak/bump', (req, res, next) => {
  try {
    const today = req.body?.today // "YYYY-MM-DD"
    if (!today) return res.status(400).json({ error: 'Body cần { today: "YYYY-MM-DD" }' })
    const state = pool.prepare('SELECT * FROM app_state WHERE id = 1').get()
    const lastStudyDate = state?.last_study_date ?? null
    if (lastStudyDate === today) return res.json({ ok: true, streak: state.streak })

    const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10)
    const newStreak = lastStudyDate === yesterday ? (state?.streak ?? 0) + 1 : 1
    pool.prepare(
      `INSERT OR REPLACE INTO app_state (id, streak, last_study_date) VALUES (1, ?, ?)`
    ).run(newStreak, today)
    res.json({ ok: true, streak: newStreak })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/reset', (_req, res, next) => {
  try {
    pool.prepare('DELETE FROM item_progress').run()
    pool.prepare('UPDATE app_state SET streak = 0, last_study_date = NULL WHERE id = 1').run()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

function start() {
  pingDb()
  console.log('✅ Kết nối SQLite thành công.')
  ensureSeeded()
  app.listen(PORT, () => console.log(`🚀 API server chạy tại http://localhost:${PORT}`))
}

try {
  start()
} catch (err) {
  console.error('❌ Không khởi động được server:', err.message)
  process.exit(1)
}
