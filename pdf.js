// PDF Export function
function exportToPDF(student) {
    const settings = getSettings();
    const branch = student.branch;
    const sem = student.semester;
    const subjects = ensureSubjectList(branch, sem);
    const { totalObtained, cgpa, grade, status } = computeResult(student.marks);

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set font styles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    
    // Add college header
    doc.text("Your College Name", doc.internal.pageSize.width/2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Address: Your College Address", doc.internal.pageSize.width/2, 30, { align: "center" });
    doc.text("Phone: +XX-XXXX-XXXX | Website: www.college.com", doc.internal.pageSize.width/2, 37, { align: "center" });
    
    // Add line separator
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // Add title
    doc.setFontSize(16);
    doc.text("STATEMENT OF MARKS", doc.internal.pageSize.width/2, 55, { align: "center" });
    
    // Add student details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${student.name}`, 20, 70);
    doc.text(`Roll No: ${student.rollNo}`, 20, 80);
    doc.text(`Branch: ${branch}`, 120, 70);
    doc.text(`Semester: ${sem}`, 120, 80);
    
    // Add marks table
    const headers = [["Subject", "Marks Obtained", "Maximum Marks", "Status"]];
    const data = subjects.map((name, i) => {
        const obtained = student.marks[i] || 0;
        const pass = obtained >= settings.passMarksPerSubject;
        return [name, obtained.toString(), settings.maxMarksPerSubject.toString(), pass ? "PASS" : "FAIL"];
    });

    doc.autoTable({
        startY: 90,
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
            cellPadding: 5,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' }
        }
    });

    // Add result summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Result Summary", 20, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Marks: ${totalObtained}/${subjects.length * settings.maxMarksPerSubject}`, 20, finalY + 10);
    doc.text(`CGPA: ${cgpa.toFixed(2)}`, 90, finalY + 10);
    doc.text(`Grade: ${grade}`, 20, finalY + 20);
    
    // Add status with color
    doc.setTextColor(status === 'Pass' ? 0 : 255, status === 'Pass' ? 150 : 0, 0);
    doc.text(`Final Status: ${status}`, 90, finalY + 20);
    doc.setTextColor(0, 0, 0);

    // Add date and time
    const currentDate = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${currentDate}`, 20, finalY + 35);

    // Add signature lines
    const signY = finalY + 50;
    doc.line(20, signY, 70, signY);
    doc.line(130, signY, 180, signY);
    doc.setFont("helvetica", "normal");
    doc.text("Class Teacher", 30, signY + 5);
    doc.text("Principal", 145, signY + 5);

    // Save and open PDF
    const pdfOutput = doc.output('blob');
    const url = URL.createObjectURL(pdfOutput);
    
    // Open in new window
    window.open(url, '_blank');
    
    // Also trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.rollNo}_result.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}