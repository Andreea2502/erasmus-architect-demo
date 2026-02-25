// @ts-ignore
import { generateContentAction, analyzeImageAction } from '@/app/actions/gemini';

/**
 * AI SERVICE - Gemini Integration
 * ================================
 * Zentrale AI-Funktionen für den Erasmus+ Architect
 */

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  error?: { message: string };
}

/**
 * Basis-Funktion für Gemini API Calls (via Server Action)
 */
export async function callGemini(prompt: string, systemContext?: string): Promise<string> {
  try {
    return await generateContentAction(prompt, systemContext);
  } catch (error: any) {
    throw new Error(error.message || 'Fehler bei der Anfrage an Gemini');
  }
}

/**
 * Partner aus Website-URL extrahieren
 * Verwendet Server-Side API Route
 */
export async function extractPartnerFromURL(url: string, language: string = 'de'): Promise<ExtractedPartner> {

  // Nutze die Server-Side API Route
  const response = await fetch('/api/extract-partner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, language }),
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    // Falls Fehler-HTML zurückkommt (z.B. Vercel Timeout)
    const text = await response.text();
    // Versuche Titel aus HTML zu extrahieren für bessere Fehlermeldung
    const titleMatch = text.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Unbekannter Server-Fehler';
    throw new Error(`Server-Fehler (${response.status}): ${title}`);
  }

  if (!response.ok) {
    throw new Error(data.error || 'Fehler beim Extrahieren der Partner-Daten');
  }

  return data.partner as ExtractedPartner;
}

/**
 * Mehrere URLs gleichzeitig analysieren
 */
export async function extractPartnersFromURLs(
  urls: string[],
  language: string = 'de',
  onProgress?: (current: number, total: number, partner?: ExtractedPartner) => void
): Promise<{ success: ExtractedPartner[]; failed: { url: string; error: string }[] }> {
  const success: ExtractedPartner[] = [];
  const failed: { url: string; error: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;

    try {
      let partner: ExtractedPartner | null = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          partner = await extractPartnerFromURL(url, language);
          break; // Erfolg
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);

          const is429 =
            msg.includes('429') ||
            msg.toLowerCase().includes('resource exhausted');

          if (!is429 || attempt === 3) {
            throw err;
          }

          // Exponential Backoff: 2s, 4s, 8s
          const waitMs = 2000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }

      if (!partner) {
        throw lastError ?? new Error('Unbekannter Fehler beim URL-Import');
      }

      success.push(partner);
      onProgress?.(i + 1, urls.length, partner);
    } catch (error) {
      failed.push({ url, error: (error as Error).message });
      onProgress?.(i + 1, urls.length);
    }

    // Rate limiting - 1 Sekunde zwischen Requests
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  return { success, failed };
}

/**
 * Partner aus Text/CSV extrahieren
 */
export async function extractPartnersFromText(
  text: string,
  language: string = 'de'
): Promise<ExtractedPartner[]> {
  const systemContext = `Du bist ein Experte für Erasmus+ Projekte.
Analysiere den folgenden Text und extrahiere ALLE Organisationen/Partner die darin erwähnt werden.
Für jede Organisation erstelle einen vollständigen Partner-Datensatz.`;

  const prompt = `Text zum Analysieren:
${text}

Extrahiere alle Organisationen und gib ein JSON-Array zurück mit Partner-Objekten.
Jedes Objekt soll diese Felder haben:
- organizationName, acronym, country, city, website, email, phone
- organizationType: z.B. NGO, UNIVERSITY, SME, SCHOOL, etc.
- missionStatement: Fasse hier die Mission, Ziele und Hauptaufgaben detailliert zusammen. Alles Wichtige aus dem Text aufnehmen!
- contacts (Array mit firstName, lastName, role, email, phone, isPrimary)
- expertiseAreas (Array mit domain, description, level) - Nimm alle Kompetenzen und Themenbereiche auf!
- targetGroups (Array mit group, reach, method) - Mit welchen Zielgruppen arbeitet die Organisation?
- previousProjects (Array mit title, programme, year, role, description)
- sectorsActive, workingLanguages
- isNewcomer, dataQuality (0-100)
- notes: SEHR WICHTIG! 1. Fasse hier alle anderen nützlichen Infos aus dem Text zusammen. 2. Führe hier EXPLIZIT auf, welche Standard-Informationen auf Basis des Textes FEHLEN (z.B. "Folgende für Erasmus+ wichtige Infos müssen noch eingeholt werden: OID/PIC, genaue Kontaktperson, Telefonnummer, Gründungsjahr...").

WICHTIG:
Nimm SO VIELE Details aus dem Text mit wie möglich. Nichts darf verloren gehen, was für ein Partnerprofil in einem Projektantrag nützlich sein könnte. Die KI soll nicht geizig mit dem Text sein!

NUR das JSON-Array zurückgeben, keine Erklärungen!`;

  const response = await callGemini(prompt, systemContext);

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]) as ExtractedPartner[];
  } catch {
    return [];
  }
}

