import html2canvas from 'html2canvas';

/** Rasterize calendar HTML so jsPDF preserves status colors on web. */
export async function renderCalendarHtmlToDataUrl(calendarHtml: string): Promise<string> {
  if (typeof document === 'undefined') {
    throw new Error('Calendar rendering requires a browser environment');
  }

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:720px;background:#ffffff;padding:16px;box-sizing:border-box;';
  container.innerHTML = calendarHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(container);
  }
}
