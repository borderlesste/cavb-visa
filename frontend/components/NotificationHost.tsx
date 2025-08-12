
import React, { useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { CheckCircleIcon, XCircleIcon, InfoCircleIcon } from './Icons';
import { Notification } from '../types';

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: number) => void }> = ({ notification, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification, onRemove]);

    const baseClasses = "flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-lg";
    const typeClasses = {
        success: 'text-green-500',
        error: 'text-red-500',
        info: 'text-blue-500',
    };
    const Icon = {
        success: CheckCircleIcon,
        error: XCircleIcon,
        info: InfoCircleIcon,
    }[notification.type];

    return (
        <div className={baseClasses} role="alert">
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-opacity-20 ${typeClasses[notification.type] === 'text-green-500' ? 'bg-green-100' : typeClasses[notification.type] === 'text-red-500' ? 'bg-red-100' : 'bg-blue-100'}`}>
                <Icon className={`w-5 h-5 ${typeClasses[notification.type]}`} />
            </div>
            <div className="ml-3 text-sm font-normal">{notification.message}</div>
            <button onClick={() => onRemove(notification.id)} type="button" className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8" aria-label="Close">
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
    );
};


const NotificationHost: React.FC = () => {
    const { notifications, removeNotification } = useApp();

    return (
        <div className="fixed top-5 right-5 z-50">
            {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onRemove={removeNotification} />
            ))}
        </div>
    );
};

export default NotificationHost;
