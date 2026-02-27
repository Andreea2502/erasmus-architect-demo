import { ConceptState } from '@/types/concept';

export const SECTORS = [
  { value: 'ADU', label: 'Erwachsenenbildung' },
  { value: 'VET', label: 'Berufsbildung' },
  { value: 'SCH', label: 'Schulbildung' },
  { value: 'YOU', label: 'Jugend' },
  { value: 'HED', label: 'Hochschulbildung' },
];

export const ERASMUS_PRIORITIES = [
  { value: 'Inklusion und Vielfalt', label: 'Inklusion und Vielfalt' },
  { value: 'Digitaler Wandel', label: 'Digitaler Wandel' },
  { value: 'Umwelt und Bekämpfung des Klimawandels', label: 'Umwelt und Bekämpfung des Klimawandels' },
  { value: 'Teilhabe am demokratischen Leben', label: 'Teilhabe am demokratischen Leben' },
  { value: 'Union of Skills', label: 'Union of Skills' },
  { value: 'Anderes', label: 'Anderes (selbst eintragen)' },
];

function getSectorLabel(sectorValue: string): string {
  return SECTORS.find(s => s.value === sectorValue)?.label || sectorValue;
}

// ============================================================================
// STEP 1: IDEA & RESEARCH PROMPTS
// ============================================================================

export function getEnhanceIdeaPrompt(state: ConceptState): string {
  const sectorLabel = getSectorLabel(state.sector);
  return `Du bist ein erfahrener Erasmus+ Projektentwickler im Bereich ${sectorLabel}.

Ein Nutzer hat seine Projektidee grob und umgangssprachlich beschrieben. Deine Aufgabe ist es, daraus eine klare, präzise und professionelle Formulierung zu machen, die für EU-Förderanträge geeignet ist.

ROHE IDEE DES NUTZERS:
"${state.idea}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

ROHES PROBLEM DES NUTZERS:
"${state.problem}"

AUFGABE:
1. Verstehe den Kern der Idee - was will der Nutzer eigentlich erreichen?
2. Formuliere die Idee als klaren, professionellen Projektansatz (3-4 Sätze). Behalte den inhaltlichen Kern bei, aber mache die Formulierung präzise, strukturiert und fachlich korrekt.
3. Formuliere das Problem/die Herausforderung klar und nachvollziehbar (3-4 Sätze). Stelle den Bedarf heraus.

REGELN:
- Behalte den INHALT und die INTENTION des Nutzers bei
- Erfinde NICHTS dazu, was der Nutzer nicht gesagt hat
- Mache es professioneller, aber nicht übertrieben akademisch
- Die Formulierung soll für Recherche-Prompts optimiert sein (klar, durchsuchbar, mit relevanten Fachbegriffen)
- Schreibe auf Deutsch

Antworte NUR im JSON-Format:
{
  "enhancedIdea": "Die aufbereitete Projektidee...",
  "enhancedProblem": "Die aufbereitete Problemstellung..."
}`;
}

export function getBedarfsanalysePrompt(state: ConceptState): string {
  const sectorLabel = getSectorLabel(state.sector);
  const ideaText = state.enhancedIdea || state.idea;
  const problemText = state.enhancedProblem || state.problem;

  return `Du bist ein erfahrener Recherche-Assistent für EU-Bildungsprojekte im Bereich ${sectorLabel}.

AUFGABE: Erstelle eine fundierte Bedarfsanalyse zum folgenden Thema.

THEMA / PROJEKTIDEE:
"${ideaText}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

PROBLEM / HERAUSFORDERUNG:
"${problemText}"

RECHERCHEKRITERIEN:
- NUR Studien und Berichte aus den letzten 3 Jahren (2023-2026).
- INKLUSIVES WORDING: Nutze "Europa" oder "europäisch" anstelle von "EU", da bei Erasmus+ auch assoziierte Nicht-EU-Länder (z.B. Serbien) beteiligt sind.
- STRUKTURIERE DEINE RECHERCHE NACH DEM TRICHTER-PRINZIP (Funnel-Ansatz: Makro -> Meso -> Mikro).
- MAKRO-EBENE (International/Europäisch): Nutze primär Berichte von Organisationen mit anerkannter Analysekompetenz wie Eurydice-Netzwerk, CEDEFOP, OECD, Weltwirtschaftsforum und Europarat.
- EU-DATENBANKEN: Nutze Instrumente wie das EU-Kompetenzpanorama oder die ESCO-Klassifikation zur Untermauerung von Qualifikationslücken oder Arbeitsmarktbedürfnissen.
- MESO-EBENE (National/Regional): Beziehe dich auf Daten von nationalen statistischen Ämtern, Ministerien, regionalen Behörden, Arbeitsvermittlungsdiensten oder Branchen-/Berufsverbänden.
- MIKRO-EBENE (Lokal/Projektbezogen): Verweise auf eigene Erhebungen (z.B. Umfragen, Experteninterviews) oder erfolgreiche Ergebnisse aus Vorgängerprojekten.
- Nenne IMMER den vollständigen Titel der Studie, das Institut und das Erscheinungsjahr.
- Konkrete Zahlen, Prozentsätze und Statistiken sind zwingend erforderlich.

STRUKTUR DEINER ANALYSE (TRICHTER-PRINZIP):

1. MAKRO-EBENE: EUROPÄISCHE/GLOBALE LAGE (mit Zahlen)
- Wie ist die aktuelle Situation in Europa bezüglich "${problemText}"?
- Zitiere anerkannte Makro-Studien (z.B. OECD, Eurydice, CEDEFOP) und EU-Datenbanken.
- Nenne 2-3 aktuelle Studien mit Titel, Institut, Jahr und Kernaussage.

2. MESO-EBENE: NATIONALE/REGIONALE LAGE
- Wie stellt sich das Problem auf länderspezifischer Ebene in den beteiligten Partnerländern dar?
- Nutze Daten von nationalen Behörden und Ämtern, um die Relevanz der Qualifikationslücken in den verschiedenen Staaten zu belegen.

3. MIKRO-EBENE: ZIELGRUPPEN-ANALYSE & LOKALER BEDARF
- Wie ist die spezifische Zielgruppe "${state.targetGroup}" vor Ort betroffen?
- Beziehe dich auf konkrete lokale Bedarfe, potenziell eigene Datenerhebungen (Umfragen) oder Erfahrungen aus Vorgängerprojekten.
- Zahlen zur Größe und Betroffenheit der Zielgruppe.

4. POLITISCHER RAHMEN
- Welche EU-Strategien und Initiativen gibt es zu diesem Thema?
- Wie passt das Thema zu den Erasmus+ Prioritäten (Inklusion, Digitalisierung, Green Deal, Demokratische Teilhabe)?

5. SCHLUSSFOLGERUNG
- Die ermittelten Probleme, Bedürfnisse und Lösungen auf Makro-, Meso- und Mikro-Ebene müssen hier logisch miteinander verknüpft werden.
- Warum ist JETZT ein Erasmus+ Projekt zu diesem Thema notwendig?
- Was sind die 3 wichtigsten Bedarfe, die adressiert werden müssen?

Bitte antworte ausführlich und mit konkreten Quellenangaben.`;
}

export function getBestPracticesPrompt(state: ConceptState): string {
  const sectorLabel = getSectorLabel(state.sector);
  const ideaText = state.enhancedIdea || state.idea;
  const problemText = state.enhancedProblem || state.problem;

  return `Du bist ein erfahrener Recherche-Assistent für EU-Bildungsprojekte im Bereich ${sectorLabel}.

AUFGABE: Recherchiere bestehende Projekte, Initiativen und Best Practices zum folgenden Thema.

THEMA / PROJEKTIDEE:
"${ideaText}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

PROBLEM / HERAUSFORDERUNG:
"${problemText}"

RECHERCHEKRITERIEN:
- Bestehende EU-geförderte Projekte (Erasmus+, ESF, Horizon, Creative Europe etc.)
- Innovative nationale Initiativen in EU-Mitgliedsstaaten
- Nur Projekte und Initiativen der letzten 5 Jahre (2021-2026)
- Konkrete Ergebnisse und Lessons Learned
- Nenne IMMER: Projektname, Förderprogramm, Laufzeit, beteiligte Länder

STRUKTUR DEINER ANALYSE:

1. BESTEHENDE EU-PROJEKTE
- Welche Erasmus+ oder EU-Projekte gibt es bereits zu diesem Thema?
- Was waren deren Hauptergebnisse und Outputs?
- Was hat gut funktioniert, was nicht?
- Suche konkret in: Erasmus+ Project Results Platform, EPALE, School Education Gateway
- Nenne 5-8 relevante Projekte mit Name, Programm, Jahr und Hauptergebnis

2. NATIONALE BEST PRACTICES
- Welche innovativen Ansätze gibt es in einzelnen EU-Ländern?
- Was können wir davon lernen und übernehmen?
- Nenne 3-5 konkrete Beispiele mit Land und Initiative

3. INNOVATIONSLÜCKE (Gap Analysis)
- Was fehlt bei den bestehenden Ansätzen?
- Welche Aspekte wurden noch NICHT ausreichend adressiert?
- Wo gibt es den größten Bedarf für neue Lösungen?

4. METHODISCHE ANSÄTZE
- Welche Methoden und Ansätze haben sich als besonders wirksam erwiesen?
- Welche didaktischen/pädagogischen Frameworks sind relevant?
- Gibt es technologische Lösungen die eingesetzt wurden?

5. EMPFEHLUNGEN
- Was sollte ein neues Projekt ANDERS oder BESSER machen?
- Welche 3 innovativen Ansätze wären am vielversprechendsten?
- Wie kann das Projekt einen echten Mehrwert gegenüber bestehenden Initiativen schaffen?

Bitte antworte ausführlich und mit konkreten Projektbeispielen.`;
}

