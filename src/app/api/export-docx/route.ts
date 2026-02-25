/**
 * API Route: Export to DOCX
 * =========================
 * Generates a Word document from finalized proposal sections
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, acronym, sections, metadata } = body;

    if (!title || !sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'Titel und Abschnitte sind erforderlich' },
        { status: 400 }
      );
    }

    // Generate HTML content that can be converted to DOCX
    const htmlContent = generateHTML(title, acronym, sections, metadata);

    // Return as downloadable HTML (can be opened in Word)
    // For full DOCX support, we'd need docx library on server
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${acronym || 'proposal'}_export.doc"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export fehlgeschlagen: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

function generateHTML(
  title: string,
  acronym: string,
  sections: { title: string; content: string; wordCount: number }[],
  metadata: {
    generatedAt: string;
    totalWords: number;
    consortium: string[];
    sector: string;
    duration: number;
    budget: number;
  }
): string {
  const sectionsHTML = sections.map(section => `
    <div style="page-break-before: always;">
      <h2 style="color: #003399; border-bottom: 2px solid #003399; padding-bottom: 10px;">
        ${section.title}
      </h2>
      <p style="color: #666; font-size: 12px; margin-bottom: 20px;">
        Wortanzahl: ${section.wordCount}
      </p>
      <div style="text-align: justify; line-height: 1.6;">
        ${section.content.split('\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - ${acronym}</title>
  <style>
    @page {
      margin: 2.5cm;
      size: A4;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #333;
    }
    h1 {
      color: #003399;
      text-align: center;
      font-size: 24pt;
      margin-bottom: 10px;
    }
    h2 {
      color: #003399;
      font-size: 16pt;
      margin-top: 30px;
    }
    .acronym {
      text-align: center;
      font-size: 18pt;
      color: #666;
      margin-bottom: 30px;
    }
    .metadata {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .metadata table {
      width: 100%;
      border-collapse: collapse;
    }
    .metadata td {
      padding: 5px 10px;
      border-bottom: 1px solid #ddd;
    }
    .metadata td:first-child {
      font-weight: bold;
      width: 150px;
    }
    p {
      text-align: justify;
      margin-bottom: 12px;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 10pt;
      margin-top: 50px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="acronym">${acronym}</div>

  <div class="metadata">
    <table>
      <tr>
        <td>Sektor:</td>
        <td>${metadata.sector}</td>
      </tr>
      <tr>
        <td>Laufzeit:</td>
        <td>${metadata.duration} Monate</td>
      </tr>
      <tr>
        <td>Budget:</td>
        <td>€${metadata.budget?.toLocaleString() || 'N/A'}</td>
      </tr>
      <tr>
        <td>Konsortium:</td>
        <td>${metadata.consortium?.join(', ') || 'N/A'}</td>
      </tr>
      <tr>
        <td>Gesamtwortanzahl:</td>
        <td>${metadata.totalWords} Wörter</td>
      </tr>
    </table>
  </div>

  ${sectionsHTML}

  <div class="footer">
    Generiert mit Erasmus+ Architect am ${new Date(metadata.generatedAt).toLocaleDateString('de-DE')}
  </div>
</body>
</html>
  `.trim();
}
