
import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, runMigrations } from './db';
import apiRoutes from './routes';
import { initializeWebSocket } from './websocket';
import { corsOptions } from './middleware/corsConfig';
import { globalLimiter } from './middleware/rateLimiter';
import { protect } from './middleware/authMiddleware';

// Load environment variables from .env file
dotenv.config();

// Test the database connection on startup
testConnection();
runMigrations();

const app: Express = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
// Apply global rate limiting
app.use(globalLimiter);

// Enable CORS with secure configuration
app.use(cors(corsOptions)); 

// To parse incoming requests with JSON payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files with authentication
app.use('/uploads', protect, express.static('uploads', {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

// API Routes
app.use('/api', apiRoutes);

// Basic health-check route
app.get('/api/health', (req: express.Request, res: express.Response) => {
    res.status(200).send({ status: 'ok', message: 'IOM Visa Application Backend is running!' });
});

// Root health for container checks
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Initialize WebSocket Server
initializeWebSocket(server);