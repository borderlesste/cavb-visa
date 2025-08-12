import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { VisaType } from '../types';
import { CheckCircleIcon, ClockIcon, DocumentIcon, CalendarIcon, UserIcon } from './Icons';
import styles from './AnalyticsDashboard.module.css';

interface AnalyticsData {
    applications: {
        total: number;
        approved: number;
        rejected: number;
        inReview: number;
        pendingDocuments: number;
        appointmentScheduled: number;
    };
    documents: {
        total: number;
        verified: number;
        uploaded: number;
        missing: number;
        rejected: number;
    };
    appointments: {
        total: number;
        confirmed: number;
        booked: number;
        completed: number;
        cancelled: number;
    };
    visaTypes: {
        [VisaType.VITEM_XI]: number;
        [VisaType.VITEM_III]: number;
    };
    monthlyStats: {
        month: string;
        applications: number;
        approvals: number;
    }[];
    processingTime: {
        average: number; // in days
        fastest: number;
        slowest: number;
    };
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        gray: 'bg-gray-50 text-gray-600 border-gray-200'
    };

    return (
        <div className={`rounded-xl border-2 p-6 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className="text-2xl opacity-80">
                    {icon}
                </div>
            </div>
        </div>
    );
};

interface ProgressBarProps {
    label: string;
    value: number;
    max: number;
    color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, max, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    
    return (
        <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{label}</span>
                <span>{value} / {max} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${color} ${styles[`progressBarWidth${Math.round(percentage)}`]}`}
                />
            </div>
        </div>
    );
};

interface ChartBarProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
}

const ChartBar: React.FC<ChartBarProps> = ({ label, value, maxValue, color }) => {
    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const barHeightClass = `chart-bar-height-${Math.round(height)}`;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-12 h-32 bg-gray-200 rounded-t-md">
                <div 
                    className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${color} ${styles[barHeightClass]}`}
                />
            </div>
            <div className="text-xs text-gray-600 mt-2 text-center">
                <div className="font-medium">{value}</div>
                <div className="truncate w-12">{label}</div>
            </div>
        </div>
    );
};

const AnalyticsDashboard: React.FC = () => {
    const { t } = useApp();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

    useEffect(() => {
        fetchAnalyticsData();
    }, [selectedPeriod]);

    const fetchAnalyticsData = async () => {
        console.log('Starting to fetch analytics data for period:', selectedPeriod);
        setIsLoading(true);
        try {
            const { api } = await import('../services/api');
            console.log('API imported successfully');
            const data = await api.getAnalytics(selectedPeriod);
            console.log('Analytics data received:', JSON.stringify(data, null, 2));
            setAnalyticsData(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Set error state to show error message instead of blank screen
            setAnalyticsData(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iom-blue"></div>
                    <span className="ml-4 text-gray-600">{t('loadingAnalytics')}</span>
                </div>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="bg-white rounded-xl shadow-md p-8">
                <div className="text-center text-gray-500">
                    <p>{t('errorLoadingAnalytics')}</p>
                    <button 
                        onClick={fetchAnalyticsData}
                        className="mt-4 bg-iom-blue text-white px-4 py-2 rounded-md hover:bg-iom-blue/90"
                    >
                        {t('retry')}
                    </button>
                </div>
            </div>
        );
    }

    const maxMonthlyApplications = analyticsData.monthlyStats ? Math.max(...analyticsData.monthlyStats.map((stat: any) => stat.applications)) : 0;

    return (
        <div className="space-y-8">
            {/* Header with Period Selector */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">
                        {t('analyticsOverview')}
                    </h2>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['week', 'month', 'quarter'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    selectedPeriod === period 
                                        ? 'bg-white text-iom-blue shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                {t(period)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={t('totalApplications')}
                    value={analyticsData.applications.total}
                    icon={<UserIcon className="w-8 h-8" />}
                    color="blue"
                />
                <StatCard
                    title={t('approvedApplications')}
                    value={analyticsData.applications.approved}
                    icon={<CheckCircleIcon className="w-8 h-8" />}
                    color="green"
                    subtitle={`${((analyticsData.applications.approved / analyticsData.applications.total) * 100).toFixed(1)}% ${t('approvalRate')}`}
                />
                <StatCard
                    title={t('pendingReview')}
                    value={analyticsData.applications.inReview}
                    icon={<ClockIcon className="w-8 h-8" />}
                    color="yellow"
                />
                <StatCard
                    title={t('totalAppointments')}
                    value={analyticsData.appointments.total}
                    icon={<CalendarIcon className="w-8 h-8" />}
                    color="purple"
                />
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Status Breakdown */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('applicationStatusBreakdown')}</h3>
                    <div className="space-y-3">
                        <ProgressBar
                            label={t('approved')}
                            value={analyticsData.applications.approved}
                            max={analyticsData.applications.total}
                            color="bg-green-500"
                        />
                        <ProgressBar
                            label={t('inReview')}
                            value={analyticsData.applications.inReview}
                            max={analyticsData.applications.total}
                            color="bg-yellow-500"
                        />
                        <ProgressBar
                            label={t('pendingDocuments')}
                            value={analyticsData.applications.pendingDocuments}
                            max={analyticsData.applications.total}
                            color="bg-orange-500"
                        />
                        <ProgressBar
                            label={t('rejected')}
                            value={analyticsData.applications.rejected}
                            max={analyticsData.applications.total}
                            color="bg-red-500"
                        />
                    </div>
                </div>

                {/* Document Status */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('documentStatus')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <DocumentIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-600">{analyticsData.documents?.verified || 0}</p>
                            <p className="text-sm text-gray-600">{t('verified')}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <DocumentIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-600">{analyticsData.documents?.uploaded || 0}</p>
                            <p className="text-sm text-gray-600">{t('uploaded')}</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <DocumentIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-600">{analyticsData.documents?.missing || 0}</p>
                            <p className="text-sm text-gray-600">{t('missing')}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <DocumentIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-600">{analyticsData.documents?.rejected || 0}</p>
                            <p className="text-sm text-gray-600">{t('rejected')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('monthlyApplications')}</h3>
                    <div className="flex justify-center space-x-4 overflow-x-auto pb-4">
                        {analyticsData.monthlyStats?.map((stat: any, index: number) => (
                            <ChartBar
                                key={index}
                                label={stat.month}
                                value={stat.applications}
                                maxValue={maxMonthlyApplications}
                                color="bg-iom-blue"
                            />
                        ))}
                    </div>
                </div>

                {/* Visa Type Distribution */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('visaTypeDistribution')}</h3>
                    <div className="space-y-4">
                        {Object.entries(analyticsData.visaTypes).map(([visaType, count]) => (
                            <div key={visaType} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">{t(visaType as VisaType)}</span>
                                <div className="flex items-center">
                                    <div 
                                        className={`bg-iom-blue h-2 rounded-full transition-all duration-300 visa-bar-width-${Math.round((count / analyticsData.applications.total) * 100)}`}
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-800 w-8">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Processing Time */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('processingTimeMetrics')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-iom-blue">{analyticsData.processingTime.average}</p>
                        <p className="text-sm text-gray-600">{t('averageDays')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{analyticsData.processingTime.fastest}</p>
                        <p className="text-sm text-gray-600">{t('fastestDays')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">{analyticsData.processingTime.slowest}</p>
                        <p className="text-sm text-gray-600">{t('slowestDays')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;