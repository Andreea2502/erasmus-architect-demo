# Handbuch: Architektur & Datenfluss im "Erasmus Architect"

Dieses Handbuch dokumentiert die interne Struktur, die Funktionsweise und den Datenfluss der **Erasmus Architect** Applikation. Es richtet sich an Entwickler, die den bestehenden Code warten, überarbeiten oder neu schreiben möchten.

---

## 1. Übersicht der Kernmodule

Die Applikation besteht aus drei wesentlichen Kernmodulen, die aufeinander aufbauen, aber derzeit als separate Komponenten existieren:

1. **Concept Developer (`src/components/concept/ConceptDeveloper.tsx`)**:
   Das "Vor-Modul", um aus einer losen Idee, Forschungsdaten und einem Zielgruppen-Fokus ein strukturiertes Projektkonzept (Zusammenfassung, SMART-Ziele, grobe Struktur) zu entwickeln.
2. **Project Generator (`src/components/pipeline/ProjectPipeline.tsx` & `src/lib/project-pipeline.ts`)**:
   Das Hauptmodul, in dem das finale Antragskonzept in einen vollständigen EU-Antrag umgeschrieben wird (Ausfüllen der offiziellen Antragsfragen).
3. **Project Evaluator (`src/app/api/evaluate-project` & `src/app/api/evaluate-question`)**:
   Das Qualitätskontroll-Modul, das den generierten oder manuell verfassten Antrag gegen die offiziellen Wertungskriterien der EU-Kommission prüft (Relevanz, Qualität der Projektkonzeption, Qualität der Partnerschaft, Wirkung).

Dazu kommen Unterstützungs-Module:
- **Partner Management (`src/app/partners/...`)**: Verwaltung der Konsortialpartner.
- **Wissensdatenbank (`src/lib/rag-system.ts` & `src/components/knowledge/...`)**: Dokumenten-Upload und RAG (Retrieval-Augmented Generation) zur Recherche.

---

## 2. Der Concept Developer (Der Startpunkt)

Der Concept Developer arbeitet in einem linearen, 6-stufigen *Flow*:

### 2.1 Schritt 1: Idee & Research
Nutzer geben ihre Grundidee, Zielgruppe und das Problem ein. Die App formuliert automatisiert *"Research-Prompts"*. Mit diesen können externe KI-Tools (wie Perplexity) nach Fakten, Zahlen und Best-Practices durchsucht werden.

### 2.2 Schritt 2: Quellen & Konzepte
Die Research-Ergebnisse werden als "Quellen" eingefügt.
Ein API-Call führt diese Quellen zusammen und generiert **3 verschiedene Konzept-Ansätze**.
- Die Generierung nutzt das Objekt `state.additionalInstructions` als **globalen Parameter**, durch den der Nutzer spezifische Schwerpunkte (z.B. "Inklusion") für alle KI-Generierungen erzwingen kann.

### 2.3 Schritt 3: Konsortium
Hier wählt der Nutzer aus der globalen Partner-Datenbank (siehe Partner Management) die passenden Organisationen für das Projekt aus und weist ihnen Rollen (Partner / Koordinator) zu.

### 2.4 Schritt 4: SMART-Ziele
Die KI erhält:
- Das gewählte Konzept
- Die Research-Quellen
- Die *Additional Instructions*
**Ergebnis:** 3-5 messbare Projektziele ("SMART-Ziele").

### 2.5 Schritt 5: Work Packages (WP) / Aktivitäten (KA210)
**Dieses Modul unterscheidet streng zwischen den EU-Aktionstypen:**
- **KA210 (Small-scale):** Generiert eine einfache Liste von schrittweisen *Aktivitäten* (Keine formellen WPs, Budget max. 60k).
- **KA220 (Cooperation Partnerships):** Generiert formelle *Work Packages* (WP1 ist zwingend Management & QA, die letzten WPs Dissemination). 
Die WPs werden hier generiert – sie verknüpfen automatisch die vorher gewählten **Ziele** und die **Partner** (als Lead der WPs).

### 2.6 Schritt 6: Zusammenfassung (Rohentwurf)
Die KI nimmt alle gewählten Bausteine (Konzept, Ziele, WPs, Partner) und gießt sie in ein langes, zusammenhängendes Dokument. Über ein iFrame wird dieses als sauberes PDF gedruckt (`exportToPDF`).