// ============================================================================
// STEP 2: CONCEPTS & COMPARISON PROMPTS
// ============================================================================

export function getGenerateConceptsPrompt(state: ConceptState, sourceContext: string, allSourceContext: string, language: string): string {
  const isKA210 = state.actionType === 'KA210';
  const ideaText = state.enhancedIdea || state.idea;
  const problemText = state.enhancedProblem || state.problem;
  const sectorLabel = getSectorLabel(state.sector);
  const ka210Hint = isKA210
    ? `\nWICHTIG - KA210 Rahmenbedingungen:
- Budget: max. 60.000 EUR
- Dauer: 6-24 Monate
- Min. 2 Partner aus 2 verschiedenen Ländern
- Fokus auf EINFACHE, umsetzbare Aktivitäten
- Weniger Outputs als bei KA220 (2-3 statt 4-6)
- Keine formalen Work Packages, sondern direkte Aktivitäten
- Ideal für: Austausch von Best Practices, Kapazitätsaufbau, kleine Pilotprojekte`
    : `\nWICHTIG - KA220 Rahmenbedingungen:
- Budget: 120.000-400.000 EUR
- Dauer: 12-36 Monate
- Min. 3 Partner aus 3 verschiedenen Ländern
- Fokus auf transnationale Zusammenarbeit und Innovation
- 3-6 konkrete Outputs/Intellectual Results
- Formale Work Package Struktur mit WP1 Management`;

  return `Du bist ein erfahrener Erasmus+ Projektentwickler im Bereich ${sectorLabel}.

PROJEKTIDEE: "${ideaText}"
ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}
PROBLEM: "${problemText}"
AKTIONSTYP: ${state.actionType}${isKA210 ? ' (Kleine Partnerschaft)' : ' (Kooperationspartnerschaft)'}
${ka210Hint}

RECHERCHE-ERGEBNISSE:
${sourceContext}
${allSourceContext ? `\nWEITERE QUELLEN:\n${allSourceContext}` : ''}

${state.additionalInstructions ? `ZUSÄTZLICHE ANWEISUNGEN / FEHLENDE THEMEN (UNBEDINGT INTEGRIEREN!):\n${state.additionalInstructions}\n` : ''}

AUFGABE: Entwickle 3 UNTERSCHIEDLICHE Konzeptvorschläge für ein Erasmus+ ${state.actionType} Projekt.
Jedes Konzept soll einen ANDEREN Ansatz verfolgen, ABER alle Konzepte MÜSSEN den definierten Erasmus+ Schwerpunkt ("${state.priorityFocus || 'Kein spezifischer Schwerpunkt'}") zentral als roter Faden behandeln!

Die Konzepte sollen sich deutlich unterscheiden in:
- Methodischem Ansatz
- Schwerpunkt und Innovation
- Art der Outputs und Ergebnisse

${isKA210 ? 'Halte die Konzepte REALISTISCH für ein kleines Budget (max 60k) und kurze Laufzeit. Weniger ist mehr!' : 'Nutze das größere Budget und die längere Laufzeit für ambitionierte, innovative Ansätze.'}

Nutze die Recherche-Ergebnisse als Grundlage und beziehe dich auf konkrete Daten.

WICHTIGE LOGIK- UND WORTWAHL-REGELN:
- INKLUSIVES WORDING: Nutze "Europa" oder "europäisch" anstelle von "EU" (z.B. "European workforce" statt "EU workforce"), da bei Erasmus+ auch assoziierte Nicht-EU-Länder (z.B. Serbien) gleichberechtigt beteiligt sind.
- KEINE BUZZWORDS: Ersetze leere Begriffe wie "AI-based learning companion" durch konkrete, machbare technische Ansätze (z.B. "Web-basierte Applikation mit Anbindung an existierende LLM-APIs wie OpenAI").
- VERMEIDE FLASCHENHÄLSE (Bottlenecks): Projektphasen müssen parallel oder überlappend stattfinden. Wenn z.B. Entwicklung auf Analyse aufbaut, zeige, wie die Entwicklung schon parallel starten kann.
- TRAIN-THE-TRAINER: Wenn Pädagogen/Trainer ausgebildet werden, MUSS im Konzept klar werden, dass diese die Methoden/Tools in anschließenden Pilottests mit ihren eigenen Lernenden ausprobieren.

SPRACHE: Antworte grundsätzlich auf ${language === 'de' ? 'Deutsch' : 'Englisch'}. 
WICHTIGE AUSNAHME: Der Projekttitel und das Akronym MÜSSEN ZWINGEND auf Englisch sein, da der finale EU-Antrag auf Englisch eingereicht wird!

AKRONYM-REGEL: Das Akronym MUSS ein kreatives englisches Wort sein, bei dem JEDER Buchstabe für ein Wort aus dem englischen Projekttitel steht.
Beispiele: GAFFE = Generative AI for Female Entrepreneurship, BRIDGE = Building Resilience through Inclusive Digital Growth in Education, LEARN = Leveraging Education for Accessible Resources Network.
Das Akronym soll einprägsam und thematisch passend sein!

Antworte im JSON-Format:
{
  "concepts": [
    {
      "title": "ENGLISCHER Projekttitel (der die Buchstaben des Akronyms enthält)",
      "acronym": "KREATIVES ENGLISCHES Akronym (max 10 Buchstaben, jeder Buchstabe = ein Wort aus dem Titel)",
      "summary": "Zusammenfassung in ${isKA210 ? '3-4' : '4-5'} Sätzen",
      "problemStatement": "Welches spezifische Problem adressiert dieses Konzept? (3-4 Sätze, mit Bezug auf Studien)",
      "innovation": "Was ist der innovative Ansatz? Was ist NEU? (${isKA210 ? '2-3' : '3-4'} Sätze)",
      "targetGroups": ["Zielgruppe 1", "Zielgruppe 2"],
      "objectives": ["Ziel 1", "Ziel 2"${isKA210 ? '' : ', "Ziel 3"'}],
      "mainOutputs": ["Output 1: Beschreibung", "Output 2: Beschreibung"${isKA210 ? '' : ', "Output 3: Beschreibung"'}],
      "erasmusPriorities": ["Welche Erasmus+ Prioritäten werden adressiert"]
    }
  ]
}

WICHTIG: 3 Konzepte, die sich deutlich voneinander unterscheiden!`;
}

export function getCompareConceptsPrompt(state: ConceptState, conceptsContext: string): string {
  const isKA210 = state.actionType === 'KA210';
  const sectorLabel = getSectorLabel(state.sector);
  const ideaText = state.enhancedIdea || state.idea;
  const problemText = state.enhancedProblem || state.problem;

  return `Du bist ein strenger aber konstruktiver Evaluator für Erasmus+ Projektkonzepte im Bereich ${sectorLabel}.

RÜCKBLICK AUF DEN URSPRÜNGLICHEN BEDARF:
Projektidee: "${ideaText}"
Zielgruppe: ${state.targetGroup}
Problem: "${problemText}"
Aktionstyp: ${state.actionType}${isKA210 ? ' (Kleine Partnerschaft, Budget max 60k)' : ' (Kooperationspartnerschaft)'}
Erasmus+ Schwerpunkt/Priorität: ${state.priorityFocus || 'Kein definierter Schwerpunkt'}

ZUR BEWERTUNG VORLIEGENDE KONZEPTE:
${conceptsContext}

AUFGABE: 
Bewerte diese ${state.concepts.length} Erasmus+ Konzepte im direkten Vergleich. 
Welches Konzept hat die besten Chancen auf Förderung und löst das Problem der Zielgruppe am effizientesten im Rahmen des gewählten Aktionstyps?

Kriterien für die Bewertung:
1. Relevanz & Passung zum Problem und zur Zielgruppe
2. Innovationsgrad & Methodik
3. Realisierbarkeit (besonders hinsichtlich des ${state.actionType} Budgets)
4. Integration des definierten Erasmus+ Schwerpunkts

Antworte ZWINGEND im JSON-Format:
{
  "recommendationId": "Die exakte ID des Konzepts, das du am meisten empfiehlst",
  "overallSummary": "Eine zusammenfassende Begründung für deine Wahl in 2-3 klaren Sätzen.",
  "comparisons": [
    {
      "conceptId": "Die exakte ID des bewerteten Konzepts",
      "strengths": ["Stärke 1", "Stärke 2"],
      "weaknesses": ["Schwäche 1 (konstruktiv formuliert)", "Schwäche 2"],
      "improvementTip": "Ein konkreter, kurzer Ratschlag, wie dieses Konzept noch besser werden könnte"
    }
  ]
}`;
}

// ============================================================================
// STEP 4: OBJECTIVES PROMPTS
// ============================================================================

export function getGenerateObjectivesPrompt(state: ConceptState, sourceContext: string, selectedConcept: any): string {
  const isKA210 = state.actionType === 'KA210';
  const objectiveCount = isKA210 ? '2-3' : '3-5';
  const durationMonths = state.duration || (isKA210 ? 24 : 24);

  return `Du bist ein Erasmus+ Projektplaner${isKA210 ? ' für Kleine Partnerschaften (KA210)' : ''}.

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

PROBLEM: ${selectedConcept.problemStatement}
INNOVATION: ${selectedConcept.innovation}
AKTIONSTYP: ${state.actionType}${isKA210 ? ' (Kleine Partnerschaft)' : ' (Kooperationspartnerschaft)'}
⚠️ PROJEKTLAUFZEIT: ${durationMonths} MONATE — Alle zeitbezogenen Formulierungen in den Zielen ("bis Ende des Projekts", "innerhalb von X Monaten" etc.) MÜSSEN sich auf diese ${durationMonths} Monate beziehen!

RECHERCHE-QUELLEN:
${sourceContext}

${state.additionalInstructions ? `ZUSÄTZLICHE ANWEISUNGEN / FEHLENDE THEMEN (UNBEDINGT BEI DEN ZIELEN BERÜCKSICHTIGEN!):\n${state.additionalInstructions}\n` : ''}
AUFGABE: Definiere ${objectiveCount} SMART-Ziele für dieses Projekt.
Jedes Ziel muss:
- Specific, Measurable, Achievable, Relevant, Time-bound sein
- Konkrete Indikatoren haben (Zahlen!)
- Sich auf die Recherche-Quellen beziehen (welche Studie belegt den Bedarf)
- Einer Erasmus+ Priorität zugeordnet sein
- Zeitangaben auf die tatsächliche Projektlaufzeit (${durationMonths} Monate) abstimmen!
${isKA210 ? '- REALISTISCH für ein kleines Budget und kurze Laufzeit sein' : ''}

Antworte im JSON-Format:
{
  "objectives": [
    {
      "text": "SMART-Ziel ausformuliert",
      "indicators": ["Indikator 1 mit Zielwert", "Indikator 2 mit Zielwert"],
      "sources": ["Welche Quelle belegt den Bedarf für dieses Ziel"],
      "erasmusPriority": "Inklusion / Digitalisierung / Nachhaltigkeit / Demokratische Teilhabe"
    }
  ]
}`;
}

export function getRegenerateSingleObjectivePrompt(state: ConceptState, sourceContext: string, existingObjectivesContext: string, selectedConcept: any): string {
  return `Du bist ein Erasmus+ Projektplaner.

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}
PROBLEM: ${selectedConcept.problemStatement}
INNOVATION: ${selectedConcept.innovation}
AKTIONSTYP: ${state.actionType}

RECHERCHE-QUELLEN:
${sourceContext}

BEREITS VORHANDENE ZIELE (BITTE KEINE DUPLIKATE PRODUZIEREN):
${existingObjectivesContext || 'Keine anderen Ziele verbleibend.'}

AUFGABE: Generiere exakt EIN NEUES SMART-Ziel, das die bestehenden ergänzt und sich thematisch auf die Quellen bezieht.
Es muss Specific, Measurable, Achievable, Relevant und Time-bound sein, konkrete Indikatoren haben und einer Erasmus+ Priorität zugeordnet sein.

Antworte im JSON-Format:
{
  "objective": {
    "text": "Neues SMART-Ziel ausformuliert",
    "indicators": ["Indikator 1", "Indikator 2"],
    "sources": ["Quelle 1"],
    "erasmusPriority": "Priorität"
  }
}`;
}

// ============================================================================
// STEP 5: WORK PACKAGES PROMPTS
// ============================================================================

export function getGenerateWorkPackagesPrompt(state: ConceptState, consortiumText: string, selectedConcept: any): string {
  const isKA210 = state.actionType === 'KA210';
  const objectivesContext = state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).map((o, i) => `${i + 1}. ${o.text}`).join('\n');
  const durationMonths = state.duration || (isKA210 ? 24 : 24);

  if (isKA210) {
    return `Du bist ein Erasmus+ Projektplaner für Kleine Partnerschaften (KA210).

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

ZIELE:
${objectivesContext}

OUTPUTS:
${selectedConcept.mainOutputs.join('\n')}

KONSORTIUM:
${consortiumText}

RAHMENBEDINGUNGEN KA210:
- Budget: max. 60.000 EUR
⚠️ PROJEKTLAUFZEIT: ${durationMonths} MONATE — Alle Zeitangaben ("start"/"end") in den Aktivitäten MÜSSEN innerhalb von Monat 1 bis Monat ${durationMonths} liegen!
- KEINE formalen Work Packages, sondern direkte AKTIVITÄTEN
- Einfache, umsetzbare Struktur

WICHTIGE LOGIK-REGELN FÜR AKTIVITÄTEN:
- VERMEIDE FLASCHENHÄLSE (Bottlenecks): Aktivitäten müssen parallel oder leicht überlappend stattfinden. Wenn z.B. Aktivität 2 auf Analyse aus Aktivität 1 aufbaut, darf es keinen monatelangen Stillstand geben. Die Entwicklung muss schon parallel auf Basis von Zwischenergebnissen starten.
- TRAIN-THE-TRAINER ANSATZ: Wenn Pädagogen/Trainer in einer Aktivität ausgebildet werden, MUSS in einer darauf folgenden Aktivität explizit gemacht werden, dass diese ihr Wissen in Pilotphasen mit ihren eigenen Lernenden testen/anwenden. So schließt sich der Kreis.
- KEINE BUZZWORDS: Nutze für technische Ergebnisse konkrete Beschreibungen (z.B. "Web-Applikation mit LLM-API-Anbindung" statt "AI-based companion").

${state.additionalInstructions ? `ZUSÄTZLICHE ANWEISUNGEN / FEHLENDE THEMEN (UNBEDINGT ALS AKTIVITÄTEN/ERGEBNISSE INTEGRIEREN!):\n${state.additionalInstructions}\n` : ''}
AUFGABE: Erstelle 3-5 Projektaktivitäten für dieses KA210 Projekt.
Jede Aktivität soll:
- Einen klaren Zweck und Inhalt haben
- 2-3 konkrete Teilschritte beinhalten
- 1-2 Ergebnisse/Outputs liefern
- Einem Partner zugeordnet sein
- Einen realistischen Zeitrahmen haben (START und END Monat müssen in die Gesamtlaufzeit von ${durationMonths} Monaten passen!)

STRUKTURTREUE-REGELN (BINDEND):
- Wenn die ZUSÄTZLICHEN ANWEISUNGEN eine bestimmte Anzahl an Aktivitäten vorgeben, erstelle EXAKT diese Anzahl.
- Wenn das Konzept Lead-Zuordnungen vorgibt, übernimm diese 1:1.
- Das Akronym "${selectedConcept.acronym}" ist GESPERRT — nicht modifizieren.
- Nenne jeden Lead-Partner beim EXAKTEN Namen aus dem KONSORTIUM-Block.

⚠️ VERTEILUNG DER LAUFZEIT:
Verteile die Aktivitäten logisch über die ${durationMonths} Monate Laufzeit. Gehe NICHT automatisch von 24 Monaten aus! Die letzte Aktivität muss spätestens in Monat ${durationMonths} enden.

Antworte im JSON-Format:
{
  "workPackages": [
    {
      "number": 1,
      "title": "Titel der Aktivität",
      "type": "ACTIVITY",
      "description": "Beschreibung der Aktivität (2-3 Sätze)",
      "activities": ["Teilschritt 1", "Teilschritt 2"],
      "deliverables": ["Ergebnis 1"],
      "duration": { "start": 1, "end": ${Math.round(durationMonths / 3)} },
      "lead": "EXAKTER Name des Lead-Partners aus dem Konsortium"
    }
  ]
}

WICHTIG: Halte es einfach und realistisch für ein kleines Budget!`;
  }

  return `Du bist ein Erasmus+ Work Package Experte.

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

ZIELE:
${objectivesContext}

OUTPUTS:
${selectedConcept.mainOutputs.join('\n')}

KONSORTIUM:
${consortiumText}

⚠️ PROJEKTLAUFZEIT: ${durationMonths} MONATE — Alle Zeitangaben ("start"/"end") MÜSSEN innerhalb von Monat 1 bis Monat ${durationMonths} liegen! KEIN WP darf über Monat ${durationMonths} hinausgehen!

WICHTIGE LOGIK-REGELN FÜR WORK PACKAGES:
- VERMEIDE FLASCHENHÄLSE (Bottlenecks): Work Packages müssen parallel oder leicht überlappend stattfinden. Wenn z.B. WP2 auf der Analyse aus WP3 aufbaut, darf es keinen monatelangen Stillstand geben. Die Entwicklung muss schon parallel auf Basis von Zwischenergebnissen starten. (z.B. Needs Analysis D2.1 darf nicht den Rest des Projekts aufhalten!).
- TRAIN-THE-TRAINER ANSATZ: Wenn Pädagogen/Trainer in einem WP ausgebildet werden, MUSS in einem darauf folgenden WP explizit gemacht werden, dass diese ihr Wissen in Pilotphasen mit ihren eigenen Lernenden testen/anwenden. So schließt sich der Kreis und der Impact multipliziert sich.
- KEINE BUZZWORDS: Nutze für technische Ergebnisse konkrete Beschreibungen (z.B. "Web-Applikation mit LLM-API-Anbindung" statt "AI-based companion").

${state.additionalInstructions ? `ZUSÄTZLICHE ANWEISUNGEN / FEHLENDE THEMEN (UNBEDINGT IN DIE WORK PACKAGES INTEGRIEREN!):\n${state.additionalInstructions}\n` : ''}
AUFGABE: Erstelle eine logische WP-Struktur (4-5 Work Packages + WP1 Management).
Jedes WP soll:
- Einen klaren Zweck haben
- 2-3 konkrete Aktivitäten beinhalten
- 2-3 Deliverables haben
- Einem Konsortium-Partner zugeordnet sein
- Einen realistischen Zeitrahmen haben (START und END Monat müssen in die Laufzeit von ${durationMonths} Monaten passen!)

═══════════════════════════════════════════════════════════════════
STRUKTURTREUE-REGELN (BINDEND)
═══════════════════════════════════════════════════════════════════

1. WP-STRUKTUR-LOCK:
   - Wenn die ZUSÄTZLICHEN ANWEISUNGEN oder das Konzept eine bestimmte Anzahl an WPs vorgeben (z.B. "3 WPs" oder "WP1, WP2, WP3"), dann erstelle EXAKT diese Anzahl. NICHT mehr, NICHT weniger.
   - Wenn das Konzept WP-Titel oder WP-Leads vorgibt, übernimm diese 1:1.
   - Du darfst die vorgegebene WP-Struktur NICHT "verbessern" oder "erweitern".

2. WP-LEAD-KONSISTENZ:
   - JEDES WP muss GENAU EINEM Lead-Partner zugewiesen sein.
   - Nenne den Lead-Partner beim EXAKTEN Namen/Kürzel aus dem KONSORTIUM-Block.
   - Der Lead muss in der GESAMTEN Beschreibung des WP konsistent bleiben.
   - Wenn das Konzept vorgibt, wer welches WP leitet, übernimm das 1:1.

3. AKRONYM-LOCK:
   - Das Projektakronym "${selectedConcept.acronym}" ist GESPERRT.
   - Verwende es EXAKT so — NICHT modifizieren, ergänzen oder abkürzen.
   - Schreibe NICHT "${selectedConcept.acronym} AI" oder "${selectedConcept.acronym}+" o.ä.
═══════════════════════════════════════════════════════════════════

⚠️ VERTEILUNG DER LAUFZEIT:
Verteile die Aktivitäten logisch über die ${durationMonths} Monate. Gehe NICHT automatisch von 24 Monaten aus! Das letzte WP (Dissemination) muss im Monat ${durationMonths} enden.

Antworte im JSON-Format:
{
  "workPackages": [
    {
      "number": 1,
      "title": "Project Management & Quality Assurance",
      "type": "MANAGEMENT",
      "description": "Beschreibung des WP (3-4 Sätze)",
      "activities": ["Aktivität 1", "Aktivität 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "duration": { "start": 1, "end": ${durationMonths} },
      "lead": "EXAKTER Name des Lead-Partners aus dem Konsortium"
    }
  ]
}

Stelle sicher dass WP1 immer Management ist und das letzte WP Dissemination.`;
}

