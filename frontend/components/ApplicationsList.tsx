import * as React from 'react';
import { useState, useEffect } from 'react';
import '../src/styles/progress.css';
import { useApp } from '../hooks/useApp';
import { Application, ApplicationStatus, DocumentStatus, VisaType, Document as AppDocument } from '../types';
import { 
    ChevronDownIcon, 
    ChevronRightIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    XCircleIcon, 
    DocumentIcon,
    CalendarIcon,
    PlusIcon,
    TrashIcon,
    EditIcon
} from './Icons';
import { StatusBadge } from './StatusBadge';
import ProcessTimeline from './ProcessTimeline';
import DocumentPreview from './DocumentPreview';
import PDFExportModal from './PDFExportModal';

interface ApplicationsListProps {
    onCreateNew: () => void;
    onViewApplication: (application: Application) => void;
    onCountChange?: (count: number) => void;
}

interface ApplicationCardProps {
    application: Application;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onViewFull: () => void;
    onDelete: (applicationId: string) => void;
    onEdit: (applicationId: string, currentVisaType: VisaType) => void;
}

const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
        case ApplicationStatus.APPROVED:
            return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
        case ApplicationStatus.IN_REVIEW:
            return <ClockIcon className="w-5 h-5 text-yellow-600" />;
        case ApplicationStatus.REJECTED:
            return <XCircleIcon className="w-5 h-5 text-red-600" />;
        case ApplicationStatus.APPOINTMENT_SCHEDULED:
            return <CalendarIcon className="w-5 h-5 text-blue-600" />;
        default:
            return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
};

const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
        case ApplicationStatus.APPROVED:
            return 'border-l-green-500 bg-green-50';
        case ApplicationStatus.IN_REVIEW:
            return 'border-l-yellow-500 bg-yellow-50';
        case ApplicationStatus.REJECTED:
            return 'border-l-red-500 bg-red-50';
        case ApplicationStatus.APPOINTMENT_SCHEDULED:
            return 'border-l-blue-500 bg-blue-50';
        default:
            return 'border-l-gray-500 bg-gray-50';
    }
};

