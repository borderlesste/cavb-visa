import { pool } from '../db';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npm run sample-notification -- <userId>');
    process.exit(1);
  }
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    await connection.execute(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`, [
      id,
      userId,
      'Test Notification',
      'This is a sample notification generated at ' + new Date().toISOString(),
      'info'
    ]);
    console.log('[sample-notification] Inserted notification id:', id);
  } catch (e) {
    console.error('[sample-notification] Error:', e);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
