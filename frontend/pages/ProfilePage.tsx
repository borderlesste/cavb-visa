import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../constants';
import { UserIcon, DocumentIcon, InfoCircleIcon, CheckCircleIcon } from '../components/Icons';

interface ProfileFormData {
    fullName: string;
    email: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
    phone?: string;
    address?: string;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

const ProfilePage: React.FC = () => {
    const { t, user, isAuthenticated, isLoading, addNotification } = useApp();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
    const [profileData, setProfileData] = useState<ProfileFormData>({
        fullName: '',
        email: '',
        dateOfBirth: '',
        passportNumber: '',
        nationality: '',
        phone: '',
        address: ''
    });
    
    const [passwordData, setPasswordData] = useState<PasswordFormData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState<string>('');

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate(APP_ROUTES.AUTH);
        }
        
        if (user) {
            setProfileData({
                fullName: user.fullName || '',
                email: user.email || '',
                dateOfBirth: user.dateOfBirth || '',
                passportNumber: user.passportNumber || '',
                nationality: user.nationality || '',
                phone: '',
                address: ''
            });
        }
    }, [isLoading, isAuthenticated, user, navigate]);

    const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        
        try {
            // TODO: Implement API call to update user profile
            // await api.updateProfile(profileData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            addNotification(t('profileUpdatedSuccessfully'), 'success');
        } catch (error) {
            addNotification((error as Error).message || t('profileUpdateFailed'), 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addNotification(t('passwordsDoNotMatch'), 'error');
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            addNotification(t('passwordTooShort'), 'error');
            return;
        }
        
        setIsUpdating(true);
        
        try {
            // TODO: Implement API call to change password
            // await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            addNotification(t('passwordChangedSuccessfully'), 'success');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            addNotification((error as Error).message || t('passwordChangeFailed'), 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                addNotification(t('imageTooLarge'), 'error');
                return;
            }
            
            setProfileImage(file);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImageUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iom-blue mx-auto"></div>
                    <p className="mt-4">{t('loading')}</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-iom-blue flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                                {profileImageUrl ? (
                                    <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user.fullName.charAt(0).toUpperCase()
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-brazil-green text-white p-1 rounded-full cursor-pointer hover:bg-brazil-green/90">
                                <DocumentIcon className="w-4 h-4" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{user.fullName}</h1>
                            <p className="text-gray-600">{user.email}</p>
                            <div className="flex items-center mt-2">
                                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-sm text-green-600">{t('emailVerified')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-md mb-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                                    activeTab === 'personal' 
                                        ? 'border-iom-blue text-iom-blue' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <UserIcon className="w-4 h-4 inline mr-2" />
                                {t('personalInformation')}
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                                    activeTab === 'security' 
                                        ? 'border-iom-blue text-iom-blue' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <InfoCircleIcon className="w-4 h-4 inline mr-2" />
                                {t('security')}
                            </button>
                        </nav>
                    </div>

                    <div className="p-6 sm:p-8">
                        {/* Personal Information Tab */}
                        {activeTab === 'personal' && (
                            <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('fullName')} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={profileData.fullName}
                                            onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('email')} *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                            disabled // Email typically shouldn't be editable
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('dateOfBirth')} *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={profileData.dateOfBirth}
                                            onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('passportNumber')} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={profileData.passportNumber}
                                            onChange={(e) => setProfileData({...profileData, passportNumber: e.target.value.toUpperCase()})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                            placeholder="AB1234567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('nationality')} *
                                        </label>
                                        <select
                                            required
                                            value={profileData.nationality}
                                            onChange={(e) => setProfileData({...profileData, nationality: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('phoneNumber')}
                                        </label>
                                        <input
                                            type="tel"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                            placeholder="+509 1234-5678"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('address')}
                                    </label>
                                    <textarea
                                        value={profileData.address}
                                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                        placeholder={t('enterYourAddress')}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="bg-iom-blue text-white px-6 py-3 rounded-md font-medium hover:bg-iom-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdating ? t('updating') : t('updateProfile')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                                    <div className="flex">
                                        <InfoCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                                        <div>
                                            <h3 className="text-sm font-medium text-yellow-800">{t('passwordSecurityNote')}</h3>
                                            <p className="text-sm text-yellow-700 mt-1">{t('passwordRequirements')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('currentPassword')} *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('newPassword')} *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('confirmNewPassword')} *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-iom-blue focus:border-transparent"
                                        minLength={6}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="bg-brazil-green text-white px-6 py-3 rounded-md font-medium hover:bg-brazil-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdating ? t('updating') : t('changePassword')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;