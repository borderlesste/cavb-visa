import { pool } from '../db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  const email = 'hackemate2@gmail.com';
  const plainPassword = '123456';
  const fullName = 'HACKEMATE TEST';
  const connection = await pool.getConnection();
  try {
    const [exists]: any = await connection.execute('SELECT id, email_verified, verification_token FROM users WHERE email = ?', [email]);
    if (exists.length > 0) {
      console.log('[create-test-user] User already exists:', exists[0]);
      process.exit(0);
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);
    const id = uuidv4();
    const verificationToken = uuidv4();

    await connection.execute(`INSERT INTO users (
      id, fullName, email, password_hash, role, email_verified, verification_token
    ) VALUES (?, ?, ?, ?, 'applicant', 0, ?)` , [id, fullName, email.toLowerCase(), passwordHash, verificationToken]);

    console.log('[create-test-user] Created user id:', id);
    console.log('[create-test-user] Verification token:', verificationToken);
    console.log('[create-test-user] Login credentials -> email:', email, 'password:', plainPassword);
  } catch (e) {
    console.error('[create-test-user] Error:', e);
  } finally {
    connection.release();
    process.exit(0);
  }
})();