// ============================================================================
// STEP 6: DETAILED CONCEPT / SUMMARY PROMPT
// ============================================================================

export function getGenerateDetailedConceptPrompt(
  state: ConceptState,
  consortiumText: string,
  sourceContext: string,
  objectivesText: string,
  wpText: string,
  selectedConcept: any
): string {
  const sectorLabel = getSectorLabel(state.sector);

  return `Du bist ein hochqualifizierter Erasmus+ Förderantrags-Autor. Entwickle einen überzeugenden, in sich konsistenten und detaillierten Konzeptentwurf (2-3 Seiten Fließtext und strukturierte Absätze) in Markdown-Format.

PROJEKT: "${selectedConcept.title}" (${selectedConcept.acronym})
SEKTOR: ${sectorLabel}
AKTIONSTYP: ${state.actionType}
INNOVATION: ${selectedConcept.innovation}

ZIELE: 
${objectivesText}

KONSORTIUM (WARUM WIR DIE RICHTIGEN SIND):
${consortiumText}

FORSCHUNGSERGEBNISSE (DER BEDARF):
${sourceContext}

STRUKTUR/ARBEITSPAKETE:
${wpText}

WEITERE ANWEISUNGEN / SCHWERPUNKTE (falls vorhanden):
${state.additionalInstructions ? state.additionalInstructions : 'Keine besonderen Zusatzanweisungen.'}

AUFGABE:
Schreibe einen detaillierten Konzeptentwurf, der als Grundlage für den späteren EU-Förderantrag dient. Das Dokument muss professionell strukturiert sein und folgende Abschnitte enthalten:

# 1. Relevanz & Bedarf (Needs Analysis)
Verwende hier konkrete Bezugnahmen auf die Forschungsergebnisse/Studien, um den dringenden Bedarf zu untermauern. Warum ist dieses Projekt JETZT nötig?

# 2. Ansatz & Innovation (Proposed Solution)
Wie löst das Projekt das Problem? Was ist der innovative Kern?

# 3. Konsortium & Partnerschaft
Beschreibe kurz die komplementäre Expertise der Partner. Warum bilden gerade diese Organisationen das perfekte Team für dieses Projekt? (Greife die Expertise aus dem Prompt auf).

# 4. Methodik & Arbeitsplan
Fasse die geplante Umsetzung (Aktivitäten/Work Packages) verständlich zusammen. Wie greifen die Bausteine ineinander?

# 5. Erwartete Wirkung (Impact)
Welche nachhaltigen Veränderungen werden bei den Zielgruppen erreicht, auch über die Projektlaufzeit hinaus?

WICHTIGE LOGIK- UND WORTWAHL-REGELN (ÜBERALL ANWENDEN):
- INKLUSIVES WORDING: Nutze "Europa" oder "europäisch" anstelle von "EU", da bei Erasmus+ auch Assoziierte Nicht-EU-Länder (z.B. Westbalkan/Serbien) gleichberechtigt beteiligt sind.
- KEINE BUZZWORDS: Ersetze leere Begriffe wie "AI-based learning companion" durch konkrete, machbare technische Ansätze (z.B. "Web-basierte Applikation mit Anbindung an existierende LLM-APIs").
- KEINE FLASCHENHÄLSE (Bottlenecks): Mache deutlich, dass Work Packages überlappend und agil stattfinden ("Development starts based on preliminary analysis findings...").
- TRAIN-THE-TRAINER: Wenn Pädagogen ausgebildet werden, mache explizit deutlich, dass sie diese Tools in Pilottests mit IHREN Lernenden erproben. Der logische Klebstoff dazwischen muss im Konzept deutlich werden.

═══════════════════════════════════════════════════════════════════
STRUKTURTREUE-REGELN (BINDEND — Verletzung = Disqualifikation)
═══════════════════════════════════════════════════════════════════

1. WP-STRUKTUR-LOCK:
   - Die oben definierten Work Packages sind BINDEND. Übernimm EXAKT die Anzahl, Titel und Reihenfolge der WPs aus "STRUKTUR/ARBEITSPAKETE".
   - KEINE WPs hinzufügen, entfernen oder umbenennen.
   - Wenn 3 WPs definiert sind, schreibe über GENAU 3 WPs. Nicht 5, nicht 4.

2. WP-LEAD-KONSISTENZ:
   - Jeder WP-Lead muss in JEDER Erwähnung im gesamten Dokument identisch sein.
   - Wenn in den WP-Daten steht "Lead: Ekologija", dann darf NIRGENDS im Text stehen, dass ein anderer Partner dieses WP leitet.
   - VOR dem Fertigstellen: Scanne jeden Abschnitt und prüfe, ob WP-Lead-Zuordnungen konsistent sind.

3. AKRONYM-LOCK:
   - Das Akronym "${selectedConcept.acronym}" ist GESPERRT. Verwende es EXAKT so.
   - NICHT modifizieren (kein "${selectedConcept.acronym} AI", kein "${selectedConcept.acronym}+" etc.).

4. PRIORITÄTEN-TREUE:
   - ALLE Erasmus+ Prioritäten aus dem Konzept müssen im Dokument erscheinen.
   - KEINE Priorität weglassen oder durch andere ersetzen.

5. PARTNER-COMMITMENTS BEIBEHALTEN:
   - Wenn im Konzept oder in den Zusatzanweisungen KONKRETE Verpflichtungen einzelner Partner stehen
     (z.B. "Partner X übernimmt Hosting-Kosten für 2 Jahre nach Projektende"),
     dann MÜSSEN diese exakt so übernommen werden.
   - Ersetze sie NICHT durch generische Formulierungen (z.B. "Ergebnisse werden für mindestens 5 Jahre gehostet").

6. BUDGET-MATHEMATIK (Sanity Check):
   - Wenn Budgetprozente für WPs genannt werden: Sie MÜSSEN exakt 100% ergeben.
   - Wenn absolute EUR-Beträge für WPs genannt werden: Sie MÜSSEN exakt die Antragssumme ergeben.
   - JEDER Prozentsatz muss zu seinem EUR-Betrag passen (X% von Gesamtbudget = Y EUR).
   - VOR dem Fertigstellen: Rechne die Summen nach. Wenn sie nicht stimmen, korrigiere sie.
═══════════════════════════════════════════════════════════════════

REGELN FÜR DIE AUSGABE:
- Ausschließlich Markdown (kein JSON!)
- Keine Einleitungen wie "Hier ist dein Konzept:"
- Fachlich fundierte und überzeugende Sprache
- Mindestens 800-1000 Wörter (2-3 Seiten).
- Beziehe explizit die mitgelieferten Studienerkenntnisse (Daten/Zitate) und die Spezifika der Partner ein.`;
}
