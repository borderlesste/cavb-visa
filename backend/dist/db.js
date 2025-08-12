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
