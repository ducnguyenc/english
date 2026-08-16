import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rawSql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

// Bỏ các dòng comment "--" và tách theo ";" để chạy từng statement
const statements = rawSql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

try {
  for (const stmt of statements) {
    pool.exec(stmt)
  }
  console.log(`✅ Đã chạy migration: ${statements.length} statement(s) trên database.`)
  process.exit(0)
} catch (err) {
  console.error('❌ Migration lỗi:', err.message)
  process.exit(1)
}
