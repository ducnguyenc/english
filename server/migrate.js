import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rawSql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

// Bỏ các dòng comment "--" trước, rồi mới tách theo ";" để chạy từng statement
// (mysql2 không hỗ trợ multipleStatements theo mặc định).
const sql = rawSql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')

const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

async function main() {
  for (const stmt of statements) {
    await pool.query(stmt)
  }
  console.log(`✅ Đã chạy migration: ${statements.length} statement(s) trên database.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration lỗi:', err.message)
  process.exit(1)
})
