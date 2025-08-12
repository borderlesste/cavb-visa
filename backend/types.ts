export enum Language {
  EN = 'en',
  FR = 'fr',
  HT = 'ht',
}

export enum VisaType {
  VITEM_XI = 'VITEM_XI',
  VITEM_III = 'VITEM_III',
}

export enum ApplicationStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  IN_REVIEW = 'IN_REVIEW',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DocumentStatus {
  MISSING = 'MISSING',
  UPLOADED = 'UPLOADED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  APPLICANT = 'applicant',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface Document {
  id: string;
  type: string;
  status: DocumentStatus;
  fileName?: string;
  filePath?: string;
  rejectionReason?: string;
}

export interface Appointment {
  id:string;
  date: string;
  time: string;
  location: string;
}

export interface Application {
  id: string;
  userId: string;
  visaType: VisaType;
  status: ApplicationStatus;
  documents: Document[];
  appointment: Appointment | null;
  createdAt: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface DecodedUser {
  id: string;
  role: string;
}