/**
 * Visitenkarte/Bild analysieren (Base64)
 */
export async function extractPartnerFromImage(
  imageBase64: string,
  language: string = 'de'
): Promise<ExtractedPartner> {
  const prompt = `Analysiere diese Visitenkarte oder dieses Bild einer Organisation.
Extrahiere alle Kontakt- und Organisationsdaten.
Gib ein JSON-Objekt zurück mit: organizationName, acronym, country, city, website, email, phone, contacts (Array mit firstName, lastName, role, email, phone).
NUR JSON, keine Erklärungen!`;

  try {
    const text = await analyzeImageAction(imageBase64, prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Konnte keine Daten aus dem Bild extrahieren');
    }

    return JSON.parse(jsonMatch[0]) as ExtractedPartner;
  } catch (error: any) {
    console.error('Image analysis error:', error);
    throw new Error(error.message || 'Fehler bei der Bildanalyse');
  }
}

/**
 * Projekt-Konzepte generieren basierend auf Konsortium und Studien
 */
export async function generateProjectConcepts(
  params: ProjectConceptParams,
  language: string = 'de'
): Promise<ProjectConcept[]> {
  const langInstructions: Record<string, string> = {
    de: 'Antworte komplett auf Deutsch. Alle Texte, Titel, Beschreibungen auf Deutsch.',
    en: 'Respond completely in English.',
    pt: 'Responda completamente em português.',
    ro: 'Răspundeți complet în limba română.',
    hr: 'Odgovorite potpuno na hrvatskom/srpskom jeziku.',
  };

  const systemContext = `Du bist ein erfahrener Erasmus+ Projektmanager mit 15 Jahren Erfahrung.
${langInstructions[language] || langInstructions.de}

Du kennst den Erasmus+ Programmleitfaden 2025 perfekt und weißt genau:
- Welche Prioritäten gerade gefragt sind
- Was Evaluatoren überzeugt (Relevanz, Qualität, Impact, Nachhaltigkeit)
- Wie man innovative und gleichzeitig realistische Projekte konzipiert
- Wie man Studien und Statistiken effektiv einbindet

WICHTIG:
- Alle Konzepte müssen zur Konsortium-Zusammensetzung passen
- Nutze die Stärken der Partner
- Beziehe dich auf die hochgeladenen Studien mit konkreten Zahlen
- Berücksichtige die EU Horizontal Priorities 2025`;

  const studiesInfo = params.studies?.length
    ? `\n\nHochgeladene Studien/Statistiken:\n${params.studies.map(s => `- ${s.title}: ${s.keyFindings}`).join('\n')}`
    : '';

  const prompt = `Entwickle 5 verschiedene innovative Projektkonzepte für ein ${params.actionType} Erasmus+ Projekt im Bereich ${params.sector}.

KONSORTIUM (${params.partners.length} Partner):
${params.partners.map(p => `- ${p.name} (${p.country}): ${p.type} - Expertise: ${p.expertise.join(', ')}`).join('\n')}

THEMATISCHE RICHTUNG:
${params.themeIdeas || 'Offen für Vorschläge basierend auf Konsortium-Stärken'}

ZIELGRUPPE:
${params.targetGroups?.join(', ') || 'Noch nicht festgelegt'}
${studiesInfo}

BUDGET: €${params.budget.toLocaleString()}
DAUER: ${params.duration} Monate

Erstelle 5 unterschiedliche Konzepte. Für jedes Konzept gib zurück:
1. Einen eingängigen Projekttitel und ein Akronym (WICHTIG: Das Akronym MUSS zwingend aus englischen Wörtern gebildet werden, z.B. AIducate, DigiYouth, auch wenn der restliche Antrag auf Deutsch ist!)
2. Die adressierte EU-Priorität
3. Das Kernproblem (mit Bezug auf Studien/Statistiken)
4. Die Innovation/den neuen Ansatz
5. 4-5 Work Packages mit kurzer Beschreibung
6. 2-3 Hauptergebnisse/Outputs
7. Erwarteter Impact
8. Warum dieses Konsortium perfekt dafür ist

Gib ein JSON-Array mit 5 Objekten zurück:
[
  {
    "title": "Projekttitel",
    "acronym": "AKRONYM",
    "priority": "EU Priorität",
    "problemStatement": "Das Problem mit Zahlen/Studien",
    "innovation": "Was ist neu/innovativ",
    "workPackages": [
      {"number": 1, "title": "WP Titel", "description": "Kurzbeschreibung", "lead": "Partner Name"}
    ],
    "mainOutputs": ["Output 1", "Output 2"],
    "expectedImpact": "Erwartete Wirkung",
    "consortiumFit": "Warum dieses Konsortium passt"
  }
]

NUR das JSON-Array, keine weiteren Erklärungen!`;

  const response = await callGemini(prompt, systemContext);

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Konnte keine Konzepte generieren');
  }

  return JSON.parse(jsonMatch[0]) as ProjectConcept[];
}