const ApplicationCard: React.FC<ApplicationCardProps> = ({ 
    application, 
    isExpanded, 
    onToggleExpand, 
    onViewFull,
    onDelete,
    onEdit 
}) => {
    const { t } = useApp();
    const [previewDocument, setPreviewDocument] = useState<any>(null);
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [showPDFExport, setShowPDFExport] = useState(false);

    const handleViewDocument = (document: any) => {
        setPreviewDocument(document);
        setShowDocumentPreview(true);
    };

    const completedDocs = application.documents.filter((doc: AppDocument) => 
        doc.status === DocumentStatus.VERIFIED
    ).length;
    const totalDocs = application.documents.length;
    const docProgress = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

    return (
        <div className={`bg-white rounded-lg shadow-md border-l-4 ${getStatusColor(application.status)} transition-all duration-200 hover:shadow-lg`}>
            {/* Header - Always visible */}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                        {getStatusIcon(application.status)}
                        <div className="flex-1">
                            <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {t(application.visaType)}
                                </h3>
                                <StatusBadge status={application.status} />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {t('createdAt')}: {new Date(application.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                                ID: {application.id.slice(-8)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onViewFull}
                            className="px-3 py-1.5 text-sm font-medium text-iom-blue hover:text-iom-blue/80 transition-colors"
                        >
                            {t('viewDetails')}
                        </button>
                        
                        <button
                            onClick={onToggleExpand}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={isExpanded ? t('collapse') : t('expand')}
                        >
                            {isExpanded ? (
                                <ChevronDownIcon className="w-5 h-5" />
                            ) : (
                                <ChevronRightIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{t('documentsProgress')}</span>
                        <span>{completedDocs}/{totalDocs}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        {(() => {
                            const valNow = Math.round(docProgress);
                            const widthClass = `progress-w-${valNow}`;
                            return (
                                <progress
                                    value={valNow}
                                    max={100}
                                    aria-label={t('documentsProgress')}
                                    title={`${valNow}%`}
                                    className={`progress-bar-inner ${widthClass} h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-iom-blue [&::-moz-progress-bar]:bg-iom-blue`}
                                    data-width={docProgress}
                                />
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-gray-200">
                    <div className="p-6 space-y-6">
                        {/* Timeline */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                {t('processTimeline')}
                            </h4>
                            <ProcessTimeline application={application} compact />
                        </div>

                        {/* Documents summary */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                {t('documents')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {application.documents.slice(0, 4).map((doc: AppDocument) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <DocumentIcon className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {doc.type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {t(doc.status)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {doc.status === DocumentStatus.VERIFIED && (
                                                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                            )}
                                            {doc.filePath && (
                                                <button
                                                    onClick={() => handleViewDocument(doc)}
                                                    className="text-xs text-iom-blue hover:text-iom-blue/80"
                                                >
                                                    {t('view')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {application.documents.length > 4 && (
                                <p className="text-sm text-gray-500 mt-2">
                                    {(() => {
                                        const extra = application.documents.length - 4;
                                        return t('andXMore')?.replace?.('{{count}}', String(extra)) ?? `+ ${extra} more`;
                                    })()}
                                </p>
                            )}
                        </div>

                        {/* Appointment info */}
                        {application.appointment && (
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                    {t('appointment')}
                                </h4>
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium text-blue-900">
                                                {new Date(application.appointment.date).toLocaleDateString()} 
                                                {t('at')} {application.appointment.time}
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                {application.appointment.location}
                                            </p>
                                            <p className="text-xs text-blue-600">
                                                {t('status')}: {t(application.appointment.status)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowPDFExport(true)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                {t('exportPDF')}
                            </button>
                            <button
                                onClick={onViewFull}
                                className="px-4 py-2 text-sm font-medium text-white bg-iom-blue rounded-md hover:bg-iom-blue/90 transition-colors"
                            >
                                {t('viewFullDetails')}
                            </button>
                            {/* Only show edit and delete buttons for non-approved applications */}
                            {application.status !== ApplicationStatus.APPROVED && application.status !== ApplicationStatus.APPOINTMENT_SCHEDULED && (
                                <>
                                    <button
                                        onClick={() => onEdit(application.id, application.visaType)}
                                        className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                                        title={t('editApplication')}
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(application.id)}
                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors flex items-center"
                                        title={t('deleteApplication')}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {showDocumentPreview && previewDocument && (
                <DocumentPreview
                    document={previewDocument}
                    isOpen={showDocumentPreview}
                    onClose={() => {
                        setShowDocumentPreview(false);
                        setPreviewDocument(null);
                    }}
                />
            )}

            {/* PDF Export Modal */}
            {showPDFExport && (
                <PDFExportModal
                    isOpen={showPDFExport}
                    onClose={() => setShowPDFExport(false)}
                    application={application}
                    exportType="application"
                />
            )}
        </div>
    );
};

const ApplicationsList: React.FC<ApplicationsListProps> = ({ onCreateNew, onViewApplication, onCountChange }: ApplicationsListProps) => {
    const { t } = useApp();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [applicationToDelete, setApplicationToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [applicationToEdit, setApplicationToEdit] = useState<{id: string, currentVisaType: VisaType} | null>(null);
    const [newVisaType, setNewVisaType] = useState<VisaType | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setIsLoading(true);
        try {
            const { api } = await import('../services/api');
            const data = await api.getUserApplications();
            setApplications(data);
            onCountChange && onCountChange(data.length);
        } catch (error) {
            console.error('Error fetching applications:', error);
            onCountChange && onCountChange(0);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCardExpansion = (applicationId: string) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(applicationId)) {
            newExpanded.delete(applicationId);
        } else {
            newExpanded.add(applicationId);
        }
        setExpandedCards(newExpanded);
    };

    const handleDeleteApplication = (applicationId: string) => {
        setApplicationToDelete(applicationId);
        setShowDeleteModal(true);
    };

    const confirmDeleteApplication = async () => {
        if (!applicationToDelete) return;
        
        setIsDeleting(true);
        try {
            const { api } = await import('../services/api');
            await api.deleteApplication(applicationToDelete);
            
            // Remove the application from the local state
            setApplications(prev => {
                const updated = prev.filter(app => app.id !== applicationToDelete);
                onCountChange && onCountChange(updated.length);
                return updated;
            });
            
            // Show success message (you might want to add a toast notification here)
            console.log(t('applicationDeleted'));
            
        } catch (error: any) {
            console.error('Error deleting application:', error);
            // Show error message to user
            alert(error.message || 'Failed to delete application');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setApplicationToDelete(null);
        }
    };

    const handleEditApplication = (applicationId: string, currentVisaType: VisaType) => {
        setApplicationToEdit({id: applicationId, currentVisaType});
        setNewVisaType(currentVisaType);
        setShowEditModal(true);
    };

    const confirmEditApplication = async () => {
        if (!applicationToEdit || !newVisaType) return;
        
        setIsEditing(true);
        try {
            const { api } = await import('../services/api');
            await api.editApplication(applicationToEdit.id, newVisaType);
            
            // Refresh applications list to show updated data
            await fetchApplications();
            
            // Show success message
            console.log(t('applicationUpdated'));
            
        } catch (error: any) {
            console.error('Error editing application:', error);
            // Show error message to user
            alert(error.message || 'Failed to edit application');
        } finally {
            setIsEditing(false);
            setShowEditModal(false);
            setApplicationToEdit(null);
            setNewVisaType(null);
        }
    };

    const filteredAndSortedApplications = applications
        .filter(app => filterStatus === 'all' || app.status === filterStatus)
        .sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
                return a.status.localeCompare(b.status);
            }
        });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iom-blue"></div>
                <span className="ml-4 text-gray-600">{t('loadingApplications')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {t('myApplications')}
                    </h2>
                    <div className="space-y-1">
                        {/* Pluralized applications count */}
                        <p className="text-sm text-gray-600">
                            {(() => {
                                const count = applications.length;
                                const key = count === 1 ? 'applicationsCount_one' : 'applicationsCount_other';
                                return t(key)?.replace?.('{{count}}', String(count)) ?? `${count}`;
                            })()}
                        </p>
                        {/* Remaining quota */}
                        <p className="text-xs text-blue-600">
                            {(() => {
                                const used = applications.length;
                                const total = 5; // TODO: externalize quota
                                const remaining = Math.max(0, total - used);
                                return t('applicationsRemaining')
                                    ?.replace?.('{{count}}', String(remaining))
                                    ?.replace?.('{{used}}', String(used))
                                    ?.replace?.('{{total}}', String(total))
                                    ?? `${remaining} (${used}/${total})`;
                            })()}
                        </p>
                    </div>
                </div>

                {applications.length > 0 && (
                    <button
                        onClick={onCreateNew}
                        className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-brazil-green text-white rounded-md hover:bg-brazil-green/90 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        {t('createNewApplication')}
                    </button>
                )}
            </div>

            {/* Filters and Sort */}
            {applications.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                            {t('filterByStatus')}:
                        </label>
                        <select
                            id="status-filter"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as ApplicationStatus | 'all')}
                            className="text-sm border-gray-300 rounded-md focus:ring-iom-blue focus:border-iom-blue"
                        >
                            <option value="all">{t('allStatuses')}</option>
                            <option value={ApplicationStatus.PENDING_DOCUMENTS}>{t(ApplicationStatus.PENDING_DOCUMENTS)}</option>
                            <option value={ApplicationStatus.IN_REVIEW}>{t(ApplicationStatus.IN_REVIEW)}</option>
                            <option value={ApplicationStatus.APPOINTMENT_SCHEDULED}>{t(ApplicationStatus.APPOINTMENT_SCHEDULED)}</option>
                            <option value={ApplicationStatus.APPROVED}>{t(ApplicationStatus.APPROVED)}</option>
                            <option value={ApplicationStatus.REJECTED}>{t(ApplicationStatus.REJECTED)}</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">
                            {t('sortBy')}:
                        </label>
                        <select
                            id="sort-by"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                            className="text-sm border-gray-300 rounded-md focus:ring-iom-blue focus:border-iom-blue"
                        >
                            <option value="date">{t('dateCreated')}</option>
                            <option value="status">{t('status')}</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Applications List */}
            {filteredAndSortedApplications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
                    <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {applications.length === 0 ? t('noApplicationsYet') : t('noApplicationsMatch')}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {applications.length === 0 ? t('startFirstApplication') : t('adjustFilters')}
                    </p>
                    {/* Removed duplicate create button to avoid multiple CTAs when list is empty */}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedApplications.map((application) => (
                        <ApplicationCard
                            key={application.id}
                            application={application}
                            isExpanded={expandedCards.has(application.id)}
                            onToggleExpand={() => toggleCardExpansion(application.id)}
                            onViewFull={() => onViewApplication(application)}
                            onDelete={handleDeleteApplication}
                            onEdit={handleEditApplication}
                        />
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center mb-4">
                            <XCircleIcon className="w-8 h-8 text-red-500 mr-3" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {t('deleteApplication')}
                            </h3>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                            {t('confirmDelete')}
                        </p>
                        
                        <p className="text-sm text-gray-500 mb-6">
                            {t('deleteWarning')}
                        </p>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setApplicationToDelete(null);
                                }}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmDeleteApplication}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isDeleting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                )}
                                {isDeleting ? 'Deleting...' : t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Application Modal */}
            {showEditModal && applicationToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center mb-4">
                            <EditIcon className="w-8 h-8 text-blue-500 mr-3" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {t('editVisaType')}
                            </h3>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                            {t('confirmEdit')}
                        </p>
                        
                        <p className="text-sm text-yellow-600 mb-4">
                            {t('editWarning')}
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('selectNewVisaType')}
                            </label>
                            <select
                                aria-label={t('selectNewVisaType')}
                                value={newVisaType || ''}
                                onChange={(e) => setNewVisaType(e.target.value as VisaType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                            >
                                <option value={VisaType.VITEM_XI}>
                                    {t(VisaType.VITEM_XI)}
                                </option>
                                <option value={VisaType.VITEM_III}>
                                    {t(VisaType.VITEM_III)}
                                </option>
                            </select>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setApplicationToEdit(null);
                                    setNewVisaType(null);
                                }}
                                disabled={isEditing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmEditApplication}
                                disabled={isEditing || newVisaType === applicationToEdit.currentVisaType}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isEditing ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                    <EditIcon className="w-4 h-4 mr-2" />
                                )}
                                {isEditing ? 'Updating...' : t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationsList;