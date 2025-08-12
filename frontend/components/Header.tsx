
import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { Language, UserRole } from '../types';
import { APP_ROUTES } from '../constants';
import DynamicMessagingSystem from './DynamicMessagingSystem';
import MobileNavigation from './MobileNavigation';
import NotificationManager from './NotificationManager';
import { useState } from 'react';
import { BellIcon } from './Icons';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useApp();

    const languages = [
        { code: Language.EN, label: 'EN' },
        { code: Language.FR, label: 'FR' },
        { code: Language.HT, label: 'HT' },
    ];

    return (
        <div className="flex items-center bg-gray-200 rounded-full">
            {languages.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-300 ${language === lang.code ? 'bg-iom-blue text-white' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
};

const Header: React.FC = () => {
    const { t, isAuthenticated, logout, user } = useApp();
    const navigate = useNavigate();
    const [showMessaging, setShowMessaging] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleLogout = () => {
        logout();
        navigate(APP_ROUTES.HOME);
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <NavLink to={APP_ROUTES.HOME} className="flex items-center space-x-3">
                        <img src="https://haiti.iom.int/themes/custom/iom2021/logo.svg" alt="IOM Logo" className="h-10" />
                        <span className="hidden sm:block text-lg font-bold text-iom-blue">{t('appName')}</span>
                    </NavLink>
                    <div className="flex items-center space-x-4">
                        {/* Desktop Language Switcher */}
                        <div className="hidden sm:block">
                            <LanguageSwitcher />
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setShowMobileNav(true)}
                            className="lg:hidden p-2 text-gray-600 hover:text-iom-blue transition-colors rounded-md hover:bg-gray-100"
                            title="Open mobile navigation"
                            aria-label="Open mobile navigation"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        {/* Desktop Navigation */}
                        {isAuthenticated ? (
                             <div className="hidden lg:flex items-center space-x-4">
                                {user?.role === UserRole.ADMIN ? (
                                    <NavLink to={APP_ROUTES.ADMIN} className="text-gray-600 hover:text-iom-blue font-medium transition-colors">
                                        {t('adminDashboard')}
                                    </NavLink>
                                ) : (
                                     <NavLink to={APP_ROUTES.DASHBOARD} className="text-gray-600 hover:text-iom-blue font-medium transition-colors">
                                        {t('dashboardTitle')}
                                    </NavLink>
                                )}

                                {/* Notifications Button */}
                                <button 
                                    onClick={() => setShowNotifications(true)}
                                    className="relative p-2 text-gray-600 hover:text-iom-blue transition-colors rounded-md hover:bg-gray-100"
                                    title={t('notifications')}
                                >
                                    <BellIcon className="w-5 h-5" />
                                    {/* Notification badge */}
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                        3
                                    </span>
                                </button>

                                {/* Messages Button */}
                                <button 
                                    onClick={() => setShowMessaging(true)}
                                    className="relative p-2 text-gray-600 hover:text-iom-blue transition-colors rounded-md hover:bg-gray-100"
                                    title={t('messages')}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {/* Notification badge */}
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                        1
                                    </span>
                                </button>
                                
                                {/* Profile dropdown */}
                                <div className="relative group">
                                    <button className="flex items-center space-x-2 text-gray-600 hover:text-iom-blue font-medium transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-iom-blue text-white flex items-center justify-center text-sm font-bold">
                                            {user?.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="hidden md:block">{user?.fullName}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {/* Dropdown menu */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="py-1">
                                            <NavLink 
                                                to={APP_ROUTES.PROFILE} 
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                {t('personalInformation')}
                                            </NavLink>
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                                            >
                                                {t('logout')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                             <NavLink
                                to={APP_ROUTES.AUTH}
                                className="hidden lg:inline-block bg-iom-blue text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors font-semibold"
                            >
                                {t('login')} / {t('register')}
                            </NavLink>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Notification Manager Modal */}
            <NotificationManager
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            {/* Messaging System Modal */}
            <DynamicMessagingSystem 
                isOpen={showMessaging}
                onClose={() => setShowMessaging(false)}
            />
            
            {/* Mobile Navigation */}
            <MobileNavigation
                isOpen={showMobileNav}
                onClose={() => setShowMobileNav(false)}
                onOpenMessaging={() => setShowMessaging(true)}
            />
        </header>
    );
};

export default Header;
