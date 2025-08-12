import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { Application, AppointmentStatus, ApplicationStatus } from '../types';
import { CalendarIcon, ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon, InfoCircleIcon } from './Icons';

interface AppointmentEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    status: AppointmentStatus;
    visaType: string;
}

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    appointments: AppointmentEvent[];
}

const AdminAppointmentCalendar: React.FC = () => {
    const { t, addNotification } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Generate calendar days
    const generateCalendarDays = (date: Date): CalendarDay[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        
        const days: CalendarDay[] = [];
        
        // Add previous month days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({
                date,
                isCurrentMonth: false,
                appointments: appointments.filter(apt => 
                    new Date(apt.date).toDateString() === date.toDateString()
                )
            });
        }
        
        // Add current month days
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(year, month, day);
            days.push({
                date,
                isCurrentMonth: true,
                appointments: appointments.filter(apt => 
                    new Date(apt.date).toDateString() === date.toDateString()
                )
            });
        }
        
        // Add next month days to complete the grid
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            days.push({
                date,
                isCurrentMonth: false,
                appointments: appointments.filter(apt => 
                    new Date(apt.date).toDateString() === date.toDateString()
                )
            });
        }
        
        return days;
    };

    const fetchAppointments = async () => {
        setIsLoading(true);
        try {
            const { api } = await import('../services/api');
            const dateString = currentDate.toISOString().split('T')[0];
            const appointments = await api.getAppointments(dateString);
            setAppointments(appointments);
        } catch (error) {
            addNotification(t('failedToLoadAppointments'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [currentDate]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const getStatusColor = (status: AppointmentStatus) => {
        switch (status) {
            case AppointmentStatus.CONFIRMED:
                return 'bg-green-100 text-green-800 border-green-300';
            case AppointmentStatus.BOOKED:
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case AppointmentStatus.COMPLETED:
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case AppointmentStatus.CANCELLED:
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case AppointmentStatus.CONFIRMED:
                return <CheckCircleIcon className="w-4 h-4" />;
            case AppointmentStatus.BOOKED:
                return <ClockIcon className="w-4 h-4" />;
            case AppointmentStatus.COMPLETED:
                return <CheckCircleIcon className="w-4 h-4" />;
            case AppointmentStatus.CANCELLED:
                return <XCircleIcon className="w-4 h-4" />;
            default:
                return <InfoCircleIcon className="w-4 h-4" />;
        }
    };

    const handleRescheduleAppointment = async (appointmentId: string, newDate: string, newTime: string) => {
        try {
            // TODO: Implement API call
            // await api.rescheduleAppointment(appointmentId, newDate, newTime);
            addNotification(t('appointmentRescheduled'), 'success');
            fetchAppointments();
        } catch (error) {
            addNotification(t('failedToReschedule'), 'error');
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm(t('confirmCancelAppointment'))) return;
        
        try {
            // TODO: Implement API call
            // await api.cancelAppointment(appointmentId);
            addNotification(t('appointmentCancelled'), 'success');
            fetchAppointments();
        } catch (error) {
            addNotification(t('failedToCancelAppointment'), 'error');
        }
    };

    const calendarDays = generateCalendarDays(currentDate);
    const selectedDayAppointments = selectedDate ? 
        appointments.filter(apt => new Date(apt.date).toDateString() === selectedDate.toDateString()) : [];

    const monthNames = [
        t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
        t('july'), t('august'), t('september'), t('october'), t('november'), t('december')
    ];

    const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-2xl font-bold text-iom-blue mb-4 sm:mb-0 flex items-center">
                    <CalendarIcon className="w-6 h-6 mr-2" />
                    {t('appointmentManagement')}
                </h2>
                
                <div className="flex items-center space-x-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'calendar' 
                                    ? 'bg-white text-iom-blue shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {t('calendar')}
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'list' 
                                    ? 'bg-white text-iom-blue shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {t('list')}
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="space-y-6">
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title={t('previousMonth')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <h3 className="text-xl font-semibold text-gray-800">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h3>
                        
                        <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title={t('nextMonth')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Day headers */}
                        {dayNames.map(day => (
                            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 uppercase">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                        
                        {/* Calendar days */}
                        {calendarDays.map((day, index) => (
                            <div
                                key={index}
                                onClick={() => setSelectedDate(day.date)}
                                className={`
                                    min-h-[80px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                                    ${selectedDate?.toDateString() === day.date.toDateString() ? 'bg-blue-50 border-blue-300' : ''}
                                `}
                            >
                                <div className="text-sm font-medium mb-1">
                                    {day.date.getDate()}
                                </div>
                                
                                {day.appointments.slice(0, 3).map(appointment => (
                                    <div
                                        key={appointment.id}
                                        className={`text-xs p-1 mb-1 rounded border ${getStatusColor(appointment.status)}`}
                                        title={`${appointment.applicantName} - ${appointment.time}`}
                                    >
                                        <div className="flex items-center">
                                            {getStatusIcon(appointment.status)}
                                            <span className="ml-1 truncate">
                                                {appointment.time} {appointment.applicantName.split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                
                                {day.appointments.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                        +{day.appointments.length - 3} {t('more')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Selected Date Details */}
                    {selectedDate && selectedDayAppointments.length > 0 && (
                        <div className="border-t pt-6">
                            <h4 className="text-lg font-semibold mb-4">
                                {t('appointmentsFor')} {selectedDate.toLocaleDateString()}
                            </h4>
                            
                            <div className="space-y-3">
                                {selectedDayAppointments.map(appointment => (
                                    <AppointmentCard
                                        key={appointment.id}
                                        appointment={appointment}
                                        onReschedule={handleRescheduleAppointment}
                                        onCancel={handleCancelAppointment}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* List View */
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-iom-blue"></div>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{t('noAppointmentsScheduled')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {appointments
                                .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())
                                .map(appointment => (
                                    <AppointmentCard
                                        key={appointment.id}
                                        appointment={appointment}
                                        onReschedule={handleRescheduleAppointment}
                                        onCancel={handleCancelAppointment}
                                        showDate={true}
                                    />
                                ))
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface AppointmentCardProps {
    appointment: AppointmentEvent;
    onReschedule: (id: string, date: string, time: string) => void;
    onCancel: (id: string) => void;
    showDate?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ 
    appointment, 
    onReschedule, 
    onCancel, 
    showDate = false 
}) => {
    const { t } = useApp();
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [newDate, setNewDate] = useState(appointment.date);
    const [newTime, setNewTime] = useState(appointment.time);

    const getStatusColor = (status: AppointmentStatus) => {
        switch (status) {
            case AppointmentStatus.CONFIRMED:
                return 'border-l-green-500 bg-green-50';
            case AppointmentStatus.BOOKED:
                return 'border-l-blue-500 bg-blue-50';
            case AppointmentStatus.COMPLETED:
                return 'border-l-gray-500 bg-gray-50';
            case AppointmentStatus.CANCELLED:
                return 'border-l-red-500 bg-red-50';
            default:
                return 'border-l-gray-500 bg-gray-50';
        }
    };

    const handleRescheduleSubmit = () => {
        onReschedule(appointment.id, newDate, newTime);
        setIsRescheduling(false);
    };

    return (
        <div className={`border-l-4 p-4 rounded-r-lg ${getStatusColor(appointment.status)}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <UserIcon className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{appointment.applicantName}</span>
                        <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                            {t(appointment.visaType)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                            appointment.status === AppointmentStatus.CONFIRMED ? 'bg-green-100 text-green-800' :
                            appointment.status === AppointmentStatus.BOOKED ? 'bg-blue-100 text-blue-800' :
                            appointment.status === AppointmentStatus.COMPLETED ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {t(appointment.status)}
                        </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {showDate && <span>{new Date(appointment.date).toLocaleDateString()} - </span>}
                            <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{appointment.applicantEmail}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {appointment.status !== AppointmentStatus.COMPLETED && appointment.status !== AppointmentStatus.CANCELLED && (
                        <>
                            <button
                                onClick={() => setIsRescheduling(!isRescheduling)}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
                            >
                                {t('reschedule')}
                            </button>
                            <button
                                onClick={() => onCancel(appointment.id)}
                                className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Reschedule Form */}
            {isRescheduling && (
                <div className="mt-4 p-3 bg-white rounded-md border">
                    <h5 className="font-medium mb-3">{t('rescheduleAppointment')}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('newDate')}
                            </label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                placeholder={t('selectDate')}
                                title={t('selectNewDate')}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('newTime')}
                            </label>
                            <select
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                aria-label={t('newTime')}
                                title={t('newTime')}
                            >
                                <option value="09:00">09:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="14:00">02:00 PM</option>
                                <option value="15:00">03:00 PM</option>
                                <option value="16:00">04:00 PM</option>
                            </select>
                        </div>
                        
                        <div className="flex items-end space-x-2">
                            <button
                                onClick={handleRescheduleSubmit}
                                className="px-4 py-2 bg-iom-blue text-white rounded-md text-sm font-medium hover:bg-iom-blue/90 transition-colors"
                            >
                                {t('confirm')}
                            </button>
                            <button
                                onClick={() => setIsRescheduling(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAppointmentCalendar;