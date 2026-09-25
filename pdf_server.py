from flask import Flask, request, send_file
from flask_cors import CORS
from fpdf import FPDF
import json
import qrcode
from PIL import Image
import io
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

class PDF(FPDF):
    def header(self):
        # Add college logo (replace with your actual logo path)
        try:
            self.image('college_logo.png', 10, 8, 30)
        except:
            pass

        # Add college name and address
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'Your College Name', 0, 1, 'C')
        self.set_font('Arial', '', 12)
        self.cell(0, 6, 'Address Line 1, City - PIN', 0, 1, 'C')
        self.cell(0, 6, 'Phone: +91-XXXXXXXXXX | Email: info@college.edu', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        # Add page number
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', 0, 0, 'C')

def create_qr_code(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    return img_buffer

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        student_data = json.loads(request.form['student'])
        
        # Create PDF object
        pdf = PDF()
        pdf.alias_nb_pages()
        pdf.add_page()
        
        # Add result title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'STATEMENT OF MARKS', 0, 1, 'C')
        pdf.ln(5)
        
        # Add student details in a box
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, 'Student Details', 1, 1, 'C', fill=True)
        pdf.set_font('Arial', '', 12)
        
        # Create two-column layout for student details
        details = [
            ['Name:', student_data['name']],
            ['Roll No:', student_data['rollNo']],
            ['Branch:', student_data['branch']],
            ['Semester:', str(student_data['semester'])]
        ]
        
        for label, value in details:
            pdf.set_font('Arial', 'B', 11)
            pdf.cell(40, 8, label)
            pdf.set_font('Arial', '', 11)
            pdf.cell(0, 8, value, 0, 1)
        
        pdf.ln(5)
        
        # Add marks table
        pdf.set_font('Arial', 'B', 11)
        pdf.set_fill_color(200, 200, 200)
        
        # Table header
        col_widths = [10, 80, 30, 30, 40]
        headers = ['#', 'Subject', 'Marks', 'Max', 'Status']
        
        for i, header in enumerate(headers):
            pdf.cell(col_widths[i], 10, header, 1, 0, 'C', fill=True)
        pdf.ln()
        
        # Table content
        pdf.set_font('Arial', '', 11)
        for i, subject in enumerate(student_data['subjects']):
            marks = student_data['marks'][i]
            status = 'PASS' if marks >= student_data['passMarks'] else 'FAIL'
            status_color = (0, 200, 0) if status == 'PASS' else (200, 0, 0)
            
            pdf.cell(col_widths[0], 8, str(i + 1), 1)
            pdf.cell(col_widths[1], 8, subject, 1)
            pdf.cell(col_widths[2], 8, str(marks), 1, 0, 'C')
            pdf.cell(col_widths[3], 8, str(student_data['maxMarks']), 1, 0, 'C')
            
            # Change color for status
            pdf.set_text_color(*status_color)
            pdf.cell(col_widths[4], 8, status, 1)
            pdf.set_text_color(0, 0, 0)
            pdf.ln()
        
        # Add summary
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(0, 10, 'Result Summary', 1, 1, 'C', fill=True)
        pdf.set_font('Arial', '', 11)
        
        summary = [
            ['Total Marks:', f"{student_data['total']}/{len(student_data['subjects']) * student_data['maxMarks']}"],
            ['CGPA:', f"{student_data['cgpa']:.2f}"],
            ['Grade:', student_data['grade']],
            ['Final Status:', student_data['status']]
        ]
        
        for label, value in summary:
            pdf.set_font('Arial', 'B', 11)
            pdf.cell(40, 8, label)
            pdf.set_font('Arial', '', 11)
            if label == 'Final Status:':
                status_color = (0, 200, 0) if value == 'Pass' else (200, 0, 0)
                pdf.set_text_color(*status_color)
            pdf.cell(0, 8, value, 0, 1)
            pdf.set_text_color(0, 0, 0)
        
        # Add QR code
        qr_data = f"Name: {student_data['name']}\nRoll No: {student_data['rollNo']}\nCGPA: {student_data['cgpa']:.2f}\nStatus: {student_data['status']}"
        qr_buffer = create_qr_code(qr_data)
        
        # Position QR code at bottom right
        pdf.image(qr_buffer, x=160, y=pdf.get_y() + 10, w=30)
        
        # Add signature boxes
        pdf.ln(50)
        pdf.line(20, pdf.get_y(), 70, pdf.get_y())
        pdf.line(130, pdf.get_y(), 180, pdf.get_y())
        pdf.set_font('Arial', '', 10)
        pdf.text(30, pdf.get_y() + 5, 'Class Teacher')
        pdf.text(140, pdf.get_y() + 5, 'Principal')
        
        # Add date of generation
        pdf.set_y(-30)
        pdf.set_font('Arial', 'I', 10)
        pdf.cell(0, 10, f'Generated on: {datetime.now().strftime("%d-%m-%Y %H:%M:%S")}', 0, 1, 'L')
        
        # Output PDF
        pdf_buffer = io.BytesIO()
        pdf.output(pdf_buffer)
        pdf_buffer.seek(0)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{student_data['rollNo']}_result.pdf"
        )
        
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)