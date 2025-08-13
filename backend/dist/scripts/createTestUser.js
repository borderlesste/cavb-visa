"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
(async () => {
    const email = 'hackemate2@gmail.com';
    const plainPassword = '123456';
    const fullName = 'HACKEMATE TEST';
    const connection = await db_1.pool.getConnection();
    try {
        const [exists] = await connection.execute('SELECT id, email_verified, verification_token FROM users WHERE email = ?', [email]);
        if (exists.length > 0) {
            console.log('[create-test-user] User already exists:', exists[0]);
            process.exit(0);
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(plainPassword, salt);
        const id = (0, uuid_1.v4)();
        const verificationToken = (0, uuid_1.v4)();
        await connection.execute(`INSERT INTO users (
      id, fullName, email, password_hash, role, email_verified, verification_token
    ) VALUES (?, ?, ?, ?, 'applicant', 0, ?)`, [id, fullName, email.toLowerCase(), passwordHash, verificationToken]);
        console.log('[create-test-user] Created user id:', id);
        console.log('[create-test-user] Verification token:', verificationToken);
        console.log('[create-test-user] Login credentials -> email:', email, 'password:', plainPassword);
    }
    catch (e) {
        console.error('[create-test-user] Error:', e);
    }
    finally {
        connection.release();
        process.exit(0);
    }
})();
