import React from 'react';
import { useApp } from '../hooks/useApp';
import { Application, ApplicationStatus, DocumentStatus, AppointmentStatus } from '../types';
import { CheckCircleIcon, ClockIcon, XCircleIcon, DocumentIcon, CalendarIcon, UserIcon } from './Icons';

interface TimelineStep {
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'current' | 'upcoming' | 'failed';
    icon: React.ReactNode;
    date?: string;
    details?: string[];
}

interface ProcessTimelineProps {
    application: Application;
    className?: string;
    compact?: boolean;
}

const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ application, className = '', compact = false }) => {
    const { t } = useApp();

    const getTimelineSteps = (): TimelineStep[] => {
        const steps: TimelineStep[] = [
            {
                id: 'application_started',
                title: t('applicationStarted'),
                description: t('applicationStartedDesc'),
                status: 'completed',
                icon: <UserIcon className="w-5 h-5" />,
                date: application.createdAt,
                details: [
                    t('visaType') + ': ' + t(application.visaType),
                    t('applicationId') + ': ' + application.id
                ]
            },
            {
                id: 'documents_upload',
                title: t('documentsUpload'),
                description: t('documentsUploadDesc'),
                status: getDocumentsStatus(),
                icon: <DocumentIcon className="w-5 h-5" />,
                details: getDocumentsDetails()
            },
            {
                id: 'review_process',
                title: t('reviewProcess'),
                description: t('reviewProcessDesc'),
                status: getReviewStatus(),
                icon: <ClockIcon className="w-5 h-5" />,
                details: getReviewDetails()
            },
            {
                id: 'appointment_scheduling',
                title: t('appointmentScheduling'),
                description: t('appointmentSchedulingDesc'),
                status: getAppointmentStatus(),
                icon: <CalendarIcon className="w-5 h-5" />,
                date: application.appointment?.date,
                details: getAppointmentDetails()
            },
            {
                id: 'final_decision',
                title: t('finalDecision'),
                description: t('finalDecisionDesc'),
                status: getFinalStatus(),
                icon: application.status === ApplicationStatus.APPROVED 
                    ? <CheckCircleIcon className="w-5 h-5" />
                    : application.status === ApplicationStatus.REJECTED 
                    ? <XCircleIcon className="w-5 h-5" />
                    : <ClockIcon className="w-5 h-5" />,
                details: getFinalDetails()
            }
        ];

        return steps;
    };

    const getDocumentsStatus = (): 'completed' | 'current' | 'upcoming' | 'failed' => {
        const allDocuments = application.documents;
        const verifiedDocuments = allDocuments.filter(doc => doc.status === DocumentStatus.VERIFIED);
        const rejectedDocuments = allDocuments.filter(doc => doc.status === DocumentStatus.REJECTED);
        const uploadedDocuments = allDocuments.filter(doc => doc.status === DocumentStatus.UPLOADED);
        
        if (rejectedDocuments.length > 0) return 'failed';
        if (verifiedDocuments.length === allDocuments.length) return 'completed';
        if (uploadedDocuments.length > 0 || verifiedDocuments.length > 0) return 'current';
        return 'upcoming';
    };

    const getDocumentsDetails = (): string[] => {
        const allDocuments = application.documents;
        const verifiedCount = allDocuments.filter(doc => doc.status === DocumentStatus.VERIFIED).length;
        const uploadedCount = allDocuments.filter(doc => doc.status === DocumentStatus.UPLOADED).length;
        const rejectedCount = allDocuments.filter(doc => doc.status === DocumentStatus.REJECTED).length;
        
        const details = [
            `${verifiedCount} ${t('verified').toLowerCase()}`,
            `${uploadedCount} ${t('uploaded').toLowerCase()}`,
            `${allDocuments.length - verifiedCount - uploadedCount} ${t('missing').toLowerCase()}`
        ];
        
        if (rejectedCount > 0) {
            details.push(`${rejectedCount} ${t('rejected').toLowerCase()}`);
        }
        
        return details;
    };

    const getReviewStatus = (): 'completed' | 'current' | 'upcoming' | 'failed' => {
        if (application.status === ApplicationStatus.REJECTED) return 'failed';
        if (application.status === ApplicationStatus.APPROVED || 
            application.status === ApplicationStatus.APPOINTMENT_SCHEDULED) return 'completed';
        if (application.status === ApplicationStatus.IN_REVIEW) return 'current';
        return 'upcoming';
    };

    const getReviewDetails = (): string[] => {
        const details = [t('currentStatus') + ': ' + t(application.status)];
        
        if (application.status === ApplicationStatus.IN_REVIEW) {
            details.push(t('estimatedReviewTime') + ': 5-10 ' + t('businessDays'));
        }
        
        return details;
    };

    const getAppointmentStatus = (): 'completed' | 'current' | 'upcoming' | 'failed' => {
        if (application.status === ApplicationStatus.REJECTED) return 'failed';
        if (application.appointment) {
            if (application.appointment.status === AppointmentStatus.COMPLETED) return 'completed';
            if (application.appointment.status === AppointmentStatus.CANCELLED) return 'failed';
            return 'completed'; // Booked or Confirmed
        }
        if (application.status === ApplicationStatus.APPROVED) return 'current';
        return 'upcoming';
    };

    const getAppointmentDetails = (): string[] => {
        if (!application.appointment) {
            if (application.status === ApplicationStatus.APPROVED) {
                return [t('readyToSchedule')];
            }
            return [t('pendingApproval')];
        }

        const details = [
            t('status') + ': ' + t(application.appointment.status),
            t('date') + ': ' + new Date(application.appointment.date).toLocaleDateString(),
            t('time') + ': ' + application.appointment.time,
            t('location') + ': ' + application.appointment.location
        ];

        return details;
    };

    const getFinalStatus = (): 'completed' | 'current' | 'upcoming' | 'failed' => {
        if (application.status === ApplicationStatus.APPROVED) return 'completed';
        if (application.status === ApplicationStatus.REJECTED) return 'failed';
        if (application.appointment?.status === AppointmentStatus.COMPLETED) return 'current';
        return 'upcoming';
    };

    const getFinalDetails = (): string[] => {
        if (application.status === ApplicationStatus.APPROVED) {
            return [
                t('applicationApproved'),
                t('visaProcessingComplete')
            ];
        }
        if (application.status === ApplicationStatus.REJECTED) {
            return [
                t('applicationRejected'),
                t('contactSupportForDetails')
            ];
        }
        return [t('pendingFinalReview')];
    };

    const getStepColor = (status: string) => {
        switch (status) {
            case 'completed':
                return {
                    bg: 'bg-green-500',
                    border: 'border-green-500',
                    text: 'text-green-600',
                    icon: 'text-white'
                };
            case 'current':
                return {
                    bg: 'bg-iom-blue',
                    border: 'border-iom-blue',
                    text: 'text-iom-blue',
                    icon: 'text-white'
                };
            case 'failed':
                return {
                    bg: 'bg-red-500',
                    border: 'border-red-500',
                    text: 'text-red-600',
                    icon: 'text-white'
                };
            default: // upcoming
                return {
                    bg: 'bg-gray-300',
                    border: 'border-gray-300',
                    text: 'text-gray-500',
                    icon: 'text-gray-400'
                };
        }
    };

    const steps = getTimelineSteps();

    if (compact) {
        // Compact horizontal timeline
        return (
            <div className={`${className}`}>
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const colors = getStepColor(step.status);
                        const isLast = index === steps.length - 1;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center border-2 ${colors.border}`}>
                                        <div className={`${colors.icon} text-xs`}>
                                            {step.icon}
                                        </div>
                                    </div>
                                    <span className={`text-xs mt-1 text-center max-w-20 ${colors.text}`}>
                                        {step.title}
                                    </span>
                                </div>
                                {!isLast && (
                                    <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
            <div className="flex items-center mb-6">
                <ClockIcon className="w-6 h-6 text-iom-blue mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">{t('applicationTimeline')}</h3>
            </div>

            <div className="space-y-8">
                {steps.map((step, index) => {
                    const colors = getStepColor(step.status);
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id} className="relative">
                            {/* Connector line */}
                            {!isLast && (
                                <div className="absolute left-4 top-10 w-0.5 h-16 bg-gray-200" />
                            )}

                            <div className="flex items-start space-x-4">
                                {/* Step icon */}
                                <div className={`relative flex-shrink-0 w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center border-2 ${colors.border}`}>
                                    <div className={colors.icon}>
                                        {step.icon}
                                    </div>
                                    
                                    {/* Status indicator */}
                                    {step.status === 'current' && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                    )}
                                </div>

                                {/* Step content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className={`text-lg font-medium ${colors.text}`}>
                                            {step.title}
                                        </h4>
                                        {step.date && (
                                            <span className="text-sm text-gray-500">
                                                {new Date(step.date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <p className="text-gray-600 text-sm mb-3">
                                        {step.description}
                                    </p>

                                    {/* Step details */}
                                    {step.details && step.details.length > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <ul className="text-sm text-gray-600 space-y-1">
                                                {step.details.map((detail, detailIndex) => (
                                                    <li key={detailIndex} className="flex items-center">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                                                        {detail}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Progress indicator for current step */}
                                    {step.status === 'current' && step.id === 'review_process' && (
                                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-iom-blue border-t-transparent"></div>
                                                <span className="text-sm font-medium text-iom-blue">
                                                    {t('inProgress')}
                                                </span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2">
                                                <div className="bg-iom-blue h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-8 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                        {t('applicationSubmitted')}: {new Date(application.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`font-medium ${
                        application.status === ApplicationStatus.APPROVED ? 'text-green-600' :
                        application.status === ApplicationStatus.REJECTED ? 'text-red-600' :
                        'text-iom-blue'
                    }`}>
                        {t(application.status)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProcessTimeline;