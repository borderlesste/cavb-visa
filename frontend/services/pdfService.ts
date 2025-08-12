import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have proper ES module exports
import autoTable from 'jspdf-autotable';
import { Application, Document, UserRole, ApplicationStatus } from '../types';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportOptions {
  title?: string;
  subtitle?: string;
  author?: string;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  watermark?: string;
}

interface ApplicationReportData {
  applications: (Application & { user: { fullName: string; email: string } })[];
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: ApplicationStatus;
    visaType?: string;
  };
}

class PDFService {
  private readonly logoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // Placeholder
  private readonly defaultOptions: ReportOptions = {
    includeMetadata: true,
    includeTimestamp: true,
    author: 'CAVB IOM Haiti',
  };

  // Helper function to call autoTable
  private callAutoTable(doc: jsPDF, options: any): void {
    try {
      // Use the imported autoTable function directly
      if (typeof autoTable === 'function') {
        autoTable(doc, options);
      } else if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(options);
      } else {
        console.error('jspdf-autotable not available');
        throw new Error('PDF table generation not available');
      }
    } catch (error) {
      console.error('Error calling autoTable:', error);
      throw new Error('Failed to generate PDF table');
    }
  }

  private addHeader(doc: jsPDF, title: string, subtitle?: string): number {
    // Add logo (placeholder)
    // doc.addImage(this.logoUrl, 'PNG', 15, 15, 30, 15);

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(0, 74, 142); // IOM Blue
    doc.text(title, 15, 25);

    let yPos = 35;

    // Add subtitle if provided
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, 15, yPos);
      yPos += 10;
    }

    // Add organization info
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('International Organization for Migration (IOM) Haiti', 15, yPos);
    yPos += 5;
    doc.text('CAVB - Brazil Visa Application Center', 15, yPos);
    yPos += 15;

    return yPos;
  }

  private addFooter(doc: jsPDF, options: ReportOptions): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add page number
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const pageText = `Page ${i} of ${pageCount}`;
      const textWidth = doc.getTextWidth(pageText);
      doc.text(pageText, doc.internal.pageSize.width - textWidth - 15, doc.internal.pageSize.height - 10);
      
      // Add timestamp if requested
      if (options.includeTimestamp) {
        const timestamp = new Date().toLocaleString();
        doc.text(`Generated: ${timestamp}`, 15, doc.internal.pageSize.height - 10);
      }
      
      // Add watermark if provided
      if (options.watermark) {
        doc.setFontSize(40);
        doc.setTextColor(200, 200, 200);
        doc.text(options.watermark, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
          angle: 45,
          align: 'center'
        });
      }
    }
  }

  generateApplicationReport(application: Application, user?: { fullName: string; email: string }): string {
    const doc = new jsPDF();
    const options = { ...this.defaultOptions, title: 'Visa Application Report' };

    // Add header
    let yPos = this.addHeader(doc, 'Visa Application Report', `Application ID: ${application.id}`);

    // Application Information Section
    doc.setFontSize(14);
    doc.setTextColor(0, 74, 142);
    doc.text('Application Information', 15, yPos);
    yPos += 10;

    const applicationInfo = [
      ['Application ID', application.id],
      ['Visa Type', application.visaType],
      ['Status', application.status],
      ['Created Date', new Date(application.createdAt).toLocaleDateString()],
      ['Last Updated', new Date(application.updatedAt || application.createdAt).toLocaleDateString()],
    ];

    if (user) {
      applicationInfo.unshift(['Applicant Name', user.fullName]);
      applicationInfo.unshift(['Email', user.email]);
    }

    this.callAutoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: applicationInfo,
      theme: 'striped',
      headStyles: { fillColor: [0, 74, 142] },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Documents Section
    if (application.documents && application.documents.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 74, 142);
      doc.text('Required Documents', 15, yPos);
      yPos += 10;

      const documentData = application.documents.map(doc => [
        doc.type,
        doc.status,
        doc.fileName || 'Not uploaded',
        doc.rejectionReason || '-'
      ]);

      this.callAutoTable(doc, {
        startY: yPos,
        head: [['Document Type', 'Status', 'File Name', 'Notes']],
        body: documentData,
        theme: 'striped',
        headStyles: { fillColor: [0, 74, 142] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          1: { 
            cellWidth: 25,
            didParseCell: function(data: any) {
              if (data.cell.text[0] === 'VERIFIED') {
                data.cell.styles.textColor = [0, 128, 0];
              } else if (data.cell.text[0] === 'REJECTED') {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    // Appointment Information
    if (application.appointment) {
      doc.setFontSize(14);
      doc.setTextColor(0, 74, 142);
      doc.text('Appointment Information', 15, yPos);
      yPos += 10;

      const appointmentData = [
        ['Date', new Date(application.appointment.date).toLocaleDateString()],
        ['Time', application.appointment.time],
        ['Location', application.appointment.location],
        ['Status', application.appointment.status]
      ];

      this.callAutoTable(doc, {
        startY: yPos,
        head: [['Field', 'Value']],
        body: appointmentData,
        theme: 'striped',
        headStyles: { fillColor: [0, 74, 142] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 }
        }
      });
    }

    // Add footer
    this.addFooter(doc, options);

    // Return base64 string
    return doc.output('datauristring');
  }

  generateAdminReport(data: ApplicationReportData, options: ReportOptions = {}): string {
    const doc = new jsPDF();
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Add header
    const title = mergedOptions.title || 'Applications Report';
    const subtitle = this.buildSubtitle(data.filters);
    let yPos = this.addHeader(doc, title, subtitle);

    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(0, 74, 142);
    doc.text('Summary Statistics', 15, yPos);
    yPos += 10;

    const stats = this.calculateStatistics(data.applications);
    const statsData = [
      ['Total Applications', stats.total.toString()],
      ['Approved', stats.approved.toString()],
      ['In Review', stats.inReview.toString()],
      ['Pending Documents', stats.pendingDocuments.toString()],
      ['Rejected', stats.rejected.toString()],
      ['Appointment Scheduled', stats.appointmentScheduled.toString()]
    ];

    this.callAutoTable(doc, {
      startY: yPos,
      head: [['Status', 'Count']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [0, 74, 142] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Applications Table
    doc.setFontSize(14);
    doc.setTextColor(0, 74, 142);
    doc.text('Applications Details', 15, yPos);
    yPos += 10;

    const applicationData = data.applications.map(app => [
      app.id.substring(0, 8) + '...',
      app.user.fullName,
      app.visaType,
      app.status,
      new Date(app.createdAt).toLocaleDateString(),
      app.appointment ? 'Yes' : 'No'
    ]);

    this.callAutoTable(doc, {
      startY: yPos,
      head: [['ID', 'Applicant', 'Visa Type', 'Status', 'Created', 'Appointment']],
      body: applicationData,
      theme: 'striped',
      headStyles: { fillColor: [0, 74, 142] },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20, halign: 'center' }
      }
    });

    // Add footer
    this.addFooter(doc, mergedOptions);

    return doc.output('datauristring');
  }

  generateDocumentChecklist(application: Application): string {
    const doc = new jsPDF();
    const options = { ...this.defaultOptions, title: 'Document Checklist' };

    // Add header
    let yPos = this.addHeader(doc, 'Document Checklist', `Application ID: ${application.id}`);

    // Instructions
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Please bring all required documents to your appointment:', 15, yPos);
    yPos += 20;

    // Documents checklist
    const documentData = application.documents.map(doc => [
      '☐', // Checkbox
      doc.type,
      doc.status === 'VERIFIED' ? '✓ Verified' : doc.status === 'UPLOADED' ? '⏳ Under Review' : '❌ Required',
      doc.fileName || 'Not uploaded'
    ]);

    this.callAutoTable(doc, {
      startY: yPos,
      head: [['', 'Document Type', 'Status', 'File Name']],
      body: documentData,
      theme: 'grid',
      headStyles: { fillColor: [0, 74, 142] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 50 }
      }
    });

    // Add appointment info if available
    if (application.appointment) {
      yPos = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 74, 142);
      doc.text('Appointment Details', 15, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Date: ${new Date(application.appointment.date).toLocaleDateString()}`, 15, yPos);
      yPos += 7;
      doc.text(`Time: ${application.appointment.time}`, 15, yPos);
      yPos += 7;
      doc.text(`Location: ${application.appointment.location}`, 15, yPos);
    }

    // Add footer
    this.addFooter(doc, options);

    return doc.output('datauristring');
  }

  private buildSubtitle(filters?: ApplicationReportData['filters']): string {
    if (!filters) return '';

    const parts: string[] = [];
    
    if (filters.dateFrom && filters.dateTo) {
      parts.push(`Period: ${filters.dateFrom} to ${filters.dateTo}`);
    }
    
    if (filters.status) {
      parts.push(`Status: ${filters.status}`);
    }
    
    if (filters.visaType) {
      parts.push(`Visa Type: ${filters.visaType}`);
    }

    return parts.join(' | ');
  }

  private calculateStatistics(applications: Application[]) {
    return {
      total: applications.length,
      approved: applications.filter(app => app.status === ApplicationStatus.APPROVED).length,
      inReview: applications.filter(app => app.status === ApplicationStatus.IN_REVIEW).length,
      pendingDocuments: applications.filter(app => app.status === ApplicationStatus.PENDING_DOCUMENTS).length,
      rejected: applications.filter(app => app.status === ApplicationStatus.REJECTED).length,
      appointmentScheduled: applications.filter(app => app.status === ApplicationStatus.APPOINTMENT_SCHEDULED).length,
    };
  }
}

export const pdfService = new PDFService();

// Utility functions for easy access
export const generateApplicationPDF = (application: Application, user?: { fullName: string; email: string }) => {
  return pdfService.generateApplicationReport(application, user);
};

export const generateAdminReportPDF = (data: ApplicationReportData, options?: ReportOptions) => {
  return pdfService.generateAdminReport(data, options);
};

export const generateDocumentChecklistPDF = (application: Application) => {
  return pdfService.generateDocumentChecklist(application);
};

export { PDFService, ReportOptions, ApplicationReportData };