# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IOM Brazil Visa Application platform - a full-stack web application for managing Brazilian visa applications for Haitian nationals. The system includes user registration, document upload, appointment scheduling, and administrative review processes.

## Development Commands

### Backend (Express.js/TypeScript)
```bash
cd backend
cp .env.example .env # Copy environment variables template
# Edit .env with your database configuration
npm run dev          # Start development server with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server (requires build first)
```

### Frontend (React/Vite)
```bash
cd frontend
npm install --legacy-peer-deps  # Install dependencies (required due to React 19 conflicts)
npm run dev          # Start Vite dev server (default port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Local Development Setup

This project is configured for local development only:

1. **Backend runs on**: `http://localhost:4000`
2. **Frontend runs on**: `http://localhost:5173` (Vite default)
3. **Frontend proxy**: All `/api` and `/uploads` requests proxy to backend
4. **Database**: MySQL (configure via environment variables)

### Required Environment Variables (.env in backend/)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`
- Email service configuration for notifications

### MySQL Setup Options
1. **Local MySQL**: Install MySQL locally and configure .env
2. **Docker MySQL**: Run `docker-compose up -d` to start MySQL container
   - Uses credentials: user=visa_user, password=visa_password, db=visa_application_db

## Architecture

### Backend Structure
- **Express.js** with TypeScript
- **MySQL** database with connection pooling
- **JWT** authentication with role-based access (applicant/admin)
- **WebSocket** support for real-time notifications
- **Rate limiting** and security middlewares
- **File uploads** with multer (documents, appointment letters)

### Frontend Structure
- **React 19** with TypeScript
- **Vite** as build tool
- **React Router** with lazy-loaded pages
- **TailwindCSS** for styling
- **Context API** for state management
- **Code splitting** and performance optimizations

### Key Application Flow
1. **User Registration/Login** → JWT token authentication
2. **Application Creation** → Choose visa type (VITEM_XI or VITEM_III)
3. **Document Upload** → Required documents based on visa type
4. **Admin Review** → Document verification and appointment scheduling
5. **Appointment Management** → PDF generation for appointment letters
6. **Status Tracking** → Real-time updates via WebSocket

### Database Schema
- Users (applicants and admins)
- Applications (linked to users, contains visa type and status)
- Documents (file uploads with verification status)
- Appointments (scheduling and confirmation letters)

### Visa Types & Required Documents
- **VITEM_XI**: Family reunification (requires proof of family ties)
- **VITEM_III**: Humanitarian cases (requires humanitarian reason proof)
- **Common documents**: Passport, Birth Certificate, Police Record, Identity Document

### Security Features
- Rate limiting on all endpoints
- CORS configuration
- File upload restrictions and validation
- JWT token expiration
- Protected file serving with authentication

The application supports multiple languages (EN, FR, HT) and includes comprehensive status tracking for applications, documents, and appointments.