/**
 * Needs Analysis mit Studien erstellen
 */
export async function generateNeedsAnalysis(
  params: NeedsAnalysisParams,
  language: string = 'de'
): Promise<NeedsAnalysis> {
  const systemContext = `Du bist ein Experte für Bedarfsanalysen in EU-Projekten.
Erstelle eine überzeugende, evidenzbasierte Needs Analysis.
Nutze konkrete Zahlen und Quellenangaben.`;

  const prompt = `Erstelle eine Needs Analysis für ein Erasmus+ Projekt:

Thema: ${params.topic}
Sektor: ${params.sector}
Zielgruppen: ${params.targetGroups.join(', ')}
Länder: ${params.countries.join(', ')}

${params.studies?.length ? `Verfügbare Studien:\n${params.studies.map(s => `- ${s.title}: ${s.keyFindings}`).join('\n')}` : ''}

Gib ein JSON-Objekt zurück:
{
  "problemStatement": "Hauptproblem in 2-3 Sätzen",
  "rootCauses": ["Ursache 1", "Ursache 2", "Ursache 3"],
  "statistics": [
    {"fact": "Statistik mit Zahl", "source": "Quelle", "year": 2024}
  ],
  "gaps": ["Lücke 1", "Lücke 2"],
  "targetGroupNeeds": [
    {"group": "Zielgruppe", "needs": ["Bedarf 1", "Bedarf 2"]}
  ],
  "europeanDimension": "Warum EU-weite Lösung nötig",
  "urgency": "Warum jetzt handeln"
}`;

  const response = await callGemini(prompt, systemContext);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Konnte keine Needs Analysis generieren');
  }

  return JSON.parse(jsonMatch[0]) as NeedsAnalysis;
}

/**
 * Text übersetzen
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  context?: string
): Promise<string> {
  const langNames: Record<string, string> = {
    de: 'Deutsch', en: 'English', pt: 'Português', nl: 'Nederlands', pl: 'Polski',
    ro: 'Română', hu: 'Magyar', cs: 'Čeština', sk: 'Slovenčina',
    bg: 'Български', el: 'Ελληνικά', sv: 'Svenska', da: 'Dansk', fi: 'Suomi',
    hr: 'Hrvatski'
  };

  const prompt = `Übersetze den folgenden Text ins ${langNames[targetLanguage] || targetLanguage}.
${context ? `Kontext: ${context}` : ''}
Behalte Formatierung und Fachbegriffe bei.

Text:
${text}

Übersetzung (NUR der übersetzte Text, keine Erklärungen):`;

  return await callGemini(prompt);
}

/**
 * AI Chat für Fragen zum Projektantrag
 */
