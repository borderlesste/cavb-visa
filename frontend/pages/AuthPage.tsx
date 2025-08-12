import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { APP_ROUTES } from '../constants';
import { UserRole } from '../types';
import DetailedRegisterForm from '../components/DetailedRegisterForm';
import { AuthPageSEO } from '../components/SEO';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showDetailedRegister, setShowDetailedRegister] = useState(false);
    const [showEmailVerificationNotice, setShowEmailVerificationNotice] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const { t, login, register, isLoading, addNotification } = useApp();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (isLogin) {
            if (!email || !password) {
                addNotification(t('fillAllFields'), 'error');
                return;
            }
            const loggedInUser = await login(email, password);
            if (loggedInUser) {
                if (loggedInUser.role === UserRole.ADMIN) {
                    navigate(APP_ROUTES.ADMIN);
                } else {
                    navigate(APP_ROUTES.DASHBOARD);
                }
            }
        } else {
            if (!email || !password || !fullName) {
                addNotification(t('fillAllFields'), 'error');
                return;
            }
            const success = await register(fullName, email, password);
            if(success) {
                addNotification(t('registrationSuccess'), 'success');
                setIsLogin(true);
                // Clear fields
                setFullName('');
                setEmail('');
                setPassword('');
            }
        }
    };

    // Show email verification notice after successful registration
    if (showEmailVerificationNotice) {
        return (
            <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative auth-bg">
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-10 rounded-xl shadow-2xl animate-fade-in relative z-10">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-4">
                            {t('registrationSuccessTitle')}
                        </h2>
                        <div className="text-left space-y-4">
                            <p className="text-gray-700">
                                {t('accountCreatedMessage')}
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-blue-800">
                                            {t('verifyEmailRequired')}
                                        </h3>
                                        <div className="mt-2 text-sm text-blue-700">
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>{t('emailVerificationStep1')} <strong>Gmail</strong></li>
                                                <li>{t('emailVerificationStep2')} <strong>"IOM Visa Application System"</strong></li>
                                                <li>{t('emailVerificationStep3')} <strong>"✅ Verify Email Address"</strong></li>
                                                <li>{t('emailVerificationStep4')}</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <span className="font-medium">{t('emailSentTo')}</span><br />
                                    {registeredEmail}
                                </p>
                                <p className="text-xs text-yellow-700 mt-2">
                                    {t('spamWarning')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowEmailVerificationNotice(false);
                                    setIsLogin(true);
                                    setRegisteredEmail('');
                                }}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                {t('gotItGoToLogin')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show detailed register form if requested
    if (showDetailedRegister) {
        return (
            <DetailedRegisterForm 
                onSuccess={(userEmail?: string) => {
                    setShowDetailedRegister(false);
                    setRegisteredEmail(userEmail || '');
                    setShowEmailVerificationNotice(true);
                }}
                onBack={() => setShowDetailedRegister(false)}
            />
        );
    }

    return (
        <>
            <AuthPageSEO />
            <div 
                className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative auth-bg"
            >
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            
            <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-10 rounded-xl shadow-2xl animate-fade-in relative z-10">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-green-800">
                        {isLogin ? t('login') : t('register')}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        {!isLogin && (
                            <div>
                                <label htmlFor="full-name" className="sr-only">{t('fullName')}</label>
                                <input id="full-name" name="fullName" type="text" autoComplete="name" required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                    placeholder={t('fullName')} value={fullName} onChange={e => setFullName(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email-address" className="sr-only">{t('email')}</label>
                            <input id="email-address" name="email" type="email" autoComplete="email" required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm`}
                                placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">{t('password')}</label>
                            <input id="password" name="password" type="password" autoComplete="current-password" required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <button type="submit" disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white btn-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">
                            {isLoading ? t('loading') : (isLogin ? t('login') : t('register'))}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <button 
                        type="button"
                        onClick={() => {
                            if (isLogin) {
                                setShowDetailedRegister(true);
                            } else {
                                setIsLogin(true);
                            }
                        }} 
                        className="font-medium text-green-600 hover:text-green-500"
                    >
                        {isLogin ? t('registerPrompt') : t('loginPrompt')} {isLogin ? t('register') : t('login')}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default AuthPage;