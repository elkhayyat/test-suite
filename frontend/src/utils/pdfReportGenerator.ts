import jsPDF from 'jspdf';
import { TestFlow, StepResult } from '../../../shared/src/types';

interface TestRunData {
  id: string;
  flowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  environment?: string;
  results: StepResult[];
}

export function generatePDFReport(testRun: TestRunData, flow: TestFlow): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to add text with automatic page breaks
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    if (yPosition + lineHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.text(text, margin, yPosition);
    yPosition += lineHeight;
  };

  // Helper function to add multi-line text
  const addMultilineText = (text: string, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Title
  addText('Test Execution Report', 20, true);
  yPosition += 5;

  // Test Information
  addText('Test Information', 16, true);
  addText(`Flow Name: ${testRun.flowName}`);
  addText(`Run ID: ${testRun.id}`);
  addText(`Status: ${testRun.status.toUpperCase()}`);
  addText(`Environment: ${testRun.environment || 'Default'}`);
  addText(`Start Time: ${new Date(testRun.startTime).toLocaleString()}`);
  
  if (testRun.endTime) {
    addText(`End Time: ${new Date(testRun.endTime).toLocaleString()}`);
  }
  
  if (testRun.duration) {
    addText(`Duration: ${(testRun.duration / 1000).toFixed(2)} seconds`);
  }
  
  yPosition += 10;

  // Summary Statistics
  addText('Summary', 16, true);
  const totalSteps = testRun.results.length;
  const passedSteps = testRun.results.filter(r => r.status === 'passed').length;
  const failedSteps = testRun.results.filter(r => r.status === 'failed').length;
  const skippedSteps = testRun.results.filter(r => r.status === 'skipped').length;
  
  addText(`Total Steps: ${totalSteps}`);
  addText(`Passed: ${passedSteps}`);
  addText(`Failed: ${failedSteps}`);
  addText(`Skipped: ${skippedSteps}`);
  addText(`Success Rate: ${totalSteps > 0 ? ((passedSteps / totalSteps) * 100).toFixed(1) : 0}%`);
  
  yPosition += 10;

  // Step Details
  addText('Step Execution Details', 16, true);
  yPosition += 5;

  testRun.results.forEach((result, index) => {
    const step = flow.steps.find(s => s.id === result.stepId);
    if (!step) return;

    // Check if we need a new page for this step
    if (yPosition + 40 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Step header
    const statusColor = result.status === 'passed' ? 'green' : 
                       result.status === 'failed' ? 'red' : 
                       result.status === 'skipped' ? 'gray' : 'orange';
    
    doc.setFillColor(statusColor === 'green' ? 76 : statusColor === 'red' ? 220 : statusColor === 'gray' ? 158 : 255,
                     statusColor === 'green' ? 175 : statusColor === 'red' ? 53 : statusColor === 'gray' ? 158 : 152,
                     statusColor === 'green' ? 80 : statusColor === 'red' ? 69 : statusColor === 'gray' ? 158 : 0);
    doc.roundedRect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 8, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    addText(`Step ${index + 1}: ${step.name} - ${result.status.toUpperCase()}`, 12, true);
    doc.setTextColor(0, 0, 0);

    // Step details
    addText(`Type: ${step.type}`);
    
    if (result.duration) {
      addText(`Duration: ${(result.duration / 1000).toFixed(2)} seconds`);
    }

    // Output
    if (result.output) {
      addText('Output:', 10, true);
      addMultilineText(JSON.stringify(result.output, null, 2));
      yPosition += 3;
    }

    // Error
    if (result.error) {
      doc.setTextColor(220, 53, 69);
      addText('Error:', 10, true);
      addMultilineText(result.error);
      doc.setTextColor(0, 0, 0);
      yPosition += 3;
    }

    // Console logs
    if (result.logs && result.logs.length > 0) {
      addText('Console Logs:', 10, true);
      result.logs.forEach(log => {
        addMultilineText(`[${log.level}] ${log.message}`, 9);
      });
      yPosition += 3;
    }

    yPosition += 5;
  });

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Save the PDF
  const fileName = `test-report-${testRun.flowName.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}