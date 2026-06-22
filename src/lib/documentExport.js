import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';

export function saveBlob(blob, filename) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = filename; a.click();
  URL.revokeObjectURL(u);
}

export function downloadAsPdf(text, baseName) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica');
  doc.setFontSize(11);
  let y = margin;
  text.split('\n').forEach((paragraph) => {
    const lines = doc.splitTextToSize(paragraph || ' ', maxWidth);
    lines.forEach((line) => {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 14;
    });
  });
  doc.save(`${baseName}.pdf`);
}

export async function downloadAsDocx(text, baseName) {
  const doc = new Document({
    sections: [{ children: text.split('\n').map((line) => new Paragraph(line)) }],
  });
  saveBlob(await Packer.toBlob(doc), `${baseName}.docx`);
}
