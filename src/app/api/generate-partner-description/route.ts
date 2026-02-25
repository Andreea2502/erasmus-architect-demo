/**
 * API Route: KI-generierte Partner-Beschreibung
 * =============================================
 * Generiert eine 1000-1500 Wörter umfassende Beschreibung eines Partners
 * für Verwendung in EU-Projektanträgen
 *
 * Modi:
 * - generate: Neue Beschreibung generieren
 * - correct: Bestehende Beschreibung korrigieren
 */

import { NextRequest, NextResponse } from 'next/server';
import { Partner } from '@/store/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

export async function POST(request: NextRequest) {
  try {
    const {
      partner,
      projectContext,
      additionalInfo,
      existingDescription,
      correctionInstruction,
      language = 'de',
      mode = 'generate'
    } = await request.json() as {
      partner: Partner;
      projectContext?: {
        actionType?: string;
        sector?: string;
        projectTitle?: string;
        projectDescription?: string;
      };
      additionalInfo?: string;
      existingDescription?: string;
      correctionInstruction?: string;
      language: string;
      mode?: 'generate' | 'correct';
    };

    if (!partner) {
      return NextResponse.json({ error: 'Partner data required' }, { status: 400 });
    }

    // API Key aus Header oder Environment
    const headerApiKey = request.headers.get('x-gemini-api-key');
    const apiKey = headerApiKey || process.env.GEMINI_API_KEY;

    console.log('[API/generate-description] Request received. Has Key:', !!apiKey, 'Mode:', mode);

    if (!apiKey) {
      console.error('[API/generate-description] Missing API Key. Environment: GEMINI_API_KEY is', !!process.env.GEMINI_API_KEY);
      return NextResponse.json({ error: 'Gemini API Key nicht konfiguriert' }, { status: 500 });
    }

    const langInstructions: Record<string, { instruction: string; wordLabel: string }> = {
      de: { instruction: 'Schreibe die Beschreibung auf Deutsch.', wordLabel: 'Wörter' },
      en: { instruction: 'Write the description in English.', wordLabel: 'words' },
      es: { instruction: 'Escribe la descripción en español.', wordLabel: 'palabras' },
      fr: { instruction: 'Écris la description en français.', wordLabel: 'mots' },
      it: { instruction: 'Scrivi la descrizione in italiano.', wordLabel: 'parole' },
    };

    const { instruction: langInstruction, wordLabel } = langInstructions[language] || langInstructions.en;

    // Handle CORRECTION mode
    if (mode === 'correct' && existingDescription && correctionInstruction) {
      const correctionPrompt = `Du bist ein erfahrener EU-Antragsschreiber. Du sollst eine bestehende Partner-Beschreibung korrigieren.

AKTUELLE BESCHREIBUNG:
${existingDescription}

KORREKTUR-ANWEISUNG:
${correctionInstruction}

AUFGABE:
1. Lies die bestehende Beschreibung sorgfältig
2. Führe die gewünschte Korrektur durch
3. Stelle sicher, dass der Rest des Textes konsistent bleibt
4. Behalte den professionellen Ton bei
5. Die Länge soll ungefähr gleich bleiben (1000-1500 ${wordLabel})

${langInstruction}

Gib NUR die korrigierte Beschreibung zurück, keine Erklärungen oder Meta-Kommentare.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: correctionPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4096,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 500 });
      }

      const description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const wordCount = description.split(/\s+/).filter((w: string) => w.length > 0).length;

      return NextResponse.json({
        description,
        wordCount,
        language,
        corrected: true,
        generatedAt: new Date().toISOString(),
      });
    }

    // Handle GENERATE mode
    // Build comprehensive partner information
    const partnerInfo = `
ORGANISATION: ${partner.organizationName}
${partner.acronym ? `AKRONYM: ${partner.acronym}` : ''}
LAND: ${partner.country}
${partner.city ? `STADT: ${partner.city}` : ''}
ORGANISATIONSTYP: ${partner.organizationType}
${partner.foundingYear ? `GRÜNDUNGSJAHR: ${partner.foundingYear}` : ''}
${partner.staffSize ? `MITARBEITERZAHL: ${partner.staffSize}` : ''}

MISSION/PROFIL:
${partner.missionStatement || 'Nicht angegeben'}

ZIELGRUPPEN:
${partner.targetGroups?.map(t => `- ${t.group}: ${t.method || ''} (Reichweite: ${t.reach || '?'})`).join('\n') || 'Nicht angegeben'}

AKTIVE SEKTOREN: ${partner.sectorsActive?.join(', ') || 'Nicht angegeben'}
ARBEITSSPRACHEN: ${partner.workingLanguages?.join(', ') || 'Nicht angegeben'}

FRÜHERE EU-PROJEKTE:
${partner.previousProjects?.map(p => `- ${p.title} (${p.programme}, ${p.year}, Rolle: ${p.role})${p.description ? `: ${p.description}` : ''}`).join('\n') || 'Keine bekannt'}

ANSPRECHPARTNER:
${partner.contacts?.map(c => `- ${c.firstName} ${c.lastName} (${c.role})${c.email ? ` - ${c.email}` : ''}`).join('\n') || 'Nicht angegeben'}

${partner.notes ? `ZUSÄTZLICHE NOTIZEN:\n${partner.notes}` : ''}

DOKUMENT-ZUSAMMENFASSUNGEN (Inhalte aus hochgeladenen Dokumenten/Studien):
${partner.uploadedDocuments?.filter(d => d.summary).map(d => `- Dok: "${d.name}": ${d.summary?.executiveSummary}`).join('\n') || 'Keine Dokument-Zusammenfassungen vorhanden'}
`;

    const projectContextInfo = projectContext ? `
PROJEKT-KONTEXT:
- Aktionstyp: ${projectContext.actionType || 'Nicht spezifiziert'}
- Sektor: ${projectContext.sector || 'Nicht spezifiziert'}
${projectContext.projectTitle ? `- Projekttitel: ${projectContext.projectTitle}` : ''}
${projectContext.projectDescription ? `- Projektbeschreibung: ${projectContext.projectDescription}` : ''}
` : '';

    const additionalInfoSection = additionalInfo ? `
ZUSÄTZLICHE INFORMATIONEN VOM BENUTZER:
========================================
${additionalInfo}
========================================
WICHTIG: Diese zusätzlichen Informationen sind direkt vom Benutzer bereitgestellt und sollten
mit hoher Priorität in die Beschreibung einfließen! Sie enthalten wichtige Details, die nicht
auf der Website zu finden sind.
` : '';

    const prompt = `Du bist ein erfahrener Erasmus+ Antragsschreiber. Erstelle eine professionelle Partner-Beschreibung für einen EU-Projektantrag.

WICHTIGE KERN-DIREKTIVEN (aus dem Erasmus+ Regelwerk):
1. KEIN PARTNER OHNE ROLLE: Jeder Partner muss eine klar definierte, unverzichtbare Aufgabe haben.
2. DIVERSITÄT = QUALITÄT: Betone die Synergie zwischen den Partnern (verschiedene Sektoren, Regionen, Erfahrungslevel).
3. TECH & TOUCH STRATEGIE: Identifiziere ob die Organisation eher "Tech" (Methodik, technische Expertise) oder "Touch" (Zielgruppen-Zugang, lokale Implementierung) liefert und beschreibe sie entsprechend.

${partnerInfo}

${projectContextInfo}

${additionalInfoSection}

AUFGABE:
Schreibe eine umfassende, überzeugende Beschreibung dieser Organisation für den EU-Antrag.

ANFORDERUNGEN:
1. Länge: GENAU 1000-1500 ${wordLabel} (sehr wichtig!)
2. ${langInstruction}
3. Professioneller, formeller Ton
4. Struktur:
   - Organisationsprofil und Geschichte
   - Kernkompetenzen und Expertise
   - Erfahrung mit Zielgruppen (Betone den "Touch"-Aspekt, falls zutreffend)
   - Relevante EU-Projekterfahrung
   - Spezifischer Beitrag zum Projekt und Synergie mit dem Konsortium
   - Kapazitäten und Ressourcen
5. Verwende konkrete Zahlen und Fakten wo möglich
6. Betone EU-relevante Aspekte (europäische Dimension, Mehrwert)
7. Hebe Alleinstellungsmerkmale hervor
${additionalInfo ? '8. WICHTIG: Integriere unbedingt die zusätzlichen Informationen vom Benutzer!' : ''}

WICHTIG:
- Erfinde KEINE Informationen die nicht in den Daten stehen
- Bei fehlenden Informationen, formuliere allgemeiner
- Schreibe in der dritten Person
- Vermeide Wiederholungen

Gib NUR die Beschreibung zurück, keine Überschriften oder Meta-Informationen.`;

    const { generateContentAction } = await import('@/app/actions/gemini');

    let description = "";
    try {
      description = await generateContentAction(prompt, undefined, 0.7);
    } catch (error: any) {
      console.error('[API/generate-description] AI Service Error:', error.message);
      return NextResponse.json({
        error: 'KI-Dienst vorübergehend nicht verfügbar (Quote erreicht)',
        details: error.message
      }, { status: 503 });
    }

    const wordCount = description.split(/\s+/).filter((w: string) => w.length > 0).length;

    return NextResponse.json({
      description,
      wordCount,
      language,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Generate description error:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      error: errorMessage,
      details: 'Failed to generate partner description. Please check the server logs for more information.'
    }, { status: 500 });
  }
}
