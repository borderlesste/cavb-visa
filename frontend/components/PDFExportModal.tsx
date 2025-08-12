import React, { useState } from 'react';
import { Application, ApplicationStatus, VisaType } from '../types';
import { useApp } from '../hooks/useApp';
import { CloseIcon, DocumentArrowDownIcon, PrinterIcon } from './Icons';
import { generateApplicationPDF, generateAdminReportPDF, generateDocumentChecklistPDF } from '../services/pdfService';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  application?: Application;
  applications?: (Application & { user: { fullName: string; email: string } })[];
  exportType: 'application' | 'admin-report' | 'document-checklist';
}

const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  application,
  applications,
  exportType,
}) => {
  const { t, addNotification } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    title: 'Applications Report',
    includeMetadata: true,
    includeTimestamp: true,
    watermark: '',
    filters: {
      dateFrom: '',
      dateTo: '',
      status: '' as ApplicationStatus | '',
      visaType: '' as VisaType | '',
    },
  });

  const handleExport = async (format: 'download' | 'print' | 'email') => {
    setIsGenerating(true);
    
    try {
      let pdfDataUri: string;
      let filename: string;

      switch (exportType) {
        case 'application':
          if (!application) throw new Error('Application data is required');
          pdfDataUri = generateApplicationPDF(application);
          filename = `visa-application-${application.id}.pdf`;
          break;

        case 'document-checklist':
          if (!application) throw new Error('Application data is required');
          pdfDataUri = generateDocumentChecklistPDF(application);
          filename = `document-checklist-${application.id}.pdf`;
          break;

        case 'admin-report':
          if (!applications) throw new Error('Applications data is required');
          pdfDataUri = generateAdminReportPDF(
            {
              applications,
              filters: {
                ...reportOptions.filters,
                status: reportOptions.filters.status === '' ? undefined : reportOptions.filters.status,
                visaType: reportOptions.filters.visaType === '' ? undefined : reportOptions.filters.visaType,
              },
            },
            {
              title: reportOptions.title,
              includeMetadata: reportOptions.includeMetadata,
              includeTimestamp: reportOptions.includeTimestamp,
              watermark: reportOptions.watermark || undefined,
            }
          );
          filename = `admin-report-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        default:
          throw new Error('Invalid export type');
      }

      switch (format) {
        case 'download':
          downloadPDF(pdfDataUri, filename);
          break;

        case 'print':
          printPDF(pdfDataUri);
          break;

        case 'email':
          // This would typically send the PDF to the server for emailing
          await emailPDF(pdfDataUri);
          break;
      }

      addNotification(t('pdfGeneratedSuccessfully'), 'success');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      addNotification(t('pdfGenerationError'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = (dataUri: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = (dataUri: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print PDF</title></head>
          <body style="margin:0;">
            <iframe src="${dataUri}" style="width:100%;height:100vh;border:none;"></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 1000);
    }
  };

  const emailPDF = async (dataUri: string) => {
    // Convert data URI to blob
    const response = await fetch(dataUri);
    await response.blob();
    
    // Here you would typically upload to server and send via email
    // For now, we'll just show a success message
    console.log('Email PDF functionality would be implemented here');
    throw new Error('Email functionality not implemented yet');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t('exportPDF')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={t('close')}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Export Type Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">
              {exportType === 'application' && t('applicationReport')}
              {exportType === 'document-checklist' && t('documentChecklist')}
              {exportType === 'admin-report' && t('adminReport')}
            </h4>
            <p className="text-sm text-gray-600">
              {exportType === 'application' && t('applicationReportDesc')}
              {exportType === 'document-checklist' && t('documentChecklistDesc')}
              {exportType === 'admin-report' && t('adminReportDesc')}
            </p>
          </div>

          {/* Admin Report Options */}
          {exportType === 'admin-report' && (
            <div className="mb-6 space-y-4">
              <h4 className="font-semibold">{t('reportOptions')}</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reportTitle')}
                </label>
                <input
                  type="text"
                  value={reportOptions.title}
                  onChange={(e) => setReportOptions(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  title={t('reportTitle')}
                  placeholder={t('enterReportTitle')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dateFrom')}
                  </label>
                  <input
                    type="date"
                    value={reportOptions.filters.dateFrom}
                    onChange={(e) => setReportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, dateFrom: e.target.value }
                    }))}
                    className="w-full p-2 border rounded-md"
                    title={t('dateFrom')}
                    placeholder={t('selectDateFrom')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dateTo')}
                  </label>
                  <input
                    type="date"
                    value={reportOptions.filters.dateTo}
                    onChange={(e) => setReportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, dateTo: e.target.value }
                    }))}
                    className="w-full p-2 border rounded-md"
                    title={t('dateTo')}
                    placeholder={t('selectDateTo')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filterByStatus')}
                  </label>
                  <select
                    value={reportOptions.filters.status}
                    onChange={(e) => setReportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, status: e.target.value as ApplicationStatus | '' }
                    }))}
                    className="w-full p-2 border rounded-md"
                    title={t('filterByStatus')}
                    aria-label={t('filterByStatus')}
                  >
                    <option value="">{t('allStatuses')}</option>
                    <option value={ApplicationStatus.PENDING_DOCUMENTS}>{t('pendingDocuments')}</option>
                    <option value={ApplicationStatus.IN_REVIEW}>{t('inReview')}</option>
                    <option value={ApplicationStatus.APPROVED}>{t('approved')}</option>
                    <option value={ApplicationStatus.REJECTED}>{t('rejected')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filterByVisaType')}
                  </label>
                  <select
                    value={reportOptions.filters.visaType}
                    onChange={(e) => setReportOptions(prev => ({
                      ...prev,
                      filters: { ...prev.filters, visaType: e.target.value as VisaType | '' }
                    }))}
                    className="w-full p-2 border rounded-md"
                    title={t('filterByVisaType')}
                    aria-label={t('filterByVisaType')}
                  >
                    <option value="">{t('allVisaTypes')}</option>
                    <option value={VisaType.VITEM_III}>{t(VisaType.VITEM_III)}</option>
                    <option value={VisaType.VITEM_XI}>{t(VisaType.VITEM_XI)}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeMetadata}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">{t('includeMetadata')}</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeTimestamp}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, includeTimestamp: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">{t('includeTimestamp')}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('watermark')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={reportOptions.watermark}
                  onChange={(e) => setReportOptions(prev => ({ ...prev, watermark: e.target.value }))}
                  placeholder={t('confidential')}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          )}

          {/* Export Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleExport('download')}
              disabled={isGenerating}
              className="flex items-center justify-center px-4 py-3 bg-iom-blue text-white rounded-md hover:bg-iom-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {t('generating')}...
                </div>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  {t('downloadPDF')}
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport('print')}
                disabled={isGenerating}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                {t('print')}
              </button>

              <button
                onClick={() => handleExport('email')}
                disabled={isGenerating}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('email')}
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            {t('pdfGeneratedLocally')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFExportModal;