export const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

export const exportToPDF = (printContentId: string, conceptTitle: string, conceptAcronym: string, actionType: string, sectorLabel: string) => {
    const printContent = document.getElementById(printContentId);
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        // Get all styles from the parent document
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(style => style.outerHTML)
            .join('\n');

        doc.open();
        doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${conceptTitle || 'Konzept'} - Erasmus+</title>
          ${styles}
          <style>
            body { 
              background: white !important;
              padding: 40px !important; 
              max-width: 900px;
              margin: 0 auto;
            }
            .prose { 
              max-width: none !important; 
              color: #334155 !important;
            }
            .prose h1, .prose h2, .prose h3 {
              color: #0f172a !important;
              margin-top: 2em !important;
            }
            .pdf-header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 1.5rem;
              margin-bottom: 2rem;
            }
            .pdf-intro {
              background-color: #f8fafc;
              border-left: 4px solid #2563eb;
              padding: 1.25rem 1.5rem;
              border-radius: 0.5rem;
              margin-bottom: 2.5rem;
            }
            .pdf-intro p {
              margin: 0;
              color: #475569;
              font-size: 1.05rem;
              line-height: 1.6;
            }
            @media print {
              body { padding: 0 !important; }
              @page { margin: 2cm; }
              .pdf-intro {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <div class="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2">Erasmus+ Projektkonzept</div>
            <h1 class="text-4xl font-extrabold text-slate-900 leading-tight mb-4">${conceptTitle || ''}</h1>
            <div class="flex items-center gap-4 text-sm font-medium text-slate-500 font-mono">
              <span class="bg-slate-100 px-3 py-1 rounded-md text-slate-700">${conceptAcronym || 'Kein Akronym'}</span>
              <span>•</span>
              <span>${actionType}</span>
              <span>•</span>
              <span>${sectorLabel || ''}</span>
            </div>
          </div>
          <div class="pdf-intro">
            <p><strong>Hinweis:</strong> Dieses Dokument ist ein automatisch generierter, vorläufiger Konzeptentwurf für einen Erasmus+ Förderantrag. Es bietet eine strukturierte Zusammenfassung der Problemstellung, der Projektziele, der geplanten Umsetzungsschritte sowie der vorgesehenen Rollen der Partnerorganisationen und dient als Diskussionsgrundlage für das Projektkonsortium.</p>
          </div>
          <div class="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
        doc.close();

        // Wait for content and styles to load
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            // Clean up after small delay
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 500);
        }, 500);
    }
};
