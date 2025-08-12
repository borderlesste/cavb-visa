import { pool } from '../db';

const token = process.argv[2];
if (!token) {
  console.error('Usage: npm run verify-test-user -- <verificationToken>');
  process.exit(1);
}

(async () => {
  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute('SELECT id, email, email_verified FROM users WHERE verification_token = ?', [token]);
    if (rows.length === 0) {
      console.error('[verify-test-user] Token not found or already used');
      process.exit(2);
    }
    const user = rows[0];
    if (user.email_verified) {
      console.log('[verify-test-user] User already verified');
      process.exit(0);
    }
    await connection.execute('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);
    console.log('[verify-test-user] User verified:', user.email);
  } catch (e) {
    console.error('[verify-test-user] Error:', e);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
