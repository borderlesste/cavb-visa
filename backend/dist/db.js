"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = exports.testConnection = exports.query = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Accept both DB_DATABASE and DB_NAME for compatibility
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
exports.pool = promise_1.default.createPool(dbConfig);
// Lightweight query wrapper to provide a Postgres-like interface { rows }
const query = async (sql, params = []) => {
    const [rows] = await exports.pool.query(sql, params);
    return { rows };
};
exports.query = query;
const testConnection = async () => {
    try {
        const connection = await exports.pool.getConnection();
        console.log('Successfully connected to the database.');
        connection.release();
    }
    catch (error) {
        console.error('Error connecting to the database:', error);
        // In a real app, you might want to handle this more gracefully
        // For now, we exit to make it clear there is a configuration issue.
    }
};
exports.testConnection = testConnection;
// Minimal migrations to align DB schema with application expectations
const runMigrations = async () => {
    const connection = await exports.pool.getConnection();
    try {
        const dbName = (process.env.DB_DATABASE || process.env.DB_NAME);
        // Ensure 'users' table exists with required columns
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('applicant', 'admin') NOT NULL DEFAULT 'applicant',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Ensure 'applications' table exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS applications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                visa_type ENUM('VITEM_XI', 'VITEM_III') NOT NULL,
                status ENUM('NOT_STARTED', 'PENDING_DOCUMENTS', 'IN_REVIEW', 'APPOINTMENT_SCHEDULED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_STARTED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Ensure 'documents' table exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(36) PRIMARY KEY,
                application_id VARCHAR(36) NOT NULL,
                document_type VARCHAR(255) NOT NULL,
                status ENUM('MISSING', 'UPLOADED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'MISSING',
                file_path VARCHAR(255),
                file_name VARCHAR(255),
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_doc_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Ensure 'appointments' table exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS appointments (
                id VARCHAR(36) PRIMARY KEY,
                application_id VARCHAR(36) NOT NULL,
                appointment_date DATE NOT NULL,
                appointment_time TIME NOT NULL,
                location VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE(application_id),
                CONSTRAINT fk_apt_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Add 'fullName' column if missing (in case table existed without it)
        const [rows] = await connection.execute(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fullName'`, [dbName]);
        if (rows[0].cnt === 0) {
            await connection.execute(`ALTER TABLE users ADD COLUMN fullName VARCHAR(255) NOT NULL AFTER id`);
            console.log("[DB] Added missing column 'fullName' to users table");
        }
        // Add 'visa_type' column to 'applications' if missing
        const [appCols] = await connection.execute(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'visa_type'`, [dbName]);
        if (appCols[0].cnt === 0) {
            await connection.execute(`ALTER TABLE applications ADD COLUMN visa_type ENUM('VITEM_XI', 'VITEM_III') NOT NULL AFTER user_id`);
            console.log("[DB] Added missing column 'visa_type' to applications table");
        }
        // Add 'status' column to 'applications' if missing
        const [appStatusCols] = await connection.execute(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'status'`, [dbName]);
        if (appStatusCols[0].cnt === 0) {
            await connection.execute(`ALTER TABLE applications ADD COLUMN status ENUM('NOT_STARTED', 'PENDING_DOCUMENTS', 'IN_REVIEW', 'APPOINTMENT_SCHEDULED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_STARTED' AFTER visa_type`);
            console.log("[DB] Added missing column 'status' to applications table");
        }
        // Conversations table (use CHAR(36) to match existing production schema; server default charset is utf8mb3)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id CHAR(36) PRIMARY KEY,
                participant_a CHAR(36) NOT NULL,
                participant_b CHAR(36) NOT NULL,
                application_id CHAR(36) NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_conv_participants (participant_a, participant_b),
                INDEX idx_conv_application (application_id),
                CONSTRAINT fk_conv_user_a FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_conv_user_b FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_conv_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
        `);
        // Ensure we have a uniqueness guarantee for participant pair (unordered) at application level.
        // Implementation strategy: enforce application code to always store the lexicographically smaller user id in participant_a.
        // Here we add a UNIQUE index on (participant_a, participant_b) if it doesn't already exist and there are no duplicates.
        try {
            // Canonicalize existing rows (swap participants so participant_a <= participant_b)
            const [misordered] = await connection.execute(`SELECT id, participant_a, participant_b FROM conversations WHERE participant_a > participant_b LIMIT 500`);
            for (const row of misordered) {
                const a = row.participant_a;
                const b = row.participant_b;
                const canonicalA = b < a ? b : a; // since a > b, canonicalA = b
                const canonicalB = b < a ? a : b;
                // Check if canonical conversation already exists
                const [existingCanonical] = await connection.execute(`SELECT id FROM conversations WHERE participant_a = ? AND participant_b = ? LIMIT 1`, [canonicalA, canonicalB]);
                if (existingCanonical.length > 0) {
                    const targetId = existingCanonical[0].id;
                    // Move messages then delete duplicate conversation
                    await connection.execute(`UPDATE messages SET conversation_id = ? WHERE conversation_id = ?`, [targetId, row.id]);
                    await connection.execute(`DELETE FROM conversations WHERE id = ?`, [row.id]);
                    console.log(`[DB] Merged duplicate conversation ${row.id} into ${targetId}`);
                }
                else {
                    await connection.execute(`UPDATE conversations SET participant_a = ?, participant_b = ? WHERE id = ?`, [canonicalA, canonicalB, row.id]);
                    console.log(`[DB] Canonicalized conversation ${row.id}`);
                }
            }
            // If application_id intended to be mandatory, and there are no NULLs, enforce NOT NULL (idempotent)
            const enforceAppId = process.env.ENFORCE_CONVERSATION_APPLICATION_ID === 'true';
            if (enforceAppId) {
                const [nullCheck1] = await connection.execute(`SELECT COUNT(*) AS cnt FROM conversations WHERE application_id IS NULL`);
                const [nullCheck2] = await connection.execute(`SELECT COUNT(*) AS cnt FROM messages WHERE application_id IS NULL`);
                if (nullCheck1[0].cnt === 0 && nullCheck2[0].cnt === 0) {
                    // Only alter if column currently nullable
                    const [colInfoConv] = await connection.execute(`SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'application_id'`, [dbName]);
                    const [colInfoMsg] = await connection.execute(`SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'application_id'`, [dbName]);
                    if (colInfoConv[0]?.IS_NULLABLE === 'YES') {
                        await connection.execute(`ALTER TABLE conversations MODIFY application_id CHAR(36) NOT NULL`);
                        console.log('[DB] Enforced NOT NULL on conversations.application_id');
                    }
                    if (colInfoMsg[0]?.IS_NULLABLE === 'YES') {
                        await connection.execute(`ALTER TABLE messages MODIFY application_id CHAR(36) NOT NULL`);
                        console.log('[DB] Enforced NOT NULL on messages.application_id');
                    }
                }
                else {
                    console.warn('[DB] Skipped enforcing NOT NULL on application_id due to existing NULLs');
                }
            }
            const [convUniqueRows] = await connection.execute(`SELECT COUNT(1) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'conversations' AND INDEX_NAME = 'uniq_conv_participants'`, [dbName]);
            if (convUniqueRows[0].cnt === 0) {
                const [dupRows] = await connection.execute(`
                    SELECT participant_a, participant_b, COUNT(*) c
                    FROM conversations
                    GROUP BY participant_a, participant_b
                    HAVING c > 1
                    LIMIT 1;
                `);
                if (dupRows.length > 0) {
                    console.warn('[DB] Duplicate conversation participant pairs detected; UNIQUE index not created. Clean manually then rerun migrations.');
                }
                else {
                    await connection.execute(`ALTER TABLE conversations ADD UNIQUE KEY uniq_conv_participants (participant_a, participant_b)`);
                    console.log('[DB] Added UNIQUE index uniq_conv_participants on conversations(participant_a, participant_b)');
                }
            }
        }
        catch (e) {
            console.warn('[DB] Could not create UNIQUE index for conversations participant pair:', e);
        }
        // Messages table (CHAR(36) FKs to match existing tables; charset aligned to avoid FK collation issues)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id CHAR(36) PRIMARY KEY,
                conversation_id CHAR(36) NOT NULL,
                sender_id CHAR(36) NOT NULL,
                recipient_id CHAR(36) NOT NULL,
                content TEXT NOT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                application_id CHAR(36) NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_msg_conversation (conversation_id),
                INDEX idx_msg_recipient_read (recipient_id, is_read),
                INDEX idx_msg_sender_created (sender_id, created_at),
                CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_msg_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
        `);
        // Notifications table (backfill needed for existing code expecting this)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('info','warning','success','error','system') NOT NULL DEFAULT 'info',
                application_id CHAR(36) NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notif_user_created (user_id, created_at),
                INDEX idx_notif_user_unread (user_id, is_read),
                CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_notif_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
        `);
        // You can extend with more checks for other tables/columns if needed.
    }
    catch (err) {
        console.error('[DB] Migration error:', err);
    }
    finally {
        connection.release();
    }
};
exports.runMigrations = runMigrations;
