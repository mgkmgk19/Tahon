/**
 * Utility functions for exporting reports and vouchers to Excel (.xls),
 * Printing / PDF generation, and sharing via WhatsApp / Web Share / Email.
 */

export interface ExportXLSOptions {
  filename: string;
  sheetName?: string;
  title: string;
  subtitle?: string;
  metaInfo?: { label: string; value: string | number }[];
  headers: string[];
  rows: (string | number)[][];
  footerTotals?: (string | number)[];
}

/**
 * Exports data to a genuine Microsoft Excel .xls file with Arabic RTL support,
 * cell borders, header colors, and proper numeric formatting.
 */
export function exportToXLS(options: ExportXLSOptions): void {
  const {
    filename,
    sheetName = 'التقرير',
    title,
    subtitle = '',
    metaInfo = [],
    headers,
    rows,
    footerTotals,
  } = options;

  // Build HTML table that Excel parses as an .xls spreadsheet
  let tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:x="urn:schemas-microsoft-com:office:excel" 
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetName.replace(/[:\\/?*[\]]/g, '_')}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayRightToLeft/>
              <x:Print>
                <x:ValidPrinterInfo/>
                <x:PaperSizeIndex>9</x:PaperSizeIndex>
                <x:HorizontalResolution>600</x:HorizontalResolution>
                <x:VerticalResolution>600</x:VerticalResolution>
              </x:Print>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        direction: rtl;
      }
      table {
        border-collapse: collapse;
        direction: rtl;
        width: 100%;
      }
      .title {
        font-size: 16pt;
        font-weight: bold;
        color: #78350f;
        text-align: center;
        height: 35px;
      }
      .subtitle {
        font-size: 11pt;
        color: #475569;
        text-align: center;
        height: 25px;
      }
      .meta-cell {
        font-size: 9.5pt;
        color: #334155;
        padding: 4px 8px;
        background-color: #f8fafc;
        border: 0.5pt solid #cbd5e1;
      }
      th {
        background-color: #f1f5f9;
        color: #0f172a;
        font-size: 10.5pt;
        font-weight: bold;
        border: 1pt solid #94a3b8;
        padding: 8px 12px;
        text-align: center;
      }
      td {
        font-size: 10pt;
        border: 0.5pt solid #cbd5e1;
        padding: 6px 10px;
        text-align: right;
      }
      .num {
        text-align: center;
        mso-number-format: "\\#\\,\\#\\#0";
      }
      .even {
        background-color: #ffffff;
      }
      .odd {
        background-color: #fcfbf9;
      }
      .footer-total {
        background-color: #fef3c7;
        color: #78350f;
        font-weight: bold;
        font-size: 11pt;
        border-top: 1.5pt solid #b45309;
        border-bottom: 1.5pt solid #b45309;
        padding: 8px;
      }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="${headers.length}" class="title">${title}</td>
      </tr>
      ${subtitle ? `<tr><td colspan="${headers.length}" class="subtitle">${subtitle}</td></tr>` : ''}
      <tr><td colspan="${headers.length}" style="height: 10px;"></td></tr>
  `;

  // Add metadata lines if provided
  if (metaInfo.length > 0) {
    for (let i = 0; i < metaInfo.length; i += 2) {
      const item1 = metaInfo[i];
      const item2 = metaInfo[i + 1];
      tableHtml += `<tr>`;
      if (item2) {
        tableHtml += `
          <td colspan="${Math.floor(headers.length / 2)}" class="meta-cell"><strong>${item1.label}:</strong> ${item1.value}</td>
          <td colspan="${Math.ceil(headers.length / 2)}" class="meta-cell"><strong>${item2.label}:</strong> ${item2.value}</td>
        `;
      } else {
        tableHtml += `
          <td colspan="${headers.length}" class="meta-cell"><strong>${item1.label}:</strong> ${item1.value}</td>
        `;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `<tr><td colspan="${headers.length}" style="height: 12px;"></td></tr>`;
  }

  // Headers
  tableHtml += `<tr>`;
  headers.forEach((h) => {
    tableHtml += `<th>${h}</th>`;
  });
  tableHtml += `</tr>`;

  // Rows
  rows.forEach((row, idx) => {
    const rowClass = idx % 2 === 0 ? 'even' : 'odd';
    tableHtml += `<tr class="${rowClass}">`;
    row.forEach((cell) => {
      const isNum = typeof cell === 'number' || (!isNaN(Number(cell)) && cell !== '' && typeof cell === 'string' && !cell.includes('-') && !cell.includes('/'));
      tableHtml += `<td class="${isNum ? 'num' : ''}">${cell ?? ''}</td>`;
    });
    tableHtml += `</tr>`;
  });

  // Footer Totals
  if (footerTotals && footerTotals.length > 0) {
    tableHtml += `<tr>`;
    footerTotals.forEach((total) => {
      const isNum = typeof total === 'number' || (!isNaN(Number(total)) && total !== '');
      tableHtml += `<td class="footer-total ${isNum ? 'num' : ''}">${total ?? ''}</td>`;
    });
    tableHtml += `</tr>`;
  }

  tableHtml += `
    </table>
  </body>
  </html>
  `;

  // Create downloadable file with .xls extension
  const blob = new Blob([tableHtml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;

  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers standard print-to-PDF workflow
 */
export function printOrSavePDF(title?: string): void {
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

/**
 * Share report via WhatsApp or Native Web Share API
 */
export async function shareReportData(options: {
  title: string;
  summaryText: string;
  whatsappPhone?: string;
}): Promise<boolean> {
  const { title, summaryText, whatsappPhone } = options;

  // If navigator.share is supported and user isn't targeting WhatsApp specifically
  if (!whatsappPhone && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text: summaryText,
      });
      return true;
    } catch {
      // If user cancelled or failed, fallback to whatsapp/clipboard
    }
  }

  // WhatsApp link fallback
  const encodedText = encodeURIComponent(`*${title}*\n\n${summaryText}`);
  let waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  if (whatsappPhone) {
    const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
    waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  window.open(waUrl, '_blank');
  return true;
}

/**
 * Convert integer to Arabic words (Tafqeet) for official receipts / vouchers
 */
export function numberToArabicWords(n: number): string {
  if (isNaN(n) || n === 0) return 'صفر كيس';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertHundreds(val: number): string {
    let result = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (rem > 0) {
      if (result) result += ' و ';
      if (rem < 10) {
        result += ones[rem];
      } else if (rem < 20) {
        result += teens[rem - 10];
      } else {
        const o = rem % 10;
        const t = Math.floor(rem / 10);
        if (o > 0) {
          result += ones[o] + ' و ' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  let words = '';
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    if (thousands === 1) {
      words += 'ألف';
    } else if (thousands === 2) {
      words += 'ألفان';
    } else if (thousands >= 3 && thousands <= 10) {
      words += convertHundreds(thousands) + ' آلاف';
    } else {
      words += convertHundreds(thousands) + ' ألف';
    }

    if (rem > 0) {
      words += ' و ' + convertHundreds(rem);
    }
  } else {
    words = convertHundreds(n);
  }

  return `فقط ${words} كيس لا غير`;
}
