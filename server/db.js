import Database from 'better-sqlite3';

export const pool = new Database('./server/data/app.db');

export async function pingDb() {
  try {
    console.log('Connecting to database...');
    pool.prepare('SELECT 1').get();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Không thể kết nối database:', error.message);
  }
}
