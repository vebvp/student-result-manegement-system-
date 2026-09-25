function exportToPDF(student) {
    try {
        const settings = getSettings();
        const branch = student.branch;
        const sem = student.semester;
        const subjects = ensureSubjectList(branch, sem);
        const { totalObtained, cgpa, grade, status } = computeResult(student.marks);

        // Create new PDF document
        const doc = new window.jspdf.jsPDF();

        // Set initial font
        doc.setFont('helvetica');
        doc.setFontSize(16);

        // Add college name
        doc.text('Statement of Marks', 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Your College Name', 105, 30, { align: 'center' });
        
        // Add student info
        doc.setFontSize(12);
        doc.text('Student Information:', 20, 45);
        doc.text(`Name: ${student.name}`, 20, 55);
        doc.text(`Roll No: ${student.rollNo}`, 20, 65);
        doc.text(`Branch: ${branch}`, 120, 55);
        doc.text(`Semester: ${sem}`, 120, 65);

        // Add marks table
        const tableData = subjects.map((name, i) => {
            const marks = student.marks[i] || 0;
            return [
                name,
                marks.toString(),
                settings.maxMarksPerSubject.toString(),
                marks >= settings.passMarksPerSubject ? 'Pass' : 'Fail'
            ];
        });

        doc.autoTable({
            startY: 75,
            head: [['Subject', 'Marks Obtained', 'Maximum Marks', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            }
        });

        // Add result summary
        const finalY = doc.lastAutoTable.finalY + 10;
        
        doc.text('Result Summary:', 20, finalY + 10);
        doc.text(`Total Marks: ${totalObtained}`, 20, finalY + 20);
        doc.text(`CGPA: ${cgpa.toFixed(2)}`, 20, finalY + 30);
        doc.text(`Grade: ${grade}`, 20, finalY + 40);
        doc.text(`Status: ${status}`, 20, finalY + 50);

        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, finalY + 70);

        // Add signature lines
        const signY = finalY + 90;
        doc.line(20, signY, 70, signY);
        doc.line(120, signY, 170, signY);
        doc.text('Class Teacher', 35, signY + 5);
        doc.text('Principal', 135, signY + 5);

        // Open in new window
        const pdfOutput = doc.output('blob');
        const url = URL.createObjectURL(pdfOutput);
        window.open(url, '_blank');

        // Also download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${student.rollNo}_result.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Make it available globally
window.exportToPDF = exportToPDF;