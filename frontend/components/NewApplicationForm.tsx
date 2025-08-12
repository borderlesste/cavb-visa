import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { VisaType } from '../types';
import { DocumentIcon, CheckCircleIcon } from './Icons';

interface NewApplicationFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const NewApplicationForm: React.FC<NewApplicationFormProps> = ({ onSuccess, onCancel }) => {
    const { t, addNotification, startNewApplication } = useApp();
    const [selectedVisaType, setSelectedVisaType] = useState<VisaType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const handleVisaTypeSelection = (visaType: VisaType) => {
        setSelectedVisaType(visaType);
        setCurrentStep(2);
    };

    const handleSubmit = async () => {
        if (!selectedVisaType) return;
        
        setIsSubmitting(true);
        try {
            await startNewApplication(selectedVisaType);
            onSuccess();
        } catch (error) {
            addNotification(t('errorCreatingApplication'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRequiredDocuments = (visaType: VisaType) => {
        const baseDocuments = [
            t('passport'),
            t('birthCertificate'),
            t('identityDocument'),
            t('medicalCertificate')
        ];

        if (visaType === VisaType.VITEM_XI) {
            return [
                ...baseDocuments,
                t('familyDocuments'),
                t('sponsorshipLetter'),
                t('incomeProof')
            ];
        } else if (visaType === VisaType.VITEM_III) {
            return [
                ...baseDocuments,
                t('humanitarianDocuments'),
                t('emergencyDocuments')
            ];
        }
        
        return baseDocuments;
    };

    if (currentStep === 1) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-iom-blue mb-6 text-center">
                    {t('createNewApplication')}
                </h2>
                
                <p className="text-gray-600 text-center mb-8">
                    {t('selectVisaTypeForNewApplication')}
                </p>

                <div className="space-y-4 max-w-2xl mx-auto">
                    <div 
                        onClick={() => handleVisaTypeSelection(VisaType.VITEM_XI)}
                        className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-iom-blue hover:bg-blue-50 transition-all"
                    >
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {t(VisaType.VITEM_XI)}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {t('vitemXIDesc')}
                        </p>
                        <div className="flex items-center text-sm text-iom-blue">
                            <DocumentIcon className="w-4 h-4 mr-2" />
                            {t('documentsRequired')}: 7
                        </div>
                    </div>

                    <div 
                        onClick={() => handleVisaTypeSelection(VisaType.VITEM_III)}
                        className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-iom-blue hover:bg-blue-50 transition-all"
                    >
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {t(VisaType.VITEM_III)}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {t('vitemIIIDesc')}
                        </p>
                        <div className="flex items-center text-sm text-iom-blue">
                            <DocumentIcon className="w-4 h-4 mr-2" />
                            {t('documentsRequired')}: 6
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-8">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        );
    }

    if (currentStep === 2 && selectedVisaType) {
        const requiredDocuments = getRequiredDocuments(selectedVisaType);
        
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-iom-blue mb-2">
                        {t('applicationSummary')}
                    </h2>
                    <p className="text-gray-600">
                        {t('reviewBeforeSubmitting')}
                    </p>
                </div>

                {/* Selected Visa Type */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-iom-blue mb-2">
                        {t('selectedVisaType')}
                    </h3>
                    <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                        <span className="font-medium">{t(selectedVisaType)}</span>
                    </div>
                </div>

                {/* Required Documents */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {t('documentsYouWillNeed')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requiredDocuments.map((document, index) => (
                            <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <DocumentIcon className="w-4 h-4 text-gray-500 mr-3" />
                                <span className="text-sm text-gray-700">{document}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Important Notes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                        {t('importantNotes')}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• {t('allDocumentsMustBeValid')}</li>
                        <li>• {t('processingTimeIs')} 10-15 {t('businessDays')}</li>
                        <li>• {t('applicationFeeWillBeCharged')}</li>
                        <li>• {t('youCanTrackProgress')}</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        {t('back')}
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-3 bg-iom-blue text-white rounded-md hover:bg-iom-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                {t('creating')}...
                            </div>
                        ) : (
                            t('createApplication')
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default NewApplicationForm;