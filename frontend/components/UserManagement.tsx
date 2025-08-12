import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { UserRole } from '../types';
import { UserIcon, CloseIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface User {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    createdAt: string;
    lastLoginAt?: string;
    isActive: boolean;
    profileImage?: string;
}

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t, addNotification } = useApp();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: UserRole.APPLICANT,
        sendInvite: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { api } = await import('../services/api');
            await api.createUser(formData);
            
            addNotification(t('userCreatedSuccessfully'), 'success');
            onSuccess();
            onClose();
            setFormData({
                fullName: '',
                email: '',
                role: UserRole.APPLICANT,
                sendInvite: true
            });
        } catch (error) {
            addNotification(t('errorCreatingUser'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">{t('createNewUser')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-600 hover:text-gray-800"
                        title={t('close')}
                        aria-label={t('close')}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label htmlFor="createUserFullName" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('fullName')} *
                        </label>
                        <input
                            id="createUserFullName"
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-iom-blue"
                            title={t('fullName')}
                            placeholder={t('enterFullName')}
                        />
                    </div>

                    <div>
                        <label htmlFor="createUserEmail" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('email')} *
                        </label>
                        <input
                            id="createUserEmail"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-iom-blue"
                            title={t('email')}
                            placeholder={t('enterEmail')}
                        />
                    </div>

                    <div>
                        <label htmlFor="createUserRole" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('userRole')} *
                        </label>
                        <select
                            id="createUserRole"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-iom-blue"
                            title={t('userRole')}
                        >
                            <option value={UserRole.APPLICANT}>{t('applicant')}</option>
                            <option value={UserRole.ADMIN}>{t('administrator')}</option>
                        </select>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="sendInvite"
                            checked={formData.sendInvite}
                            onChange={(e) => setFormData({...formData, sendInvite: e.target.checked})}
                            className="mr-2"
                        />
                        <label htmlFor="sendInvite" className="text-sm text-gray-700">
                            {t('sendWelcomeEmail')}
                        </label>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-iom-blue text-white rounded-md hover:bg-iom-blue/90 disabled:opacity-50"
                        >
                            {isLoading ? t('creating') : t('createUser')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { t, addNotification } = useApp();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { api } = await import('../services/api');
            const data = await api.getAllUsers(1, 100);
            setUsers(data.users || []);
        } catch (error) {
            addNotification(t('errorLoadingUsers'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { api } = await import('../services/api');
            const user = users.find(u => u.id === userId);
            if (!user) return;
            
            await api.updateUser(userId, {
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: !currentStatus
            });
            
            setUsers(prev => prev.map(user => 
                user.id === userId ? { ...user, isActive: !currentStatus } : user
            ));
            
            addNotification(
                currentStatus ? t('userDeactivated') : t('userActivated'), 
                'success'
            );
        } catch (error) {
            addNotification(t('errorUpdatingUser'), 'error');
        }
    };

    const changeUserRole = async (userId: string, newRole: UserRole) => {
        try {
            const { api } = await import('../services/api');
            const user = users.find(u => u.id === userId);
            if (!user) return;
            
            await api.updateUser(userId, {
                fullName: user.fullName,
                email: user.email,
                role: newRole,
                isActive: user.isActive
            });
            
            setUsers(prev => prev.map(user => 
                user.id === userId ? { ...user, role: newRole } : user
            ));
            
            addNotification(t('userRoleUpdated'), 'success');
        } catch (error) {
            addNotification(t('errorUpdatingUser'), 'error');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === '' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-8">
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iom-blue"></div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">
                        {t('userManagement')}
                    </h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-iom-blue text-white px-4 py-2 rounded-md hover:bg-iom-blue/90"
                    >
                        {t('createNewUser')}
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <input
                            type="text"
                            placeholder={t('searchUsers')}
                            title={t('searchUsers')}
                            aria-label={t('searchUsers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-iom-blue"
                        />
                    </div>
                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-iom-blue"
                            title={t('userRole')}
                            aria-label={t('userRole')}
                        >
                            <option value="">{t('allRoles')}</option>
                            <option value={UserRole.APPLICANT}>{t('applicant')}</option>
                            <option value={UserRole.ADMIN}>{t('administrator')}</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t('user')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t('role')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t('status')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t('lastLogin')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                                <UserIcon className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {user.fullName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            aria-label={t('userRole')}
                                            title={t('userRole')}
                                            value={user.role}
                                            onChange={(e) => changeUserRole(user.id, e.target.value as UserRole)}
                                            className="text-sm border rounded p-1"
                                        >
                                            <option value={UserRole.APPLICANT}>{t('applicant')}</option>
                                            <option value={UserRole.ADMIN}>{t('administrator')}</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            user.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.isActive ? (
                                                <>
                                                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                                                    {t('active')}
                                                </>
                                            ) : (
                                                <>
                                                    <XCircleIcon className="w-3 h-3 mr-1" />
                                                    {t('inactive')}
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t('never')}
                                    </td>
                                    <td className="px-6 py-4 text-sm space-x-2">
                                        <button
                                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                                            className={`px-3 py-1 rounded text-xs font-medium ${
                                                user.isActive
                                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                            }`}
                                        >
                                            {user.isActive ? t('deactivate') : t('activate')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>{t('noUsersFound')}</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateUserModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchUsers}
            />
        </>
    );
};

export default UserManagement;