import { PoolConnection } from 'mysql2/promise';
import { Application, AppointmentStatus } from '../types';

/**
 * Fetches a complete application object for a given user from the database.
 * @param connection - An active database connection.
 * @param userId - The ID of the user whose application is to be fetched.
 * @returns A complete Application object or null if not found.
 */
export const fetchApplicationFromDb = async (connection: PoolConnection, userId: string): Promise<Application | null> => {
    const [appRows]: any = await connection.execute('SELECT * FROM applications WHERE user_id = ?', [userId]);

    if (appRows.length === 0) {
        return null;
    }

    const appData = appRows[0];
    const applicationId = appData.id;

    const [docRows]: any = await connection.execute('SELECT d.id, d.document_type as type, ds.name as status, d.file_name as fileName, d.file_path as filePath, d.rejection_reason as rejectionReason FROM documents d JOIN document_status ds ON d.status_id = ds.id WHERE d.application_id = ?', [applicationId]);
    const [aptRows]: any = await connection.execute('SELECT id, appointment_date as date, appointment_time as time, location FROM appointments WHERE application_id = ?', [applicationId]);

    const application: Application = {
        id: appData.id,
        userId: appData.user_id,
        visaType: appData.visa_type,
        status: appData.status,
        createdAt: new Date(appData.created_at).toISOString(),
        documents: docRows,
        appointment: aptRows.length > 0 ? {
            id: aptRows[0].id,
            date: new Date(aptRows[0].date).toISOString(),
            time: aptRows[0].time,
            location: aptRows[0].location,
            status: AppointmentStatus.BOOKED
        } : null,
    };

    return application;
};
