// PDF Export functionality
function generatePDF(student) {
    const settings = getSettings();
    const branch = student.branch;
    const sem = student.semester;
    const subjects = ensureSubjectList(branch, sem);
    const { totalObtained, cgpa, grade, status } = computeResult(student.marks);

    // Create new PDF document
    const doc = new window.jspdf.jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT OF MARKS', 105, 20, { align: 'center' });
    
    // College info
    doc.setFontSize(16);
    doc.text('Your College Name', 105, 35, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Address: College Address Line 1, City - PIN', 105, 43, { align: 'center' });
    
    // Decorative line
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    
    // Student info box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 55, 170, 35, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Details', 25, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${student.name}`, 25, 71);
    doc.text(`Roll No: ${student.rollNo}`, 25, 79);
    doc.text(`Branch: ${branch}`, 105, 71);
    doc.text(`Semester: ${sem}`, 105, 79);
    
    // Marks table
    const headers = [['Subject', 'Marks Obtained', 'Maximum Marks', 'Status']];
    const data = subjects.map((name, i) => {
        const obtained = student.marks[i] || 0;
        const pass = obtained >= settings.passMarksPerSubject;
        return [
            name,
            obtained.toString(),
            settings.maxMarksPerSubject.toString(),
            pass ? 'PASS' : 'FAIL'
        ];
    });
    
    doc.autoTable({
        startY: 100,
        head: headers,
        body: data,
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' }
        }
    });
    
    // Result summary
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Result Summary', 20, finalY);
    
    // Summary box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, finalY + 5, 170, 30, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.text(`Total Marks: ${totalObtained}/${subjects.length * settings.maxMarksPerSubject}`, 25, finalY + 15);
    doc.text(`CGPA: ${cgpa.toFixed(2)}`, 105, finalY + 15);
    doc.text(`Grade: ${grade}`, 25, finalY + 25);
    
    // Status with color
    if (status === 'Pass') {
        doc.setTextColor(0, 150, 0);
    } else {
        doc.setTextColor(255, 0, 0);
    }
    doc.text(`Status: ${status}`, 105, finalY + 25);
    doc.setTextColor(0);
    
    // Signature section
    const signY = finalY + 50;
    doc.setDrawColor(0);
    doc.line(20, signY, 70, signY);
    doc.line(120, signY, 170, signY);
    doc.setFontSize(10);
    doc.text('Class Teacher', 35, signY + 5);
    doc.text('Principal', 138, signY + 5);
    
    // Footer with date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, signY + 20);
    
    // Open PDF in new window
    const pdfOutput = doc.output('blob');
    const url = URL.createObjectURL(pdfOutput);
    window.open(url, '_blank');
    
    // Also download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.rollNo}_result.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Replace the old exportToPDF function
window.exportToPDF = generatePDF;