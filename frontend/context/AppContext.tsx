import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Language, User, Application, Notification, UserRole, VisaType, DocumentStatus, ApplicationStatus } from '../types';
import { TRANSLATIONS } from '../constants';
import { api } from '../services/api';
import { API_ROUTES } from '../constants'; // Add this import for API_ROUTES

interface AdminFilterOptions {
  search?: string;
  status?: string;
  visaType?: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isAuthenticated: boolean;
  user: User | null;
  application: Application | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => void;
  register: (fullName: string, email: string, pass: string) => Promise<boolean>;
  startNewApplication: (visaType: VisaType) => Promise<void>;
  uploadDocument: (docId: string, file: File) => Promise<void>;
  scheduleAppointment: (date: string, time: string, personalInfo?: {dateOfBirth: string, passportNumber: string, nationality: string}) => Promise<void>;
  notifications: Notification[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: number) => void;
  // Admin functions
  fetchAllApplications: (filters: AdminFilterOptions) => Promise<(Application & { user: { fullName: string; email: string; } })[] | undefined>;
  updateDocumentStatusAsAdmin: (applicationId: string, docId: string, status: DocumentStatus, reason?: string) => Promise<void>;
  updateApplicationStatusAsAdmin: (applicationId: string, status: ApplicationStatus) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true for auth check
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const t = useCallback((key: string): string => {
    return TRANSLATIONS[language][key] || key;
  }, [language]);
  
  const notificationIdRef = useRef(1);
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = notificationIdRef.current++;
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchApplicationData = useCallback(async () => {
    try {
      const appData = await api.getApplication();
      setApplication(appData);
    } catch (error) {
      console.error(error);
      addNotification(t('apiError'), 'error');
      setApplication(null);
    }
  }, [t, addNotification]);

  useEffect(() => {
    const checkUserSession = async () => {
        try {
            const userData = await api.checkAuth();
            if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                if (userData.role === UserRole.APPLICANT) {
                    try {
                      const appData = await api.getApplication();
                      setApplication(appData);
                    } catch (error) {
                      console.error(error);
                      addNotification(t('apiError'), 'error');
                      setApplication(null);
                    }
                }
            }
        } catch (error) {
            console.error("Session check failed", error);
        } finally {
            setIsLoading(false);
        }
    };
    checkUserSession();
  }, [t, addNotification]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== UserRole.APPLICANT) {
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const wsUrl = `${API_ROUTES.WEBSOCKET}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.type === 'APPLICATION_UPDATED' && data.payload?.application) {
                setApplication(data.payload.application);
                addNotification("Your application has been updated.", 'info');
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };

    // Cleanup on component unmount
    return () => {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
    };
}, [isAuthenticated, user, addNotification]);


  const login = async (email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const userData = await api.login(email, pass);
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        if (userData.role === UserRole.APPLICANT) {
          await fetchApplicationData();
        }
        return userData;
      }
      addNotification(t('invalidCredentials'), 'error');
      return null;
    } catch (error) {
      addNotification(t('apiError'), 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const newUser = await api.register(fullName, email, pass);
      if(newUser) {
          addNotification(t('registrationSuccess'), 'success');
          return true;
      }
      return false;
    } catch (error) {
       addNotification((error as Error).message, 'error');
       return false;
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
    setApplication(null);
  };
  
  const startNewApplication = async (visaType: VisaType) => {
    if(!user) return;
    setIsLoading(true);
    try {
        const newApp = await api.createApplication(visaType);
        setApplication(newApp);
        addNotification('Application started!', 'success');
    } catch(error) {
        addNotification((error as Error).message, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const uploadDocument = async (docId: string, file: File) => {
      if(!user) return;
      setIsLoading(true);
      try {
          await api.uploadDocument(docId, file);
          addNotification(t('fileUploaded'), 'success');
          await fetchApplicationData();
      } catch(error) {
          addNotification((error as Error).message, 'error');
      } finally {
          setIsLoading(false);
      }
  };
  
  const scheduleAppointment = async (date: string, time: string, personalInfo?: {dateOfBirth: string, passportNumber: string, nationality: string}) => {
      if(!user) return;
      setIsLoading(true);
      try {
          await api.scheduleAppointment(date, time, personalInfo);
          addNotification(t('appointmentBooked'), 'success');
          await fetchApplicationData();
      } catch(error) {
          addNotification((error as Error).message, 'error');
      } finally {
          setIsLoading(false);
      }
  };

  // --- Admin Functions ---
  const fetchAllApplications = async (filters: AdminFilterOptions) => {
      if(user?.role !== UserRole.ADMIN) return undefined;
      try {
          return await api.getAllApplications(filters);
      } catch (error) {
          addNotification(t('apiError'), 'error');
          return undefined;
      }
  };

  const updateDocumentStatusAsAdmin = async (applicationId: string, docId: string, status: DocumentStatus, reason?: string) => {
      if(user?.role !== UserRole.ADMIN) return;
      try {
          await api.updateDocumentStatus(applicationId, docId, status, reason);
          addNotification(status === DocumentStatus.VERIFIED ? t('documentVerified') : t('documentRejected'), 'success');
      } catch (error) {
          addNotification(t('apiError'), 'error');
      }
  };

  const updateApplicationStatusAsAdmin = async (applicationId: string, status: ApplicationStatus) => {
      if(user?.role !== UserRole.ADMIN) return;
      try {
          await api.updateApplicationStatus(applicationId, status);
          addNotification(status === ApplicationStatus.APPROVED ? t('applicationApproved') : t('applicationRejected'), 'success');
      } catch (error) {
          addNotification(t('apiError'), 'error');
      }
  };

  return (
    <AppContext.Provider value={{ 
        language, setLanguage, t, isAuthenticated, user, application, isLoading, 
        login, logout, register, startNewApplication, uploadDocument, scheduleAppointment,
        notifications, addNotification, removeNotification,
        fetchAllApplications, updateDocumentStatusAsAdmin, updateApplicationStatusAsAdmin
    }}>
      {children}
    </AppContext.Provider>
  );
};