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
  ClipboardCheck,
  Languages,
  ChevronDown,
  ChevronUp,
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showMissingDetails, setShowMissingDetails] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ current: 0, total: 0 });
  const [translatedAnswers, setTranslatedAnswers] = useState<Record<string, string>>({});
  const [showTranslated, setShowTranslated] = useState(false);
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

  const handleExport = async () => {
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
      // Real DOCX export via API
      const answers = project.generatorState?.answers || {};
      const actionType = project.actionType || 'KA220';
      const wpCount = project.generatorState?.configuration?.wpCount || project.workPackages?.length || 5;
      const structure = getOfficialPipelineStructure(actionType as 'KA220' | 'KA210', wpCount);

      const getVal = (key: string): string => {
        if (showTranslated && translatedAnswers[key]) return translatedAnswers[key];
        const ans = answers[key];
        if (!ans) return '';
        if (typeof ans === 'string') return ans;
        if (typeof ans === 'object' && ans.value) return ans.value;
        return '';
      };

      // Build sections from pipeline structure
      const sections: { chapterTitle: string; chapterId: number; questionText: string; fullQuestion: string; answerText: string; partnerName?: string; charLimit?: number }[] = [];

      for (const chapter of structure) {
        if (chapter.id === 1 || chapter.id === 8) continue;
        for (const section of chapter.sections) {
          const isPartnerSection = chapter.id === 2;
          for (const q of section.questions) {
            if (q.type === 'info' || q.type === 'select' || q.type === 'multiselect' || q.type === 'number') continue;
            if (isPartnerSection) {
              for (const member of project.consortium) {
                const val = getVal(`${q.id}_${member.partnerId}`);
                if (!val) continue;
                const partner = getPartner(member.partnerId);
                sections.push({
                  chapterTitle: chapter.title,
                  chapterId: chapter.id,
                  questionText: q.text,
                  fullQuestion: q.fullQuestion,
                  answerText: val,
                  partnerName: partner ? `${partner.organizationName} (${COUNTRY_NAMES[partner.country] || partner.country})` : undefined,
                  charLimit: q.charLimit,
                });
              }
            } else {
              const val = getVal(q.id);
              if (!val) continue;
              sections.push({
                chapterTitle: chapter.title,
                chapterId: chapter.id,
                questionText: q.text,
                fullQuestion: q.fullQuestion,
                answerText: val,
                charLimit: q.charLimit,
              });
            }
          }
        }
      }

      // Build consortium data
      const consortiumData = project.consortium.map(member => {
        const partner = getPartner(member.partnerId);
        return {
          name: partner?.organizationName || 'Unknown',
          country: COUNTRY_NAMES[partner?.country || ''] || partner?.country || '',
          type: partner?.organizationType ? ORGANIZATION_TYPE_LABELS[partner.organizationType] : '',
          role: member.role,
        };
      });

      try {
        const res = await fetch('/api/export-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: project.title,
            acronym: project.acronym,
            actionType: ACTION_TYPE_LABELS[project.actionType],
            sector: SECTOR_LABELS[project.sector],
            budget: project.budgetTier,
            duration: project.duration,
            consortium: consortiumData,
            sections,
          }),
        });

        if (!res.ok) throw new Error('DOCX generation failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.acronym || 'project'}_application.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportedContent(`Word-Dokument (.docx) wurde heruntergeladen: ${project.acronym || "project"}_application.docx\n\nÖffne die Datei mit Microsoft Word oder LibreOffice Writer.\n\nDas Dokument enthält ${sections.length} Abschnitte mit allen generierten Inhalten.${showTranslated ? '\n\n🇬🇧 English Translation included.' : ''}`);
      } catch (err) {
        console.error('DOCX export error:', err);
        setExportedContent(`Fehler beim DOCX-Export: ${(err as Error).message}\n\nVersuche stattdessen den PDF-Export.`);
      }
      return;
    }

    setExportedContent(content);
  };

  // Translation handler
  const handleTranslate = async () => {
    if (!project || translating) return;
    const answers = project.generatorState?.answers || {};
    const keys = Object.keys(answers).filter(k => {
      const v = answers[k];
      return v && ((typeof v === 'string' && v.trim()) || (typeof v === 'object' && v.value?.trim()));
    });

    if (keys.length === 0) return;

    setTranslating(true);
    setTranslateProgress({ current: 0, total: keys.length });
    const translated: Record<string, string> = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const ans = answers[key];
      const text = typeof ans === 'string' ? ans : ans?.value || '';
      if (!text.trim()) continue;

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage: 'en', context: project.actionType }),
        });
        const data = await res.json();
        if (data.translatedText) {
          translated[key] = data.translatedText;
        }
      } catch (err) {
        console.error(`Translation failed for ${key}:`, err);
      }
      setTranslateProgress({ current: i + 1, total: keys.length });
    }

    setTranslatedAnswers(translated);
    setShowTranslated(true);
    setTranslating(false);
    // Re-trigger export to refresh preview
    if (exportFormat === 'summary') {
      setExportedContent(generateSummary(project));
    } else {
      setExportedContent('translated');
    }
  };

  const generateSummary = (proj: typeof project) => {
    if (!proj) return "";

    const coordinator = proj.consortium.find((m) => m.role === "COORDINATOR");
    const coordinatorPartner = coordinator ? getPartner(coordinator.partnerId) : null;
    const answers = proj.generatorState?.answers || {};

    const getAnswerVal = (key: string): string => {
      const ans = answers[key];
      if (!ans) return '';
      if (typeof ans === 'string') return ans;
      if (typeof ans === 'object' && ans.value) return ans.value;
      return '';
    };

    const lines = [
      `PROJECT SUMMARY`,
      `═══════════════`,
      ``,
      `Title: ${proj.title || "Not specified"}`,
      `Acronym: ${proj.acronym || "Not specified"}`,
      `Action Type: ${ACTION_TYPE_LABELS[proj.actionType]}`,
      `Sector: ${SECTOR_LABELS[proj.sector]}`,
      `Budget: €${proj.budgetTier.toLocaleString()}`,
      `Duration: ${proj.duration} months`,
      `Coordinator: ${coordinatorPartner ? coordinatorPartner.organizationName : "Not assigned"}`,
      `Countries: ${[...new Set(proj.consortium.map((m) => getPartner(m.partnerId)?.country).filter(Boolean))].map((c) => COUNTRY_NAMES[c!] || c).join(", ")}`,
      ``,
      `CONSORTIUM`,
      `──────────`,
    ];

    proj.consortium.forEach((member, idx) => {
      const partner = getPartner(member.partnerId);
      if (partner) {
        lines.push(
          `  ${idx + 1}. ${partner.organizationName} (${COUNTRY_NAMES[partner.country] || partner.country}, ${ORGANIZATION_TYPE_LABELS[partner.organizationType]}) – ${member.role}`
        );
      }
    });

    // Use pipeline structure for correct ordering
    const actionType = proj.actionType || 'KA220';
    const wpCount = proj.generatorState?.configuration?.wpCount || proj.workPackages?.length || 5;
    const structure = getOfficialPipelineStructure(actionType as 'KA220' | 'KA210', wpCount);

    let totalExported = 0;

    for (const chapter of structure) {
      if (chapter.id === 1 || chapter.id === 8) continue;

      let chapterHasContent = false;

      for (const section of chapter.sections) {
        const isPartnerSection = chapter.id === 2;

        for (const q of section.questions) {
          if (q.type === 'info' || q.type === 'select' || q.type === 'multiselect' || q.type === 'number') continue;

          if (isPartnerSection) {
            for (const member of proj.consortium) {
              const val = getAnswerVal(`${q.id}_${member.partnerId}`);
              if (!val) continue;
              if (!chapterHasContent) {
                lines.push(``);
                lines.push(`CHAPTER ${chapter.id}: ${chapter.title.toUpperCase()}`);
                lines.push(`${'─'.repeat(40)}`);
                chapterHasContent = true;
              }
              const partner = getPartner(member.partnerId);
              lines.push(``);
              lines.push(`▸ ${q.text} – ${partner?.organizationName || '?'}`);
              lines.push(`  ${q.fullQuestion}`);
              lines.push(``);
              lines.push(val);
              totalExported++;
            }
          } else {
            const val = getAnswerVal(q.id);
            if (!val) continue;
            if (!chapterHasContent) {
              lines.push(``);
              lines.push(`CHAPTER ${chapter.id}: ${chapter.title.toUpperCase()}`);
              lines.push(`${'─'.repeat(40)}`);
              chapterHasContent = true;
            }
            lines.push(``);
            lines.push(`▸ ${q.text}`);
            lines.push(`  ${q.fullQuestion}`);
            lines.push(``);
            lines.push(val);
            totalExported++;
          }
        }
      }
    }

    lines.push(``);
    lines.push(`═══════════════════════════════════════`);
    lines.push(`Total exported sections: ${totalExported}`);

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
                  description: "Echtes .docx für Microsoft Word",
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

          {/* Translation */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Languages size={18} />
              Translation
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Übersetzt alle generierten Texte ins Englische (via KI).
            </p>
            {Object.keys(translatedAnswers).length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowTranslated(false)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${!showTranslated ? 'bg-[#003399] text-white border-[#003399]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowTranslated(true)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${showTranslated ? 'bg-[#003399] text-white border-[#003399]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  🇬🇧 English
                </button>
              </div>
            )}
            <button
              onClick={handleTranslate}
              disabled={!selectedProject || translating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Translating... {translateProgress.current}/{translateProgress.total}
                </>
              ) : Object.keys(translatedAnswers).length > 0 ? (
                <><CheckCircle size={16} /> Erneut übersetzen</>
              ) : (
                <><Languages size={16} /> Ins Englische übersetzen</>
              )}
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
                      Click &quot;Generate Export&quot; to preview
                    </p>
                  </div>
                </div>
              ) : exportFormat === 'json' ? (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]">
                  {exportedContent}
                </pre>
              ) : (() => {
                // Structured preview using pipeline structure
                const proj = project;
                if (!proj) return null;
                const answers = proj.generatorState?.answers || {};
                const actionType = proj.actionType || 'KA220';
                const wpCount = proj.generatorState?.configuration?.wpCount || proj.workPackages?.length || 5;
                const structure = getOfficialPipelineStructure(actionType as 'KA220' | 'KA210', wpCount);

                const getAnswerVal = (key: string): string => {
                  // Use translated version if available and toggle is on
                  if (showTranslated && translatedAnswers[key]) {
                    return translatedAnswers[key];
                  }
                  const ans = answers[key];
                  if (!ans) return '';
                  if (typeof ans === 'string') return ans;
                  if (typeof ans === 'object' && ans.value) return ans.value;
                  return '';
                };

                // Count missing answers
                let totalQuestions = 0;
                let answeredQuestions = 0;
                const missingQuestions: { chapter: string; question: string }[] = [];

                for (const chapter of structure) {
                  if (chapter.id === 1 || chapter.id === 8) continue;
                  for (const section of chapter.sections) {
                    const isPartnerSection = chapter.id === 2;
                    for (const q of section.questions) {
                      if (q.type === 'info' || q.type === 'select' || q.type === 'multiselect' || q.type === 'number') continue;
                      if (isPartnerSection) {
                        for (const member of proj.consortium) {
                          totalQuestions++;
                          const val = getAnswerVal(`${q.id}_${member.partnerId}`);
                          if (val) answeredQuestions++;
                          else {
                            const partner = getPartner(member.partnerId);
                            missingQuestions.push({ chapter: `Ch.${chapter.id}`, question: `${q.text} (${partner?.organizationName || '?'})` });
                          }
                        }
                      } else {
                        totalQuestions++;
                        const val = getAnswerVal(q.id);
                        if (val) answeredQuestions++;
                        else missingQuestions.push({ chapter: `Ch.${chapter.id}`, question: q.text });
                      }
                    }
                  }
                }

                const copyToClipboard = (text: string, sectionId: string) => {
                  navigator.clipboard.writeText(text);
                  setCopiedSection(sectionId);
                  setTimeout(() => setCopiedSection(null), 2000);
                };

                const charBadge = (text: string, limit?: number) => {
                  if (!limit) return null;
                  const len = text.length;
                  const pct = len / limit;
                  let color = 'bg-green-100 text-green-700';
                  if (pct > 1) color = 'bg-red-100 text-red-700';
                  else if (pct > 0.9) color = 'bg-yellow-100 text-yellow-700';
                  return (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                      {len.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                  );
                };

                return (
                  <div className="space-y-4 max-h-[700px] overflow-auto">
                    {/* Missing answers warning */}
                    {missingQuestions.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <button
                          onClick={() => setShowMissingDetails(!showMissingDetails)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">
                              ⚠ {missingQuestions.length} von {totalQuestions} Fragen noch nicht beantwortet
                            </span>
                          </div>
                          {showMissingDetails ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-amber-600" />}
                        </button>
                        {showMissingDetails && (
                          <ul className="mt-2 space-y-1 text-xs text-amber-700 border-t border-amber-200 pt-2">
                            {missingQuestions.map((mq, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-amber-500 font-mono">{mq.chapter}</span>
                                <span>{mq.question}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Completeness bar */}
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all bg-green-500"
                          style={{ width: `${totalQuestions > 0 ? (answeredQuestions / totalQuestions * 100) : 0}%` }}
                        />
                      </div>
                      <span className="font-medium">{answeredQuestions}/{totalQuestions} beantwortet</span>
                    </div>

                    {/* Chapters */}
                    {structure.map(chapter => {
                      if (chapter.id === 1 || chapter.id === 8) return null;

                      const chapterAnswers: { questionText: string; fullQuestion: string; answerText: string; answerId: string; charLimit?: number }[] = [];

                      for (const section of chapter.sections) {
                        const isPartnerSection = chapter.id === 2;
                        for (const q of section.questions) {
                          if (q.type === 'info' || q.type === 'select' || q.type === 'multiselect' || q.type === 'number') continue;
                          if (isPartnerSection) {
                            for (const member of proj.consortium) {
                              const val = getAnswerVal(`${q.id}_${member.partnerId}`);
                              if (!val) continue;
                              const partner = getPartner(member.partnerId);
                              chapterAnswers.push({
                                questionText: `${q.text} – ${partner?.organizationName || member.partnerId}`,
                                fullQuestion: q.fullQuestion,
                                answerText: val,
                                answerId: `${q.id}_${member.partnerId}`,
                                charLimit: q.charLimit
                              });
                            }
                          } else {
                            const val = getAnswerVal(q.id);
                            if (!val) continue;
                            chapterAnswers.push({
                              questionText: q.text,
                              fullQuestion: q.fullQuestion,
                              answerText: val,
                              answerId: q.id,
                              charLimit: q.charLimit
                            });
                          }
                        }
                      }

                      if (chapterAnswers.length === 0) return null;

                      return (
                        <div key={chapter.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-[#003399] text-white px-4 py-2 font-semibold text-sm">
                            Chapter {chapter.id}: {chapter.title}
                          </div>
                          <div className="divide-y">
                            {chapterAnswers.map(({ questionText, fullQuestion, answerText, answerId, charLimit }) => (
                              <div key={answerId} className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1">
                                    <div className="text-xs font-semibold text-[#003399]">{fullQuestion}</div>
                                    <div className="text-[10px] text-gray-400 italic">{questionText}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {charBadge(answerText, charLimit)}
                                    <button
                                      onClick={() => copyToClipboard(answerText, answerId)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 transition-colors"
                                      title="In Zwischenablage kopieren"
                                    >
                                      {copiedSection === answerId ? (
                                        <><ClipboardCheck size={12} className="text-green-600" /><span className="text-green-600">Kopiert!</span></>
                                      ) : (
                                        <><Copy size={12} className="text-gray-400" /><span className="text-gray-500">Copy</span></>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto">
                                  {answerText}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
