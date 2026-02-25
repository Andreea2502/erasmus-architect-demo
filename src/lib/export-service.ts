/**
 * EXPORT SERVICE
 * ===============
 * Generates HTML and PDF exports of Erasmus+ project applications
 */

import { Project } from '@/store/types';
import { getOfficialPipelineStructure } from '@/lib/official-pipeline-structure';

// ============================================================================
// HTML EXPORT
// ============================================================================

export function generateProjectHTML(project: Project): string {
  const generatorState = project.generatorState;

  // Build table of contents
  const actionType = project.actionType || 'KA220';
  const structure = getOfficialPipelineStructure(actionType);
  const tocEntries = structure.map(ch =>
    `<a href="#chapter-${ch.id}" class="toc-entry">${ch.id}. ${ch.title}</a>`
  ).join('\n');

  // Build HTML document
  let html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.acronym || project.title} - Erasmus+ Antrag</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
      background: #fff;
    }
    h1 { font-size: 18px; }
    h2 { font-size: 14px; }
    h3 { font-size: 12px; }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #003399 0%, #0055cc 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin-bottom: 8px;
    }
    .header .acronym {
      background: #FFCC00;
      color: #003399;
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }
    .header .meta {
      margin-top: 10px;
      font-size: 10px;
      opacity: 0.9;
    }
    
    /* Table of Contents */
    .toc {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 25px;
    }
    .toc h2 {
      margin-bottom: 10px;
      color: #003399;
    }
    .toc-entry {
      display: block;
      color: #003399;
      text-decoration: none;
      padding: 4px 0;
      font-size: 11px;
    }
    .toc-entry:hover {
      text-decoration: underline;
    }
    
    /* Chapter */
    .chapter {
      margin-bottom: 25px;
      page-break-before: always;
    }
    .chapter:first-of-type {
      page-break-before: auto;
    }
    .chapter-header {
      background: #003399;
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .chapter-content {
      padding: 0 10px;
    }
    
    /* Section */
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      color: #003399;
      font-weight: 600;
      font-size: 12px;
      padding-bottom: 5px;
      border-bottom: 1px solid #003399;
      margin-bottom: 12px;
    }
    
    /* Question */
    .question {
      background: #f5f7fa;
      padding: 10px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .question-text {
      font-weight: 500;
      color: #555;
      font-size: 10px;
      margin-bottom: 6px;
    }
    .question-number {
      color: #003399;
      font-weight: bold;
    }
    .answer {
      padding-left: 12px;
      border-left: 2px solid #FFCC00;
      font-size: 11px;
      white-space: pre-wrap;
    }
    .answer p { margin-bottom: 6px; }
    .answer ul, .answer ol { margin-left: 15px; margin-bottom: 6px; }
    .answer li { margin-bottom: 3px; }
    .answer strong { font-weight: 600; }
    .no-answer {
      color: #999;
      font-style: italic;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 9px;
      color: #888;
    }
    
    @media print {
      body {
        padding: 10mm;
        font-size: 10px;
      }
      .chapter {
        page-break-before: always;
      }
      .chapter:first-of-type {
        page-break-before: auto;
      }
      .header, .chapter-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .toc {
        page-break-after: always;
      }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${project.title || 'Erasmus+ Projekt'}</h1>
    ${project.acronym ? `<span class="acronym">${project.acronym}</span>` : ''}
    <div class="meta">
      ${project.actionType || 'KA220'} | ${project.sector || ''} | 
      Budget: €${project.budgetTier?.toLocaleString() || 'N/A'} | 
      Dauer: ${project.duration || 24} Monate
    </div>
  </div>

  <div class="toc">
    <h2>Inhaltsverzeichnis</h2>
    ${tocEntries}
  </div>
`;

  // Render each chapter
  structure.forEach(chapter => {
    html += `
  <div class="chapter" id="chapter-${chapter.id}">
    <div class="chapter-header">${chapter.id}. ${chapter.title}</div>
    <div class="chapter-content">
`;

    chapter.sections.forEach(section => {
      html += `
      <div class="section">
        <h3 class="section-title">${section.title}</h3>
`;

      const questions = section.questions.filter(q => q.type !== 'info');
      questions.forEach((q, idx) => {
        const answer = generatorState?.answers?.[q.id];
        let answerText = typeof answer === 'string' ? answer :
          typeof answer === 'object' && 'value' in answer ? (answer as any).value :
            Array.isArray(answer) ? answer.join(', ') : null;

        // Format for PDF - check if already HTML (from RichTextEditor) or markdown
        if (answerText) {
          const isHtml = answerText.includes('<') && answerText.includes('>');
          if (!isHtml) {
            // Convert markdown to HTML
            answerText = answerText
              .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
              .replace(/\*([^*]+)\*/g, '<em>$1</em>')
              .replace(/^- (.+)$/gm, '<li>$1</li>')
              .replace(/^• (.+)$/gm, '<li>$1</li>')
              .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
              .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>');
            answerText = `<p>${answerText}</p>`;
          }
          // HTML content is already formatted, use directly
        }

        html += `
        <div class="question">
          <div class="question-text">
            <span class="question-number">Q${idx + 1}:</span>
            ${q.text}
          </div>
          <div class="answer ${!answerText ? 'no-answer' : ''}">
            ${answerText || 'Keine Antwort generiert'}
          </div>
        </div>
`;
      });

      html += `
      </div>
`;
    });

    html += `
    </div>
  </div>
`;
  });

  // Footer
  html += `
  <div class="footer">
    Erasmus+ Antrag | ${project.acronym || project.title} | 
    Exportiert am ${new Date().toLocaleDateString('de-DE')}
  </div>
</body>
</html>
`;

  return html;
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

export function downloadAsHTML(project: Project): void {
  const html = generateProjectHTML(project);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.acronym || 'projekt'}_antrag.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAsPDF(project: Project): Promise<void> {
  const html = generateProjectHTML(project);

  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  document.body.appendChild(iframe);

  // Write content
  iframe.contentDocument?.open();
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();

  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 500));

  // Trigger print (browser's save as PDF functionality)
  iframe.contentWindow?.print();

  // Clean up after a short delay
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

// ============================================================================
// CONSORTIUM / PARTNER INFO EXPORT
// ============================================================================

export function generatePartnerContactsHTML(project: Project, partners: any[]): string {
  // Find partners in the consortium
  const consortiumPartnerIds = project.consortium?.map(c => c.partnerId) || [];
  const consortiumPartners = partners.filter(p => consortiumPartnerIds.includes(p.id));

  let html = `
<div class="partner-contacts">
  <h3>Konsortium Kontaktdaten</h3>
  <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
    <thead>
      <tr style="background: #003399; color: white;">
        <th style="padding: 10px; text-align: left;">Organisation</th>
        <th style="padding: 10px; text-align: left;">Land</th>
        <th style="padding: 10px; text-align: left;">Kontakt</th>
        <th style="padding: 10px; text-align: left;">E-Mail</th>
        <th style="padding: 10px; text-align: left;">Telefon</th>
      </tr>
    </thead>
    <tbody>
`;

  consortiumPartners.forEach(partner => {
    const primaryContact = partner.contacts?.find((c: any) => c.isPrimary) || partner.contacts?.[0];
    html += `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px;">${partner.organizationName}</td>
        <td style="padding: 10px;">${partner.country}</td>
        <td style="padding: 10px;">${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : '-'}</td>
        <td style="padding: 10px;">${partner.email || primaryContact?.email || '-'}</td>
        <td style="padding: 10px;">${partner.phone || primaryContact?.phone || '-'}</td>
      </tr>
`;
  });

  html += `
    </tbody>
  </table>
</div>
`;

  return html;
}
