import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { API_ROUTES } from '../constants';

interface DetailedRegisterFormProps {
    onSuccess: () => void;
    onBack: () => void;
}

const DetailedRegisterForm: React.FC<DetailedRegisterFormProps> = ({ onSuccess, onBack }) => {
    const { isLoading, addNotification } = useApp();

    // Department to Arrondissement mapping
    const departmentArrondissements: Record<string, Array<{value: string, label: string}>> = {
        'OUEST': [
            { value: 'PORT_AU_PRINCE', label: 'Port-au-Prince' },
            { value: 'CROIX_DES_BOUQUETS', label: 'Croix-des-Bouquets' },
            { value: 'PETION_VILLE', label: 'Pétion-Ville' }
        ],
        'NORD': [
            { value: 'CAP_HAITIEN', label: 'Cap-Haïtien' },
            { value: 'FORT_LIBERTE', label: 'Fort-Liberté' }
        ],
        'SUD': [
            { value: 'LES_CAYES', label: 'Les Cayes' },
            { value: 'AQUIN', label: 'Aquin' }
        ],
        'ARTIBONITE': [
            { value: 'GONAIVES', label: 'Gonaïves' },
            { value: 'SAINT_MARC', label: 'Saint-Marc' }
        ],
        'SUD_EST': [
            { value: 'JACMEL', label: 'Jacmel' }
        ],
        'NORD_OUEST': [
            { value: 'PORT_DE_PAIX', label: 'Port-de-Paix' }
        ],
        'CENTRE': [
            { value: 'HINCHE', label: 'Hinche' }
        ],
        'GRAND_ANSE': [
            { value: 'JEREMIE', label: 'Jérémie' }
        ],
        'NIPPES': [
            { value: 'MIRAGOANE', label: 'Miragoâne' },
            { value: 'ANSE_A_VEAU', label: 'Anse-à-Veau' }
        ],
        'NORD_EST': [
            { value: 'FORT_LIBERTE', label: 'Fort-Liberté' }
        ]
    };

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        otherNames: '',
        dateOfBirth: '',
        countryCode: '+509',
        phoneNumber: '',
        email: '',
        password: '',
        nationalId: '',
        sex: '',
        nationality: '',
        address: '',
        department: '',
        arrondissement: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Convert text fields to uppercase (except email, password, phone, and date fields)
        const uppercaseFields = ['firstName', 'lastName', 'otherNames', 'nationalId', 'address'];
        const processedValue = uppercaseFields.includes(name) ? value.toUpperCase() : value;
        
        // Reset arrondissement when department changes
        if (name === 'department') {
            setFormData(prev => ({
                ...prev,
                [name]: processedValue,
                arrondissement: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: processedValue
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        // Validation
        const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'email', 'password', 'nationalId', 'sex', 'nationality', 'address', 'department', 'arrondissement'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
        
        if (missingFields.length > 0) {
            addNotification('Please fill all required fields', 'error');
            return;
        }

        // Combine full name for API
        const fullName = `${formData.firstName} ${formData.lastName}${formData.otherNames ? ' ' + formData.otherNames : ''}`;
        
        const requestBody = {
            fullName,
            email: formData.email,
            password: formData.password,
            // Additional data could be stored in future
            additionalData: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                otherNames: formData.otherNames || undefined,
                dateOfBirth: formData.dateOfBirth,
                phone: `${formData.countryCode}${formData.phoneNumber}`,
                nationalId: formData.nationalId,
                sex: formData.sex,
                nationality: formData.nationality,
                address: formData.address,
                department: formData.department,
                arrondissement: formData.arrondissement
            }
        };

        console.log('Sending registration data:', JSON.stringify(requestBody, null, 2));
        
        try {
            const response = await fetch(`${API_ROUTES.BASE_URL}${API_ROUTES.AUTH}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (response.ok) {
                addNotification(data.message || 'Registration successful! Please check your email to verify your account.', 'success');
                onSuccess();
            } else {
                console.error('Registration failed:', data);
                addNotification(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            addNotification('Network error occurred', 'error');
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative detailed-register-bg"
        >
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>

            {/* IOM Logo */}
            <div className="absolute top-6 left-6 text-white z-20">
                <div className="text-2xl font-bold">⚬OIM</div>
                <div className="text-xs -mt-1">ORGANIZACIÓN INTERNACIONAL</div>
            </div>

            {/* Form Container */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-green-800 mb-2">IOM VIA</h1>
                        <p className="text-gray-600">Sign up</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name Fields */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name*
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name*
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="otherNames" className="block text-sm font-medium text-gray-700 mb-1">
                                Other Names
                            </label>
                            <input
                                type="text"
                                id="otherNames"
                                name="otherNames"
                                value={formData.otherNames}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                                Date of Birth*
                            </label>
                            <input
                                type="date"
                                id="dateOfBirth"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number*</label>
                            <div className="flex gap-2">
                                <select
                                    name="countryCode"
                                    title="Country Code"
                                    value={formData.countryCode}
                                    onChange={handleInputChange}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="+509">🇭🇹 +509</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+55">🇧🇷 +55</option>
                                    <option value="+52">🇲🇽 +52</option>
                                    <option value="+57">🇨🇴 +57</option>
                                    <option value="+51">🇵🇪 +51</option>
                                    <option value="+56">🇨🇱 +56</option>
                                    <option value="+54">🇦🇷 +54</option>
                                </select>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter your phone number"
                                    title="Phone Number"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>

                        {/* Email and Password */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address*
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password*
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 mb-1">
                                National ID Number*
                            </label>
                            <input
                                type="text"
                                id="nationalId"
                                name="nationalId"
                                value={formData.nationalId}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Sex and Nationality */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-1">
                                    Sex*
                                </label>
                                <select
                                    id="sex"
                                    name="sex"
                                    title="Sex"
                                    value={formData.sex}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nationality*
                                </label>
                                <select
                                    id="nationality"
                                    name="nationality"
                                    title="Nationality"
                                    value={formData.nationality}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="haitian">Haitian</option>
                                    <option value="brazilian">Brazilian</option>
                                    <option value="venezuelan">Venezuelan</option>
                                    <option value="colombian">Colombian</option>
                                    <option value="peruvian">Peruvian</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                                Address*
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Department and Arrondissement */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                                    Department*
                                </label>
                                <select
                                    id="department"
                                    name="department"
                                    title="Department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="ARTIBONITE">Artibonite</option>
                                    <option value="CENTRE">Centre</option>
                                    <option value="GRAND_ANSE">Grand'Anse</option>
                                    <option value="NIPPES">Nippes</option>
                                    <option value="NORD">Nord</option>
                                    <option value="NORD_EST">Nord-Est</option>
                                    <option value="NORD_OUEST">Nord-Ouest</option>
                                    <option value="OUEST">Ouest</option>
                                    <option value="SUD_EST">Sud-Est</option>
                                    <option value="SUD">Sud</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="arrondissement" className="block text-sm font-medium text-gray-700 mb-1">
                                    Arrondissement*
                                </label>
                                <select
                                    id="arrondissement"
                                    name="arrondissement"
                                    title="Arrondissement"
                                    value={formData.arrondissement}
                                    onChange={handleInputChange}
                                    required
                                    disabled={!formData.department}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {!formData.department ? 'First select a department' : 'Select...'}
                                    </option>
                                    {formData.department && departmentArrondissements[formData.department]?.map(arr => (
                                        <option key={arr.value} value={arr.value}>
                                            {arr.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 py-3 px-4 btn-green rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                            >
                                {isLoading ? 'Registering...' : 'Register'}
                            </button>
                        </div>
                    </form>
                </div>
        </div>
    );
};

export default DetailedRegisterForm;