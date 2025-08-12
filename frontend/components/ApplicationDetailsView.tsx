import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Application, ApplicationStatus, DocumentStatus, AppointmentStatus } from '../types';
import { 
    ArrowLeftIcon, 
    DocumentArrowDownIcon, 
    DocumentIcon,
    UploadIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    CalendarIcon,
    InfoCircleIcon
} from './Icons';
import { StatusBadge } from './StatusBadge';
import ProcessTimeline from './ProcessTimeline';
import DocumentPreview from './DocumentPreview';
import PDFExportModal from './PDFExportModal';
import EnhancedAppointmentScheduler from './EnhancedAppointmentScheduler';

interface ApplicationDetailsViewProps {
    application: Application;
    onBack: () => void;
}

const DocumentRow: React.FC<{ 
    doc: any; 
    onViewDocument: (doc: any) => void;
}> = ({ doc, onViewDocument }) => {
    const { t, uploadDocument, isLoading } = useApp();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadDocument(doc.id, e.target.files[0]);
        }
    };

    const handleViewDocument = () => {
        if (doc.filePath) {
            onViewDocument(doc);
        }
    };

    const getStatusIcon = () => {
        switch (doc.status) {
            case DocumentStatus.VERIFIED:
                return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
            case DocumentStatus.UPLOADED:
                return <ClockIcon className="w-4 h-4 text-blue-600" />;
            case DocumentStatus.REJECTED:
                return <XCircleIcon className="w-4 h-4 text-red-600" />;
            default:
                return <DocumentIcon className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <tr className="border-b hover:bg-gray-50">
            <td className="py-4 px-6 text-gray-700 font-medium">
                <div className="flex items-center space-x-3">
                    {getStatusIcon()}
                    <div>
                        <span>{doc.type}</span>
                        {doc.status === DocumentStatus.REJECTED && doc.rejectionReason && (
                            <div className="mt-2 flex items-start text-xs text-red-600">
                                <InfoCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
                                <span className="flex-1">
                                    <b>{t('rejectionNote')}:</b> {doc.rejectionReason}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-4 px-6">
                <StatusBadge status={doc.status} />
            </td>
            <td className="py-4 px-6 text-sm text-gray-500">
                {doc.fileName || '—'}
            </td>
            <td className="py-4 px-6 text-sm text-gray-500">
                {doc.filePath ? new Date().toLocaleDateString() : '—'}
            </td>
            <td className="py-4 px-6">
                {doc.status === DocumentStatus.MISSING || doc.status === DocumentStatus.REJECTED ? (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            aria-label="Upload document" 
                            title="Upload document" 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isLoading} 
                            className="bg-iom-blue text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-iom-blue/90 flex items-center disabled:bg-gray-400 transition-colors"
                        >
                            <UploadIcon className="w-4 h-4 mr-1" />
                            {t('upload')}
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={handleViewDocument}
                        disabled={!doc.filePath}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <DocumentIcon className="w-4 h-4 mr-1" />
                        {t('view')}
                    </button>
                )}
            </td>
        </tr>
    );
};

const AppointmentSection: React.FC<{ application: Application }> = ({ application }) => {
    const { t } = useApp();

    // Case 1: Appointment already exists
    if (application.appointment) {
        const statusColor = application.appointment.status === AppointmentStatus.CONFIRMED ? 'green' : 'blue';
        const statusIcon = application.appointment.status === AppointmentStatus.CONFIRMED ? '✓' : '📅';
        
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CalendarIcon className="w-6 h-6 text-iom-blue mr-2" />
                    {t('appointment')}
                </h3>
                
                <div className={`flex items-center justify-between p-4 bg-${statusColor}-50 rounded-lg`}>
                    <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-${statusColor}-100 rounded-full flex items-center justify-center`}>
                            <CalendarIcon className={`w-6 h-6 text-${statusColor}-600`} />
                        </div>
                        <div>
                            <p className="font-semibold text-lg text-gray-900">
                                {statusIcon} {new Date(application.appointment.date).toLocaleDateString()} 
                                {t('at')} {application.appointment.time}
                            </p>
                            <p className="text-gray-600">{application.appointment.location}</p>
                            <div className="flex items-center mt-2">
                                <StatusBadge status={application.appointment.status} />
                            </div>
                        </div>
                    </div>
                    
                    {application.appointment.confirmationLetterPath && (
                        <button 
                            onClick={() => window.open(application.appointment.confirmationLetterPath, '_blank')}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            {t('downloadLetter')}
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    // Case 2: Application Approved, ready to schedule
    if (application.status === ApplicationStatus.APPROVED) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CalendarIcon className="w-6 h-6 text-iom-blue mr-2" />
                    {t('scheduleAppointment')}
                </h3>
                
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <InfoCircleIcon className="w-6 h-6 text-blue-600" />
                        <p className="text-blue-800 font-medium">{t('appointmentPromptApproved')}</p>
                    </div>
                </div>
                
                <EnhancedAppointmentScheduler application={application} />
            </div>
        );
    }

    // Case 3: Other statuses
    const getPendingMessage = () => {
        switch(application.status) {
            case ApplicationStatus.PENDING_DOCUMENTS:
                return t('noAppointment');
            case ApplicationStatus.IN_REVIEW:
                return t('appointmentPromptReview');
            case ApplicationStatus.REJECTED:
                return t('applicationRejectedMessage');
            default:
                return t('noAppointment');
        }
    };
    
    const message = getPendingMessage();
    const isRejected = application.status === ApplicationStatus.REJECTED;
    const Icon = isRejected ? XCircleIcon : ClockIcon;
    const iconColor = isRejected ? 'text-red-600' : 'text-yellow-600';
    const bgColor = isRejected ? 'bg-red-50' : 'bg-yellow-50';
    const borderColor = isRejected ? 'border-red-200' : 'border-yellow-200';

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <CalendarIcon className="w-6 h-6 text-iom-blue mr-2" />
                {t('appointment')}
            </h3>
            
            <div className={`flex items-center space-x-4 p-4 ${bgColor} border ${borderColor} rounded-lg`}>
                <Icon className={`w-8 h-8 ${iconColor}`} />
                <p className={`font-medium ${iconColor.replace('text-', 'text-')} text-gray-800`}>
                    {message}
                </p>
            </div>
        </div>
    );
};

const ApplicationDetailsView: React.FC<ApplicationDetailsViewProps> = ({ application, onBack }) => {
    const { t } = useApp();
    const [previewDocument, setPreviewDocument] = useState<any>(null);
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [showPDFExport, setShowPDFExport] = useState(false);
    const [pdfExportType, setPDFExportType] = useState<'application' | 'document-checklist'>('application');

    const handleViewDocument = (document: any) => {
        setPreviewDocument(document);
        setShowDocumentPreview(true);
    };

    const handleExportPDF = (type: 'application' | 'document-checklist') => {
        setPDFExportType(type);
        setShowPDFExport(true);
    };

    const completedDocs = application.documents.filter(doc => 
        doc.status === DocumentStatus.VERIFIED
    ).length;
    const totalDocs = application.documents.length;
    const docProgress = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <button
                            onClick={onBack}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            aria-label={t('goBack')}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                                <span>{t(application.visaType)}</span>
                                <StatusBadge status={application.status} />
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {t('applicationId')}: {application.id}
                            </p>
                            <p className="text-sm text-gray-600">
                                {t('createdAt')}: {new Date(application.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleExportPDF('application')}
                            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            title={t('exportApplicationReport')}
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            {t('exportReport')}
                        </button>
                        
                        <button
                            onClick={() => handleExportPDF('document-checklist')}
                            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            title={t('exportDocumentChecklist')}
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            {t('checklist')}
                        </button>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{t('overallProgress')}</span>
                        <span>{Math.round(docProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            className="bg-iom-blue h-3 rounded-full transition-all duration-500"
                            style={{ width: `${docProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <ProcessTimeline application={application} />
            
            {/* Application Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {t('applicationDetails')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-600">{t('visaType')}</label>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{t(application.visaType)}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">{t('status')}</label>
                        <div className="mt-2">
                            <StatusBadge status={application.status} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">{t('submitted')}</label>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                            {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">{t('documentsCompleted')}</label>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                            {completedDocs} / {totalDocs}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">{t('applicationId')}</label>
                        <p className="text-lg font-mono text-gray-900 mt-1">{application.id.slice(-12)}</p>
                    </div>
                </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <DocumentIcon className="w-6 h-6 text-iom-blue mr-2" />
                    {t('documents')} ({completedDocs}/{totalDocs})
                </h3>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="py-3 px-6 text-left font-medium text-gray-600">{t('documentColumn')}</th>
                                <th className="py-3 px-6 text-left font-medium text-gray-600">{t('status')}</th>
                                <th className="py-3 px-6 text-left font-medium text-gray-600">{t('fileNameColumn')}</th>
                                <th className="py-3 px-6 text-left font-medium text-gray-600">{t('uploadDateColumn')}</th>
                                <th className="py-3 px-6 text-left font-medium text-gray-600">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {application.documents.map((doc) => (
                                <DocumentRow 
                                    key={doc.id} 
                                    doc={doc} 
                                    onViewDocument={handleViewDocument}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Appointment */}
            <AppointmentSection application={application} />

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
                    exportType={pdfExportType}
                />
            )}
        </div>
    );
};

export default ApplicationDetailsView;