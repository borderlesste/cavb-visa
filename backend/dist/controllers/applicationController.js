"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editApplication = exports.deleteApplication = exports.getApplicationById = exports.getAllUserApplications = exports.scheduleAppointment = exports.uploadDocument = exports.createApplication = exports.getApplication = void 0;
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const db_1 = require("../db");
const types_1 = require("../types");
const applicationService_1 = require("../services/applicationService");
const appointmentLetterService_1 = __importDefault(require("../services/appointmentLetterService"));
const createApplicationSchema = joi_1.default.object({
    visaType: joi_1.default.string().valid(types_1.VisaType.VITEM_III, types_1.VisaType.VITEM_XI).required(),
});
const getRequiredDocuments = (visaType) => {
    const commonDocs = ['Passport', 'Birth Certificate', 'Police Record', 'Identity Document'];
    if (visaType === types_1.VisaType.VITEM_XI) {
        return [...commonDocs, 'Proof of Family Ties (VITEM XI)'];
    }
    // VITEM_III
    return [...commonDocs, 'Humanitarian Reason Proof (VITEM III)'];
};
const getApplication = async (req, res) => {
    const userId = req.user?.id;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        const application = await (0, applicationService_1.fetchApplicationFromDb)(connection, userId);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.status(200).json(application);
    }
    catch (dbError) {
        console.error('Database error in getApplication:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.getApplication = getApplication;
const createApplication = async (req, res) => {
    const { error } = createApplicationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const userId = req.user?.id;
    const { visaType } = req.body;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        // Allow multiple applications - users can create additional ones
        // Optional: Add a reasonable limit to prevent abuse
        const [existingApps] = await connection.execute('SELECT id FROM applications WHERE user_id = ?', [userId]);
        if (existingApps.length >= 5) {
            return res.status(409).json({ message: 'Maximum number of applications reached (5). Please complete or cancel existing applications first.' });
        }
        await connection.beginTransaction();
        // Get visa_type_id
        const [visaTypeRows] = await connection.execute('SELECT id FROM visa_types WHERE name = ?', [visaType]);
        if (visaTypeRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid visa type' });
        }
        const visaTypeId = visaTypeRows[0].id;
        // Get status_id for PENDING_DOCUMENTS
        const [statusRows] = await connection.execute('SELECT id FROM application_status WHERE name = ?', [types_1.ApplicationStatus.PENDING_DOCUMENTS]);
        if (statusRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid application status' });
        }
        const statusId = statusRows[0].id;
        const newAppId = (0, uuid_1.v4)();
        await connection.execute('INSERT INTO applications (id, user_id, visa_type, status, visa_type_id, status_id) VALUES (?, ?, ?, ?, ?, ?)', [newAppId, userId, visaType, types_1.ApplicationStatus.PENDING_DOCUMENTS, visaTypeId, statusId]);
        // Get status_id for MISSING
        const [missingStatusRows] = await connection.execute('SELECT id FROM document_status WHERE name = ?', [types_1.DocumentStatus.MISSING]);
        if (missingStatusRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid document status' });
        }
        const missingStatusId = missingStatusRows[0].id;
        const documentsToCreate = getRequiredDocuments(visaType);
        for (const docType of documentsToCreate) {
            await connection.execute('INSERT INTO documents (id, application_id, document_type, status_id) VALUES (?, ?, ?, ?)', [(0, uuid_1.v4)(), newAppId, docType, missingStatusId]);
        }
        await connection.commit();
        const newApplication = await (0, applicationService_1.fetchApplicationFromDb)(connection, userId);
        res.status(201).json(newApplication);
    }
    catch (dbError) {
        if (connection)
            await connection.rollback();
        console.error('Database error in createApplication:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.createApplication = createApplication;
const uploadDocument = async (req, res) => {
    const userId = req.user?.id;
    const { docId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const { originalname, path } = req.file;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        await connection.beginTransaction();
        const [appRows] = await connection.execute('SELECT id FROM applications WHERE user_id = ?', [userId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found for user.' });
        }
        const applicationId = appRows[0].id;
        // Get status_id for UPLOADED
        const [uploadedStatusRows] = await connection.execute('SELECT id FROM document_status WHERE name = ?', [types_1.DocumentStatus.UPLOADED]);
        if (uploadedStatusRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid document status' });
        }
        const uploadedStatusId = uploadedStatusRows[0].id;
        const [updateResult] = await connection.execute('UPDATE documents SET status_id = ?, file_name = ?, file_path = ?, rejection_reason = NULL WHERE id = ? AND application_id = ?', [uploadedStatusId, originalname, path, docId, applicationId]);
        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Document not found or does not belong to this application.' });
        }
        const [docs] = await connection.execute('SELECT ds.name as status FROM documents d JOIN document_status ds ON d.status_id = ds.id WHERE d.application_id = ?', [applicationId]);
        const allDocsUploadedOrVerified = docs.every((doc) => doc.status === types_1.DocumentStatus.UPLOADED || doc.status === types_1.DocumentStatus.VERIFIED);
        if (allDocsUploadedOrVerified) {
            const [currentAppStatus] = await connection.execute('SELECT status from applications WHERE id = ?', [applicationId]);
            if (currentAppStatus[0].status !== types_1.ApplicationStatus.IN_REVIEW) {
                // Get status_id for IN_REVIEW
                const [inReviewStatusRows] = await connection.execute('SELECT id FROM application_status WHERE name = ?', [types_1.ApplicationStatus.IN_REVIEW]);
                const inReviewStatusId = inReviewStatusRows[0]?.id;
                if (inReviewStatusId) {
                    await connection.execute('UPDATE applications SET status = ?, status_id = ? WHERE id = ?', [types_1.ApplicationStatus.IN_REVIEW, inReviewStatusId, applicationId]);
                }
            }
        }
        else {
            // Get status_id for PENDING_DOCUMENTS
            const [pendingStatusRows] = await connection.execute('SELECT id FROM application_status WHERE name = ?', [types_1.ApplicationStatus.PENDING_DOCUMENTS]);
            const pendingStatusId = pendingStatusRows[0]?.id;
            if (pendingStatusId) {
                await connection.execute('UPDATE applications SET status = ?, status_id = ? WHERE id = ?', [types_1.ApplicationStatus.PENDING_DOCUMENTS, pendingStatusId, applicationId]);
            }
        }
        await connection.commit();
        res.status(200).json({ message: 'File uploaded successfully.' });
    }
    catch (dbError) {
        if (connection)
            await connection.rollback();
        console.error('Database error in uploadDocument:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.uploadDocument = uploadDocument;
const appointmentSchema = joi_1.default.object({
    date: joi_1.default.date().iso().required(),
    time: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    personalInfo: joi_1.default.object({
        dateOfBirth: joi_1.default.date().iso().required(),
        passportNumber: joi_1.default.string().min(6).max(15).required(),
        nationality: joi_1.default.string().min(2).max(100).required(),
    }).optional(),
});
const scheduleAppointment = async (req, res) => {
    const { error } = appointmentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const userId = req.user?.id;
    const { date, time, personalInfo } = req.body;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        await connection.beginTransaction();
        // Get application and user data
        const [appRows] = await connection.execute('SELECT a.id, a.status, a.visa_type, u.fullName, u.email, u.date_of_birth, u.passport_number, u.nationality FROM applications a JOIN users u ON a.user_id = u.id WHERE a.user_id = ?', [userId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found for user.' });
        }
        const application = appRows[0];
        const applicationId = application.id;
        const applicationStatus = application.status;
        if (applicationStatus !== types_1.ApplicationStatus.APPROVED) {
            await connection.rollback();
            return res.status(403).json({ message: 'Application must be approved before scheduling.' });
        }
        // Check if Identity Document is verified
        const [identityDocs] = await connection.execute('SELECT status FROM documents WHERE application_id = ? AND document_type = ?', [applicationId, 'Identity Document']);
        const identityDocStatus = identityDocs[0]?.status;
        if (identityDocStatus !== types_1.DocumentStatus.VERIFIED) {
            await connection.rollback();
            return res.status(403).json({ message: 'Identity Document must be verified before scheduling appointment.' });
        }
        // Update user personal info if provided
        if (personalInfo) {
            await connection.execute('UPDATE users SET date_of_birth = ?, passport_number = ?, nationality = ? WHERE id = ?', [personalInfo.dateOfBirth, personalInfo.passportNumber, personalInfo.nationality, userId]);
        }
        const appointmentId = (0, uuid_1.v4)();
        // Create appointment
        await connection.execute('INSERT INTO appointments (id, application_id, appointment_date, appointment_time, location, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE appointment_date=VALUES(appointment_date), appointment_time=VALUES(appointment_time), status=VALUES(status)', [appointmentId, applicationId, date, time, 'IOM Office, Port-au-Prince', types_1.AppointmentStatus.BOOKED]);
        // Generate appointment letter
        const letterData = {
            fullName: application.fullName,
            email: application.email,
            dateOfBirth: personalInfo?.dateOfBirth || application.date_of_birth,
            passportNumber: personalInfo?.passportNumber || application.passport_number,
            nationality: personalInfo?.nationality || application.nationality,
            appointmentDate: date,
            appointmentTime: time,
            appointmentId,
            applicationId,
            visaType: application.visa_type
        };
        try {
            const letterPath = await appointmentLetterService_1.default.generateConfirmationLetter(appointmentId, letterData);
            // Update appointment with letter path and confirm status
            await connection.execute('UPDATE appointments SET confirmation_letter_path = ?, status = ? WHERE id = ?', [letterPath, types_1.AppointmentStatus.CONFIRMED, appointmentId]);
        }
        catch (letterError) {
            console.error('Error generating appointment letter:', letterError);
            // Continue without letter - appointment still created
        }
        // Update application status
        await connection.execute('UPDATE applications SET status = ? WHERE id = ?', [types_1.ApplicationStatus.APPOINTMENT_SCHEDULED, applicationId]);
        await connection.commit();
        res.status(201).json({
            message: 'Appointment scheduled successfully.',
            appointmentId,
            confirmationGenerated: true
        });
    }
    catch (dbError) {
        if (connection)
            await connection.rollback();
        console.error('Database error in scheduleAppointment:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.scheduleAppointment = scheduleAppointment;
// Get all applications for a user
const getAllUserApplications = async (req, res) => {
    const userId = req.user?.id;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        // Get all applications for the user
        const [appRows] = await connection.execute(`SELECT id, visa_type, status, created_at, updated_at 
             FROM applications 
             WHERE user_id = ? 
             ORDER BY created_at DESC`, [userId]);
        const applications = [];
        for (const app of appRows) {
            // Get documents for each application
            const [docRows] = await connection.execute(`SELECT d.id, d.application_id, d.document_type, d.file_name, d.file_path, ds.name as status, d.rejection_reason
                 FROM documents d
                 JOIN document_status ds ON d.status_id = ds.id
                 WHERE d.application_id = ?`, [app.id]);
            // Get appointment if exists
            const [aptRows] = await connection.execute(`SELECT id, appointment_date as date, appointment_time as time, location, status, confirmation_letter_path
                 FROM appointments 
                 WHERE application_id = ?`, [app.id]);
            const application = {
                id: app.id,
                userId: userId,
                visaType: app.visa_type,
                status: app.status,
                createdAt: app.created_at,
                updatedAt: app.updated_at,
                documents: docRows.map((doc) => ({
                    id: doc.id,
                    type: doc.document_type,
                    fileName: doc.file_name,
                    filePath: doc.file_path,
                    status: doc.status,
                    rejectionReason: doc.rejection_reason
                })),
                appointment: aptRows.length > 0 ? {
                    id: aptRows[0].id,
                    date: aptRows[0].date,
                    time: aptRows[0].time,
                    location: aptRows[0].location,
                    status: aptRows[0].status,
                    confirmationLetterPath: aptRows[0].confirmation_letter_path
                } : null
            };
            applications.push(application);
        }
        res.status(200).json(applications);
    }
    catch (dbError) {
        console.error('Database error in getAllUserApplications:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.getAllUserApplications = getAllUserApplications;
// Get specific application by ID
const getApplicationById = async (req, res) => {
    const userId = req.user?.id;
    const { applicationId } = req.params;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        // Verify the application belongs to the user
        const [appRows] = await connection.execute(`SELECT id, visa_type, status, created_at, updated_at 
             FROM applications 
             WHERE id = ? AND user_id = ?`, [applicationId, userId]);
        if (appRows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        const app = appRows[0];
        // Get documents
        const [docRows] = await connection.execute(`SELECT d.id, d.application_id, d.document_type, d.file_name, d.file_path, ds.name as status, d.rejection_reason
             FROM documents d
             JOIN document_status ds ON d.status_id = ds.id
             WHERE d.application_id = ?`, [app.id]);
        // Get appointment if exists
        const [aptRows] = await connection.execute(`SELECT id, appointment_date as date, appointment_time as time, location, status, confirmation_letter_path
             FROM appointments 
             WHERE application_id = ?`, [app.id]);
        const application = {
            id: app.id,
            userId: userId,
            visaType: app.visa_type,
            status: app.status,
            createdAt: app.created_at,
            updatedAt: app.updated_at,
            documents: docRows.map((doc) => ({
                id: doc.id,
                type: doc.document_type,
                fileName: doc.file_name,
                filePath: doc.file_path,
                status: doc.status,
                rejectionReason: doc.rejection_reason
            })),
            appointment: aptRows.length > 0 ? {
                id: aptRows[0].id,
                date: aptRows[0].date,
                time: aptRows[0].time,
                location: aptRows[0].location,
                status: aptRows[0].status,
                confirmationLetterPath: aptRows[0].confirmation_letter_path
            } : null
        };
        res.status(200).json(application);
    }
    catch (dbError) {
        console.error('Database error in getApplicationById:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.getApplicationById = getApplicationById;
// Delete application
const deleteApplication = async (req, res) => {
    const userId = req.user?.id;
    const { applicationId } = req.params;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        await connection.beginTransaction();
        // Verify the application belongs to the user and get its current status
        const [appRows] = await connection.execute('SELECT id, status FROM applications WHERE id = ? AND user_id = ?', [applicationId, userId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found' });
        }
        const applicationStatus = appRows[0].status;
        // Only allow deletion if application is not approved or has scheduled appointment
        if (applicationStatus === 'APPROVED' || applicationStatus === 'APPOINTMENT_SCHEDULED') {
            await connection.rollback();
            return res.status(403).json({
                message: 'Cannot delete approved applications or applications with scheduled appointments'
            });
        }
        // Delete related appointments first
        await connection.execute('DELETE FROM appointments WHERE application_id = ?', [applicationId]);
        // Delete related documents
        await connection.execute('DELETE FROM documents WHERE application_id = ?', [applicationId]);
        // Delete the application
        await connection.execute('DELETE FROM applications WHERE id = ?', [applicationId]);
        await connection.commit();
        res.status(200).json({ message: 'Application deleted successfully' });
    }
    catch (dbError) {
        if (connection)
            await connection.rollback();
        console.error('Database error in deleteApplication:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.deleteApplication = deleteApplication;
// Edit application visa type
const editApplication = async (req, res) => {
    const { error } = createApplicationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const userId = req.user?.id;
    const { applicationId } = req.params;
    const { visaType } = req.body;
    let connection;
    try {
        connection = await db_1.pool.getConnection();
        await connection.beginTransaction();
        // Verify the application belongs to the user and get its current status
        const [appRows] = await connection.execute('SELECT id, status, visa_type FROM applications WHERE id = ? AND user_id = ?', [applicationId, userId]);
        if (appRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Application not found' });
        }
        const currentApplication = appRows[0];
        const currentStatus = currentApplication.status;
        const currentVisaType = currentApplication.visa_type;
        // Only allow editing if application is not approved or has scheduled appointment
        if (currentStatus === 'APPROVED' || currentStatus === 'APPOINTMENT_SCHEDULED') {
            await connection.rollback();
            return res.status(403).json({
                message: 'Cannot edit approved applications or applications with scheduled appointments'
            });
        }
        // If visa type is the same, no need to update
        if (currentVisaType === visaType) {
            await connection.rollback();
            return res.status(200).json({ message: 'No changes needed' });
        }
        // Get visa_type_id for new visa type
        const [visaTypeRows] = await connection.execute('SELECT id FROM visa_types WHERE name = ?', [visaType]);
        if (visaTypeRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid visa type' });
        }
        const visaTypeId = visaTypeRows[0].id;
        // Update application visa type
        await connection.execute('UPDATE applications SET visa_type = ?, visa_type_id = ? WHERE id = ?', [visaType, visaTypeId, applicationId]);
        // Delete current documents since requirements might be different
        await connection.execute('DELETE FROM documents WHERE application_id = ?', [applicationId]);
        // Get status_id for MISSING
        const [missingStatusRows] = await connection.execute('SELECT id FROM document_status WHERE name = ?', [types_1.DocumentStatus.MISSING]);
        const missingStatusId = missingStatusRows[0].id;
        // Create new required documents based on new visa type
        const documentsToCreate = getRequiredDocuments(visaType);
        for (const docType of documentsToCreate) {
            await connection.execute('INSERT INTO documents (id, application_id, document_type, status_id) VALUES (?, ?, ?, ?)', [(0, uuid_1.v4)(), applicationId, docType, missingStatusId]);
        }
        // Reset application status to PENDING_DOCUMENTS
        const [pendingStatusRows] = await connection.execute('SELECT id FROM application_status WHERE name = ?', [types_1.ApplicationStatus.PENDING_DOCUMENTS]);
        const pendingStatusId = pendingStatusRows[0].id;
        await connection.execute('UPDATE applications SET status = ?, status_id = ? WHERE id = ?', [types_1.ApplicationStatus.PENDING_DOCUMENTS, pendingStatusId, applicationId]);
        await connection.commit();
        // Fetch updated application
        const updatedApplication = await (0, applicationService_1.fetchApplicationFromDb)(connection, userId);
        res.status(200).json({
            message: 'Application updated successfully',
            application: updatedApplication
        });
    }
    catch (dbError) {
        if (connection)
            await connection.rollback();
        console.error('Database error in editApplication:', dbError);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        if (connection)
            connection.release();
    }
};
exports.editApplication = editApplication;
