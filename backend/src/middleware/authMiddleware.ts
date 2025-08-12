
import express, { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { DecodedUser } from '../types';

declare global {
    namespace Express {
        interface Request {
            user?: DecodedUser;
        }
    }
}

export const protect = async (req: express.Request, res: express.Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            const token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'averysecretkey') as DecodedUser;
            
            // Check if user still exists
            const connection = await pool.getConnection();
            const [rows]: any = await connection.execute('SELECT id FROM users WHERE id = ?', [decoded.id]);
            connection.release();

            if (rows.length === 0) {
                 return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Attach user to the request object
            req.user = decoded;
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const isAdmin = (req: express.Request, res: express.Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires admin role' });
    }
};