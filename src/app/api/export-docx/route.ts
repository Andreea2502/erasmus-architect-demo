/**
 * API Route: Export to DOCX (Real Word Document)
 * ================================================
 * Generates a proper .docx file using the docx library
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';

interface AnswerSection {
  chapterTitle: string;
  chapterId: number;
  questionText: string;
  fullQuestion: string;
  answerText: string;
  partnerName?: string;
  charLimit?: number;
}

interface DocxRequestBody {
  title: string;
  acronym: string;
  actionType: string;
  sector: string;
  budget: number;
  duration: number;
  consortium: { name: string; country: string; type: string; role: string }[];
  sections: AnswerSection[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DocxRequestBody = await request.json();
    const { title, acronym, actionType, sector, budget, duration, consortium, sections } = body;

    if (!title || !sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'Title and sections are required' },
        { status: 400 }
      );
    }

    // Build document children
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    // Acronym
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: acronym, size: 28, color: '666666', italics: true }),
        ],
      })
    );

    // Project Info Table
    const infoRows = [
      ['Action Type', actionType],
      ['Sector', sector],
      ['Budget', `€${budget?.toLocaleString() || 'N/A'}`],
      ['Duration', `${duration} months`],
    ];

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
              }),
            ],
          })
      ),
    });
    children.push(new Paragraph({ spacing: { before: 200 } }));
    children.push(infoTable as unknown as Paragraph);

    // Consortium Table
    if (consortium && consortium.length > 0) {
      children.push(new Paragraph({ spacing: { before: 300 } }));
      children.push(
        new Paragraph({
          text: 'Consortium',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );

      const consortiumTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // Header row
          new TableRow({
            tableHeader: true,
            children: ['No.', 'Organisation', 'Country', 'Type', 'Role'].map(
              (h) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: '003399' })] })],
                  shading: { color: 'auto', fill: 'F0F0F0' },
                })
            ),
          }),
          // Data rows
          ...consortium.map(
            (member, idx) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.name, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.country, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.type, size: 20 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.role, size: 20 })] })] }),
                ],
              })
          ),
        ],
      });
      children.push(consortiumTable as unknown as Paragraph);
    }

    // Generated content sections grouped by chapter
    let currentChapter = '';

    for (const section of sections) {
      // Chapter heading
      if (section.chapterTitle !== currentChapter) {
        currentChapter = section.chapterTitle;
        children.push(new Paragraph({ spacing: { before: 400 } }));
        children.push(
          new Paragraph({
            text: `Chapter ${section.chapterId}: ${section.chapterTitle}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          })
        );
      }

      // Partner name sub-heading if applicable
      if (section.partnerName) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: section.partnerName, bold: true, size: 24, color: '333333' })],
            spacing: { before: 200, after: 100 },
          })
        );
      }

      // Question (in blue, smaller)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: section.fullQuestion, italics: true, size: 20, color: '003399' }),
          ],
          spacing: { before: 200, after: 50 },
        })
      );

      // Character count if applicable
      if (section.charLimit) {
        const len = section.answerText.length;
        const status = len > section.charLimit ? '⚠ OVER LIMIT' : `${len}/${section.charLimit}`;
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[${status} characters]`, size: 16, color: len > section.charLimit ? 'CC0000' : '888888' })],
            spacing: { after: 100 },
          })
        );
      }

      // Answer text - split by lines and handle bold markers
      const answerLines = section.answerText.split('\n');
      for (const line of answerLines) {
        if (line.trim() === '') {
          children.push(new Paragraph({ spacing: { before: 50 } }));
          continue;
        }

        // Handle bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line.trim().slice(2), size: 22 })],
              bullet: { level: 0 },
              spacing: { before: 50 },
            })
          );
          continue;
        }

        // Parse bold markers **text**
        const parts: TextRun[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(new TextRun({ text: line.slice(lastIndex, match.index), size: 22 }));
          }
          parts.push(new TextRun({ text: match[1], bold: true, size: 22 }));
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) {
          parts.push(new TextRun({ text: line.slice(lastIndex), size: 22 }));
        }

        children.push(
          new Paragraph({
            children: parts.length > 0 ? parts : [new TextRun({ text: line, size: 22 })],
            spacing: { before: 50 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    }

    // Footer
    children.push(new Paragraph({ spacing: { before: 600 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Generated with Erasmus+ Architect on ${new Date().toLocaleDateString('de-DE')}`,
            size: 18,
            color: '999999',
            italics: true,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Total sections: ${sections.length}`,
            size: 18,
            color: '999999',
          }),
        ],
      })
    );

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      }],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${acronym || 'proposal'}_application.docx"`,
      },
    });

  } catch (error) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      { error: 'DOCX export failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
