import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface AppointmentLetterData {
    fullName: string;
    email: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
    applicationId: string;
    visaType: string;
}

export class AppointmentLetterService {
    private static readonly UPLOAD_DIR = path.join(__dirname, '../../uploads/appointment_letters');

    static {
        // Ensure the upload directory exists
        if (!fs.existsSync(this.UPLOAD_DIR)) {
            fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        }
    }

    static async generateAppointmentLetter(data: AppointmentLetterData): Promise<string> {
        const letterContent = this.generateLetterHTML(data);
        const fileName = `appointment_letter_${data.appointmentId}_${Date.now()}.html`;
        const filePath = path.join(this.UPLOAD_DIR, fileName);

        await fs.promises.writeFile(filePath, letterContent, 'utf8');
        
        // Return the relative path for database storage
        return `/uploads/appointment_letters/${fileName}`;
    }

    private static generateLetterHTML(data: AppointmentLetterData): string {
        const formattedDate = new Date(data.appointmentDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedTime = new Date(`2000-01-01T${data.appointmentTime}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const formattedBirthDate = new Date(data.dateOfBirth).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Letter - CAVB IOM Haiti</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #003d6b;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .org-title {
            font-size: 18pt;
            font-weight: bold;
            color: #003d6b;
            margin: 0;
        }
        
        .org-subtitle {
            font-size: 14pt;
            color: #666;
            margin: 5px 0;
        }
        
        .letter-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #003d6b;
            margin: 20px 0;
            text-decoration: underline;
        }
        
        .content {
            margin: 30px 0;
            text-align: justify;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #f8f9fa;
        }
        
        .info-table td {
            padding: 12px;
            border: 1px solid #dee2e6;
            vertical-align: top;
        }
        
        .info-table .label {
            font-weight: bold;
            background: #e9ecef;
            width: 35%;
        }
        
        .appointment-details {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .appointment-details h3 {
            color: #1976d2;
            margin: 0 0 15px 0;
            font-size: 14pt;
        }
        
        .instructions {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 25px 0;
        }
        
        .instructions h4 {
            color: #856404;
            margin: 0 0 10px 0;
        }
        
        .footer {
            margin-top: 50px;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
            font-size: 10pt;
            color: #666;
        }
        
        .signature-area {
            margin-top: 40px;
            text-align: right;
        }
        
        .qr-code {
            float: right;
            margin: 0 0 20px 20px;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div>
                <h1 class="org-title">CAVB - CENTER FOR VISA AND IMMIGRATION AFFAIRS</h1>
                <p class="org-subtitle">International Organization for Migration (IOM)</p>
                <p class="org-subtitle">Port-au-Prince, Haiti</p>
            </div>
        </div>
        <h2 class="letter-title">Appointment Confirmation Letter</h2>
    </div>

    <div class="content">
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}</p>
        
        <p><strong>Reference Number:</strong> ${data.appointmentId.toUpperCase()}</p>
        
        <br>
        
        <p>Dear <strong>${data.fullName}</strong>,</p>
        
        <p>We are pleased to confirm your appointment for your humanitarian visa application processing at the Center for Visa and Immigration Affairs (CAVB). Please review the details below carefully and ensure your attendance at the scheduled time.</p>

        <table class="info-table">
            <tr>
                <td class="label">Full Name:</td>
                <td>${data.fullName}</td>
            </tr>
            <tr>
                <td class="label">Date of Birth:</td>
                <td>${formattedBirthDate}</td>
            </tr>
            <tr>
                <td class="label">Passport Number:</td>
                <td>${data.passportNumber}</td>
            </tr>
            <tr>
                <td class="label">Nationality:</td>
                <td>${data.nationality}</td>
            </tr>
            <tr>
                <td class="label">Email Address:</td>
                <td>${data.email}</td>
            </tr>
            <tr>
                <td class="label">Application ID:</td>
                <td>${data.applicationId}</td>
            </tr>
            <tr>
                <td class="label">Visa Type:</td>
                <td>${data.visaType}</td>
            </tr>
        </table>

        <div class="appointment-details">
            <h3>📅 APPOINTMENT DETAILS</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Location:</strong> IOM Office, Port-au-Prince</p>
            <p><strong>Address:</strong> 
                Centre Administratif de la CAVB<br>
                Rue Capois, Port-au-Prince, Haiti<br>
                Tel: (+509) 2943-0000
            </p>
        </div>

        <div class="instructions">
            <h4>📋 IMPORTANT INSTRUCTIONS</h4>
            <ul>
                <li><strong>Arrive 15 minutes early</strong> to allow time for security screening</li>
                <li><strong>Bring this appointment letter</strong> and a valid photo ID</li>
                <li><strong>Bring original documents</strong> and photocopies of all required documents</li>
                <li><strong>Dress appropriately</strong> - business casual attire is recommended</li>
                <li><strong>Mobile phones</strong> must be turned off inside the building</li>
                <li><strong>Accompaniments:</strong> Only the applicant is allowed, unless special arrangements have been made</li>
            </ul>
        </div>

        <div class="instructions" style="background: #ffebee; border-color: #ffcdd2;">
            <h4 style="color: #c62828;">⚠️ REQUIRED DOCUMENTS</h4>
            <ul>
                <li>Valid passport (original and copy)</li>
                <li>Birth certificate (original and certified translation if not in English/French)</li>
                <li>Police clearance certificate</li>
                <li>Identity document (national ID or driver's license)</li>
                <li>Supporting documents as per your visa type (${data.visaType})</li>
                <li>This appointment confirmation letter</li>
            </ul>
        </div>

        <p><strong>Note:</strong> Failure to appear at your scheduled appointment may result in delays in processing your application. If you need to reschedule, please contact our office at least 24 hours in advance.</p>
        
        <p>If you have any questions or concerns, please contact us at:</p>
        <ul>
            <li>Email: appointments@cavb-haiti.org</li>
            <li>Phone: (+509) 2943-0000</li>
            <li>Office Hours: Monday - Friday, 8:00 AM - 4:00 PM</li>
        </ul>

        <p>Thank you for choosing CAVB for your visa processing needs. We look forward to assisting you with your application.</p>
    </div>

    <div class="signature-area">
        <p><strong>Appointments Department</strong><br>
        Center for Visa and Immigration Affairs<br>
        International Organization for Migration</p>
        
        <p style="margin-top: 30px;">_________________________<br>
        <small>Authorized Signature</small></p>
    </div>

    <div class="footer">
        <p><strong>Disclaimer:</strong> This letter serves as confirmation of your appointment only. It does not guarantee visa approval. All applications are subject to review and approval by the relevant authorities.</p>
        
        <p style="text-align: center; margin-top: 20px;">
            <strong>CAVB - IOM Haiti</strong> | 
            <em>Supporting Humanitarian Migration with Dignity</em>
        </p>
    </div>
</body>
</html>
        `;
    }

    static async generateConfirmationLetter(appointmentId: string, data: AppointmentLetterData): Promise<string> {
        // This would typically generate a PDF, but for now we'll create an enhanced HTML version
        const letterPath = await this.generateAppointmentLetter(data);
        
        // In a production environment, you might want to:
        // 1. Use a PDF generation library like Puppeteer or PDFKit
        // 2. Add digital signatures
        // 3. Include QR codes for verification
        // 4. Send email notifications
        
        return letterPath;
    }

    static getLetterPath(fileName: string): string {
        return path.join(this.UPLOAD_DIR, fileName);
    }

    static async deleteAppointmentLetter(filePath: string): Promise<void> {
        try {
            const fullPath = path.join(__dirname, '../..', filePath);
            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }
        } catch (error) {
            console.error('Error deleting appointment letter:', error);
        }
    }
}

export default AppointmentLetterService;