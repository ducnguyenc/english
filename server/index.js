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

/** Ghép row (cột riêng lẻ) lại thành ContentItem — bỏ qua field null/undefined để không đè lên optional. */
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

/** Tách ContentItem thành các cột SQL tương ứng (word/pattern), điền NULL cho cột không thuộc kind. */
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

const UPSERT_ITEM_SQL = `
  INSERT INTO content_items
    (id, kind, topic, english, ipa, vietnamese, word_type, example, example_vi, note,
     collocations, etymology, formula, meaning_vi, examples, image)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    kind = VALUES(kind), topic = VALUES(topic), english = VALUES(english), ipa = VALUES(ipa),
    vietnamese = VALUES(vietnamese), word_type = VALUES(word_type), example = VALUES(example),
    example_vi = VALUES(example_vi), note = VALUES(note), collocations = VALUES(collocations),
    etymology = VALUES(etymology), formula = VALUES(formula), meaning_vi = VALUES(meaning_vi),
    examples = VALUES(examples), image = VALUES(image)
`

function upsertItemParams(item) {
  const c = itemToColumns(item)
  return [
    item.id,
    item.kind,
    item.topic ?? null,
    c.english,
    c.ipa,
    c.vietnamese,
    c.word_type,
    c.example,
    c.example_vi,
    c.note,
    c.collocations,
    c.etymology,
    c.formula,
    c.meaning_vi,
    c.examples,
    c.image,
  ]
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

async function ensureSeeded() {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM content_items')
  if (rows[0].c > 0) return
  for (const item of SEED_ITEMS) {
    await pool.query(UPSERT_ITEM_SQL, upsertItemParams(item))
    await pool.query('INSERT IGNORE INTO item_progress (item_id, day) VALUES (?, 1)', [item.id])
  }
  console.log(`Seeded ${SEED_ITEMS.length} mục mẫu vào content_items.`)
}

// ---------- content_items ----------
app.get('/api/items', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM content_items ORDER BY created_at ASC')
    res.json(rows.map(rowToItem))
  } catch (err) {
    next(err)
  }
})

app.post('/api/items', async (req, res, next) => {
  try {
    const item = req.body
    if (!item?.id || !item?.kind) return res.status(400).json({ error: 'Thiếu id hoặc kind' })
    await pool.query(UPSERT_ITEM_SQL, upsertItemParams(item))
    await pool.query('INSERT IGNORE INTO item_progress (item_id, day) VALUES (?, 1)', [item.id])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.delete('/api/items/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM content_items WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Import JSON hàng loạt — thêm mới, đè theo id nếu trùng (không xoá nội dung đang có). */
app.post('/api/items/import', async (req, res, next) => {
  const items = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body phải là mảng ContentItem[]' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const item of items) {
      if (!item?.id || !item?.kind) throw new Error(`Item thiếu id hoặc kind: ${JSON.stringify(item)}`)
      await conn.query(UPSERT_ITEM_SQL, upsertItemParams(item))
      await conn.query('INSERT IGNORE INTO item_progress (item_id, day) VALUES (?, 1)', [item.id])
    }
    await conn.commit()
    res.json({ ok: true, count: items.length })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

/** Xoá hết nội dung tự thêm, seed lại từ dữ liệu mẫu ban đầu. */
app.post('/api/items/reset', async (_req, res, next) => {
  try {
    await pool.query('DELETE FROM content_items')
    await ensureSeeded()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ---------- item_progress ----------
app.get('/api/progress', async (_req, res, next) => {
  try {
    const [progressRows] = await pool.query('SELECT * FROM item_progress')
    const [[state]] = await pool.query('SELECT * FROM app_state WHERE id = 1')
    const items = {}
    for (const row of progressRows) items[row.item_id] = rowToProgress(row)
    res.json({
      items,
      streak: state?.streak ?? 0,
      lastStudyDate: state?.last_study_date
        ? new Date(state.last_study_date).toISOString().slice(0, 10)
        : null,
    })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params
    const { day, correctStreak, wrongCount, lastReviewedAt, history } = req.body
    await pool.query(
      `INSERT INTO item_progress (item_id, day, correct_streak, wrong_count, last_reviewed_at, history)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE day = VALUES(day), correct_streak = VALUES(correct_streak),
         wrong_count = VALUES(wrong_count), last_reviewed_at = VALUES(last_reviewed_at), history = VALUES(history)`,
      [itemId, day, correctStreak, wrongCount, lastReviewedAt, JSON.stringify(history ?? [])],
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Đảm bảo mọi itemId truyền lên đều có 1 dòng progress (mặc định Day 1) — dùng khi có item mới. */
app.post('/api/progress/ensure', async (req, res, next) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Body cần { ids: string[] }' })
    for (const id of ids) {
      await pool.query('INSERT IGNORE INTO item_progress (item_id, day) VALUES (?, 1)', [id])
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/streak/bump', async (req, res, next) => {
  try {
    const today = req.body?.today // "YYYY-MM-DD"
    if (!today) return res.status(400).json({ error: 'Body cần { today: "YYYY-MM-DD" }' })
    const [[state]] = await pool.query('SELECT * FROM app_state WHERE id = 1')
    const lastStudyDate = state?.last_study_date
      ? new Date(state.last_study_date).toISOString().slice(0, 10)
      : null
    if (lastStudyDate === today) return res.json({ ok: true, streak: state.streak }) // đã tính hôm nay

    const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10)
    const newStreak = lastStudyDate === yesterday ? (state?.streak ?? 0) + 1 : 1
    await pool.query(
      `INSERT INTO app_state (id, streak, last_study_date) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE streak = VALUES(streak), last_study_date = VALUES(last_study_date)`,
      [newStreak, today],
    )
    res.json({ ok: true, streak: newStreak })
  } catch (err) {
    next(err)
  }
})

app.post('/api/progress/reset', async (_req, res, next) => {
  try {
    await pool.query('DELETE FROM item_progress')
    await pool.query('UPDATE app_state SET streak = 0, last_study_date = NULL WHERE id = 1')
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

async function start() {
  await pingDb()
  console.log('✅ Kết nối MySQL thành công.')
  await ensureSeeded()
  app.listen(PORT, () => console.log(`🚀 API server chạy tại http://localhost:${PORT}`))
}

start().catch((err) => {
  console.error('❌ Không khởi động được server:', err.message)
  process.exit(1)
})
