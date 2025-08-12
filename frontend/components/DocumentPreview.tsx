import * as React from 'react';
import { useState, useEffect } from 'react';
import { API_ROUTES } from '../constants';
import { useApp } from '../hooks/useApp';
import { Document } from '../types';
import { DocumentIcon, CloseIcon, DownloadIcon, ZoomInIcon, ZoomOutIcon, RotateIcon } from './Icons';

interface DocumentPreviewProps {
    document: Document;
    isOpen: boolean;
    onClose: () => void;
}

interface FilePreviewProps {
    filePath: string;
    fileName: string;
    fileType: string;
}

const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const documentTypes = ['pdf'];
    const textTypes = ['txt', 'rtf'];
    const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (imageTypes.includes(extension)) return 'image';
    if (documentTypes.includes(extension)) return 'pdf';
    if (textTypes.includes(extension)) return 'text';
    if (officeTypes.includes(extension)) return 'office';
    return 'other';
};

// (Removed unused formatFileSize to satisfy linter)

const FilePreview: React.FC<FilePreviewProps> = ({ filePath, fileName, fileType }: FilePreviewProps) => {
    const { t } = useApp();
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    const handleImageError = () => {
        setImageError(true);
    };

    const resetImageTransform = () => {
        setImageZoom(1);
        setImageRotation(0);
    };

    useEffect(() => {
        resetImageTransform();
        setImageError(false);
    }, [filePath]);

    const fullPath = filePath?.startsWith('/') ? filePath : `/${filePath}`;

    // Derive backend origin from API base (strip trailing /api)
    const backendOrigin = API_ROUTES.BASE_URL.replace(/\/api$/, '');

    // For protected /uploads we fetch with Authorization header to avoid 401 on direct <img src>
    useEffect(() => {
        let revoked = false;
        const token = localStorage.getItem('authToken');

        // Validate token
        if (!token) {
            console.error('No token found. Redirecting to login.');
            window.location.href = '/auth'; // Redirect to login page
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                console.error('Token expired. Redirecting to login.');
                window.location.href = '/auth';
                return;
            }
        } catch (e) {
            console.error('Invalid token format. Redirecting to login.', e);
            window.location.href = '/auth';
            return;
        }

        if (!fullPath.startsWith('/uploads')) {
            setSecureUrl(fullPath);
            return;
        }

        const absolute = `${backendOrigin}${fullPath}`;
        (async () => {
            try {
                const res = await fetch(absolute, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    setSecureUrl(absolute); // fallback attempt (may 401)
                    return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (!revoked) {
                    setBlobUrl(url);
                    setSecureUrl(url);
                } else {
                    URL.revokeObjectURL(url);
                }
            } catch (e) {
                console.error('Error fetching secure URL:', e);
                setSecureUrl(absolute);
            }
        })();

        return () => {
            revoked = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [fullPath, backendOrigin, blobUrl]);

    switch (fileType) {
        case 'image':
            return (
                <div className="flex flex-col h-full">
                    {/* Image Controls */}
                    <div className="flex justify-center space-x-2 mb-4 bg-gray-100 p-2 rounded-lg">
                        <button
                            onClick={() => setImageZoom(prev => Math.max(0.25, prev - 0.25))}
                            disabled={imageZoom <= 0.25}
                            className="p-2 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('zoomOut')}
                        >
                            <ZoomOutIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setImageZoom(prev => Math.min(3, prev + 0.25))}
                            disabled={imageZoom >= 3}
                            className="p-2 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('zoomIn')}
                        >
                            <ZoomInIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                            className="p-2 bg-white rounded-md hover:bg-gray-50"
                            title={t('rotate')}
                        >
                            <RotateIcon className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-2 bg-white rounded-md text-sm font-medium">
                            {Math.round(imageZoom * 100)}%
                        </span>
                    </div>

                    {/* Image Container */}
                    <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                        {imageError && (
                            <div className="text-center text-gray-500">
                                <DocumentIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p>{t('errorLoadingImage')}</p>
                                <button 
                                    onClick={() => window.open(fullPath, '_blank')}
                                    className="mt-2 text-iom-blue hover:underline text-sm"
                                >
                                    {t('openInNewTab')}
                                </button>
                            </div>
                        )}
                        {!imageError && (
                            (() => {
                                // Quantize zoom to closest of predefined scales (25%, 50%, 75%, 100%, 125%, 150%, 175%, 200%, 225%, 250%, 275%, 300%)
                                const zoomSteps = [0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3];
                                const nearest = zoomSteps.reduce((prev,curr)=> Math.abs(curr-imageZoom)<Math.abs(prev-imageZoom)?curr:prev,1);
                                const scaleClassMap: Record<number,string> = {
                                    0.25:'scale-[0.25]',
                                    0.5:'scale-50',
                                    0.75:'scale-[0.75]',
                                    1:'scale-100',
                                    1.25:'scale-[1.25]',
                                    1.5:'scale-150',
                                    1.75:'scale-[1.75]',
                                    2:'scale-[2]',
                                    2.25:'scale-[2.25]',
                                    2.5:'scale-[2.5]',
                                    2.75:'scale-[2.75]',
                                    3:'scale-[3]'
                                };
                                const rotationClass = {
                                    0:'rotate-0',
                                    90:'rotate-90',
                                    180:'rotate-180',
                                    270:'-rotate-90'
                                }[imageRotation as 0|90|180|270] || 'rotate-0';
                                const scaleClass = scaleClassMap[nearest] || 'scale-100';
                                return (
                                    <img
                                        src={secureUrl || fullPath}
                                        alt={fileName}
                                        onError={handleImageError}
                                        className={`object-contain transition-transform duration-200 will-change-transform ${scaleClass} ${rotationClass}`}
                                    />
                                );
                            })()
                        )}
                    </div>
                </div>
            );

        case 'pdf':
            return (
                <div className="h-full flex flex-col">
                    <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
                        <iframe
                            src={secureUrl || fullPath}
                            className="w-full h-full border-none"
                            title={fileName}
                        />
                    </div>
                    <div className="mt-4 text-center">
                        <button 
                            onClick={() => window.open(secureUrl || fullPath, '_blank')}
                            className="text-iom-blue hover:underline text-sm"
                        >
                            {t('openInNewTab')}
                        </button>
                    </div>
                </div>
            );

        case 'text':
            return (
                <div className="h-full flex flex-col">
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                        <iframe
                            src={fullPath}
                            className="w-full h-full border-none"
                            title={fileName}
                        />
                    </div>
                </div>
            );

        case 'office':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <DocumentIcon className="w-24 h-24 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {t('officeDocumentPreview')}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                        {t('officeDocumentPreviewDesc')}
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => window.open(fullPath, '_blank')}
                            className="block w-full bg-iom-blue text-white px-6 py-2 rounded-md hover:bg-iom-blue/90"
                        >
                            {t('openInNewTab')}
                        </button>
                        <a 
                            href={secureUrl || fullPath} 
                            download={fileName}
                            className="block w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300"
                        >
                            {t('downloadDocument')}
                        </a>
                    </div>
                </div>
            );

        default:
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <DocumentIcon className="w-24 h-24 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {t('filePreviewNotAvailable')}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {t('downloadToView')}
                    </p>
                        <a 
                        href={secureUrl || fullPath} 
                        download={fileName}
                        className="bg-iom-blue text-white px-6 py-2 rounded-md hover:bg-iom-blue/90"
                    >
                        {t('downloadDocument')}
                    </a>
                </div>
            );
    }
};

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, isOpen, onClose }: DocumentPreviewProps) => {
    const { t } = useApp();
    
    if (!isOpen || !document.filePath) return null;

    const fileType = getFileType(document.fileName || '');
    const fullPath = document.filePath.startsWith('/') ? document.filePath : `/${document.filePath}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {document.fileName || t('document')}
                        </h2>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>{t('documentType')}: {document.type}</span>
                            <span>{t('status')}: {t(document.status)}</span>
                            {document.fileName && (
                                <span>{t('fileType')}: {fileType.toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                        {/* Download button */}
                        <a
                            href={fullPath}
                            download={document.fileName}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                            title={t('downloadDocument')}
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </a>
                        
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                            title={t('close')}
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 min-h-0">
                    <FilePreview 
                        filePath={document.filePath} 
                        fileName={document.fileName || ''} 
                        fileType={fileType}
                    />
                </div>

                {/* Footer with document info */}
                {document.rejectionReason && (
                    <div className="p-4 bg-red-50 border-t border-red-200">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{t('rejectionReason')}</h3>
                                <p className="mt-1 text-sm text-red-700">{document.rejectionReason}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentPreview;