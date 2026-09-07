import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, 'migrations')

// Mỗi thay đổi schema là 1 file mới trong migrations/ (đặt tên "0003_...sql", tăng dần) — KHÔNG sửa
// trực tiếp các file migration cũ đã chạy trên DB thật, vì migrate.js chỉ chạy 1 lần cho mỗi file
// (đã ghi nhận trong bảng schema_migrations) rồi bỏ qua ở các lần sau.
function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

function splitStatements(rawSql) {
  return rawSql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function runFile(file) {
  const rawSql = readFileSync(join(migrationsDir, file), 'utf-8')
  const statements = splitStatements(rawSql)
  const run = pool.transaction(() => {
    for (const stmt of statements) pool.exec(stmt)
    pool.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file)
  })
  run()
}

try {
  pool.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const alreadyApplied = new Set(
    pool.prepare('SELECT id FROM schema_migrations').all().map((r) => r.id),
  )
  const contentItemsExists = !!pool
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'content_items'")
    .get()

  // Bootstrap: DB đã có dữ liệu từ trước khi hệ thống migration này tồn tại (content_items đã tạo
  // sẵn) nhưng schema_migrations còn trống — coi như DB hiện tại đã ở đúng schema mới nhất, chỉ đánh
  // dấu các migration hiện có là "đã áp dụng" mà KHÔNG chạy lại (chạy lại sẽ lỗi vì bảng đã tồn tại /
  // đã đổi cấu trúc). Nếu DB thật ra chưa theo kịp migration nào đó, hãy tự kiểm tra lại thủ công.
  if (contentItemsExists && alreadyApplied.size === 0) {
    const insert = pool.prepare('INSERT INTO schema_migrations (id) VALUES (?)')
    const files = migrationFiles()
    const markAll = pool.transaction(() => {
      for (const f of files) insert.run(f)
    })
    markAll()
    console.log(
      `⚠️  DB đã có dữ liệu từ trước — đánh dấu ${files.length} migration hiện có là "đã áp dụng" mà không chạy lại.\n` +
        `   Nếu DB thật ra chưa khớp migration nào, hãy tự đối chiếu/sửa tay.`,
    )
    process.exit(0)
  }

  const pending = migrationFiles().filter((f) => !alreadyApplied.has(f))
  if (pending.length === 0) {
    console.log('✅ DB đã ở phiên bản mới nhất, không có migration nào cần chạy.')
    process.exit(0)
  }

  for (const file of pending) {
    runFile(file)
    console.log(`✅ Đã áp dụng migration: ${file}`)
  }
  console.log(`✅ Hoàn tất — đã chạy ${pending.length} migration.`)
  process.exit(0)
} catch (err) {
  console.error('❌ Migration lỗi:', err.message)
  process.exit(1)
}
