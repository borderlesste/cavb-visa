import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { APP_ROUTES } from '../constants';

const InfoCard: React.FC<{ title: string; description: string; }> = ({ title, description }) => (
    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-2xl font-bold text-iom-blue mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
);

const HomePage: React.FC = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    return (
        <div className="bg-gray-50 animate-fade-in">
            {/* Hero Section */}
            <div className="relative bg-iom-blue text-white py-20 sm:py-32">
                <div className="absolute inset-0">
                    <img src="https://toptransferbrasil.com.br/wp-content/uploads/2019/10/cristo-redentor-3.jpg" className="w-full h-full object-cover opacity-20" alt="Abstract background"/>
                </div>
                <div className="relative container mx-auto px-4 text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
                        {t('welcomeTitle')}
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto">
                        {t('welcomeSubtitle')}
                    </p>
                    <button 
                        onClick={() => navigate(APP_ROUTES.AUTH)}
                        className="mt-8 bg-brazil-yellow text-iom-blue font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brazil-yellow/90 transition-transform transform hover:scale-105"
                    >
                        {t('getStarted')}
                    </button>
                </div>
            </div>
            
            {/* Visa Programs Section */}
            <div className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12">
                        <InfoCard title={t('vitemXI')} description={t('vitemXIDesc')} />
                        <InfoCard title={t('vitemIII')} description={t('vitemIIIDesc')} />
                    </div>
                </div>
            </div>
            
            {/* Call to Action */}
            <div className="bg-white py-16">
                 <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('authPrompt')}</h2>
                     <button 
                        onClick={() => navigate(APP_ROUTES.AUTH)}
                        className="bg-iom-blue text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-iom-blue/90 transition-transform transform hover:scale-105"
                    >
                        {t('login')} / {t('register')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;