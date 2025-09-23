import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function addWatermarkToPDF(pdfFile) {
  try {
    // Load the PDF document
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Create watermark text
    const watermarkText = "PiataDeSiteuri.ro";
    
    // Embed the standard Helvetica font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Draw watermark multiple times across the page
      page.drawText(watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 24,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.2,
        rotate: degrees(45),
      });

      page.drawText(watermarkText, {
        x: width / 4 - 100,
        y: height / 4,
        size: 24,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.2,
        rotate: degrees(45),
      });

      page.drawText(watermarkText, {
        x: (width * 3) / 4 - 100,
        y: (height * 3) / 4,
        size: 24,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.2,
        rotate: degrees(45),
      });
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return new File([modifiedPdfBytes], pdfFile.name, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error adding watermark to PDF:', error);
    throw error;
  }
} 