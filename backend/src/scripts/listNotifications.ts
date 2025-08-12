import { pool } from '../db';

(async () => {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npm run list-notifications -- <userId>');
    process.exit(1);
  }
  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute('SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
    console.table(rows);
  } catch (e) {
    console.error('[list-notifications] Error:', e);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
