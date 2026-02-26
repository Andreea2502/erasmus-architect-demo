"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import {
  SECTOR_LABELS,
  ACTION_TYPE_LABELS,
  COUNTRY_NAMES,
  ORGANIZATION_TYPE_LABELS,
} from "@/store/types";
import { getOfficialPipelineStructure } from "@/lib/official-pipeline-structure";
import {
  FileOutput,
  FileText,
  FileJson,
  Download,
  Copy,
  CheckCircle,
  FolderKanban,
  Users,
  AlertCircle,
  Upload,
  Clock,
  Shield,
  FileUp,
  Printer,
} from "lucide-react";

type ExportFormat = "json" | "word" | "summary" | "pdf";

// Backup reminder interval (7 days in ms)
const BACKUP_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;

/**
 * Convert Markdown text to clean HTML for PDF export
 * Handles: headings, bold, italic, bullet points, numbered lists, line breaks
 */
function markdownToHtml(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headers (## and ###)
    .replace(/^### (.+)$/gm, '<h4 style="color: #333; font-size: 11pt; margin: 15px 0 8px 0; font-weight: 600;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color: #003399; font-size: 12pt; margin: 18px 0 10px 0; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">$1</h3>')

    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')

    // Italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')

    // Bullet points (- or *)
    .replace(/^[\-\*] (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')

    // Numbered lists (1. 2. etc)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')

    // Wrap consecutive <li> items in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
      return `<ul style="margin: 10px 0; padding-left: 20px; list-style-type: disc;">${match}</ul>`;
    })

    // Double line breaks = paragraph
    .replace(/\n\n/g, '</p><p style="margin: 10px 0; text-align: justify;">')

    // Single line breaks
    .replace(/\n/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p')) {
    html = `<p style="margin: 10px 0; text-align: justify;">${html}</p>`;
  }

  return html;
}

export function ExportPanel() {
  const projects = useAppStore((state) => state.projects);
  const partners = useAppStore((state) => state.partners);
  const exportData = useAppStore((state) => state.exportData);
  const importData = useAppStore((state) => state.importData);

  const [selectedProject, setSelectedProject] = useState<string | null>(
    projects[0]?.id || null
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>("summary");
  const [copied, setCopied] = useState(false);
  const [exportedContent, setExportedContent] = useState<string | null>(null);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === selectedProject);

  // Check for backup reminder
  useEffect(() => {
    const lastBackup = localStorage.getItem('erasmus-last-backup');
    if (lastBackup) {
      const lastBackupDate = new Date(lastBackup).getTime();
      const now = Date.now();
      if (now - lastBackupDate > BACKUP_REMINDER_INTERVAL) {
        setShowBackupReminder(true);
      }
    } else if (projects.length > 0 || partners.length > 0) {
      // No backup ever made but has data
      setShowBackupReminder(true);
    }
  }, [projects.length, partners.length]);

  // Handle file import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate the imported data structure
        if (!data.partners && !data.projects) {
          throw new Error('Ungültiges Backup-Format: Keine Partner oder Projekte gefunden');
        }

        // Check version compatibility
        if (data.version && parseFloat(data.version) > 1.1) {
          throw new Error(`Backup-Version ${data.version} ist neuer als unterstützt (1.1)`);
        }

        importData(content);
        setImportStatus('success');
        setImportMessage(`Import erfolgreich: ${data.partners?.length || 0} Partner, ${data.projects?.length || 0} Projekte`);

        // Update last backup time
        localStorage.setItem('erasmus-last-backup', new Date().toISOString());
        setShowBackupReminder(false);

        // Clear message after 5 seconds
        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage('');
        }, 5000);
      } catch (err) {
        setImportStatus('error');
        setImportMessage(err instanceof Error ? err.message : 'Import fehlgeschlagen');
        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage('');
        }, 5000);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPartner = (partnerId: string) => {
    return partners.find((p) => p.id === partnerId);
  };

  const handleExport = () => {
    if (!project) return;

    // For PDF: Open print dialog directly instead of showing preview
    if (exportFormat === "pdf") {
      const pdfContent = generatePdfContent(project);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 300);
        };
        // Fallback if onload doesn't fire
        setTimeout(() => {
          printWindow.print();
        }, 800);
      }
      // Show a message in the preview area
      setExportedContent("PDF-Druckdialog wurde in einem neuen Fenster geöffnet.\n\nBitte wähle 'Als PDF speichern' im Druckdialog.\n\nFalls das Fenster nicht erscheint, prüfe deinen Popup-Blocker.");
      return;
    }

    let content = "";

    if (exportFormat === "json") {
      content = JSON.stringify(project, null, 2);
    } else if (exportFormat === "summary") {
      content = generateSummary(project);
    } else if (exportFormat === "word") {
      // For Word: Download directly as .doc file
      const wordContent = generateWordContent(project);
      const blob = new Blob([wordContent], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.acronym || "project"}_application.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show confirmation message in preview
      setExportedContent(`Word-Dokument wurde heruntergeladen: ${project.acronym || "project"}_application.doc\n\nÖffne die Datei mit Microsoft Word oder LibreOffice Writer.\n\nDas Dokument enthält alle generierten Inhalte mit Formatierung.`);
      return;
    }

    setExportedContent(content);
  };

  const generateSummary = (proj: typeof project) => {
    if (!proj) return "";

    const coordinator = proj.consortium.find((m) => m.role === "COORDINATOR");
    const coordinatorPartner = coordinator ? getPartner(coordinator.partnerId) : null;

    const lines = [
      `PROJECT SUMMARY`,
      `===============`,
      ``,
      `BASIC INFORMATION`,
      `-----------------`,
      `Title: ${proj.title || "Not specified"}`,
      `Acronym: ${proj.acronym || "Not specified"}`,
      `Action Type: ${ACTION_TYPE_LABELS[proj.actionType]}`,
      `Sector: ${SECTOR_LABELS[proj.sector]}`,
      `Budget: €${proj.budgetTier.toLocaleString()}`,
      `Duration: ${proj.duration} months`,
      `Call Year: ${proj.callYear}`,
      ``,
      `CONSORTIUM`,
      `----------`,
      `Number of Partners: ${proj.consortium.length}`,
      `Coordinator: ${coordinatorPartner ? coordinatorPartner.organizationName : "Not assigned"}`,
      `Countries: ${[...new Set(proj.consortium.map((m) => getPartner(m.partnerId)?.country).filter(Boolean))].map((c) => COUNTRY_NAMES[c!] || c).join(", ")}`,
      ``,
      `Partners:`,
    ];

    proj.consortium.forEach((member, idx) => {
      const partner = getPartner(member.partnerId);
      if (partner) {
        lines.push(
          `  ${idx + 1}. ${partner.organizationName} (${COUNTRY_NAMES[partner.country] || partner.country}) - ${member.role}`
        );
      }
    });

    if (proj.problemStatement) {
      lines.push(``);
      lines.push(`PROBLEM STATEMENT`);
      lines.push(`-----------------`);
      lines.push(proj.problemStatement);
    }

    if (proj.objectives.length > 0) {
      lines.push(``);
      lines.push(`OBJECTIVES`);
      lines.push(`----------`);
      proj.objectives.forEach((obj) => {
        lines.push(`${obj.code} (${obj.type}): ${obj.description}`);
      });
    }

    if (proj.workPackages.length > 0) {
      lines.push(``);
      lines.push(`WORK PACKAGES`);
      lines.push(`-------------`);
      proj.workPackages.forEach((wp) => {
        lines.push(`WP${wp.number}: ${wp.title} (M${wp.startMonth}-M${wp.endMonth})`);
        if (wp.objectives) {
          lines.push(`  Objectives: ${wp.objectives}`);
        }
        if (wp.activities.length > 0) {
          lines.push(`  Activities: ${wp.activities.length}`);
        }
        if (wp.deliverables.length > 0) {
          lines.push(`  Deliverables: ${wp.deliverables.length}`);
        }
      });
    }

    if (proj.results.length > 0) {
      lines.push(``);
      lines.push(`PROJECT RESULTS`);
      lines.push(`---------------`);
      proj.results.forEach((result) => {
        lines.push(`${result.code}: ${result.title} (${result.type})`);
        if (result.description) {
          lines.push(`  ${result.description.substring(0, 200)}${result.description.length > 200 ? "..." : ""}`);
        }
        lines.push(`  Languages: ${result.languages?.join(", ") || 'Not specified'}`);
      });
    }

    if (proj.horizontalPriorities.length > 0) {
      lines.push(``);
      lines.push(`HORIZONTAL PRIORITIES`);
      lines.push(`---------------------`);
      proj.horizontalPriorities.forEach((p) => {
        lines.push(`• ${p}`);
      });
    }

    // =========================================================================
    // CRITICAL: Export all generated Pipeline answers (the 30k+ words!)
    // =========================================================================
    if (proj.generatorState?.answers && Object.keys(proj.generatorState.answers).length > 0) {
      lines.push(``);
      lines.push(`===========================================`);
      lines.push(`GENERATED APPLICATION CONTENT (FULL TEXT)`);
      lines.push(`===========================================`);
      lines.push(``);

      // Group answers by chapter/section for better readability
      const answers = proj.generatorState.answers;
      const answerKeys = Object.keys(answers).sort();

      // Define question labels for better readability
      const questionLabels: Record<string, string> = {
        'projectTitle': '1.1 Project Title',
        'acronym': '1.2 Acronym',
        'projectDuration': '1.3 Duration',
        'projectStart': '1.4 Start Date',
        'org_presentation': '2.1 Organisation Presentation',
        'org_experience': '2.2 Organisation Experience',
        'org_past_participation': '2.3 Past Participation',
        'address_priorities': '3.1 Addressing Priorities',
        'needs_address': '3.2 Needs Analysis',
        'target_groups': '3.3 Target Groups',
        'objectives_results': '3.4 Objectives and Results',
        'eu_added_value': '3.5 EU Added Value',
        'formation': '4.1 Partnership Formation',
        'partner_selection': '4.2 Partner Selection',
        'task_allocation': '4.3 Task Allocation',
        'coordination': '4.4 Coordination Mechanisms',
        'wp1_monitoring': '6.1 Monitoring & Quality',
        'wp1_personnel': '6.2 Personnel & Timing',
        'wp1_budget': '6.3 Budget Management',
        'wp1_risks': '6.4 Risk Management',
        'wp1_inclusion': '6.5 Inclusion',
        'wp1_digital': '6.6 Digitalisation',
        'wp1_green': '6.7 Green Practices',
        'wp1_participation': '6.8 Participation',
        'evaluation': '5.1 Evaluation Methods',
        'dissemination': '5.2 Dissemination Strategy',
        'sustainability': '5.3 Sustainability',
        'summary_objectives': '7.1 Summary - Objectives',
        'summary_activities': '7.2 Summary - Activities',
        'summary_results': '7.3 Summary - Results',
      };

      let currentChapter = '';

      answerKeys.forEach((key) => {
        const answer = answers[key];
        if (!answer?.value || answer.value.trim() === '') return;

        // Determine chapter from key
        let chapter = 'Other';
        if (key.startsWith('org_')) chapter = 'Chapter 2: Participating Organisations';
        else if (key === 'projectTitle' || key === 'acronym' || key.startsWith('project')) chapter = 'Chapter 1: Context';
        else if (key.startsWith('address_') || key.startsWith('needs_') || key.startsWith('target_') || key.startsWith('objectives_') || key === 'eu_added_value') chapter = 'Chapter 3: Relevance';
        else if (key.startsWith('formation') || key.startsWith('partner_') || key.startsWith('task_') || key.startsWith('coordination')) chapter = 'Chapter 4: Partnership';
        else if (key.startsWith('evaluation') || key.startsWith('dissemination') || key.startsWith('sustainability')) chapter = 'Chapter 5: Impact';
        else if (key.startsWith('wp')) chapter = 'Chapter 6: Work Packages';
        else if (key.startsWith('summary_')) chapter = 'Chapter 7: Summary';

        // Add chapter header if new chapter
        if (chapter !== currentChapter) {
          lines.push(``);
          lines.push(`----- ${chapter} -----`);
          currentChapter = chapter;
        }

        // Get readable label or use key
        const baseKey = key.split('_').slice(0, -1).join('_') || key; // Remove partner ID suffix if present
        const label = questionLabels[baseKey] || questionLabels[key] || key;

        // Check if it's a partner-specific answer
        const partnerMatch = key.match(/_([a-f0-9-]+)$/);
        const partnerSuffix = partnerMatch ? ` (Partner: ${partnerMatch[1].substring(0, 8)}...)` : '';

        lines.push(``);
        lines.push(`### ${label}${partnerSuffix} ###`);
        lines.push(``);
        lines.push(answer.value);
        lines.push(``);
      });

      lines.push(``);
      lines.push(`Total answers exported: ${answerKeys.filter(k => answers[k]?.value).length}`);
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(`Generated by Erasmus+ Architect on ${new Date().toLocaleDateString()}`);

    return lines.join("\n");
  };

  const generateWordContent = (proj: typeof project) => {
    if (!proj) return "";
    // Word export uses the same HTML as PDF export
    // Both are HTML documents that can be opened in Word/LibreOffice
    return generatePdfContent(proj);
  };

  const handleCopy = () => {
    if (exportedContent) {
      navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!project) return;

    let filename: string;
    let mimeType = "text/plain";

    switch (exportFormat) {
      case "json":
        if (!exportedContent) return;
        filename = `${project.acronym || "project"}_export.json`;
        mimeType = "application/json";
        break;
      case "word":
        if (!exportedContent) return;
        filename = `${project.acronym || "project"}_application.doc`;
        mimeType = "application/msword";
        break;
      case "pdf":
        // For PDF: Generate fresh content and open print dialog
        const pdfContent = generatePdfContent(project);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(pdfContent);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => printWindow.print(), 300);
          };
          setTimeout(() => printWindow.print(), 800);
        } else {
          alert('Popup wurde blockiert. Bitte erlaube Popups für diese Seite.');
        }
        return; // Don't continue with normal download
      default:
        if (!exportedContent) return;
        filename = `${project.acronym || "project"}_summary.txt`;
    }

    // Use correct MIME type for the blob
    const blob = new Blob([exportedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const allData = exportData();
    const blob = new Blob([allData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erasmus-architect-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update last backup time
    localStorage.setItem('erasmus-last-backup', new Date().toISOString());
    setShowBackupReminder(false);
  };

  // Generate PDF-ready HTML content
  const generatePdfContent = (proj: typeof project) => {
    if (!proj) return "";

    const coordinator = proj.consortium.find((m) => m.role === "COORDINATOR");
    const coordinatorPartner = coordinator ? getPartner(coordinator.partnerId) : null;
    const answers = proj.generatorState?.answers || {};

    // Helper: get answer value for a key
    const getAnswer = (key: string): string => {
      const ans = answers[key];
      if (!ans) return '';
      if (typeof ans === 'string') return ans;
      if (typeof ans === 'object' && ans.value) return ans.value;
      return '';
    };

    // Helper: convert markdown to formatted HTML for the PDF
    const md = (text: string): string => markdownToHtml(text);

    // Get the official pipeline structure for correct ordering
    const actionType = proj.actionType || 'KA220';
    const wpCount = proj.generatorState?.configuration?.wpCount || proj.workPackages?.length || 5;
    const pipelineStructure = getOfficialPipelineStructure(actionType as 'KA220' | 'KA210', wpCount);

    // Build the document following the exact EU form structure
    let contentHtml = '';

    for (const chapter of pipelineStructure) {
      // Skip context chapter (shown in header table) and final evaluation
      if (chapter.id === 1 || chapter.id === 8) continue;

      let chapterHtml = '';
      let hasContent = false;

      for (const section of chapter.sections) {
        let sectionHtml = '';
        let sectionHasContent = false;

        // Check if this is a per-partner section (Step 2)
        const isPartnerSection = chapter.id === 2;

        if (isPartnerSection) {
          // For each partner in the consortium, render the partner questions
          for (const member of proj.consortium) {
            const partner = getPartner(member.partnerId);
            if (!partner) continue;

            sectionHtml += `
      <div style="margin: 20px 0; page-break-inside: avoid;">
        <h3 style="color: #333; font-size: 13pt; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">
          ${partner.organizationName} (${COUNTRY_NAMES[partner.country] || partner.country}) – ${ORGANIZATION_TYPE_LABELS[partner.organizationType] || partner.organizationType}
          <span style="font-size: 10pt; color: #888; font-weight: normal;"> | ${member.role}</span>
        </h3>`;

            for (const question of section.questions) {
              if (question.type === 'info' || question.type === 'select' || question.type === 'multiselect') continue;

              // Look up answer with partner ID suffix
              const answerText = getAnswer(`${question.id}_${member.partnerId}`);
              if (!answerText) continue;

              sectionHasContent = true;
              sectionHtml += `
        <div style="margin: 15px 0; page-break-inside: avoid; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
          <div style="background: #f8f9fa; padding: 10px 14px; border-bottom: 1px solid #e0e0e0;">
            <div style="color: #003399; font-size: 10pt; font-weight: bold;">${question.fullQuestion}</div>
            <div style="color: #888; font-size: 9pt; font-style: italic;">${question.text}</div>
          </div>
          <div style="padding: 14px; font-size: 11pt; line-height: 1.7; text-align: justify;">${md(answerText)}</div>
        </div>`;
            }
            sectionHtml += `</div>`;
          }
        } else {
          // Normal section - directly look up answer by question ID
          for (const question of section.questions) {
            if (question.type === 'info' || question.type === 'select' || question.type === 'multiselect' || question.type === 'number') continue;

            const answerText = getAnswer(question.id);
            if (!answerText) continue;

            sectionHasContent = true;
            sectionHtml += `
      <div style="margin: 15px 0; page-break-inside: avoid; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
        <div style="background: #f8f9fa; padding: 10px 14px; border-bottom: 1px solid #e0e0e0;">
          <div style="color: #003399; font-size: 10pt; font-weight: bold;">${question.fullQuestion}</div>
          <div style="color: #888; font-size: 9pt; font-style: italic;">${question.text}</div>
        </div>
        <div style="padding: 14px; font-size: 11pt; line-height: 1.7; text-align: justify;">${md(answerText)}</div>
      </div>`;
          }
        }

        if (sectionHasContent) {
          hasContent = true;
          // Add section title if it differs from chapter title
          if (section.title !== chapter.title && !isPartnerSection) {
            chapterHtml += `<h3 style="color: #555; font-size: 12pt; margin-top: 15px;">${section.title}</h3>`;
          }
          chapterHtml += sectionHtml;
        }
      }

      if (hasContent) {
        contentHtml += `
  <div class="section" style="page-break-before: always;">
    <h2 style="color: #003399; font-size: 14pt; background: linear-gradient(to right, #003399, #0055cc); color: white; padding: 12px 16px; border-radius: 4px; margin-bottom: 15px;">
      Chapter ${chapter.id}: ${chapter.title}
    </h2>
    ${chapterHtml}
  </div>`;
      }
    }

    // Count total answers
    const totalAnswers = Object.keys(answers).filter(k => {
      const v = answers[k];
      return v && ((typeof v === 'string' && v.trim()) || (typeof v === 'object' && v.value?.trim()));
    }).length;

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${proj.acronym}: ${proj.title}</title>
  <style>
    @page { margin: 2cm; size: A4; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; max-width: 100%; margin: 0; padding: 20px; }
    h1 { color: #003399; font-size: 18pt; text-align: center; border-bottom: 2px solid #003399; padding-bottom: 10px; margin-bottom: 5px; }
    .acronym { text-align: center; font-size: 14pt; color: #666; margin-bottom: 20px; }
    h2 { color: #003399; font-size: 14pt; margin-top: 25px; page-break-after: avoid; }
    h3 { color: #333; font-size: 12pt; margin-top: 15px; page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 11pt; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .section { margin-bottom: 20px; }
    .meta-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { text-align: center; font-size: 10pt; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
    ul { margin: 10px 0; padding-left: 25px; }
    li { margin: 5px 0; }
    .priority-tag { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 3px; font-size: 10pt; margin: 2px; }
    p { margin: 8px 0; text-align: justify; }
    strong { font-weight: bold; }
  </style>
</head>
<body>
  <h1>${proj.title}</h1>
  <div class="acronym">${proj.acronym}</div>

  <div class="meta-info">
    <table>
      <tr><td width="30%"><strong>Aktionstyp</strong></td><td>${ACTION_TYPE_LABELS[proj.actionType]}</td></tr>
      <tr><td><strong>Sektor</strong></td><td>${SECTOR_LABELS[proj.sector]}</td></tr>
      <tr><td><strong>Budget</strong></td><td>€${proj.budgetTier.toLocaleString()}</td></tr>
      <tr><td><strong>Laufzeit</strong></td><td>${proj.duration} Monate</td></tr>
      <tr><td><strong>Koordinator</strong></td><td>${coordinatorPartner?.organizationName || 'Nicht zugewiesen'}</td></tr>
      <tr><td><strong>Länder</strong></td><td>${[...new Set(proj.consortium.map((m) => getPartner(m.partnerId)?.country).filter(Boolean))].map((c) => COUNTRY_NAMES[c!] || c).join(", ")}</td></tr>
    </table>
  </div>

  ${proj.horizontalPriorities.length > 0 ? `
  <div class="section">
    <h2>EU-Horizontale Prioritäten</h2>
    <div>${proj.horizontalPriorities.map(p => `<span class="priority-tag">${p}</span>`).join(' ')}</div>
  </div>
  ` : ''}

  ${proj.consortium.length > 0 ? `
  <div class="section">
    <h2>Konsortium</h2>
    <table>
      <tr><th>Nr.</th><th>Organisation</th><th>Land</th><th>Typ</th><th>Rolle</th></tr>
      ${proj.consortium.map((member, idx) => {
      const partner = getPartner(member.partnerId);
      return partner ? `
          <tr>
            <td>${idx + 1}</td>
            <td>${partner.organizationName}</td>
            <td>${COUNTRY_NAMES[partner.country] || partner.country}</td>
            <td>${ORGANIZATION_TYPE_LABELS[partner.organizationType]}</td>
            <td>${member.role}</td>
          </tr>
        ` : '';
    }).join('')}
    </table>
  </div>
  ` : ''}

  ${contentHtml}

  <div class="footer" style="margin-top: 40px;">
    <p>Insgesamt exportierte Abschnitte: ${totalAnswers}</p>
    Erstellt mit Erasmus+ Architect am ${new Date().toLocaleDateString('de-DE')}<br>
    <small>Dieses Dokument kann in Word geöffnet oder als PDF gedruckt werden.</small>
  </div>
</body>
</html>
    `.trim();
  };

  return (
    <div>
      {/* Backup Reminder Banner */}
      {showBackupReminder && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Backup empfohlen</h3>
              <p className="text-sm text-amber-700">
                Es ist über eine Woche her seit dem letzten Backup. Sichere deine Daten regelmäßig!
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBackupReminder(false)}
              className="px-3 py-1 text-sm text-amber-700 hover:bg-amber-100 rounded"
            >
              Später
            </button>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
            >
              <Download size={16} />
              Jetzt sichern
            </button>
          </div>
        </div>
      )}

      {/* Import Status Message */}
      {importStatus !== 'idle' && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${importStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
          {importStatus === 'success' ? (
            <CheckCircle className="text-green-600" size={24} />
          ) : (
            <AlertCircle className="text-red-600" size={24} />
          )}
          <span className={importStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
            {importMessage}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export & Backup</h1>
          <p className="text-gray-500">
            Projekte exportieren, Daten sichern und wiederherstellen
          </p>
        </div>
        <div className="flex gap-2">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload size={18} />
            Daten importieren
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
          >
            <Download size={18} />
            Vollständiges Backup
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Panel - Settings */}
        <div className="md:col-span-1 space-y-6">
          {/* Project Selection */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderKanban size={18} />
              Select Project
            </h2>

            {projects.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No projects available</p>
                <a
                  href="/projects/new"
                  className="text-sm text-[#003399] hover:underline"
                >
                  Create a project
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProject(p.id);
                      setExportedContent(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedProject === p.id
                      ? "border-[#003399] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="font-medium text-gray-900">
                      {p.acronym || "Untitled"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ACTION_TYPE_LABELS[p.actionType]} • {SECTOR_LABELS[p.sector]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileOutput size={18} />
              Export Format
            </h2>

            <div className="space-y-2">
              {[
                {
                  id: "summary" as ExportFormat,
                  label: "Text-Zusammenfassung",
                  description: "Reiner Text zum Kopieren",
                  icon: FileText,
                },
                {
                  id: "pdf" as ExportFormat,
                  label: "PDF-Antrag",
                  description: "Öffnet Druckdialog → Als PDF speichern",
                  icon: Printer,
                },
                {
                  id: "word" as ExportFormat,
                  label: "Word-Dokument",
                  description: ".doc Datei für Microsoft Word",
                  icon: FileText,
                },
                {
                  id: "json" as ExportFormat,
                  label: "JSON-Daten",
                  description: "Technischer Datenexport",
                  icon: FileJson,
                },
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => {
                    setExportFormat(format.id);
                    setExportedContent(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${exportFormat === format.id
                    ? "border-[#003399] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <format.icon
                    size={20}
                    className={
                      exportFormat === format.id
                        ? "text-[#003399]"
                        : "text-gray-400"
                    }
                  />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={!selectedProject}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Export
            </button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Export Preview</h2>
              {exportedContent && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {!selectedProject ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FolderKanban size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Select a project to export</p>
                  </div>
                </div>
              ) : !exportedContent ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileOutput size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Click "Generate Export" to preview
                    </p>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]">
                  {exportedContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
