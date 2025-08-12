import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { Language, UserRole } from '../types';
import { APP_ROUTES } from '../constants';

interface MobileNavigationProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenMessaging: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose, onOpenMessaging }) => {
    const { t, isAuthenticated, logout, user, language, setLanguage } = useApp();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate(APP_ROUTES.HOME);
        onClose();
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    const languages = [
        { code: Language.EN, label: 'English', flag: '🇺🇸' },
        { code: Language.FR, label: 'Français', flag: '🇫🇷' },
        { code: Language.HT, label: 'Kreyòl', flag: '🇭🇹' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50" 
                onClick={onClose}
            />
            
            {/* Mobile menu */}
            <div className="fixed top-0 right-0 bottom-0 w-80 max-w-sm bg-white shadow-xl">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <img 
                            src="https://haiti.iom.int/themes/custom/iom2021/logo.svg" 
                            alt="IOM Logo" 
                            className="h-8" 
                        />
                        <button
                            onClick={onClose}
                            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            title="Close menu"
                            aria-label="Close menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* User info */}
                    {isAuthenticated && user && (
                        <div className="p-4 bg-gray-50 border-b">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-full bg-iom-blue text-white flex items-center justify-center text-lg font-bold">
                                    {user.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{user.fullName}</p>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                    <p className="text-xs text-iom-blue capitalize">{user.role}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {isAuthenticated ? (
                            <>
                                {/* Dashboard Link */}
                                {user?.role === UserRole.ADMIN ? (
                                    <button
                                        onClick={() => handleNavigation(APP_ROUTES.ADMIN)}
                                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 rounded-md hover:bg-gray-100"
                                    >
                                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        {t('adminDashboard')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleNavigation(APP_ROUTES.DASHBOARD)}
                                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 rounded-md hover:bg-gray-100"
                                    >
                                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5v4m8-4v4" />
                                        </svg>
                                        {t('dashboardTitle')}
                                    </button>
                                )}

                                {/* Messages */}
                                <button
                                    onClick={() => {
                                        onOpenMessaging();
                                        onClose();
                                    }}
                                    className="flex items-center w-full px-4 py-3 text-left text-gray-700 rounded-md hover:bg-gray-100"
                                >
                                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {t('messages')}
                                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        1
                                    </span>
                                </button>

                                {/* Profile */}
                                <button
                                    onClick={() => handleNavigation(APP_ROUTES.PROFILE)}
                                    className="flex items-center w-full px-4 py-3 text-left text-gray-700 rounded-md hover:bg-gray-100"
                                >
                                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {t('personalInformation')}
                                </button>

                                <div className="border-t my-4" />

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center w-full px-4 py-3 text-left text-red-600 rounded-md hover:bg-red-50"
                                >
                                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a2 2 0 012-2h4a3 3 0 013 3v1" />
                                    </svg>
                                    {t('logout')}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleNavigation(APP_ROUTES.AUTH)}
                                className="flex items-center w-full px-4 py-3 text-left text-white bg-iom-blue rounded-md hover:bg-iom-blue/90"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a2 2 0 012-2h4a3 3 0 013 3v1" />
                                </svg>
                                {t('login')} / {t('register')}
                            </button>
                        )}
                    </nav>

                    {/* Language selector */}
                    <div className="p-4 border-t bg-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-3">{t('language')}</p>
                        <div className="grid grid-cols-3 gap-2">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code)}
                                    className={`flex flex-col items-center p-3 rounded-md text-xs font-medium transition-colors ${
                                        language === lang.code 
                                            ? 'bg-iom-blue text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="text-lg mb-1">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileNavigation;