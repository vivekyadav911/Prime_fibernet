import { jsPDF } from 'jspdf';

const MIN_PDF_BYTES = 100;

async function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

async function renderHtmlToPdfBlob(html: string): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('PDF generation requires a browser environment');
  }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not initialize PDF renderer');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await waitForImages(iframeDoc);
  await new Promise((resolve) => setTimeout(resolve, 150));

  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  });

  try {
    return await new Promise<Blob>((resolve, reject) => {
      doc.html(iframeDoc.body, {
        callback: (pdf) => {
          try {
            const blob = pdf.output('blob');
            if (blob.size < MIN_PDF_BYTES) {
              reject(new Error('PDF generation failed — output file is empty'));
              return;
            }
            resolve(blob);
          } catch (error) {
            reject(error);
          }
        },
        margin: [52, 52, 52, 52],
        autoPaging: 'text',
        html2canvas: {
          scale: 0.75,
          useCORS: true,
          logging: false,
        },
        width: 489,
        windowWidth: 800,
      });
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function generatePdfFromHtml(html: string): Promise<string> {
  const blob = await renderHtmlToPdfBlob(html);
  return URL.createObjectURL(blob);
}
