"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import { t, Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from "@/lib/i18n";
import {
  extractPartnerFromURL,
  extractPartnersFromURLs,
  extractPartnersFromText,
  extractPartnerFromImage,
  ExtractedPartner,
} from "@/lib/ai-service";
import { extractTextFromPDF, extractTextFromDocx } from "@/lib/rag-system";
import {
  ArrowLeft,
  Globe,
  FileText,
  Image,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Languages,
  FileUp,
} from "lucide-react";

type ImportMode = "urls" | "text" | "image" | "csv" | "document";

// Languages for the output/analysis
const OUTPUT_LANGUAGES: Language[] = ["de", "en", "ro", "hr", "pt", "nl", "pl"];

export function SmartImport() {
  const router = useRouter();
  const addPartner = useAppStore((state) => state.addPartner);
  const { language: storeLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration-safe language
  const uiLanguage: Language = mounted ? storeLanguage : "de";

  const [mode, setMode] = useState<ImportMode>("urls");
  const [outputLanguage, setOutputLanguage] = useState<Language>("de");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // URL Mode
  const [urlInput, setUrlInput] = useState("");

  // Text Mode
  const [textInput, setTextInput] = useState("");

  // Image Mode
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Document Mode
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Results
  const [extractedPartners, setExtractedPartners] = useState<ExtractedPartner[]>([]);
  const [failedUrls, setFailedUrls] = useState<{ url: string; error: string }[]>([]);
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);

  // ============================================================================
  // URL IMPORT
  // ============================================================================
  const handleURLImport = async () => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: urls.length });
    setExtractedPartners([]);
    setFailedUrls([]);

    try {
      const result = await extractPartnersFromURLs(urls, outputLanguage, (current, total, partner) => {
        setProgress({ current, total });
        if (partner) {
          setExtractedPartners((prev) => [...prev, partner]);
        }
      });

      setFailedUrls(result.failed);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // TEXT/CSV IMPORT
  // ============================================================================
  const handleTextImport = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setExtractedPartners([]);

    try {
      const partners = await extractPartnersFromText(textInput, outputLanguage);
      setExtractedPartners(partners);
    } catch (error) {
      console.error("Text import error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // IMAGE IMPORT
  // ============================================================================
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageImport = async () => {
    if (!imagePreview) return;

    setIsProcessing(true);
    setExtractedPartners([]);

    try {
      const partner = await extractPartnerFromImage(imagePreview, outputLanguage);
      setExtractedPartners([partner]);
    } catch (error) {
      console.error("Image import error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // DOCUMENT IMPORT
  // ============================================================================
  const handleDocumentImport = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setExtractedPartners([]);

    try {
      let text = "";
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') {
        const result = await extractTextFromPDF(selectedFile);
        text = result.text;
      } else if (ext === 'docx' || ext === 'doc') {
        text = await extractTextFromDocx(selectedFile);
      } else {
        throw new Error("Unsupported file format");
      }

      const trimmedText = text.substring(0, 50000);
      const partners = await extractPartnersFromText(trimmedText, outputLanguage);
      setExtractedPartners(partners);
      setSelectedFile(null); // Clear selected file after successful extraction
    } catch (error) {
      console.error("Document import error:", error);
      alert("Fehler beim Verarbeiten des Dokuments: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // SAVE PARTNERS
  // ============================================================================
  const savePartner = (partner: ExtractedPartner, index: number) => {
    const newPartner = {
      organizationName: partner.organizationName,
      acronym: partner.acronym,
      country: partner.country,
      city: partner.city,
      website: partner.website,
      email: partner.email,
      phone: partner.phone,
      organizationType: partner.organizationType as any,
      missionStatement: partner.missionStatement || "",
      foundingYear: partner.foundingYear,
      contacts: partner.contacts.map((c) => ({
        id: crypto.randomUUID(),
        ...c,
      })),
      expertiseAreas: partner.expertiseAreas.map((e) => ({
        id: crypto.randomUUID(),
        domain: e.domain as any,
        description: e.description,
        level: e.level as 1 | 2 | 3 | 4 | 5,
      })),
      targetGroups: partner.targetGroups.map((t) => ({
        id: crypto.randomUUID(),
        group: t.group as any,
        reach: t.reach,
        method: t.method,
      })),
      previousProjects:
        partner.previousProjects?.map((p) => ({
          id: crypto.randomUUID(),
          ...p,
          role: p.role as "COORDINATOR" | "PARTNER",
        })) || [],
      sectorsActive: partner.sectorsActive as any[],
      workingLanguages: partner.workingLanguages,
      isNewcomer: partner.isNewcomer,
      tags: [],
      source: "AI Import",
      dataQuality: partner.dataQuality,
      notes: partner.notes,
    };

    addPartner(newPartner);

    // Remove from list
    setExtractedPartners((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAllPartners = () => {
    extractedPartners.forEach((partner, index) => {
      savePartner(partner, index);
    });
    setExtractedPartners([]);
    router.push("/partners");
  };

  const removePartner = (index: number) => {
    setExtractedPartners((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/partners")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-[#ffcc00]" size={24} />
              {t("smartPartnerImport", uiLanguage)}
            </h1>
            <p className="text-gray-500">
              {t("smartImportDesc", uiLanguage)}
            </p>
          </div>
        </div>

        {/* Output Language Selector */}
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-gray-400" />
          <select
            value={outputLanguage}
            onChange={(e) => setOutputLanguage(e.target.value as Language)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {OUTPUT_LANGUAGES.map((langCode) => (
              <option key={langCode} value={langCode}>
                {LANGUAGE_FLAGS[langCode]} {LANGUAGE_NAMES[langCode]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="bg-white rounded-xl border mb-6">
        <div className="flex border-b">
          {[
            { id: "urls" as ImportMode, label: t("websites", uiLanguage), icon: Globe, desc: t("analyzeUrls", uiLanguage) },
            { id: "text" as ImportMode, label: t("textCsv", uiLanguage), icon: FileText, desc: t("pasteText", uiLanguage) },
            { id: "image" as ImportMode, label: t("imageCard", uiLanguage), icon: Image, desc: t("uploadImage", uiLanguage) },
            { id: "document" as ImportMode, label: uiLanguage === 'de' ? "Dokument" : "Document", icon: FileUp, desc: uiLanguage === 'de' ? "PDF/DOCX hochladen" : "Upload PDF/DOCX" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${mode === tab.id
                ? "border-[#003399] text-[#003399] bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <tab.icon size={20} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className="text-xs font-normal text-gray-400">{tab.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* URL Mode */}
          {mode === "urls" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("websiteUrls", uiLanguage)}
                </label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t("urlPlaceholder", uiLanguage)}
                  rows={8}
                  className="w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t("urlTip", uiLanguage)}
                </p>
              </div>

              <button
                onClick={handleURLImport}
                disabled={isProcessing || !urlInput.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("analyzing", uiLanguage)} ({progress.current}/{progress.total})
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t("analyzeWithAi", uiLanguage)}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Text Mode */}
          {mode === "text" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text, CSV oder Liste einfügen
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Füge hier Text ein, z.B.:

Berufsbildungszentrum München
Kontakt: Dr. Maria Schmidt, Projektleiterin
Email: m.schmidt@bbz-muenchen.de
Tel: +49 89 123456
Expertise: Digitale Bildung, VET, Lehrerfortbildung

Oder CSV-Format:
Name;Land;Stadt;Email;Typ
BBZ München;DE;München;info@bbz.de;VET_PROVIDER
...`}
                  rows={12}
                  className="w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                />
              </div>

              <button
                onClick={handleTextImport}
                disabled={isProcessing || !textInput.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("analyzing", uiLanguage)}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t("analyzeWithAi", uiLanguage)}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Image Mode */}
          {mode === "image" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("uploadImage", uiLanguage)}
                </label>

                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">{t("clickToUpload", uiLanguage)}</span>
                    <span className="text-xs text-gray-400 mt-1">JPG, PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg border"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleImageImport}
                disabled={isProcessing || !imagePreview}
                className="flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("analyzing", uiLanguage)}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t("analyzeWithAi", uiLanguage)}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Document Mode */}
          {mode === "document" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {uiLanguage === 'de' ? "PDF oder DOCX hochladen" : "Upload PDF or DOCX"}
                </label>

                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                    <FileUp size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      {uiLanguage === 'de' ? "Klicken zum Hochladen" : "Click to upload"}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">PDF, DOCX</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative p-6 border rounded-lg bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileUp className="text-[#003399]" size={24} />
                      <div>
                        <p className="font-medium text-gray-900 border-none outline-none">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleDocumentImport}
                disabled={isProcessing || !selectedFile}
                className="flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("analyzing", uiLanguage)}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t("analyzeWithAi", uiLanguage)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Failed URLs */}
      {failedUrls.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            {failedUrls.length} {t("urlsNotAnalyzed", uiLanguage)}
          </h3>
          <ul className="space-y-1 text-sm text-red-700">
            {failedUrls.map((f, i) => (
              <li key={i}>
                <span className="font-mono">{f.url}</span>: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Partners */}
      {extractedPartners.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              {extractedPartners.length} {t("partnersFound", uiLanguage)}
            </h2>
            <button
              onClick={saveAllPartners}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save size={16} />
              {t("saveAll", uiLanguage)}
            </button>
          </div>

          <div className="divide-y">
            {extractedPartners.map((partner, index) => (
              <div key={index} className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedPartner(expandedPartner === index ? null : index)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#003399] text-white rounded-lg flex items-center justify-center font-bold">
                      {partner.country}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {partner.organizationName}
                        {partner.acronym && (
                          <span className="text-gray-400 ml-2">({partner.acronym})</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {partner.city} • {partner.organizationType?.replace(/_/g, " ")} •{" "}
                        {partner.contacts?.length || 0} Kontakt(e)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${partner.dataQuality >= 70
                      ? "bg-green-100 text-green-700"
                      : partner.dataQuality >= 40
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                      {partner.dataQuality}% {t("quality", uiLanguage)}
                    </span>
                    {expandedPartner === index ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPartner === index && (
                  <div className="mt-4 pl-14 space-y-4">
                    {/* Low Quality Warning */}
                    {partner.dataQuality < 50 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">
                              {uiLanguage === 'de'
                                ? 'Niedrige Datenqualität - bitte manuell prüfen!'
                                : uiLanguage === 'ro'
                                  ? 'Calitate scăzută a datelor - vă rugăm să verificați manual!'
                                  : uiLanguage === 'hr'
                                    ? 'Niska kvaliteta podataka - molimo provjerite ručno!'
                                    : 'Low data quality - please verify manually!'}
                            </p>
                            <p className="text-amber-700 mt-1">
                              {uiLanguage === 'de'
                                ? 'Die KI konnte nur wenige Informationen von der Website extrahieren. Bitte überprüfen und ergänzen Sie die Daten nach dem Speichern.'
                                : uiLanguage === 'ro'
                                  ? 'Inteligența artificială a putut extrage doar informații limitate de pe site-ul web. Vă rugăm să verificați și să completați datele după salvare.'
                                  : uiLanguage === 'hr'
                                    ? 'AI je uspio izdvojiti samo ograničene informacije s web mjesta. Molimo provjerite i dopunite podatke nakon spremanja.'
                                    : 'The AI could only extract limited information from the website. Please verify and complete the data after saving.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mission */}
                    {partner.missionStatement && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">{t("mission", uiLanguage)}</h4>
                        <p className="text-sm text-gray-700">{partner.missionStatement}</p>
                      </div>
                    )}

                    {/* Contacts */}
                    {partner.contacts?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t("contacts", uiLanguage)}</h4>
                        <div className="space-y-2">
                          {partner.contacts.map((contact, ci) => (
                            <div key={ci} className="flex items-center gap-4 text-sm bg-gray-50 p-2 rounded">
                              <span className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </span>
                              <span className="text-gray-500">{contact.role}</span>
                              {contact.email && (
                                <span className="text-blue-600">{contact.email}</span>
                              )}
                              {contact.phone && (
                                <span className="text-gray-500">{contact.phone}</span>
                              )}
                              {contact.isPrimary && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  {t("mainContact", uiLanguage)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expertise */}
                    {partner.expertiseAreas?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{t("expertise", uiLanguage)}</h4>
                        <div className="flex flex-wrap gap-2">
                          {partner.expertiseAreas.map((exp, ei) => (
                            <span
                              key={ei}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                            >
                              {exp.domain?.replace(/_/g, " ")} (Level {exp.level})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previous Projects */}
                    {(partner.previousProjects?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                          {t("previousEuProjects", uiLanguage)}
                        </h4>
                        <div className="space-y-1">
                          {partner.previousProjects?.map((proj, pi) => (
                            <div key={pi} className="text-sm">
                              <span className="font-medium">{proj.title}</span>
                              <span className="text-gray-400 ml-2">
                                ({proj.programme}, {proj.year}, {proj.role})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => savePartner(partner, index)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <Plus size={14} />
                        {t("save", uiLanguage)}
                      </button>
                      <button
                        onClick={() => removePartner(index)}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        <Trash2 size={14} />
                        {t("discard", uiLanguage)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State after processing */}
      {!isProcessing && extractedPartners.length === 0 && (urlInput || textInput || imagePreview) && (
        <div className="text-center py-8 text-gray-500">
          <Sparkles size={32} className="mx-auto mb-2 text-gray-300" />
          <p>{t("clickToAnalyze", uiLanguage)}</p>
        </div>
      )}
    </div>
  );
}
