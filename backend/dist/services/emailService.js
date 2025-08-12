"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApplicationRejectedEmail = exports.sendApplicationApprovedEmail = exports.sendWelcomeEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create transporter
const createTransporter = () => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
    if (smtpHost) {
        return nodemailer_1.default.createTransport({
            host: smtpHost,
            port: smtpPort || 587,
            secure: (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || (smtpPort === 465),
            auth: { user, pass },
        });
    }
    // Default to Gmail service when specific SMTP host is not provided
    return nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
};
const sendVerificationEmail = async (email, token, fullName) => {
    try {
        const transporter = createTransporter();
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
        const verificationLink = `${frontendUrl}/#/verify-email/${token}`;
        const mailOptions = {
            from: {
                name: 'IOM Visa Application System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: '✅ Verify your email address - IOM Visa Application',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">IOM Visa Application</h1>
                        <p style="color: #666; margin: 5px 0;">International Organization for Migration</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                        <h2 style="color: #1e293b; margin: 0 0 20px 0;">Welcome, ${fullName}!</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Thank you for registering with the IOM Visa Application System. 
                            To complete your registration and secure your account, please verify your email address.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" 
                               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; 
                                      border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                                ✅ Verify Email Address
                            </a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${verificationLink}" style="color: #2563eb; word-break: break-all;">${verificationLink}</a>
                        </p>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                        <p style="color: #64748b; font-size: 14px; margin: 0;">
                            <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">
                            If you didn't create an account with us, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            © 2024 International Organization for Migration (IOM)<br>
                            This is an automated message, please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    }
    catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendWelcomeEmail = async (email, fullName) => {
    try {
        const transporter = createTransporter();
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
        const mailOptions = {
            from: {
                name: 'IOM Visa Application System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: '🎉 Welcome to IOM Visa Application System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">Welcome to IOM!</h1>
                        <p style="color: #666; margin: 5px 0;">International Organization for Migration</p>
                    </div>
                    
                    <div style="background: #f0f9ff; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #2563eb;">
                        <h2 style="color: #1e293b; margin: 0 0 20px 0;">🎉 Email Verified Successfully!</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Dear ${fullName}, your email has been successfully verified and your account is now active!
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Next Steps:</h3>
                            <ul style="color: #475569; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Log in to your account</li>
                                <li style="margin-bottom: 8px;">Start your visa application process</li>
                                <li style="margin-bottom: 8px;">Upload required documents</li>
                                <li>Schedule your appointment</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${frontendUrl}/#/auth" 
                               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; 
                                      border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                                🚀 Start Application
                            </a>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            © 2024 International Organization for Migration (IOM)<br>
                            This is an automated message, please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${email}`);
    }
    catch (error) {
        console.error('❌ Error sending welcome email:', error);
        // Don't throw error for welcome email as it's not critical
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendApplicationApprovedEmail = async (email, fullName, applicationId, visaType, language = 'en') => {
    try {
        const transporter = createTransporter();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const content = {
            en: {
                subject: '🎉 Your Visa Application Has Been Approved!',
                title: 'Congratulations! Application Approved',
                greeting: `Dear ${fullName}`,
                message: 'We are pleased to inform you that your visa application has been approved.',
                details: 'Application Details:',
                nextSteps: 'Next Steps:',
                steps: [
                    'Download your approval letter from your dashboard',
                    'Collect your visa from the designated office',
                    'Prepare for your travel arrangements',
                    'Keep your approval documents safe'
                ],
                button: 'View Application',
                important: 'Important:',
                note: 'Please bring a valid ID and this approval notice when collecting your visa.',
                contact: 'If you have any questions, please contact our support team.'
            },
            fr: {
                subject: '🎉 Votre demande de visa a été approuvée!',
                title: 'Félicitations! Demande approuvée',
                greeting: `Cher/Chère ${fullName}`,
                message: 'Nous sommes heureux de vous informer que votre demande de visa a été approuvée.',
                details: 'Détails de la demande:',
                nextSteps: 'Prochaines étapes:',
                steps: [
                    'Téléchargez votre lettre d\'approbation depuis votre tableau de bord',
                    'Récupérez votre visa au bureau désigné',
                    'Préparez vos arrangements de voyage',
                    'Gardez vos documents d\'approbation en sécurité'
                ],
                button: 'Voir la demande',
                important: 'Important:',
                note: 'Veuillez apporter une pièce d\'identité valide et cet avis d\'approbation lors de la récupération de votre visa.',
                contact: 'Si vous avez des questions, veuillez contacter notre équipe de support.'
            },
            ht: {
                subject: '🎉 Aplikasyon viza ou an apwouve!',
                title: 'Felisitasyon! Aplikasyon apwouve',
                greeting: `Chè ${fullName}`,
                message: 'Nou kontan fè ou konnen aplikasyon viza ou an apwouve.',
                details: 'Detay aplikasyon an:',
                nextSteps: 'Pwochen etap yo:',
                steps: [
                    'Telechaje lèt apwobasyon ou an nan dashboard ou',
                    'Al chèche viza ou nan biwo ki dezine a',
                    'Prepare aranjman vwayaj ou yo',
                    'Konsève dokiman apwobasyon ou yo nan sekirite'
                ],
                button: 'Gade aplikasyon',
                important: 'Enpòtan:',
                note: 'Tanpri pote yon ID valab ak avèti apwobasyon sa a lè w ap al chèche viza ou.',
                contact: 'Si ou gen kesyon, tanpri kontakte ekip sipò nou an.'
            }
        };
        const text = content[language];
        const mailOptions = {
            from: {
                name: 'IOM Visa Application System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: text.subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #16a34a; margin: 0;">IOM Visa Application</h1>
                        <p style="color: #666; margin: 5px 0;">International Organization for Migration</p>
                    </div>
                    
                    <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #16a34a;">
                        <h2 style="color: #15803d; margin: 0 0 20px 0;">🎉 ${text.title}</h2>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            ${text.greeting},
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                            ${text.message}
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1f2937; margin: 0 0 15px 0;">${text.details}</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px; list-style: none;">
                                <li style="margin-bottom: 8px; padding-left: 0;">📋 Application ID: <strong>${applicationId}</strong></li>
                                <li style="margin-bottom: 8px; padding-left: 0;">📄 Visa Type: <strong>${visaType}</strong></li>
                                <li style="margin-bottom: 8px; padding-left: 0;">✅ Status: <span style="color: #16a34a; font-weight: bold;">APPROVED</span></li>
                                <li style="padding-left: 0;">📅 Date: <strong>${new Date().toLocaleDateString()}</strong></li>
                            </ul>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1f2937; margin: 0 0 15px 0;">${text.nextSteps}</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                                ${text.steps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${frontendUrl}/#/dashboard" 
                               style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; 
                                      border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                                📋 ${text.button}
                            </a>
                        </div>
                        
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                            <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0;">${text.important}</p>
                            <p style="color: #92400e; margin: 0; font-size: 14px;">${text.note}</p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                            ${text.contact}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            © 2024 International Organization for Migration (IOM)<br>
                            This is an automated message, please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Application approved email sent to ${email} for application ${applicationId}`);
    }
    catch (error) {
        console.error('❌ Error sending application approved email:', error);
        throw new Error('Failed to send application approved email');
    }
};
exports.sendApplicationApprovedEmail = sendApplicationApprovedEmail;
const sendApplicationRejectedEmail = async (email, fullName, applicationId, visaType, rejectionReason, language = 'en') => {
    try {
        const transporter = createTransporter();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const content = {
            en: {
                subject: '❌ Update on Your Visa Application',
                title: 'Application Status Update',
                greeting: `Dear ${fullName}`,
                message: 'We regret to inform you that your visa application has not been approved at this time.',
                details: 'Application Details:',
                reason: 'Reason for rejection:',
                nextSteps: 'What you can do next:',
                steps: [
                    'Review the rejection reason carefully',
                    'Address any issues mentioned in the feedback',
                    'Submit a new application if eligible',
                    'Contact our support team for guidance'
                ],
                button: 'View Application',
                important: 'Important:',
                note: 'You may be eligible to reapply. Please review our guidelines or contact support for assistance.',
                contact: 'If you have questions about this decision, please contact our support team.'
            },
            fr: {
                subject: '❌ Mise à jour de votre demande de visa',
                title: 'Mise à jour du statut de la demande',
                greeting: `Cher/Chère ${fullName}`,
                message: 'Nous regrettons de vous informer que votre demande de visa n\'a pas été approuvée pour le moment.',
                details: 'Détails de la demande:',
                reason: 'Raison du refus:',
                nextSteps: 'Ce que vous pouvez faire ensuite:',
                steps: [
                    'Examinez attentivement la raison du refus',
                    'Réglez les problèmes mentionnés dans les commentaires',
                    'Soumettez une nouvelle demande si éligible',
                    'Contactez notre équipe de support pour obtenir des conseils'
                ],
                button: 'Voir la demande',
                important: 'Important:',
                note: 'Vous pourriez être éligible pour faire une nouvelle demande. Veuillez consulter nos directives ou contacter le support.',
                contact: 'Si vous avez des questions sur cette décision, veuillez contacter notre équipe de support.'
            },
            ht: {
                subject: '❌ Nouvèl sou aplikasyon viza ou an',
                title: 'Aktyalite sou sitiyasyon aplikasyon an',
                greeting: `Chè ${fullName}`,
                message: 'Nou regret fè ou konnen aplikasyon viza ou an pa t apwouve nan moman sa a.',
                details: 'Detay aplikasyon an:',
                reason: 'Rezon refize a:',
                nextSteps: 'Sa ou ka fè apre:',
                steps: [
                    'Gade rezon refize a ak atansyon',
                    'Rezoud pwoblèm yo mansyone nan kominote a',
                    'Soumèt yon nouvel aplikasyon si ou ka',
                    'Kontakte ekip sipò nou an pou konsèy'
                ],
                button: 'Gade aplikasyon',
                important: 'Enpòtan:',
                note: 'Ou ka gen dwa pou w aplike ankò. Tanpri gade gid nou yo oswa kontakte sipò a.',
                contact: 'Si ou gen kesyon sou desizyon sa a, tanpri kontakte ekip sipò nou an.'
            }
        };
        const text = content[language];
        const mailOptions = {
            from: {
                name: 'IOM Visa Application System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: text.subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #dc2626; margin: 0;">IOM Visa Application</h1>
                        <p style="color: #666; margin: 5px 0;">International Organization for Migration</p>
                    </div>
                    
                    <div style="background: #fef2f2; padding: 30px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
                        <h2 style="color: #dc2626; margin: 0 0 20px 0;">📋 ${text.title}</h2>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            ${text.greeting},
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                            ${text.message}
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1f2937; margin: 0 0 15px 0;">${text.details}</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px; list-style: none;">
                                <li style="margin-bottom: 8px; padding-left: 0;">📋 Application ID: <strong>${applicationId}</strong></li>
                                <li style="margin-bottom: 8px; padding-left: 0;">📄 Visa Type: <strong>${visaType}</strong></li>
                                <li style="margin-bottom: 8px; padding-left: 0;">❌ Status: <span style="color: #dc2626; font-weight: bold;">REJECTED</span></li>
                                <li style="padding-left: 0;">📅 Date: <strong>${new Date().toLocaleDateString()}</strong></li>
                            </ul>
                        </div>
                        
                        ${rejectionReason ? `
                        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                            <h3 style="color: #92400e; margin: 0 0 15px 0;">${text.reason}</h3>
                            <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">${rejectionReason}</p>
                        </div>
                        ` : ''}
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1f2937; margin: 0 0 15px 0;">${text.nextSteps}</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                                ${text.steps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${frontendUrl}/#/dashboard" 
                               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; 
                                      border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                                📋 ${text.button}
                            </a>
                        </div>
                        
                        <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0288d1; margin: 20px 0;">
                            <p style="color: #01579b; font-weight: bold; margin: 0 0 10px 0;">${text.important}</p>
                            <p style="color: #01579b; margin: 0; font-size: 14px;">${text.note}</p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                            ${text.contact}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            © 2024 International Organization for Migration (IOM)<br>
                            This is an automated message, please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Application rejected email sent to ${email} for application ${applicationId}`);
    }
    catch (error) {
        console.error('❌ Error sending application rejected email:', error);
        throw new Error('Failed to send application rejected email');
    }
};
exports.sendApplicationRejectedEmail = sendApplicationRejectedEmail;
