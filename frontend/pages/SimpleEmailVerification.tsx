import React from 'react';

interface VerificationResponse {
    message: string;
    verified?: boolean;
    alreadyVerified?: boolean;
}

class EmailVerificationPage extends React.Component {
    state = {
        loading: true,
        result: null as VerificationResponse | null,
        error: null as string | null,
        resendingEmail: false,
        email: '',
        notification: null as {message: string, type: 'success' | 'error'} | null
    };

    getTokenFromUrl = () => {
        const path = window.location.hash || window.location.pathname;
        const match = path.match(/\/verify-email\/([^\/\?]+)/);
        return match ? match[1] : null;
    };

    addNotification = (message: string, type: 'success' | 'error') => {
        this.setState({ notification: { message, type } });
        setTimeout(() => this.setState({ notification: null }), 5000);
    };

    t = (key: string) => {
        const translations: Record<string, string> = {
            'verifyingEmail': 'Verifying Email',
            'pleaseWait': 'Please wait while we verify your email address...',
            'emailVerified': 'Email Verified Successfully',
            'verificationFailed': 'Email Verification Failed',
            'alreadyVerifiedInfo': 'Your email was already verified. You can proceed to login.',
            'welcomeEmailSent': 'A welcome email has been sent to your inbox.',
            'goToLogin': 'Go to Login',
            'goToHome': 'Go to Home'
        };
        return translations[key] || key;
    };

    componentDidMount() {
        const token = this.getTokenFromUrl();
        
        if (!token) {
            this.setState({ error: 'No verification token provided', loading: false });
            return;
        }

        this.verifyEmail(token);
    }

    verifyEmail = async (token: string) => {
        try {
            const response = await fetch(`/api/auth/verify-email/${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                this.setState({ result: data, loading: false });
            } else {
                this.setState({ error: data.message || 'Verification failed', loading: false });
            }
        } catch (err) {
            this.setState({ error: 'Network error occurred while verifying email', loading: false });
        }
    };

    handleResendVerification = async () => {
        const { email } = this.state;
        
        if (!email.trim()) {
            this.addNotification('Please enter your email address', 'error');
            return;
        }

        this.setState({ resendingEmail: true });
        
        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                this.addNotification('Verification email sent! Please check your email.', 'success');
                this.setState({ email: '' });
            } else {
                this.addNotification(data.message || 'Failed to send verification email', 'error');
            }
        } catch (err) {
            this.addNotification('Network error occurred', 'error');
        } finally {
            this.setState({ resendingEmail: false });
        }
    };

    handleGoToLogin = () => {
        window.location.hash = '#/auth';
    };

    handleGoToHome = () => {
        window.location.hash = '#/';
    };

    render() {
        const { loading, result, error, notification, resendingEmail, email } = this.state;

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    {notification && (
                        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
                            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {notification.message}
                        </div>
                    )}
                    <div className="max-w-md w-full space-y-8 p-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {this.t('verifyingEmail')}
                            </h2>
                            <p className="text-gray-600">
                                {this.t('pleaseWait')}
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    {notification && (
                        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
                            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {notification.message}
                        </div>
                    )}
                    <div className="max-w-md w-full space-y-8 p-8">
                        <div className="text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {this.t('verificationFailed')}
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {error}
                            </p>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Need a new verification email?
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => this.setState({ email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button
                                        onClick={this.handleResendVerification}
                                        disabled={resendingEmail || !email.trim()}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                                    >
                                        {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={this.handleGoToHome}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {this.t('goToHome')}
                                </button>
                                <button
                                    onClick={this.handleGoToLogin}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {this.t('goToLogin')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (result) {
            const isSuccess = result.verified || result.alreadyVerified;
            
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    {notification && (
                        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
                            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {notification.message}
                        </div>
                    )}
                    <div className="max-w-md w-full space-y-8 p-8">
                        <div className="text-center">
                            <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
                                isSuccess ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {isSuccess ? (
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {isSuccess ? this.t('emailVerified') : this.t('verificationFailed')}
                            </h2>
                            
                            <p className="text-gray-600 mb-6">
                                {result.message}
                            </p>
                            
                            {isSuccess && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                {result.alreadyVerified 
                                                    ? this.t('alreadyVerifiedInfo')
                                                    : this.t('welcomeEmailSent')
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                {isSuccess && (
                                    <button
                                        onClick={this.handleGoToLogin}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        {this.t('goToLogin')}
                                    </button>
                                )}
                                <button
                                    onClick={this.handleGoToHome}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {this.t('goToHome')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    }
}

export default EmailVerificationPage;