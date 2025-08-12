import { API_ROUTES } from '../constants';
import { User, Application, VisaType, ApplicationStatus, DocumentStatus, UserRole } from '../types';

const API_URL = API_ROUTES.BASE_URL;

let authToken: string | null = localStorage.getItem('authToken');

interface AdminFilterOptions {
  search?: string;
  status?: string;
  visaType?: string;
}

const getAuthHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
};


const api = {
    login: async (email: string, pass: string): Promise<User | null> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.AUTH}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass }),
            });

            if (!response.ok) {
                return null;
            }

            const { token, user } = await response.json();
            authToken = token;
            localStorage.setItem('authToken', token);
            return user;
        } catch (error) {
            console.error('Login API error:', error);
            return null;
        }
    },

    register: async (fullName: string, email: string, pass: string): Promise<User> => {
        const response = await fetch(`${API_URL}${API_ROUTES.AUTH}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password: pass }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(errorData.message || 'An unknown error occurred.');
        }

        return {
            id: 'temp-id-on-register',
            email,
            fullName,
            role: UserRole.APPLICANT,
        };
    },

    logout: () => {
        authToken = null;
        localStorage.removeItem('authToken');
    },

    checkAuth: async (): Promise<User | null> => {
        if (!authToken) return null;
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.AUTH}/me`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                api.logout();
                return null;
            }
            return await response.json();
        } catch(e) {
            api.logout();
            return null;
        }
    },

    getApplication: async (): Promise<Application | null> => {
       try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}`, {
                headers: getAuthHeaders(),
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch application');
            }
            return await response.json();
        } catch (error) {
            console.error('Get Application API error:', error);
            throw error;
        }
    },

    // Get all applications for the user
    getUserApplications: async (): Promise<Application[]> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/all`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }
            return await response.json();
        } catch (error) {
            console.error('Get User Applications API error:', error);
            throw error;
        }
    },

    // Get specific application by ID
    getApplicationById: async (applicationId: string): Promise<Application | null> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/${applicationId}`, {
                headers: getAuthHeaders(),
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch application');
            }
            return await response.json();
        } catch (error) {
            console.error('Get Application By ID API error:', error);
            throw error;
        }
    },

    // Delete application by ID
    deleteApplication: async (applicationId: string): Promise<void> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/${applicationId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete application');
            }
        } catch (error) {
            console.error('Delete Application API error:', error);
            throw error;
        }
    },

    // Edit application by ID
    editApplication: async (applicationId: string, visaType: VisaType): Promise<void> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/${applicationId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ visaType }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to edit application');
            }
        } catch (error) {
            console.error('Edit Application API error:', error);
            throw error;
        }
    },

    createApplication: async (visaType: VisaType): Promise<Application> => {
        try {
            const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ visaType }),
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to create application' }));
                 throw new Error(errorData.message || 'An unknown error occurred.');
            }
            return await response.json();
        } catch (error) {
             console.error('Create Application API error:', error);
             throw error;
        }
    },

    uploadDocument: async (docId: string, file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('document', file);

        const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/documents/${docId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'File upload failed' }));
            throw new Error(errorData.message || 'An unknown error occurred during file upload.');
        }
    },

    scheduleAppointment: async (date: string, time: string, personalInfo?: {dateOfBirth: string, passportNumber: string, nationality: string}): Promise<void> => {
         const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/appointment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                date, 
                time, 
                personalInfo: personalInfo ? {
                    dateOfBirth: personalInfo.dateOfBirth,
                    passportNumber: personalInfo.passportNumber,
                    nationality: personalInfo.nationality
                } : undefined
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to schedule appointment' }));
            throw new Error(errorData.message || 'An unknown error occurred while scheduling appointment.');
        }
    },

    getAppointmentAvailability: async (month: number, year: number): Promise<{ [key: number]: { status: string; count: number } }> => {
        const response = await fetch(`${API_URL}${API_ROUTES.APPLICATIONS}/appointments/availability?month=${month}&year=${year}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch appointment availability');
        }
        return response.json();
    },

    // --- ADMIN ---
    getAllApplications: async (filters: AdminFilterOptions): Promise<(Application & { user: { fullName: string; email: string; } })[]> => {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        if (filters.visaType) params.append('visaType', filters.visaType);
        
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/applications?${params.toString()}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch applications');
        }
        return response.json();
    },

    updateDocumentStatus: async (applicationId: string, docId: string, status: DocumentStatus, rejectionReason?: string): Promise<void> => {
         const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/applications/${applicationId}/documents/${docId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, rejectionReason }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update document status');
        }
    },

    updateApplicationStatus: async (applicationId: string, status: ApplicationStatus): Promise<void> => {
       const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/applications/${applicationId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update application status');
        }
    },

    // Analytics API
    getAnalytics: async (period: 'week' | 'month' | 'quarter' = 'month'): Promise<any> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/analytics?period=${period}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch analytics');
        }
        return response.json();
    },

    // User management API
    getAllUsers: async (page: number = 1, limit: number = 10, search: string = ''): Promise<any> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
        });
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/users?${params.toString()}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        return response.json();
    },

    createUser: async (userData: { fullName: string; email: string; role: UserRole; sendInvite: boolean }): Promise<void> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create user');
        }
    },

    updateUser: async (userId: string, userData: { fullName: string; email: string; role: UserRole; isActive: boolean }): Promise<void> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/users/${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update user');
        }
    },

    deleteUser: async (userId: string): Promise<void> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete user');
        }
    },

    exportUsers: async (): Promise<Blob> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/users/export`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to export users');
        }
        return response.blob();
    },

    // Appointment management API
    getAppointments: async (date?: string): Promise<any[]> => {
        const params = date ? `?date=${date}` : '';
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/appointments${params}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch appointments');
        }
        return response.json();
    },

    updateAppointmentStatus: async (appointmentId: string, status: string): Promise<void> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update appointment status');
        }
    },

    // Notification API
    getNotifications: async (): Promise<any[]> => {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        return response.json();
    },

    getNotificationPreferences: async (): Promise<any> => {
        const response = await fetch(`${API_URL}/notifications/preferences`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch notification preferences');
        }
        return response.json();
    },

    updateNotificationPreferences: async (preferences: any): Promise<void> => {
        const response = await fetch(`${API_URL}/notifications/preferences`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(preferences),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update preferences');
        }
    },

    // Messaging API
    getConversations: async (): Promise<any[]> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/conversations`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }
        return response.json();
    },

    getMessages: async (conversationId: string): Promise<any[]> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/conversations/${conversationId}/messages`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        return response.json();
    },

    sendMessage: async (conversationId: string, content: string): Promise<void> => {
        const response = await fetch(`${API_URL}${API_ROUTES.ADMIN}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send message');
        }
    }
};

export { api };