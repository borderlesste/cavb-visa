import express from 'express';
import Joi from 'joi';
import { pool } from '../db';
import { ApplicationStatus, DocumentStatus, VisaType } from '../types';
import { sendMessageToUser } from '../services/webSocketService';
import { fetchApplicationFromDb } from '../services/applicationService';
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from '../services/emailService';

export const getAllApplications = async (req: express.Request, res: express.Response) => {
    let connection;
    try {
        const { search, status, visaType } = req.query;

        let sql = `
            SELECT 
                a.id, a.user_id as userId, a.visa_type as visaType, a.status, a.created_at as createdAt,
                u.fullName, u.email
            FROM applications a
            JOIN users u ON a.user_id = u.id
        `;
        
        const params: (string | undefined)[] = [];
        const whereClauses: string[] = [];

        if (search && typeof search === 'string') {
            whereClauses.push(`(u.fullName LIKE ? OR u.email LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status && typeof status === 'string' && Object.values(ApplicationStatus).includes(status as ApplicationStatus) ) {
            whereClauses.push(`a.status = ?`);
            params.push(status);
        }
        if (visaType && typeof visaType === 'string' && Object.values(VisaType).includes(visaType as VisaType)) {
            whereClauses.push(`a.visa_type = ?`);
            params.push(visaType);
        }

        if(whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ` ORDER BY a.created_at DESC`;

        connection = await pool.getConnection();
        const [apps]: any = await connection.execute(sql, params);

        for (const app of apps) {
             const [docs]: any = await connection.execute(
                'SELECT d.id, d.document_type as type, ds.name as status, d.file_name as fileName, d.file_path as filePath, d.rejection_reason as rejectionReason FROM documents d JOIN document_status ds ON d.status_id = ds.id WHERE d.application_id = ?',
                [app.id]
            );
            app.documents = docs;
            
             const [apt]: any = await connection.execute(
                'SELECT id, appointment_date as date, appointment_time as time, location FROM appointments WHERE application_id = ?',
                [app.id]
            );
            app.appointment = apt.length > 0 ? apt[0] : null;

            // Remap to match frontend expected structure
            app.user = { fullName: app.fullName, email: app.email };
            delete app.fullName;
            delete app.email;
        }

        res.status(200).json(apps);
    } catch (dbError) {
        console.error('Database error in getAllApplications:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};

const updateDocStatusSchema = Joi.object({
    status: Joi.string().valid(DocumentStatus.VERIFIED, DocumentStatus.REJECTED).required(),
    rejectionReason: Joi.string().when('status', {
        is: DocumentStatus.REJECTED,
        then: Joi.string().min(5).required(),
        otherwise: Joi.optional().allow(null, '')
    })
});


export const updateDocumentStatus = async (req: express.Request, res: express.Response) => {
    const { error } = updateDocStatusSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { applicationId, docId } = req.params;
    const { status, rejectionReason } = req.body;
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const [appRows]: any = await connection.execute('SELECT user_id FROM applications WHERE id = ?', [applicationId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found' });
        }
        const userId = appRows[0].user_id;

        // Get status_id for the new status
        const [docStatusRows]: any = await connection.execute('SELECT id FROM document_status WHERE name = ?', [status]);
        if (docStatusRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid document status' });
        }
        const docStatusId = docStatusRows[0].id;

        const [updateResult]: any = await connection.execute(
            'UPDATE documents SET status_id = ?, rejection_reason = ? WHERE id = ? AND application_id = ?',
            [docStatusId, status === DocumentStatus.REJECTED ? rejectionReason : null, docId, applicationId]
        );

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Document not found for this application.' });
        }
        
        // If a document is rejected, the whole application goes back to PENDING_DOCUMENTS
        if (status === DocumentStatus.REJECTED) {
            // Get status_id for PENDING_DOCUMENTS
            const [pendingStatusRows]: any = await connection.execute('SELECT id FROM application_status WHERE name = ?', [ApplicationStatus.PENDING_DOCUMENTS]);
            const pendingStatusId = pendingStatusRows[0]?.id;
            if (pendingStatusId) {
                await connection.execute(
                    'UPDATE applications SET status = ?, status_id = ? WHERE id = ?',
                    [ApplicationStatus.PENDING_DOCUMENTS, pendingStatusId, applicationId]
                );
            }
        }

        await connection.commit();

        // Send real-time update to the user
        const updatedApplication = await fetchApplicationFromDb(connection, userId);
        if (updatedApplication) {
            sendMessageToUser(userId, {
                type: 'APPLICATION_UPDATED',
                payload: { application: updatedApplication }
            });
        }
        
        res.status(200).json({ message: 'Document status updated successfully' });

    } catch (dbError) {
        if (connection) await connection.rollback();
        console.error('Database error in updateDocumentStatus:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};


const updateAppStatusSchema = Joi.object({
    status: Joi.string().valid(ApplicationStatus.APPROVED, ApplicationStatus.REJECTED).required(),
    rejectionReason: Joi.string().when('status', {
        is: ApplicationStatus.REJECTED,
        then: Joi.string().min(10).optional(),
        otherwise: Joi.optional().allow(null, '')
    })
});

export const updateApplicationStatus = async (req: express.Request, res: express.Response) => {
    const { error } = updateAppStatusSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { applicationId } = req.params;
    const { status, rejectionReason } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [appRows]: any = await connection.execute('SELECT user_id, visa_type FROM applications WHERE id = ?', [applicationId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found' });
        }
        const userId = appRows[0].user_id;
        const visaType = appRows[0].visa_type;

        // Get user data for email notification
        const [userRows]: any = await connection.execute('SELECT fullName, email FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found' });
        }
        const { fullName, email } = userRows[0];
        
        if (status === ApplicationStatus.APPROVED) {
            const [docs]: any = await connection.execute(
                'SELECT ds.name as status FROM documents d JOIN document_status ds ON d.status_id = ds.id WHERE d.application_id = ?', 
                [applicationId]
            );
            const allVerified = docs.every((d: {status: string}) => d.status === DocumentStatus.VERIFIED);
            if (!allVerified) {
                await connection.rollback();
                return res.status(400).json({ message: 'All documents must be verified before approving the application.' });
            }
        }
        
        // Get status_id for the new status
        const [statusRows]: any = await connection.execute('SELECT id FROM application_status WHERE name = ?', [status]);
        const statusId = statusRows[0]?.id;
        if (statusId) {
            await connection.execute(
                'UPDATE applications SET status = ?, status_id = ? WHERE id = ?',
                [status, statusId, applicationId]
            );
        }
        
        await connection.commit();

        // Send email notification based on status
        try {
            if (status === ApplicationStatus.APPROVED) {
                await sendApplicationApprovedEmail(
                    email, 
                    fullName, 
                    applicationId, 
                    visaType,
                    'en' // Default to English, could be made dynamic based on user preference
                );
                console.log(`✅ Approval email sent to ${email} for application ${applicationId}`);
            } else if (status === ApplicationStatus.REJECTED) {
                await sendApplicationRejectedEmail(
                    email, 
                    fullName, 
                    applicationId, 
                    visaType,
                    rejectionReason,
                    'en' // Default to English, could be made dynamic based on user preference
                );
                console.log(`✅ Rejection email sent to ${email} for application ${applicationId}`);
            }
        } catch (emailError) {
            console.error('❌ Failed to send status update email:', emailError);
            // Continue with the process even if email fails
        }

        // Send real-time update to the user
        const updatedApplication = await fetchApplicationFromDb(connection, userId);
        if (updatedApplication) {
            sendMessageToUser(userId, {
                type: 'APPLICATION_UPDATED',
                payload: { application: updatedApplication }
            });
        }
        
        res.status(200).json({ message: 'Application status updated successfully.' });

    } catch (dbError) {
        if (connection) await connection.rollback();
        console.error('Database error in updateApplicationStatus:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};

// Analytics Controller
export const getAnalytics = async (req: express.Request, res: express.Response) => {
    const { period = 'month' } = req.query;
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        // Calculate date range based on period
        let startDate: Date;
        const endDate = new Date();
        
        switch (period) {
            case 'week':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
        }
        
        // Get total applications count
        const [totalApps]: any = await connection.execute(
            'SELECT COUNT(*) as count FROM applications WHERE created_at >= ?',
            [startDate]
        );
        
        // Get applications by status
        const [statusBreakdown]: any = await connection.execute(
            'SELECT status, COUNT(*) as count FROM applications WHERE created_at >= ? GROUP BY status',
            [startDate]
        );
        
        // Get applications by visa type
        const [visaTypeBreakdown]: any = await connection.execute(
            'SELECT visa_type, COUNT(*) as count FROM applications WHERE created_at >= ? GROUP BY visa_type',
            [startDate]
        );
        
        // Get monthly applications data
        const [monthlyData]: any = await connection.execute(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
             FROM applications 
             WHERE created_at >= ? 
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month`,
            [startDate]
        );
        
        // Get total appointments
        const [totalAppointments]: any = await connection.execute(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= ?',
            [startDate]
        );
        
        // Calculate status counts
        const approvedCount = statusBreakdown.find((item: any) => item.status === 'APPROVED')?.count || 0;
        const inReviewCount = statusBreakdown.find((item: any) => item.status === 'IN_REVIEW')?.count || 0;
        const pendingDocumentsCount = statusBreakdown.find((item: any) => item.status === 'PENDING_DOCUMENTS')?.count || 0;
        const rejectedCount = statusBreakdown.find((item: any) => item.status === 'REJECTED')?.count || 0;

        const analytics = {
            applications: {
                total: totalApps[0].count,
                approved: approvedCount,
                inReview: inReviewCount,
                pendingDocuments: pendingDocumentsCount,
                rejected: rejectedCount,
                statusBreakdown: statusBreakdown.map((item: any) => ({
                    status: item.status,
                    count: item.count
                })),
                visaTypeBreakdown: visaTypeBreakdown.map((item: any) => ({
                    visaType: item.visa_type,
                    count: item.count
                })),
                monthlyData: monthlyData.map((item: any) => ({
                    month: item.month,
                    count: item.count
                }))
            },
            appointments: {
                total: totalAppointments[0].count
            },
            visaTypes: {
                [visaTypeBreakdown.find((item: any) => item.visa_type === 'VITEM_XI')?.visa_type || 'VITEM_XI']: visaTypeBreakdown.find((item: any) => item.visa_type === 'VITEM_XI')?.count || 0,
                [visaTypeBreakdown.find((item: any) => item.visa_type === 'VITEM_III')?.visa_type || 'VITEM_III']: visaTypeBreakdown.find((item: any) => item.visa_type === 'VITEM_III')?.count || 0
            },
            monthlyStats: monthlyData.map((item: any) => ({
                month: item.month,
                applications: item.count,
                approvals: 0 // This would require additional query to get approvals by month
            })),
            processingTime: {
                average: 14, // Mock data - would need actual calculation
                fastest: 7,
                slowest: 30
            },
            period: period
        };
        
        res.status(200).json(analytics);
        
    } catch (dbError) {
        console.error('Database error in getAnalytics:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};

// Appointments Controller
export const getAppointments = async (req: express.Request, res: express.Response) => {
    const { date } = req.query;
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        let query = `
            SELECT 
                apt.id, 
                apt.appointment_date, 
                apt.appointment_time, 
                apt.location, 
                apt.status,
                apt.confirmation_letter_path,
                a.visa_type,
                u.fullName,
                u.email
            FROM appointments apt
            JOIN applications a ON apt.application_id = a.id
            JOIN users u ON a.user_id = u.id
        `;
        
        const params: any[] = [];
        
        if (date && typeof date === 'string') {
            query += ' WHERE DATE(apt.appointment_date) = ?';
            params.push(date);
        }
        
        query += ' ORDER BY apt.appointment_date, apt.appointment_time';
        
        const [appointments]: any = await connection.execute(query, params);
        
        const formattedAppointments = appointments.map((apt: any) => ({
            id: apt.id,
            date: apt.appointment_date,
            time: apt.appointment_time,
            location: apt.location,
            status: apt.status,
            confirmationLetterPath: apt.confirmation_letter_path,
            visaType: apt.visa_type,
            applicant: {
                name: apt.fullName,
                email: apt.email
            }
        }));
        
        res.status(200).json(formattedAppointments);
        
    } catch (dbError) {
        console.error('Database error in getAppointments:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
};