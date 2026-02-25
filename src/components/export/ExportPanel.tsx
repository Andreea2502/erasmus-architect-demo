"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import {
  SECTOR_LABELS,
  ACTION_TYPE_LABELS,
  COUNTRY_NAMES,
  ORGANIZATION_TYPE_LABELS,
} from "@/store/types";
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

    // Generate structured content that can be copied into Word
    const lines = [
      `<!DOCTYPE html>`,
      `<html lang="en">`,
      `<head>`,
      `<meta charset="UTF-8">`,
      `<title>${proj.acronym}: ${proj.title}</title>`,
      `<style>`,
      `  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }`,
      `  h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }`,
      `  h2 { color: #2980b9; margin-top: 30px; }`,
      `  h3 { color: #34495e; margin-top: 20px; }`,
      `  h4 { color: #7f8c8d; margin-top: 15px; }`,
      `  table { width: 100%; border-collapse: collapse; margin: 20px 0; }`,
      `  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }`,
      `  th { bg-color: #f2f2f2; font-weight: bold; }`,
      `  .question-box { background-color: #f0f4f8; padding: 15px; border-left: 4px solid #3498db; margin-bottom: 15px; font-weight: bold; color: #2c3e50; }`,
      `  .answer-box { background-color: #f9f9f9; border: 1px solid #e1e1e1; border-radius: 4px; padding: 20px; margin-bottom: 30px; position: relative; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; }`,
      `  .copy-btn { position: absolute; top: 10px; right: 10px; background-color: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; transition: all 0.2s; }`,
      `  .copy-btn:hover { background-color: #f0f0f0; border-color: #999; }`,
      `  .copy-msg { position: absolute; top: 10px; right: 60px; font-size: 12px; color: green; opacity: 0; transition: opacity 0.3s; }`,
      `  .copy-msg.visible { opacity: 1; }`,
      `</style>`,
      `</head>`,
      `<body>`,
      `<h1>${proj.acronym}: ${proj.title}</h1>`,
      ``,
      `<h2>1. Project Overview</h2>`,
      ``,
      `<table>`,
      `<tr><td><strong>Action Type</strong></td><td>${ACTION_TYPE_LABELS[proj.actionType]}</td></tr>`,
      `<tr><td><strong>Sector</strong></td><td>${SECTOR_LABELS[proj.sector]}</td></tr>`,
      `<tr><td><strong>Budget</strong></td><td>€${proj.budgetTier.toLocaleString()}</td></tr>`,
      `<tr><td><strong>Duration</strong></td><td>${proj.duration} months</td></tr>`,
      `<tr><td><strong>Call Year</strong></td><td>${proj.callYear}</td></tr>`,
      `</table>`,
      ``,
    ];

    if (proj.problemStatement) {
      lines.push(`<h2>2. Problem Statement</h2>`);
      lines.push(`<div class="question-box">Problem Statement</div>`);
      lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${proj.problemStatement}</div>`);
    }

    if (proj.objectives.length > 0) {
      lines.push(`<h2>3. Objectives</h2>`);
      lines.push(`<h3>3.1 General Objectives</h3>`);
      proj.objectives.filter(o => o.type === "GENERAL").forEach(obj => {
        lines.push(`<div class="question-box">${obj.code}: General Objective</div>`);
        lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${obj.description}</div>`);
      });
      lines.push(`<h3>3.2 Specific Objectives</h3>`);
      proj.objectives.filter(o => o.type === "SPECIFIC").forEach(obj => {
        lines.push(`<div class="question-box">${obj.code}: Specific Objective</div>`);
        lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${obj.description}</div>`);
      });
    }

    if (proj.consortium.length > 0) {
      lines.push(`<h2>4. Consortium</h2>`);
      lines.push(`<table>`);
      lines.push(`<tr><th>No.</th><th>Organisation</th><th>Country</th><th>Type</th><th>Role</th></tr>`);
      proj.consortium.forEach((member, idx) => {
        const partner = getPartner(member.partnerId);
        if (partner) {
          lines.push(`<tr><td>${idx + 1}</td><td>${partner.organizationName}</td><td>${COUNTRY_NAMES[partner.country] || partner.country}</td><td>${ORGANIZATION_TYPE_LABELS[partner.organizationType]}</td><td>${member.role}</td></tr>`);
        }
      });
      lines.push(`</table>`);
      lines.push(``);
    }

    if (proj.workPackages.length > 0) {
      lines.push(`<h2>5. Work Packages</h2>`);
      proj.workPackages.forEach(wp => {
        lines.push(`<h3>WP${wp.number}: ${wp.title}</h3>`);
        lines.push(`<p><strong>Duration:</strong> Month ${wp.startMonth} - Month ${wp.endMonth}</p>`);

        if (wp.objectives) {
          lines.push(`<div class="question-box">WP Objectives</div>`);
          lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${wp.objectives}</div>`);
        }

        if (wp.description) {
          lines.push(`<div class="question-box">Description</div>`);
          lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${wp.description}</div>`);
        }

        if (wp.activities.length > 0) {
          lines.push(`<h4>Activities:</h4>`);
          wp.activities.forEach(act => {
            lines.push(`<div class="question-box">${act.code}: ${act.title} (M${act.startMonth}-M${act.endMonth})</div>`);
            lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${act.description || "No description provided."}</div>`);
          });
        }

        if (wp.deliverables.length > 0) {
          lines.push(`<h4>Deliverables:</h4>`);
          lines.push(`<ul>`);
          wp.deliverables.forEach(del => {
            lines.push(`<li><strong>${del.code}:</strong> ${del.title} (Due: M${del.dueMonth})</li>`);
          });
          lines.push(`</ul>`);
        }
      });
      lines.push(``);
    }

    if (proj.results.length > 0) {
      lines.push(`<h2>6. Project Results</h2>`);
      proj.results.forEach(result => {
        lines.push(`<h3>${result.code}: ${result.title}</h3>`);
        lines.push(`<p><strong>Type:</strong> ${result.type}</p>`);
        if (result.description) {
          lines.push(`<div class="question-box">Description</div>`);
          lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${result.description}</div>`);
        }
        lines.push(`<p><strong>Languages:</strong> ${result.languages?.join(", ") || 'Not specified'}</p>`);
      });
    }

    // =========================================================================
    // CRITICAL: Export all generated Pipeline answers (the 30k+ words!)
    // =========================================================================
    if (proj.generatorState?.answers && Object.keys(proj.generatorState.answers).length > 0) {
      lines.push(`<h2>Generated Application Content (Full Text)</h2>`);
      lines.push(`<p style="color: #666; font-style: italic;">Below are all generated answers from the Erasmus+ Generator. Click "Copy" to copy individual sections.</p>`);

      const answers = proj.generatorState.answers;
      const answerKeys = Object.keys(answers).sort();

      // Group by chapter
      const chapters: Record<string, { key: string; label: string; value: string }[]> = {
        'Chapter 1: Context': [],
        'Chapter 2: Organisations': [],
        'Chapter 3: Relevance': [],
        'Chapter 4: Partnership': [],
        'Chapter 5: Impact': [],
        'Chapter 6: Work Packages': [],
        'Chapter 7: Summary': [],
        'Other': []
      };

      const questionLabels: Record<string, string> = {
        'projectTitle': 'Project Title',
        'acronym': 'Acronym',
        'org_presentation': 'Organisation Presentation',
        'org_experience': 'Organisation Experience',
        'org_past_participation': 'Past Participation',
        'address_priorities': 'Addressing Priorities',
        'needs_address': 'Needs Analysis',
        'target_groups': 'Target Groups',
        'objectives_results': 'Objectives and Results',
        'eu_added_value': 'EU Added Value',
        'formation': 'Partnership Formation',
        'partner_selection': 'Partner Selection',
        'task_allocation': 'Task Allocation',
        'coordination': 'Coordination',
        'evaluation': 'Evaluation Methods',
        'dissemination': 'Dissemination',
        'sustainability': 'Sustainability',
        'summary_objectives': 'Summary - Objectives',
        'summary_activities': 'Summary - Activities',
        'summary_results': 'Summary - Results',
      };

      answerKeys.forEach((key) => {
        const answer = answers[key];
        if (!answer?.value || answer.value.trim() === '') return;

        let chapter = 'Other';
        if (key.startsWith('org_')) chapter = 'Chapter 2: Organisations';
        else if (key === 'projectTitle' || key === 'acronym' || key.startsWith('project')) chapter = 'Chapter 1: Context';
        else if (key.startsWith('address_') || key.startsWith('needs_') || key.startsWith('target_') || key.startsWith('objectives_') || key === 'eu_added_value') chapter = 'Chapter 3: Relevance';
        else if (key.startsWith('formation') || key.startsWith('partner_') || key.startsWith('task_') || key.startsWith('coordination')) chapter = 'Chapter 4: Partnership';
        else if (key.startsWith('evaluation') || key.startsWith('dissemination') || key.startsWith('sustainability')) chapter = 'Chapter 5: Impact';
        else if (key.startsWith('wp')) chapter = 'Chapter 6: Work Packages';
        else if (key.startsWith('summary_')) chapter = 'Chapter 7: Summary';

        const baseKey = key.split('_').slice(0, -1).join('_') || key;
        const label = questionLabels[baseKey] || questionLabels[key] || key;

        chapters[chapter].push({ key, label, value: answer.value });
      });

      // Render each chapter
      Object.entries(chapters).forEach(([chapterName, items]) => {
        if (items.length === 0) return;

        lines.push(`<h3>${chapterName}</h3>`);
        items.forEach(({ key, label, value }) => {
          // Check for partner ID suffix
          const partnerMatch = key.match(/_([a-f0-9-]+)$/);
          const displayLabel = partnerMatch
            ? `${label} (Partner: ${partnerMatch[1].substring(0, 8)}...)`
            : label;

          lines.push(`<div class="question-box">${displayLabel}</div>`);
          lines.push(`<div class="answer-box"><button class="copy-btn">Copy</button><span class="copy-msg">Copied!</span>${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`);
        });
      });

      lines.push(`<p style="margin-top: 20px; color: #666;">Total sections exported: ${answerKeys.filter(k => answers[k]?.value).length}</p>`);
    }

    // Add script for copy functionality
    lines.push(`<script>`);
    lines.push(`
      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const content = this.parentElement.innerText.replace('Copy', '').replace('Copied!', '').trim();
          navigator.clipboard.writeText(content).then(() => {
            const msg = this.nextElementSibling;
            msg.classList.add('visible');
            setTimeout(() => {
              msg.classList.remove('visible');
            }, 2000);
          });
        });
      });
    `);
    lines.push(`</script>`);

    lines.push(`</body>`);
    lines.push(`</html>`);

    return lines.join("\n");
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
    h2 { color: #003399; font-size: 14pt; margin-top: 25px; border-bottom: 1px solid #ddd; padding-bottom: 5px; page-break-after: avoid; }
    h3 { color: #333; font-size: 12pt; margin-top: 15px; page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 11pt; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .text-block { text-align: justify; margin: 10px 0; }
    .meta-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { text-align: center; font-size: 10pt; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
    ul { margin: 10px 0; padding-left: 25px; }
    li { margin: 5px 0; }
    .priority-tag { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 3px; font-size: 10pt; margin: 2px; }
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

  ${proj.problemStatement ? `
  <div class="section">
    <h2>1. Problemstellung & Bedarfsanalyse</h2>
    <div class="text-block">${proj.problemStatement}</div>
  </div>
  ` : ''}

  ${proj.statistics.length > 0 ? `
  <div class="section">
    <h3>Relevante Statistiken</h3>
    <ul>
      ${proj.statistics.map(s => `<li>${s.statement} (${s.source}, ${s.year})</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${proj.targetGroups.length > 0 ? `
  <div class="section">
    <h2>2. Zielgruppen</h2>
    <table>
      <tr><th>Zielgruppe</th><th>Größe</th><th>Charakteristiken</th><th>Bedarfe</th></tr>
      ${proj.targetGroups.map(tg => `
        <tr>
          <td>${tg.name}</td>
          <td>${tg.size.toLocaleString()}</td>
          <td>${tg.characteristics}</td>
          <td>${tg.needs.join(', ')}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${proj.objectives.length > 0 ? `
  <div class="section">
    <h2>3. Projektziele</h2>
    <h3>Allgemeine Ziele</h3>
    ${proj.objectives.filter(o => o.type === 'GENERAL').map(obj => `
      <p><strong>${obj.code}:</strong> ${obj.description}</p>
    `).join('')}
    <h3>Spezifische Ziele</h3>
    ${proj.objectives.filter(o => o.type === 'SPECIFIC').map(obj => `
      <p><strong>${obj.code}:</strong> ${obj.description}</p>
      ${obj.indicators.length > 0 ? `<p style="margin-left: 20px; font-size: 11pt; color: #666;">Indikatoren: ${obj.indicators.join(', ')}</p>` : ''}
    `).join('')}
  </div>
  ` : ''}

  ${proj.consortium.length > 0 ? `
  <div class="section">
    <h2>4. Konsortium</h2>
    <table>
      <tr><th>Nr.</th><th>Organisation</th><th>Land</th><th>Typ</th><th>Rolle</th><th>Budget</th></tr>
      ${proj.consortium.map((member, idx) => {
        const partner = getPartner(member.partnerId);
        return partner ? `
          <tr>
            <td>${idx + 1}</td>
            <td>${partner.organizationName}</td>
            <td>${COUNTRY_NAMES[partner.country] || partner.country}</td>
            <td>${ORGANIZATION_TYPE_LABELS[partner.organizationType]}</td>
            <td>${member.role}</td>
            <td>€${(proj.budgetTier * member.budgetShare / 100).toLocaleString()}</td>
          </tr>
        ` : '';
      }).join('')}
    </table>
  </div>
  ` : ''}

  ${proj.workPackages.length > 0 ? `
  <div class="section">
    <h2>5. Arbeitspakete</h2>
    ${proj.workPackages.map(wp => `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h3>WP${wp.number}: ${wp.title}</h3>
        <p><strong>Zeitraum:</strong> Monat ${wp.startMonth} - ${wp.endMonth} | <strong>Lead:</strong> ${getPartner(wp.leadPartner)?.organizationName || 'TBD'}</p>
        ${wp.description ? `<div class="text-block">${wp.description}</div>` : ''}
        ${wp.activities.length > 0 ? `
          <p><strong>Aktivitäten:</strong></p>
          <ul>
            ${wp.activities.map(a => `<li><strong>${a.code}:</strong> ${a.title} (M${a.startMonth}-M${a.endMonth})</li>`).join('')}
          </ul>
        ` : ''}
        ${wp.deliverables.length > 0 ? `
          <p><strong>Deliverables:</strong></p>
          <ul>
            ${wp.deliverables.map(d => `<li><strong>${d.code}:</strong> ${d.title} (M${d.dueMonth})</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${proj.results.length > 0 ? `
  <div class="section">
    <h2>6. Projektergebnisse</h2>
    <table>
      <tr><th>Code</th><th>Titel</th><th>Typ</th><th>Sprachen</th></tr>
      ${proj.results.map(r => `
        <tr>
          <td>${r.code}</td>
          <td>${r.title}</td>
          <td>${r.type}</td>
          <td>${r.languages?.join(', ') || 'Not specified'}</td>
        </tr>
      `).join('')}
    </table>
    ${proj.results.map(r => r.description ? `
      <div style="margin: 10px 0;">
        <p><strong>${r.code}:</strong> ${r.description}</p>
      </div>
    ` : '').join('')}
  </div>
  ` : ''}

  ${proj.indicators.length > 0 ? `
  <div class="section">
    <h2>7. Indikatoren</h2>
    <table>
      <tr><th>Indikator</th><th>Typ</th><th>Zielwert</th><th>Messmethode</th></tr>
      ${proj.indicators.map(ind => `
        <tr>
          <td>${ind.name}</td>
          <td>${ind.type}</td>
          <td>${ind.target} ${ind.unit}</td>
          <td>${ind.measurementMethod || '-'}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${proj.multiplierEvents.length > 0 ? `
  <div class="section">
    <h2>8. Multiplier Events</h2>
    <table>
      <tr><th>Event</th><th>Typ</th><th>Land</th><th>Monat</th><th>Teilnehmer</th></tr>
      ${proj.multiplierEvents.map(me => `
        <tr>
          <td>${me.name}</td>
          <td>${me.type}</td>
          <td>${COUNTRY_NAMES[me.country] || me.country}</td>
          <td>M${me.month}</td>
          <td>${me.targetParticipants}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${proj.sustainabilityPlan ? `
  <div class="section">
    <h2>9. Nachhaltigkeit</h2>
    <div class="text-block">${proj.sustainabilityPlan}</div>
  </div>
  ` : ''}

  ${(() => {
    // CRITICAL: Export all generated Pipeline answers (the 30k+ words!)
    if (!proj.generatorState?.answers || Object.keys(proj.generatorState.answers).length === 0) {
      return '';
    }

    const answers = proj.generatorState.answers;
    const answerKeys = Object.keys(answers).sort();

    // Question labels with official English questions from Erasmus+ form
    const questionLabels: Record<string, { de: string; en: string }> = {
      'projectTitle': { de: 'Projekttitel', en: 'What is the title of your project?' },
      'acronym': { de: 'Akronym', en: 'What is the acronym of your project?' },
      'org_presentation': { de: 'Organisation Präsentation', en: 'Please briefly present your organisation.' },
      'org_experience': { de: 'Erfahrung der Organisation', en: 'What are the activities and experience of your organisation in the areas relevant for this project?' },
      'org_past_participation': { de: 'Frühere Teilnahme', en: 'Please describe the organisation\'s legal representative and management structure.' },
      'address_priorities': { de: 'Prioritäten adressieren', en: 'How does the project address one or more of the selected priorities?' },
      'needs_address': { de: 'Bedarfsanalyse', en: 'What are the needs you want to address with this project?' },
      'target_groups': { de: 'Zielgruppen', en: 'Who are the target groups of your project?' },
      'objectives_results': { de: 'Ziele und Ergebnisse', en: 'What are the objectives and expected results of your project?' },
      'eu_added_value': { de: 'EU-Mehrwert', en: 'What is the EU added value of the project?' },
      'formation': { de: 'Partnerschaftsbildung', en: 'How was the partnership formed?' },
      'partner_selection': { de: 'Partnerauswahl', en: 'What criteria were used to select the partners?' },
      'task_allocation': { de: 'Aufgabenverteilung', en: 'How will you distribute tasks among partners?' },
      'coordination': { de: 'Koordination', en: 'How will you ensure proper coordination and communication?' },
      'evaluation': { de: 'Evaluierungsmethoden', en: 'What is your evaluation plan?' },
      'dissemination': { de: 'Verbreitung', en: 'How do you plan to disseminate the project results?' },
      'sustainability': { de: 'Nachhaltigkeit', en: 'How will you ensure the sustainability of the project results?' },
      'summary_objectives': { de: 'Zusammenfassung - Ziele', en: 'Please provide a short summary of your project objectives.' },
      'summary_activities': { de: 'Zusammenfassung - Aktivitäten', en: 'Please provide a short summary of the main activities.' },
      'summary_results': { de: 'Zusammenfassung - Ergebnisse', en: 'Please provide a short summary of the expected results.' },
      'wp1_monitoring': { de: 'Monitoring & Qualität', en: 'How will you monitor the project implementation and quality?' },
      'wp1_personnel': { de: 'Personal & Zeitplanung', en: 'How will the project work be organised in terms of personnel and timing?' },
      'wp1_budget': { de: 'Budget-Management', en: 'How will you manage the project budget?' },
      'wp1_risks': { de: 'Risikomanagement', en: 'What are the main risks and how will you mitigate them?' },
      'wp1_inclusion': { de: 'Inklusion', en: 'How does your project address inclusion and diversity?' },
      'wp1_digital': { de: 'Digitalisierung', en: 'How does your project address digital transformation?' },
      'wp1_green': { de: 'Umweltpraktiken', en: 'How does your project address environmental sustainability and green practices?' },
      'wp1_participation': { de: 'Teilnahme', en: 'How will you ensure active participation of all partners?' },
    };

    // Group by chapter
    const chapters: Record<string, { key: string; labelDE: string; labelEN: string; value: string }[]> = {
      'Chapter 1: Context / Kapitel 1: Kontext': [],
      'Chapter 2: Participating Organisations / Kapitel 2: Beteiligte Organisationen': [],
      'Chapter 3: Project Relevance / Kapitel 3: Relevanz des Projekts': [],
      'Chapter 4: Partnership / Kapitel 4: Partnerschaft': [],
      'Chapter 5: Impact / Kapitel 5: Wirkung': [],
      'Chapter 6: Work Packages / Kapitel 6: Arbeitspakete': [],
      'Chapter 7: Summary / Kapitel 7: Zusammenfassung': [],
      'Other / Sonstige': []
    };

    answerKeys.forEach((key) => {
      const answer = answers[key];
      if (!answer?.value || answer.value.trim() === '') return;

      let chapter = 'Other / Sonstige';
      if (key.startsWith('org_')) chapter = 'Chapter 2: Participating Organisations / Kapitel 2: Beteiligte Organisationen';
      else if (key === 'projectTitle' || key === 'acronym' || key.startsWith('project')) chapter = 'Chapter 1: Context / Kapitel 1: Kontext';
      else if (key.startsWith('address_') || key.startsWith('needs_') || key.startsWith('target_') || key.startsWith('objectives_') || key === 'eu_added_value') chapter = 'Chapter 3: Project Relevance / Kapitel 3: Relevanz des Projekts';
      else if (key.startsWith('formation') || key.startsWith('partner_') || key.startsWith('task_') || key.startsWith('coordination')) chapter = 'Chapter 4: Partnership / Kapitel 4: Partnerschaft';
      else if (key.startsWith('evaluation') || key.startsWith('dissemination') || key.startsWith('sustainability')) chapter = 'Chapter 5: Impact / Kapitel 5: Wirkung';
      else if (key.startsWith('wp')) chapter = 'Chapter 6: Work Packages / Kapitel 6: Arbeitspakete';
      else if (key.startsWith('summary_')) chapter = 'Chapter 7: Summary / Kapitel 7: Zusammenfassung';

      const baseKey = key.split('_').slice(0, -1).join('_') || key;
      const labelObj = questionLabels[baseKey] || questionLabels[key];
      const labelDE = typeof labelObj === 'object' ? labelObj.de : (labelObj || key);
      const labelEN = typeof labelObj === 'object' ? labelObj.en : key;

      chapters[chapter].push({ key, labelDE, labelEN, value: answer.value });
    });

    // Build HTML for all chapters
    let html = `
  <div class="section" style="page-break-before: always;">
    <h2 style="color: #003399; font-size: 16pt; border-bottom: 2px solid #003399; padding-bottom: 10px;">GENERIERTE ANTRAGSFORMULAR-TEXTE</h2>
    <p style="color: #666; font-style: italic; margin-bottom: 20px;">Die folgenden Texte wurden mit dem Erasmus+ Generator erstellt und können direkt in das Antragsformular übertragen werden.</p>
`;

    Object.entries(chapters).forEach(([chapterName, items]) => {
      if (items.length === 0) return;

      html += `
    <div style="margin-top: 30px; page-break-inside: avoid;">
      <h3 style="color: #003399; font-size: 14pt; background: linear-gradient(to right, #003399, #0055cc); color: white; padding: 12px 16px; border-radius: 4px; margin-bottom: 15px;">${chapterName}</h3>
`;

      items.forEach(({ key, labelDE, labelEN, value }) => {
        // Check for partner ID suffix
        const partnerMatch = key.match(/_([a-f0-9-]+)$/);
        const partnerSuffix = partnerMatch ? ` (Partner ID: ${partnerMatch[1].substring(0, 8)}...)` : '';

        // Convert Markdown to HTML for proper formatting
        const formattedValue = markdownToHtml(value);

        html += `
      <div style="margin: 25px 0; page-break-inside: avoid; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
        <div style="background: #f8f9fa; padding: 12px 16px; border-bottom: 1px solid #e0e0e0;">
          <div style="color: #003399; font-size: 11pt; font-weight: bold; margin-bottom: 4px;">${labelEN}${partnerSuffix}</div>
          <div style="color: #666; font-size: 10pt; font-style: italic;">${labelDE}</div>
        </div>
        <div style="padding: 16px; font-size: 11pt; line-height: 1.7;">${formattedValue}</div>
      </div>
`;
      });

      html += `    </div>`;
    });

    const totalAnswers = answerKeys.filter(k => answers[k]?.value).length;
    html += `
    <p style="margin-top: 30px; color: #666; font-size: 10pt; border-top: 1px solid #ddd; padding-top: 10px;">
      Insgesamt exportierte Abschnitte: ${totalAnswers}
    </p>
  </div>
`;

    return html;
  })()}

  <div class="footer">
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
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          importStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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