---

## 3. Der Project Generator / Antrags-Generator

Der Generator (`src/lib/project-pipeline.ts`) wandelt den "Rohentwurf" (Konzept) in den eigentlichen, ausführlichen EU-Antrag um. Das System basiert auf der Beantwortung spezifischer **EU-Antragsfragen** geordnet nach Kapiteln (Context, Participating Organizations, Work Packages).

### 3.1 Wie Partner integriert werden
- Die Partnerdaten (inklusive Hintergrund, Expertise, OID, Kontaktpersonen) werden in der lokalen Datenbank (oder Supabase) gespeichert. 
- Wenn Kapitel 2 ("Participating Organizations") generiert wird, iteriert der Generator über **jeden einzelnen Partner** im Projekt.
- Er übergibt der KI das vollständige *Partner-Profil* (Zusammenfassung, Expertise) UND den *Draft des Konzepts*. So schreibt die KI für jeden Partner einen hochspezifischen Text, warum genau dieser Partner wichtig für das konkrete Projekt ist.

### 3.2 Wie Work Packages (WPs) in den richtigen Code fließen
Das komplexeste Element ist das Kapitel "Work Packages" (Kapitel 3/4).
- In `project-pipeline.ts` gibt es die Funktion `generateWorkPackage(state, index)`.
- **WP1 (Projektmanagement)** bekommt einen komplett eignen Prompt. Es werden klassische PM-Fragen gestellt (Wie sichern Sie Qualität? Wie regeln Sie den Zeitplan?).
- **WP2+ (Projektumsetzung)** bekommen einen anderen Prompt. Hier werden die inhaltlichen Ergebnisse (Intellectual Outputs) und Aktivitäten abgefragt.

### 3.3 Wenn der Generator den Code schreibt
Der Generator speichert für jede abgefragte "Frage" (Question) ein Ergebnis in den Status `projectForm`. Dies wird dann im UI (`ProjectPipeline.tsx`) durch den Nutzer geprüft. Über Buttons ("Improve with AI") können einzelne Sätze/Absätze markiert und dynamisch umgeschrieben werden.

---

## 4. Der Evaluator (Qualitätsprüfung)

Der Evaluator (`src/app/api/evaluate-project/route.ts` & `evaluate-question/route.ts`) ist das Herzstück zur Sicherung der Projektqualität.

- Sobald der Antrag geschrieben ist, kann der Evaluator gestartet werden.
- Er nimmt die generierten Antworten aus dem `Project Generator` und prüft sie gegen die **offiziellen Award Criteria** des Erasmus-Handbuchs (Relevance, Quality of Design, Quality of Partnership, Impact).
- Für jede Kategorie werden Punkte berechnet (z.B. 24/30). Wenn die Gesamtpunktzahl unter 60 liegt (Abbruchkriterium der EU), empfiehlt er tiefgreifende Änderungen.
- Die KI listet dann Stärken, Schwächen und konkrete Überarbeitungsvorschläge auf.

---

## 5. Tipps für ein Rewrite / Refactoring

Wenn der Code im Konzeptentwickler neu geschrieben werden soll, beachte folgende "Fallen" und Verbindungen:

1. **Abhängige Daten (Data Lineage)**: 
   Work Packages bauen *immer* auf den Zielen auf. Die Ziele bauen *immer* auf den Studien auf. Generiere nie ein "isolierte" WPs ohne der KI die zuvor festgelegten Ziele und Partner mitzugeben.
2. **Zusatzanweisungen (Additional Instructions)**:
   Dieser String muss tief ins System gereicht werden. Er muss bei der Konzept-Prompting, WP-Prompting und Ziele-Prompting immer per String-Interpolation angehängt werden, da das Konzept sonst inkonsistent wird.
3. **KA210 vs. KA220 Logik**:
   Das System verzweigt sehr oft je nach EU-Art. KA210 Projekte haben *keine* strukturierten WPs, sondern einfache Aktivitäten. Die Prompts müssen hierfür komplett unterschiedlich sein.

---

*Dieses Handbuch dient als Leitfaden. Der vollständige Quellcode und die Prompts befinden sich in den jeweiligen Dateien unter `src/components/...` und `src/lib/...`.*