export async function chatWithAssistant(
  message: string,
  context: ChatContext,
  language: string = 'de'
): Promise<string> {
  const systemContext = `Du bist ein erfahrener Erasmus+ Berater und hilfst bei der Projektentwicklung.
Du kennst den Programmleitfaden 2025 perfekt.
Antworte in ${language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language}.
Sei konkret, praktisch und gib Beispiele.

Aktueller Projektkontext:
- Aktion: ${context.actionType || 'Noch nicht festgelegt'}
- Sektor: ${context.sector || 'Noch nicht festgelegt'}
- Budget: ${context.budget ? '€' + context.budget.toLocaleString() : 'Noch nicht festgelegt'}
- Partner: ${context.partnerCount || 0} im Konsortium
${context.additionalInfo || ''}`;

  return await callGemini(message, systemContext);
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Antwort basierend auf Programme Guide RAG generieren
 */
export async function generateGuideAnswer(
  question: string,
  context: string,
  language: string = 'de'
): Promise<string> {
  const systemContext = `Du bist ein strikter Assistent für den Erasmus+ Programmleitfaden.
Antworte NUR basierend auf dem folgenden Kontext.
Wenn die Antwort nicht im Kontext steht, sag "Das steht nicht im Leitfaden" oder "Ich habe dazu keine Informationen gefunden".
Rate nicht!
Zitiere immer die Seite oder den Abschnitt, wenn möglich.
Antworte in ${language === 'de' ? 'Deutsch' : 'Englisch'}.

KONTEXT AUS DEM PROGRAMMLEITFADEN:
${context}`;

  const prompt = `Frage: ${question}

Antwort (mit Referenzen):`;

  return await callGemini(prompt, systemContext);
}

export interface ExtractedPartner {
  organizationName: string;
  acronym?: string;
  country: string;
  city?: string;
  website?: string;
  email?: string;
  phone?: string;
  organizationType: string;
  missionStatement?: string;
  foundingYear?: number;
  contacts: Array<{
    firstName: string;
    lastName: string;
    role: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
  }>;
  expertiseAreas: Array<{
    domain: string;
    description: string;
    level: number;
  }>;
  targetGroups: Array<{
    group: string;
    reach: number;
    method: string;
  }>;
  previousProjects?: Array<{
    title: string;
    programme: string;
    year: number;
    role: string;
    description?: string;
  }>;
  sectorsActive: string[];
  workingLanguages: string[];
  isNewcomer: boolean;
  dataQuality: number;
  notes?: string;
}

export interface ProjectConceptParams {
  actionType: string;
  sector: string;
  budget: number;
  duration: number;
  partners: Array<{
    name: string;
    country: string;
    type: string;
    expertise: string[];
  }>;
  themeIdeas?: string;
  targetGroups?: string[];
  studies?: Array<{
    title: string;
    keyFindings: string;
  }>;
}

export interface ProjectConcept {
  title: string;
  acronym: string;
  priority: string;
  problemStatement: string;
  innovation: string;
  workPackages: Array<{
    number: number;
    title: string;
    description: string;
    lead: string;
  }>;
  mainOutputs: string[];
  expectedImpact: string;
  consortiumFit: string;
  duration?: number;
  selected?: boolean;
  savedForLater?: boolean;
  expanded?: boolean;
}

export interface NeedsAnalysisParams {
  topic: string;
  sector: string;
  targetGroups: string[];
  countries: string[];
  studies?: Array<{
    title: string;
    keyFindings: string;
  }>;
}

export interface NeedsAnalysis {
  problemStatement: string;
  rootCauses: string[];
  statistics: Array<{
    fact: string;
    source: string;
    year: number;
  }>;
  gaps: string[];
  targetGroupNeeds: Array<{
    group: string;
    needs: string[];
  }>;
  europeanDimension: string;
  urgency: string;
}

export interface ChatContext {
  actionType?: string;
  sector?: string;
  budget?: number;
  partnerCount?: number;
  additionalInfo?: string;
}
