import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { Application, DocumentStatus, ApplicationStatus, UserRole, VisaType } from '../types';
import { APP_ROUTES } from '../constants';
import AdminAppointmentCalendar from '../components/AdminAppointmentCalendar';
import DocumentPreview from '../components/DocumentPreview';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import PDFExportModal from '../components/PDFExportModal';
import { DocumentArrowDownIcon } from '../components/Icons';
//import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../components/Icons';

type AdminApplication = Application & { user: { fullName: string; email: string; } };

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const StatusBadge: React.FC<{ status: ApplicationStatus | DocumentStatus }> = ({ status }) => {
    const { t } = useApp();
    const statusStyles: Record<string, string> = {
        [ApplicationStatus.APPROVED]: 'bg-green-100 text-green-800',
        [DocumentStatus.VERIFIED]: 'bg-green-100 text-green-800',
        [ApplicationStatus.IN_REVIEW]: 'bg-yellow-100 text-yellow-800',
        [ApplicationStatus.APPOINTMENT_SCHEDULED]: 'bg-blue-100 text-blue-800',
        [DocumentStatus.UPLOADED]: 'bg-blue-100 text-blue-800',
        [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-800',
        [ApplicationStatus.PENDING_DOCUMENTS]: 'bg-orange-100 text-orange-800',
        [DocumentStatus.MISSING]: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{t(status)}</span>;
};

const RejectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useApp();
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setReason('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason);
        }
    };

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <h3 className="text-lg font-bold text-gray-800 mb-4">{t('rejectionReason')}</h3>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2 border rounded-md min-h-[100px] focus:ring-2 focus:ring-iom-blue"
                    placeholder={t('rejectionReasonPrompt')}
                />
                <div className="flex justify-end space-x-4 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">{t('cancel')}</button>
                    <button onClick={handleConfirm} disabled={!reason.trim()} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 transition-colors">{t('confirm')}</button>
                </div>
            </div>
        </div>
    );
};

