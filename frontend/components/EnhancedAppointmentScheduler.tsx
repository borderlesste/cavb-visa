import  { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { Application, Document, DocumentStatus } from '../types';
import { InfoCircleIcon, CalendarIcon, ClockIcon, UserIcon, DocumentIcon } from './Icons';
import { api } from '../services/api';

interface EnhancedAppointmentSchedulerProps {
    application: Application;
}

const EnhancedAppointmentScheduler: React.FC<EnhancedAppointmentSchedulerProps> = ({ application }) => {
    const { t, user, scheduleAppointment, isLoading } = useApp();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth?.split('T')[0] || '');
    const [passportNumber, setPassportNumber] = useState(user?.passportNumber || '');
    const [nationality, setNationality] = useState(user?.nationality || '');
    const [availability, setAvailability] = useState<{ [key: number]: { status: string; count: number } }>({});
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const data = await api.getAppointmentAvailability(currentMonth, currentYear);
                setAvailability(data);
            } catch (error) {
                console.error("Failed to fetch appointment availability", error);
            }
        };
        fetchAvailability();
    }, [currentMonth, currentYear]);

    const identityDoc = application.documents.find((doc: Document) => doc.type === 'Identity Document');
    const isIdentityDocVerified = identityDoc?.status === DocumentStatus.VERIFIED;
    
    const isPersonalInfoComplete = dateOfBirth && passportNumber && nationality;
    
    const canSchedule = date && time && isPersonalInfoComplete && isIdentityDocVerified;

    const handleSchedule = () => {
        if (canSchedule) {
            scheduleAppointment(date, time, {
                dateOfBirth,
                passportNumber,
                nationality
            });
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        const newMonth = newDate.getMonth() + 1;
        const newYear = newDate.getFullYear();
        if (newMonth !== currentMonth) setCurrentMonth(newMonth);
        if (newYear !== currentYear) setCurrentYear(newYear);
        setDate(e.target.value);
    };

    const getDayClassName = (day: number) => {
        const dayAvailability = availability[day];
        if (!dayAvailability) return 'bg-green-100';
        if (dayAvailability.status === 'full') return 'bg-red-300 cursor-not-allowed';
        if (dayAvailability.status === 'limited') return 'bg-yellow-300';
        return 'bg-green-300';
    };

    return (
        <div className="mt-6 border-t pt-6">
            <h4 className="font-semibold text-lg mb-4 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                {t('scheduleAppointment')}
            </h4>

            {/* Availability Legend */}
            <div className="flex space-x-4 mb-4 text-xs">
                <div className="flex items-center"><span className="w-4 h-4 bg-green-300 mr-1"></span>{t('available')}</div>
                <div className="flex items-center"><span className="w-4 h-4 bg-yellow-300 mr-1"></span>{t('limited')}</div>
                <div className="flex items-center"><span className="w-4 h-4 bg-red-300 mr-1"></span>{t('full')}</div>
            </div>

            {/* Prerequisites Check */}
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <h5 className="font-semibold text-blue-800 mb-2">{t('appointmentRequirements')}</h5>
                <ul className="space-y-2 text-sm">
                    <li className={`flex items-center ${isIdentityDocVerified ? 'text-green-700' : 'text-red-700'}`}>
                        <DocumentIcon className="w-4 h-4 mr-2" />
                        {t('identityDocumentVerified')} {isIdentityDocVerified ? '✓' : '✗'}
                    </li>
                    <li className={`flex items-center ${isPersonalInfoComplete ? 'text-green-700' : 'text-red-700'}`}>
                        <UserIcon className="w-4 h-4 mr-2" />
                        {t('personalInfoComplete')} {isPersonalInfoComplete ? '✓' : '✗'}
                    </li>
                </ul>
            </div>

            {!isIdentityDocVerified && (
                <div className="mb-4 bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                    <p className="text-red-800 text-sm">
                        <InfoCircleIcon className="w-4 h-4 inline mr-1" />
                        {t('identityDocumentRequired')}
                    </p>
                </div>
            )}

            {/* Personal Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fullName')}
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        value={user?.fullName || ''}
                        disabled
                        className="w-full p-2 border rounded-md bg-gray-100 text-gray-600"
                    />
                </div>

                <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('dateOfBirth')} *
                    </label>
                    <input
                        id="dateOfBirth" 
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div> 

                <div>
                    <label htmlFor="passport_number" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('passportNumber')} *
                    </label>
                    <input
                        id="passport_number"
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="AB1234567"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('nationality')} *
                    </label>
                    <select
                        id="nationality"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                        title={t('selectNationality')}
                    >
                        <option value="">{t('selectNationality')}</option>
                        <option value="Haitian">Haitian</option>
                        <option value="American">American</option>
                        <option value="Canadian">Canadian</option>
                        <option value="French">French</option>
                        <option value="Dominican">Dominican</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            {/* Appointment Date/Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label htmlFor="appointmentDate" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {t('appointmentDate')} *
                    </label>
                    <input
                        id="appointmentDate"
                        type="date"
                        value={date}
                        onChange={handleDateChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${getDayClassName(new Date(date).getDate())}`}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="appointmentTime" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {t('appointmentTime')} *
                    </label>
                    <select
                        id="appointmentTime"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        required
                        title={t('selectTime')}
                    >
                        <option value="">{t('selectTime')}</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleSchedule}
                        disabled={isLoading || !canSchedule}
                        className={`w-full font-bold py-2 rounded-lg transition-colors ${
                            canSchedule && !isLoading
                                ? 'bg-brazil-green text-white hover:bg-brazil-green/90'
                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? t('scheduling') : t('bookAppointment')}
                    </button>
                </div>
            </div>

            {/* Information Note */}
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <p className="text-yellow-800 text-sm">
                    <InfoCircleIcon className="w-4 h-4 inline mr-1" />
                    {t('appointmentBookingNote')}
                </p>
            </div>
        </div>
    );
};

export default EnhancedAppointmentScheduler;