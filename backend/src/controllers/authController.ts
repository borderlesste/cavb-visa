
import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService';

const registerSchema = Joi.object({
    fullName: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    additionalData: Joi.object({
        firstName: Joi.string().max(100).optional(),
        lastName: Joi.string().max(100).optional(),
        otherNames: Joi.string().max(100).optional(),
        dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        phone: Joi.string().max(20).optional(),
        nationalId: Joi.string().max(50).optional(),
        sex: Joi.string().valid('male', 'female', 'other').optional(),
        nationality: Joi.string().max(50).optional(),
        address: Joi.string().optional(),
        department: Joi.string().max(50).optional(),
        arrondissement: Joi.string().max(50).optional()
    }).optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const registerUser = async (req: express.Request, res: express.Response) => {
    console.log('Registration request body:', JSON.stringify(req.body, null, 2));
    
    const { error } = registerSchema.validate(req.body);
    if (error) {
        console.log('Validation error:', error.details[0].message);
        return res.status(400).json({ message: error.details[0].message });
    }

    const { fullName, email, password, additionalData } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows]: any = await connection.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const newUserId = uuidv4();
        const verificationToken = uuidv4();
        
        // If additional data is provided, use it; otherwise use defaults
        const userData = additionalData || {};
        
        // Convert text fields to uppercase
        const normalizeText = (text: string | undefined | null) => {
            return text ? text.toString().toUpperCase().trim() : null;
        };
        
        await connection.execute(
            `INSERT INTO users (
                id, fullName, email, password_hash, role, email_verified, verification_token,
                firstName, lastName, otherNames, dateOfBirth, phone, nationalId, 
                sex, nationality, address, department, arrondissement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newUserId, 
                normalizeText(fullName), 
                email.toLowerCase().trim(), // Email should be lowercase
                passwordHash, 
                'applicant', 
                false, 
                verificationToken,
                normalizeText(userData.firstName),
                normalizeText(userData.lastName),
                normalizeText(userData.otherNames),
                userData.dateOfBirth || null,
                userData.phone || null, // Phone numbers don't need uppercase
                normalizeText(userData.nationalId),
                userData.sex ? userData.sex.toLowerCase() : null, // Sex should be lowercase for consistency
                normalizeText(userData.nationality),
                normalizeText(userData.address),
                normalizeText(userData.department),
                normalizeText(userData.arrondissement)
            ]
        );

        // Send verification email
        try {
            await sendVerificationEmail(email, verificationToken, fullName);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Continue with registration even if email fails
        }

        res.status(201).json({ 
            message: 'User registered successfully. Please check your email to verify your account.',
            emailSent: true
        });

    } catch (dbError) {
        console.error('Database error during registration:', dbError);
        res.status(500).json({ message: 'Internal server error during registration' });
    } finally {
        if (connection) connection.release();
    }
};

export const loginUser = async (req: express.Request, res: express.Response) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    let connection;
    try {
        if (process.env.DEBUG_AUTH === 'true') {
            console.log('[LOGIN] Attempt start', { email });
        }
        connection = await pool.getConnection();
        
        const [rows]: any = await connection.execute('SELECT id, fullName, email, role, password_hash, email_verified FROM users WHERE email = ?', [email]);
        if (process.env.DEBUG_AUTH === 'true') {
            console.log('[LOGIN] Query result count:', rows.length);
        }
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = rows[0];
        if (!user.password_hash) {
            console.error('[LOGIN] password_hash missing in DB row for user id:', user.id);
            return res.status(500).json({ message: 'Internal server error during login' });
        }
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } catch (compareErr) {
            console.error('[LOGIN] bcrypt.compare failed', compareErr);
            return res.status(500).json({ message: 'Internal server error during login' });
        }
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.email_verified) {
            return res.status(403).json({ 
                message: 'Please verify your email address before logging in. Check your email for the verification link.',
                emailVerified: false
            });
        }
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...userData } = user;

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'averysecretkey',
            { expiresIn: '1d' }
        );

        if (process.env.DEBUG_AUTH === 'true') {
            console.log('[LOGIN] Success for user id:', user.id);
        }
        res.status(200).json({ token, user: userData });

    } catch (dbError) {
        console.error('Database error during login:', dbError);
        res.status(500).json({ message: 'Internal server error during login' });
    } finally {
        if (connection) connection.release();
    }
};

export const getMe = async (req: express.Request, res: express.Response) => {
    const userId = req.user?.id;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows]: any = await connection.execute(`
            SELECT id, fullName, email, role, firstName, lastName, otherNames, 
                   dateOfBirth, phone, nationalId, sex, nationality, address, 
                   department, arrondissement, email_verified 
            FROM users WHERE id = ?`, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(rows[0]);

    } catch (dbError) {
        console.error('Database error in getMe:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};

export const verifyEmail = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    console.log('Email verification request for token:', token);
    
    if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // First, let's see all users with verification tokens for debugging
        const [allTokens]: any = await connection.execute(
            'SELECT id, email, verification_token, email_verified FROM users WHERE verification_token IS NOT NULL'
        );
        console.log('All users with verification tokens:', allTokens);
        
        const [rows]: any = await connection.execute(
            'SELECT id, fullName, email, email_verified FROM users WHERE verification_token = ?', 
            [token]
        );
        
        console.log('Query result for token:', token, 'rows found:', rows.length);
        
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        
        const user = rows[0];
        
        if (user.email_verified) {
            return res.status(200).json({ 
                message: 'Email already verified. You can now log in.',
                alreadyVerified: true
            });
        }
        
        // Update user as verified and clear the token
        await connection.execute(
            'UPDATE users SET email_verified = true, verification_token = NULL WHERE id = ?',
            [user.id]
        );
        
        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.fullName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue with verification even if welcome email fails
        }
        
        res.status(200).json({ 
            message: 'Email verified successfully! You can now log in to your account.',
            verified: true
        });
        
    } catch (dbError) {
        console.error('Database error during email verification:', dbError);
        res.status(500).json({ message: 'Internal server error during verification' });
    } finally {
        if (connection) connection.release();
    }
};

export const resendVerificationEmail = async (req: express.Request, res: express.Response) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        const [rows]: any = await connection.execute(
            'SELECT id, fullName, email, email_verified, verification_token FROM users WHERE email = ?', 
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = rows[0];
        
        if (user.email_verified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }
        
        // Generate new token if needed
        let verificationToken = user.verification_token;
        if (!verificationToken) {
            verificationToken = uuidv4();
            await connection.execute(
                'UPDATE users SET verification_token = ? WHERE id = ?',
                [verificationToken, user.id]
            );
        }
        
        // Resend verification email
        try {
            await sendVerificationEmail(email, verificationToken, user.fullName);
        } catch (emailError) {
            console.error('Failed to resend verification email:', emailError);
            return res.status(500).json({ message: 'Failed to send verification email' });
        }
        
        res.status(200).json({ 
            message: 'Verification email sent successfully. Please check your email.',
            emailSent: true
        });
        
    } catch (dbError) {
        console.error('Database error during resend verification:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};