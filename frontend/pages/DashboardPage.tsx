import * as React from 'react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Application } from '../types';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../constants';
import NewApplicationForm from '../components/NewApplicationForm';
import ApplicationsList from '../components/ApplicationsList';
import ApplicationDetailsView from '../components/ApplicationDetailsView';
import { DashboardSEO } from '../components/SEO';

type DashboardView = 'list' | 'details' | 'create';

const DashboardPage: React.FC = () => {
    const { t, user, isLoading, isAuthenticated } = useApp();
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState<DashboardView>('list');
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [applicationCount, setApplicationCount] = useState(0);

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate(APP_ROUTES.AUTH);
        }
    }, [isLoading, isAuthenticated, navigate]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iom-blue"></div>
                <span className="ml-4 text-gray-600">{t('loading')}</span>
            </div>
        );
    }
    
    if (!user) return null;

    const handleCreateNew = () => {
        setCurrentView('create');
        setSelectedApplication(null);
    };

    const handleViewApplication = (application: Application) => {
        setSelectedApplication(application);
        setCurrentView('details');
    };

    const handleBackToList = () => {
        setCurrentView('list');
        setSelectedApplication(null);
    };

    const handleApplicationCreated = () => {
        setCurrentView('list');
        setSelectedApplication(null);
        // Optionally, you can refresh the applications list here
    };

    const handleApplicationCanceled = () => {
        setCurrentView('list');
        setSelectedApplication(null);
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case 'create':
                return (
                    <NewApplicationForm
                        onSuccess={handleApplicationCreated}
                        onCancel={handleApplicationCanceled}
                    />
                );
            
            case 'details':
                if (!selectedApplication) {
                    setCurrentView('list');
                    return null;
                }
                return (
                    <ApplicationDetailsView
                        application={selectedApplication}
                        onBack={handleBackToList}
                    />
                );
            
            case 'list':
            default:
                return (
                    <ApplicationsList
                        onCreateNew={handleCreateNew}
                        onViewApplication={handleViewApplication}
                    />
                );
        }
    };

    return (
        <>
            <DashboardSEO />
            <div className="bg-gray-50 min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    {/* Header - Only show on list view */}
                    {currentView === 'list' && applicationCount === 0 && (
                        <div className="mb-8 text-center bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                                {t('welcomeMessage')}
                            </h1>
                            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                {t('noApplicationMessage')}
                            </p>
                            <button
                                onClick={handleCreateNew}
                                className="inline-flex items-center px-6 py-3 bg-brazil-green text-white font-medium rounded-md hover:bg-brazil-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brazil-green transition-colors"
                            >
                                {t('startFirstApplication')}
                            </button>
                        </div>
                    )}
                    {currentView === 'list' && applicationCount > 0 && (
                        <div className="mb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {t('myApplications')}
                            </h1>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="w-full">
                        {currentView === 'list' ? (
                            <ApplicationsList
                                onCreateNew={handleCreateNew}
                                onViewApplication={handleViewApplication}
                                onCountChange={setApplicationCount}
                            />
                        ) : renderCurrentView()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;