const DocumentReview: React.FC<{ app: AdminApplication, onUpdate: () => void }> = ({ app, onUpdate }) => {
    const { t, isLoading, updateDocumentStatusAsAdmin } = useApp();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    const handleRejectClick = (docId: string) => {
        setSelectedDocId(docId);
        setModalOpen(true);
    };

    const handleConfirmRejection = async (reason: string) => {
        if (selectedDocId) {
            await updateDocumentStatusAsAdmin(app.id, selectedDocId, DocumentStatus.REJECTED, reason);
            onUpdate();
        }
        setModalOpen(false);
        setSelectedDocId(null);
    };
    
    const handleVerifyClick = async (docId: string) => {
        await updateDocumentStatusAsAdmin(app.id, docId, DocumentStatus.VERIFIED);
        onUpdate();
    }

    const handleViewDocument = (doc: any) => {
        setPreviewDoc(doc);
        setShowPreview(true);
    };

    return (
        <>
            <div className="bg-gray-50 p-4 mt-4 rounded-lg">
                <RejectionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirmRejection} />
                <h4 className="font-bold text-iom-blue mb-2">{t('documentReview')}</h4>
                <ul className="space-y-3">
                    {app.documents.map(doc => (
                        <li key={doc.id} className="p-3 bg-white rounded-md shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 mb-2 sm:mb-0">
                                <span className="font-semibold">{doc.type}</span>: <StatusBadge status={doc.status} />
                                 {doc.fileName && <span className="text-sm text-gray-500 ml-2">({doc.fileName})</span>}
                                 {doc.status === DocumentStatus.REJECTED && doc.rejectionReason && <p className="text-xs text-red-600 mt-1"><b>{t('rejectionNote')}:</b> {doc.rejectionReason}</p>}
                            </div>
                            <div className="flex items-center space-x-2">
                                {doc.filePath && (
                                    <button 
                                        onClick={() => handleViewDocument(doc)} 
                                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                    >
                                        {t('view')}
                                    </button>
                                )}
                                {doc.status === DocumentStatus.UPLOADED && (
                                    <>
                                        <button onClick={() => handleVerifyClick(doc.id)} disabled={isLoading} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:bg-gray-400">{t('verify')}</button>
                                        <button onClick={() => handleRejectClick(doc.id)} disabled={isLoading} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:bg-gray-400">{t('reject')}</button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            {previewDoc && (
                <DocumentPreview 
                    document={previewDoc}
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
};

const ApplicationRow: React.FC<{ app: AdminApplication, onUpdate: () => void }> = ({ app, onUpdate }) => {
    const { t, isLoading, updateApplicationStatusAsAdmin } = useApp();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const allDocsVerified = app.documents.every(doc => doc.status === DocumentStatus.VERIFIED);

    const handleApprove = async () => {
        await updateApplicationStatusAsAdmin(app.id, ApplicationStatus.APPROVED);
        onUpdate();
    }
    
    const handleReject = async () => {
        await updateApplicationStatusAsAdmin(app.id, ApplicationStatus.REJECTED);
        onUpdate();
    }

    return (
        <tbody className="bg-white divide-y divide-gray-200">
            <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.user.fullName}</div>
                    <div className="text-sm text-gray-500">{app.user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t(app.visaType)}</td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={app.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-iom-blue hover:text-iom-blue/80">
                        {isExpanded ? t('cancel') : t('reviewApplication')}
                    </button>
                </td>
            </tr>
            {isExpanded && (
                <tr>
                    <td colSpan={5} className="p-0">
                        <div className="p-4 bg-iom-blue/5">
                            <DocumentReview app={app} onUpdate={onUpdate} />
                            <div className="mt-4 border-t pt-4">
                                <h4 className="font-bold text-iom-blue mb-2">{t('manageApplication')}</h4>
                                <div className="flex space-x-4">
                                     <button onClick={handleApprove} disabled={!allDocsVerified || isLoading} className="bg-brazil-green text-white px-4 py-2 rounded-md hover:bg-brazil-green/90 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                        {t('approveApplication')}
                                    </button>
                                     <button onClick={handleReject} disabled={isLoading} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400">
                                        {t('rejectApplication')}
                                    </button>
                                </div>
                                {!allDocsVerified && <p className="text-xs text-gray-500 mt-2">All documents must be 'Verified' before approving an application.</p>}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </tbody>
    );
};

const AdminDashboardPage: React.FC = () => {
    const { t, user, isAuthenticated, isLoading, fetchAllApplications } = useApp();
    const [apps, setApps] = useState<AdminApplication[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [visaTypeFilter, setVisaTypeFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'applications' | 'appointments' | 'analytics'>('applications');
    const [showPDFExport, setShowPDFExport] = useState(false);
    const navigate = useNavigate();
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const filters = useMemo(() => ({
        search: debouncedSearchTerm,
        status: statusFilter,
        visaType: visaTypeFilter,
    }), [debouncedSearchTerm, statusFilter, visaTypeFilter]);

    const loadData = useCallback(async () => {
        const data = await fetchAllApplications(filters);
        if (data) {
            setApps(data);
        }
    }, [fetchAllApplications, filters]);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || user?.role !== UserRole.ADMIN)) {
            navigate(APP_ROUTES.HOME);
            return;
        }
        if (user?.role === UserRole.ADMIN) {
            loadData();
        }
    }, [isLoading, isAuthenticated, user, navigate, loadData]);

    if (isLoading && !apps.length) {
        return <div className="flex justify-center items-center h-screen"><p>{t('loading')}</p></div>;
    }

    const applicationStatusOptions = Object.values(ApplicationStatus).filter(s => s !== ApplicationStatus.NOT_STARTED);
    const visaTypeOptions = Object.values(VisaType);

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8 animate-fade-in">
            <div className="container mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-8">{t('adminDashboard')}</h1>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-md mb-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex">
                            <button
                                onClick={() => setActiveTab('applications')}
                                className={`py-4 px-6 font-medium text-sm border-b-2 ${ 
                                    activeTab === 'applications' 
                                        ? 'border-iom-blue text-iom-blue' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t('allApplications')}
                            </button>
                            <button
                                onClick={() => setActiveTab('appointments')}
                                className={`py-4 px-6 font-medium text-sm border-b-2 ${ 
                                    activeTab === 'appointments' 
                                        ? 'border-iom-blue text-iom-blue' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t('appointmentManagement')}
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`py-4 px-6 font-medium text-sm border-b-2 ${ 
                                    activeTab === 'analytics' 
                                        ? 'border-iom-blue text-iom-blue' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t('analyticsOverview')}
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Applications Tab */}
                {activeTab === 'applications' && (
                    <>
                        {/* Header with Export Button */}
                        <div className="bg-white p-4 rounded-lg shadow mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">
                                    {t('applicationManagement')}
                                </h2>
                                <button
                                    onClick={() => setShowPDFExport(true)}
                                    className="flex items-center px-4 py-2 bg-iom-blue text-white rounded-md hover:bg-iom-blue/90 transition-colors"
                                    title={t('exportAdminReport')}
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                    {t('exportReport')}
                                </button>
                            </div>
                            
                            {/* Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder={t('applicantName') + ' / ' + t('applicantEmail')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="p-2 border rounded-md focus:ring-2 focus:ring-iom-blue"
                                />
                                 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded-md focus:ring-2 focus:ring-iom-blue" aria-label="Status filter" title="Status filter">
                                     <option value="">All Statuses</option>
                                     {applicationStatusOptions.map(s => <option key={s} value={s}>{t(s)}</option>)}
                                 </select>
                                 <select value={visaTypeFilter} onChange={(e) => setVisaTypeFilter(e.target.value)} className="p-2 border rounded-md focus:ring-2 focus:ring-iom-blue" aria-label="Visa type filter" title="Visa type filter">
                                     <option value="">All Visa Types</option>
                                     {visaTypeOptions.map(v => <option key={v} value={v}>{t(v)}</option>)}
                                 </select>
                            </div>
                        </div>

                        <div className="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('applicantName')}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('visaType')}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('applicationStatus')}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('createdAt')}</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('reviewApplication')}</span></th>
                                    </tr>
                                </thead>
                                {apps.map(app => <ApplicationRow key={app.id} app={app} onUpdate={loadData} />)}
                            </table>
                             {apps.length === 0 && !isLoading && (
                                <div className="text-center py-10 bg-white">
                                    <p className="text-gray-500">{t('noApplications')}</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <AdminAppointmentCalendar />
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <AnalyticsDashboard />
                )}

                {/* PDF Export Modal */}
                {showPDFExport && (
                    <PDFExportModal
                        isOpen={showPDFExport}
                        onClose={() => setShowPDFExport(false)}
                        applications={apps}
                        exportType="admin-report"
                    />
                )}
            </div>
        </div>
    );
};

export default AdminDashboardPage;