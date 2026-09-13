import Database from 'better-sqlite3';

export const pool = new Database('./server/data/app.db');

// Migration nhẹ: đảm bảo các cột mới thêm sau này tồn tại trên DB cũ,
// tránh lỗi "table content_items has no column named ..." khi schema code
// đã thay đổi nhưng file .db (đã tồn tại từ trước) chưa có cột đó.
function ensureColumn(table, column, ddl) {
  const cols = pool.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    pool.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
  }
}

ensureColumn('content_items', 'extra', 'extra TEXT');

export async function pingDb() {
  try {
    console.log('Connecting to database...');
    pool.prepare('SELECT 1').get();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Không thể kết nối database:', error.message);
  }
}
