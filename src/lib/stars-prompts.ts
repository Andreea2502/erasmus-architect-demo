/**
 * STARS EXPOSE PROMPTS
 * ====================
 * AI prompt functions for the STARS Expose mode.
 * Each function takes state/context parameters and returns a prompt string.
 *
 * Follows the 6-section STARS document structure:
 *   Section 1: Project Identification (metadata table)
 *   Section 2: Project Partnership (narrative + partner table)
 *   Section 3: Project Summary (Challenge -> Opportunity -> Response)
 *   Section 4: Project Goals (with rationale)
 *   Section 5: Target Groups (4-level hierarchy)
 *   Section 6: Methodological Approach (named principles)
 *
 * CRITICAL RULES applied across all prompts:
 * - Use "Europe" / "European" instead of "EU" (inclusive of associated non-EU countries)
 * - No buzzwords or hollow phrases -- be concrete and specific
 * - No "raise awareness" -- specify concrete mechanisms instead
 * - Professional, essay-like academic tone
 * - Data and statistics from sources must be cited with author, title, year
 */

// ============================================================================
// ANTI-BUZZWORD BLOCK (injected into every prompt)
// ============================================================================

const ANTI_BUZZWORD_RULES = `
LANGUAGE AND QUALITY RULES (apply to EVERY sentence you write):
- Use "Europe" or "European" instead of "EU" everywhere. Erasmus+ includes associated non-EU countries (Serbia, Turkey, North Macedonia, etc.), so "EU" is exclusionary and inaccurate.
- NEVER use the phrase "raise awareness." Instead, describe the concrete mechanism: "train 40 youth workers in digital facilitation techniques" or "publish an open-access diagnostic toolkit tested by 200 practitioners."
- NEVER use hollow buzzwords or filler phrases. The following are BANNED:
    "innovative approaches", "best practices", "state of the art", "cutting edge",
    "foster networking", "promote dialogue", "various activities", "significant impact",
    "sustainable effects", "modern methods", "it is well known that", "nowadays",
    "in today's world", "many people", "the general public", "all interested parties",
    "competent team", "highest standards", "positive development", "close cooperation"
- Every claim must be backed by a CONCRETE mechanism, number, or source reference.
- Write in professional, essay-like academic prose. No marketing language.
- When citing data, always include: author/institution, report title, and year.
- When research sources are provided, you MUST actively reference them in your text. Cite them by their title and key findings. Do NOT ignore uploaded research sources — they are the evidentiary backbone of the proposal.
`.trim();

// ============================================================================
// PARTNERSHIP FACTS BLOCK (injected into every section-generating prompt)
// ============================================================================

/**
 * Builds a strict factual context block about the partnership.
 * Injected into every prompt so the AI NEVER hallucinates countries, languages, or partner counts.
 */
export function buildPartnershipFactsBlock(
  partnerDetails: { name: string; country: string; city?: string; role: string; type: string; languages?: string[] }[],
  budget: number,
  duration: number,
  actionType: string
): string {
  if (partnerDetails.length === 0) return '';

  const partnerCount = partnerDetails.length;
  const countries = [...new Set(partnerDetails.map(p => p.country))];
  const countryCount = countries.length;
  const countryList = countries.join(', ');

  // Derive languages from countries (common mapping for Erasmus+ contexts)
  const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    'Österreich': 'German', 'Austria': 'German', 'AT': 'German',
    'Deutschland': 'German', 'Germany': 'German', 'DE': 'German',
    'Rumänien': 'Romanian', 'Romania': 'Romanian', 'RO': 'Romanian',
    'Serbien': 'Serbian', 'Serbia': 'Serbian', 'RS': 'Serbian', 'SRB': 'Serbian',
    'Italien': 'Italian', 'Italy': 'Italian', 'IT': 'Italian',
    'Frankreich': 'French', 'France': 'French', 'FR': 'French',
    'Spanien': 'Spanish', 'Spain': 'Spanish', 'ES': 'Spanish',
    'Portugal': 'Portuguese', 'PT': 'Portuguese',
    'Griechenland': 'Greek', 'Greece': 'Greek', 'GR': 'Greek',
    'Türkei': 'Turkish', 'Turkey': 'Turkish', 'Türkiye': 'Turkish', 'TR': 'Turkish',
    'Nordmazedonien': 'Macedonian', 'North Macedonia': 'Macedonian', 'MK': 'Macedonian',
    'Bulgarien': 'Bulgarian', 'Bulgaria': 'Bulgarian', 'BG': 'Bulgarian',
    'Kroatien': 'Croatian', 'Croatia': 'Croatian', 'HR': 'Croatian',
    'Slowenien': 'Slovenian', 'Slovenia': 'Slovenian', 'SI': 'Slovenian',
    'Polen': 'Polish', 'Poland': 'Polish', 'PL': 'Polish',
    'Tschechien': 'Czech', 'Czech Republic': 'Czech', 'Czechia': 'Czech', 'CZ': 'Czech',
    'Ungarn': 'Hungarian', 'Hungary': 'Hungarian', 'HU': 'Hungarian',
    'Niederlande': 'Dutch', 'Netherlands': 'Dutch', 'NL': 'Dutch',
    'Belgien': 'Dutch/French', 'Belgium': 'Dutch/French', 'BE': 'Dutch/French',
    'Schweden': 'Swedish', 'Sweden': 'Swedish', 'SE': 'Swedish',
    'Finnland': 'Finnish', 'Finland': 'Finnish', 'FI': 'Finnish',
    'Dänemark': 'Danish', 'Denmark': 'Danish', 'DK': 'Danish',
    'Norwegen': 'Norwegian', 'Norway': 'Norwegian', 'NO': 'Norwegian',
    'Irland': 'English', 'Ireland': 'English', 'IE': 'English',
    'Estland': 'Estonian', 'Estonia': 'Estonian', 'EE': 'Estonian',
    'Lettland': 'Latvian', 'Latvia': 'Latvian', 'LV': 'Latvian',
    'Litauen': 'Lithuanian', 'Lithuania': 'Lithuanian', 'LT': 'Lithuanian',
    'Zypern': 'Greek', 'Cyprus': 'Greek', 'CY': 'Greek',
    'Malta': 'Maltese/English', 'MT': 'Maltese/English',
    'Luxemburg': 'French/German', 'Luxembourg': 'French/German', 'LU': 'French/German',
    'Slowakei': 'Slovak', 'Slovakia': 'Slovak', 'SK': 'Slovak',
    'Island': 'Icelandic', 'Iceland': 'Icelandic', 'IS': 'Icelandic',
    'Liechtenstein': 'German', 'LI': 'German',
    'Albanien': 'Albanian', 'Albania': 'Albanian', 'AL': 'Albanian',
    'Bosnien und Herzegowina': 'Bosnian', 'Bosnia and Herzegovina': 'Bosnian', 'BA': 'Bosnian',
    'Montenegro': 'Montenegrin', 'ME': 'Montenegrin',
    'Kosovo': 'Albanian/Serbian', 'XK': 'Albanian/Serbian',
    'Moldau': 'Romanian', 'Moldova': 'Romanian', 'MD': 'Romanian',
    'Ukraine': 'Ukrainian', 'UA': 'Ukrainian',
    'Georgien': 'Georgian', 'Georgia': 'Georgian', 'GE': 'Georgian',
    'Armenien': 'Armenian', 'Armenia': 'Armenian', 'AM': 'Armenian',
  };

  const partnerLanguages = [...new Set(
    countries
      .map(c => COUNTRY_LANGUAGE_MAP[c])
      .filter(Boolean)
      .flatMap(l => l!.includes('/') ? l!.split('/') : [l!])
  )];
  const languagesWithEnglish = ['English', ...partnerLanguages.filter(l => l !== 'English')];

  const partnerListStr = partnerDetails.map(p =>
    `  - ${p.role}: ${p.name} (${p.country}${p.city ? ', ' + p.city : ''}) [${p.type}]`
  ).join('\n');

  const isKA210 = actionType === 'KA210';

  // Calculate realistic participant numbers based on budget and partner count
  const maxDirectParticipants = isKA210
    ? Math.min(partnerCount * 15, 50)
    : Math.min(partnerCount * 25, 150);
  const participantsPerCountry = Math.round(maxDirectParticipants / countryCount);

  return `
═══════════════════════════════════════════════════════════════════
MANDATORY PARTNERSHIP FACTS — BINDING FOR ALL CONTENT GENERATION
═══════════════════════════════════════════════════════════════════

CONSORTIUM:
  Partners: ${partnerCount} organizations from ${countryCount} countries
  Countries: ${countryList}
${partnerListStr}

PROJECT PARAMETERS:
  Budget: ${budget.toLocaleString()} EUR
  Duration: ${duration} months
  Action Type: ${actionType}${isKA210 ? ' (Small-Scale Partnership)' : ' (Cooperation Partnership)'}

PARTNER LANGUAGES: ${languagesWithEnglish.join(', ')}
(These are the ONLY languages that should be referenced for translations, localizations, or multilingual outputs.)

REALISTIC SCALE (given ${budget.toLocaleString()} EUR budget):
  Max direct participants (training/workshops): ~${maxDirectParticipants} (approx. ${participantsPerCountry} per country)
  Events: Local/national events only. NO "European conference" unless budget > 250,000 EUR.
  ${isKA210 ? 'Multiplier events: 1 small event per partner country (30-50 local participants each).' : 'Multiplier events: 1 event per partner country (50-80 participants each).'}

═══════════════════════════════════════════════════════════════════
ABSOLUTE ANTI-HALLUCINATION RULES (violation = immediate disqualification)
═══════════════════════════════════════════════════════════════════

1. COUNTRIES: You may ONLY reference these ${countryCount} partner countries: ${countryList}.
   NEVER mention any other country by name (no Germany, Italy, Finland, etc. unless they are listed above).
   When writing "across X countries," X must ALWAYS equal ${countryCount}.

2. LANGUAGES: Translations and multilingual outputs MUST be in: ${languagesWithEnglish.join(', ')}.
   NEVER suggest translations into languages not spoken in the partner countries.

3. NUMBERS: Every number you write (participants, beneficiaries, outputs) must be:
   - Consistent across ALL sections of the document
   - Realistic for a ${budget.toLocaleString()} EUR, ${duration}-month project with ${partnerCount} partners
   - The same number used in goals, target groups, methodology, and response sections
   ${isKA210 ? '- For KA210: Keep numbers small and achievable. 15-20 direct participants per country is ambitious enough.' : ''}

4. ORGANIZATIONS: Only reference the ${partnerCount} consortium organizations listed above.
   NEVER invent or add organizations not in the partnership.

5. EVENTS: Scale events to the budget.
   - ${budget.toLocaleString()} EUR does NOT fund a "European conference with 150 participants."
   - Use "local dissemination events" or "multiplier events in each partner country" instead.
   - Total event participants across all events: max ${isKA210 ? '100-150' : '200-400'} people.

6. CROSS-REFERENCE CHECK: Before finalizing your output, verify that:
   - Every country name appears in the partner list above
   - Every number is consistent with what you stated elsewhere
   - Every language corresponds to a partner country
   - No event exceeds what the budget can realistically fund
═══════════════════════════════════════════════════════════════════
`.trim();
}

// ============================================================================
// SELECTED CONCEPT CONTEXT BLOCK (injected into Step 3-4 prompts)
// ============================================================================

/**
 * Builds a binding context block from the user-selected concept proposal.
 * Ensures all downstream generation (Challenge → Opportunity → Response → Goals → etc.)
 * stays aligned with the chosen concept direction.
 */
export function buildSelectedConceptBlock(concept: {
  title: string;
  acronym: string;
  summary: string;
  approach: string;
  innovation: string;
  mainOutputs: string[];
} | null): string {
  if (!concept) return '';

  return `
═══════════════════════════════════════════════════════════════════
SELECTED CONCEPT DIRECTION — ALL CONTENT MUST ALIGN WITH THIS
═══════════════════════════════════════════════════════════════════

PROJECT: ${concept.acronym} — ${concept.title}

STRATEGIC APPROACH:
${concept.approach}

INNOVATION / UNIQUE ELEMENT:
${concept.innovation}

SUMMARY:
${concept.summary}

MAIN PROJECT OUTPUTS:
${concept.mainOutputs.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}

═══════════════════════════════════════════════════════════════════
CONCEPT ALIGNMENT RULES:
- ALL content you generate MUST serve this specific concept direction.
- The challenge narrative must frame the problem so it naturally calls for THIS approach.
- The opportunity must point toward THIS type of intervention.
- Goals, target groups, and methodology must align with THIS concept's outputs and strategy.
- Do NOT drift into a generic version of the project idea. Stay focused on the selected concept.
- When describing what the project DOES, reference the main outputs listed above.
═══════════════════════════════════════════════════════════════════
`.trim();
}

// ============================================================================
// 0. STARS CONCEPT PROPOSALS PROMPT (3 alternatives)
// ============================================================================

/**
 * Generates 3 distinct STARS concept proposals.
 * Each includes: title, acronym, summary, approach, innovation, outputs, EU policy alignment.
 * Output: JSON with concepts array.
 */
export function getStarsConceptProposalsPrompt(
  idea: string,
  enhancedIdea: string,
  problem: string,
  enhancedProblem: string,
  targetGroup: string,
  sector: string,
  actionType: string,
  priorityFocus: string,
  duration: number,
  budget: number,
  sourceContext: string,
  additionalInstructions?: string,
  partnershipFacts?: string
): string {
  const isKA210 = actionType === 'KA210';
  const ideaText = enhancedIdea || idea;
  const problemText = enhancedProblem || problem;

  return `You are a senior Erasmus+ project designer developing 3 distinct concept proposals for a STARS-format Expose.

${partnershipFacts || ''}

PROJECT IDEA:
"${ideaText}"

PROBLEM STATEMENT:
"${problemText}"

TARGET GROUP: ${targetGroup}
SECTOR: ${sector}
ACTION TYPE: ${actionType}${isKA210 ? ' (Small-Scale Partnership, max 60k EUR)' : ' (Cooperation Partnership)'}
PRIORITY FOCUS: ${priorityFocus}
DURATION: ${duration} months
BUDGET: ${budget.toLocaleString()} EUR

RESEARCH EVIDENCE AND SOURCES:
${sourceContext || '(no research sources uploaded yet)'}

${additionalInstructions ? `ADDITIONAL USER INSTRUCTIONS:\n${additionalInstructions}\n` : ''}

TASK: Generate exactly 3 DIFFERENT concept proposals, each representing a distinct strategic approach to the same problem. The concepts must differ substantially in:
- Their core intervention model (e.g., Concept A: toolkit-based, Concept B: training cascade, Concept C: community of practice)
- Their innovative element
- Their primary outputs and deliverables
- Their emphasis within the problem space

FOR EACH CONCEPT, PROVIDE:

1. "title": A professional English project title (8-12 words). The title must:
   - Clearly communicate the project's purpose
   - Be suitable for an official Erasmus+ application
   - NOT start with generic words like "Innovative" or "Enhancing"

2. "acronym": A creative, memorable English acronym (4-8 letters). The acronym must:
   - Be pronounceable as a word (like STARS, BRIDGES, COMPASS)
   - Relate meaningfully to the project's content
   - Have each letter map to a word from the title or theme (explain the mapping in parentheses)

3. "summary": A 3-5 sentence summary describing:
   - What the project does (concrete actions)
   - Who benefits directly
   - What makes it different from existing approaches
   - What the expected impact is

4. "approach": A 2-3 sentence description of the core intervention strategy. What methodology will the project use? What is the "theory of change" — the causal chain from activity to impact?

5. "innovation": A 2-3 sentence description of what is genuinely new or different about this concept. Reference what already exists and explain how this concept goes beyond it.

6. "mainOutputs": An array of 3-5 concrete project outputs/deliverables. Each must be a tangible, verifiable item (e.g., "Open-access digital toolkit with 15 ready-to-use workshop modules", NOT "innovative resources").

7. "euPolicyAlignment": An array of 2-4 EU policy area IDs from this list:
   DIGITAL_TRANSFORMATION, SOCIAL_ECONOMY, CIVIL_SOCIETY_RESILIENCE, INCLUSION_DIVERSITY, GREEN_TRANSITION, EUROPEAN_EDUCATION_AREA, DIGITAL_EDUCATION_ACTION_PLAN, SKILLS_AGENDA, YOUTH_STRATEGY, DEMOCRATIC_PARTICIPATION
   Select only those that genuinely align with the concept.

DIFFERENTIATION RULES:
- Concept 1: Focus on CAPACITY BUILDING — the primary mechanism is training, upskilling, or competence development.
- Concept 2: Focus on TOOL/RESOURCE CREATION — the primary mechanism is developing a tangible product (toolkit, platform, curriculum, framework) that can be used after the project.
- Concept 3: Focus on SYSTEMIC CHANGE — the primary mechanism is building networks, policy recommendations, or institutional change processes.
- Each concept must be independently viable and complete — not a subset of another.
${isKA210 ? '- Keep all concepts realistic for a small budget (max 60k EUR) and short timeline.' : ''}

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Respond ONLY with valid JSON:
{
  "concepts": [
    {
      "title": "...",
      "acronym": "... (Letter-by-letter expansion)",
      "summary": "...",
      "approach": "...",
      "innovation": "...",
      "mainOutputs": ["Output 1", "Output 2", "Output 3"],
      "euPolicyAlignment": ["POLICY_ID_1", "POLICY_ID_2"]
    }
  ]
}

No additional text outside the JSON.`;
}

// ============================================================================
// 1. PARTNERSHIP NARRATIVE PROMPT
// ============================================================================

/**
 * Generates a 150-200 word strategic partnership narrative.
 * Explains WHY this specific combination of organizations works together.
 * Output: plain text (no JSON, no Markdown headers).
 */
export function getPartnershipNarrativePrompt(
  projectIdea: string,
  partnersDetail: string,
  actionType: string,
  sector: string,
  partnershipFacts?: string,
  sourceContext?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ proposal writer specializing in ${sector} projects.

${partnershipFacts || ''}

${conceptContext || ''}

RESEARCH EVIDENCE AND SOURCES:
${sourceContext || '(no research sources uploaded yet)'}

PROJECT IDEA:
"${projectIdea}"

ACTION TYPE: ${actionType}${actionType === 'KA210' ? ' (Small-Scale Partnership)' : ' (Cooperation Partnership)'}

CONSORTIUM PARTNERS:
${partnersDetail}

TASK: Write a strategic partnership narrative of 150-200 words that tells the STORY of why this specific consortium exists.

REQUIREMENTS:
- Do NOT list partners one by one. Instead, weave a narrative about complementary strengths.
- Explain the strategic logic: Who brings what, and why the combination is greater than the sum of its parts.
- Cover three dimensions: complementary expertise, geographic coverage across European regions, and shared vision for the project theme.
- If the consortium mixes organization types (university + NGO + SME), explain the "Tech + Touch" synergy: one side brings methodology and research rigor, the other brings direct access to beneficiaries and contextual knowledge.
- Use concrete details from the partner descriptions -- do not invent capabilities.
- The narrative should read like a compelling paragraph from a successful grant proposal, not a bulleted list.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Plain text, 150-200 words, one or two flowing paragraphs. No headers, no bullet points, no JSON.`;
}

// ============================================================================
// 2. CHALLENGE NARRATIVE PROMPT (Section 3.1)
// ============================================================================

/**
 * Generates Section 3.1 "The Challenge" -- a deep narrative essay (400-600 words).
 * Must start with a concrete human scenario. Uses data points from research.
 * Output: Markdown text.
 */
export function getChallengeNarrativePrompt(
  problem: string,
  targetGroup: string,
  sector: string,
  sourceContext: string,
  actionType: string,
  duration: number,
  partnershipFacts?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.1 "The Challenge" for a ${actionType} project in the ${sector} sector.

${partnershipFacts || ''}

${conceptContext || ''}

THE PROBLEM TO ADDRESS:
"${problem}"

TARGET GROUP: ${targetGroup}
PROJECT DURATION: ${duration} months

RESEARCH EVIDENCE AND SOURCES:
${sourceContext}

TASK: Write a compelling challenge narrative of 400-600 words structured as follows:

OPENING (first 50-80 words):
Start with a concrete human scenario -- a specific person or situation that illustrates the problem viscerally. The scenario MUST be located in one of the actual partner countries listed above. Do NOT set the scenario in a country that is not in the partnership.

MACRO LEVEL (100-150 words):
Present the European-wide dimensions of the problem. Draw on international data from organizations such as OECD, CEDEFOP, Eurydice, or Eurostat. Cite specific reports with title, institution, and year. Use concrete numbers and percentages.

MESO LEVEL (100-150 words):
Narrow to the national and regional level. Show how the problem manifests specifically in the partner countries listed above. Reference national statistics from THOSE countries. Do NOT reference countries outside the partnership.

MICRO LEVEL (80-120 words):
Zoom into the direct experience of the target group "${targetGroup}". Describe their specific characteristics, daily realities, and unmet needs. Connect back to the opening scenario.

CLOSING (50-80 words):
Synthesize the three levels into a clear statement of urgency. Do NOT propose solutions here -- that comes in The Opportunity. End with a forward-looking sentence that creates a natural bridge to the next section.

WRITING STYLE:
- Flowing academic prose. Absolutely NO bullet points, no numbered lists.
- Each paragraph should transition smoothly into the next.
- Build emotional resonance while maintaining scholarly credibility.
- Every statistic must include its source (institution, report title, year).
- Use the funnel principle: broad European context narrowing to specific target group reality.
- ONLY reference the partner countries listed in PARTNERSHIP FACTS above.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Markdown text. Use bold (**text**) sparingly for emphasis on key statistics. No JSON. No section numbering -- this is pure flowing prose.`;
}

// ============================================================================
// 3. OPPORTUNITY NARRATIVE PROMPT (Section 3.2)
// ============================================================================

/**
 * Generates Section 3.2 "The Opportunity" (300-500 words).
 * Flips the perspective from challenge to possibility.
 * Output: Markdown text.
 */
export function getOpportunityNarrativePrompt(
  challengeText: string,
  projectIdea: string,
  sourceContext: string,
  sector: string,
  partnershipFacts?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.2 "The Opportunity" for a project in the ${sector} sector.

${partnershipFacts || ''}

${conceptContext || ''}

THE CHALLENGE NARRATIVE (Section 3.1, already written):
${challengeText}

THE PROJECT IDEA:
"${projectIdea}"

RESEARCH EVIDENCE AND SOURCES:
${sourceContext}

TASK: Write an opportunity narrative of 300-500 words that flips the perspective from the challenge described above to a vision of possibility.

STRUCTURE:

PIVOT PARAGRAPH (60-80 words):
Open by acknowledging the severity of the challenge, then pivot with a "Yet..." or "However..." construction. Introduce the idea that the same conditions creating the problem also create a unique window for intervention.

EMERGING EVIDENCE (100-150 words):
Reference concrete examples of where similar approaches have already shown results. Draw on:
- Successful pilot projects or predecessor initiatives in the partner countries or elsewhere in Europe
- Policy momentum (European strategies, action plans, frameworks that support this type of work)
- Technological or methodological developments that make this intervention newly feasible
Cite sources with institution, title, and year.

TRANSFORMED SCENARIO (80-120 words):
Paint a concrete picture of what the situation looks like AFTER a successful intervention. Mirror the opening scenario from the Challenge section but show the transformed outcome. The scenario must take place in one of the actual partner countries. Be specific and grounded -- not utopian.

STRATEGIC WINDOW (60-80 words):
Explain why NOW is the right moment for this project. Reference the Erasmus+ programme cycle, relevant European policy timelines, or sector-specific developments that create urgency and alignment.

WRITING STYLE:
- Flowing academic prose, NO bullet points.
- Maintain the emotional thread from the Challenge but shift the tone toward possibility and agency.
- Each paragraph must contain at least one concrete data point or source reference.
- The tone is confident but not grandiose. Show evidence, not aspiration.
- ONLY reference the partner countries listed in PARTNERSHIP FACTS above.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Markdown text. No JSON. No section numbering. Flowing prose with smooth transitions.`;
}

// ============================================================================
// 4. PROJECT RESPONSE PROMPT (Section 3.3)
// ============================================================================

/**
 * Generates Section 3.3 "The Project Response" (200-300 words + 5-8 bullets).
 * Output: Markdown text.
 */
export function getProjectResponsePrompt(
  challengeText: string,
  opportunityText: string,
  projectIdea: string,
  innovation: string,
  partnershipFacts?: string,
  sourceContext?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.3 "The Project Response."

${partnershipFacts || ''}

${conceptContext || ''}

THE CHALLENGE (Section 3.1):
${challengeText}

THE OPPORTUNITY (Section 3.2):
${opportunityText}

THE PROJECT IDEA:
"${projectIdea}"

INNOVATION / UNIQUE APPROACH:
"${innovation}"

RESEARCH EVIDENCE AND SOURCES:
${sourceContext || '(no research sources uploaded)'}
When describing the project's activities and outputs, reference findings from the uploaded research sources to justify WHY each action pillar is needed. Cite sources by title.

TASK: Write a project response section that has two parts:

PART 1 -- INTRODUCTORY PARAGRAPH (200-300 words):
Write a flowing paragraph that bridges from the opportunity to the concrete project. Explain HOW the project translates the identified opportunity into action. Cover:
- The core intervention model (what the project actually does, concretely)
- The innovative element that distinguishes this project from previous initiatives
- How the project directly addresses the needs identified in the Challenge section
- The expected transformation pathway: from intervention to lasting change

PART 2 -- ACTION PILLARS (5-8 bullet points):
After the paragraph, list the project's concrete action pillars. Each bullet must:
- Start with a **bold action verb** (e.g., **Develop**, **Deploy**, **Train**, **Establish**, **Create**, **Implement**, **Design**, **Pilot**)
- Describe ONE concrete activity or output the project will deliver
- Include a specific detail: who is involved, what is produced, or what scale is targeted
- ONLY mention partner countries and realistic participant numbers from PARTNERSHIP FACTS above
- Be 1-2 sentences long

The bullets should collectively cover the full scope of the project: from research/analysis through development, testing, training, and dissemination.

WRITING STYLE:
- The introductory paragraph must flow naturally from the Opportunity section.
- Bullets are the ONLY place where a list format is permitted.
- Every bullet must describe something tangible and verifiable -- no vague intentions.
- All country references, participant numbers, and languages must match PARTNERSHIP FACTS.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Markdown text. The introductory paragraph as flowing prose, followed by a bulleted list using "- **Verb** ..." format. No JSON.`;
}

// ============================================================================
// 5. STARS GOALS PROMPT (Section 4)
// ============================================================================

/**
 * Generates 3-5 project goals (3 for KA210, 4-5 for KA220).
 * Each with: number, statement, rationale, measurableOutcome.
 * Output: JSON array.
 */
export function getStarsGoalsPrompt(
  challengeText: string,
  projectIdea: string,
  sourceContext: string,
  duration: number,
  actionType: string,
  partnershipFacts?: string,
  conceptContext?: string
): string {
  const isKA210 = actionType === 'KA210';
  const goalCount = isKA210 ? '3' : '4-5';

  return `You are an expert Erasmus+ project designer defining project goals for a ${actionType} project.

${partnershipFacts || ''}

${conceptContext || ''}

THE CHALLENGE (from Section 3.1):
${challengeText}

THE PROJECT IDEA:
"${projectIdea}"

RESEARCH EVIDENCE AND SOURCES:
${sourceContext}

PROJECT DURATION: ${duration} months
ACTION TYPE: ${actionType}${isKA210 ? ' (Small-Scale Partnership, max 60k EUR budget)' : ' (Cooperation Partnership)'}

TASK: Define exactly ${goalCount} project goals. These are NOT SMART objectives with indicators -- they are higher-level GOALS with rationale. The difference is critical:
- A SMART objective: "Train 40 youth workers in digital facilitation by month 18"
- A STARS goal: "Equip frontline youth workers with practical digital facilitation competences so they can independently guide young people through online civic participation processes"

REQUIREMENTS FOR EACH GOAL:

1. "number": Sequential number (1, 2, 3, ...)

2. "statement": A clear, substantive goal statement (1-2 sentences). Must describe WHAT the project aims to achieve and WHO benefits. The statement should be ambitious yet achievable within ${duration} months${isKA210 ? ' on a small budget' : ''}.

3. "rationale": A 2-3 sentence explanation of WHY this goal matters. This is the key differentiator of the STARS format. The rationale MUST:
   - Connect directly to evidence from the Challenge narrative or research sources
   - Reference at least one specific data point, study, or policy framework
   - Explain the causal logic: "Because [evidence], the project must [goal]"

4. "measurableOutcome": A concrete, quantified outcome that proves the goal was achieved. Must include SPECIFIC NUMBERS that match the PARTNERSHIP FACTS above.
   CRITICAL: When mentioning "X countries" the number MUST match the actual partner country count from PARTNERSHIP FACTS. When mentioning participant numbers, they must be realistic for the budget.

GOAL DESIGN RULES:
- Goals must collectively cover the full project scope: capacity building, output creation, testing/piloting, and knowledge transfer.
- Each goal must be distinct -- no overlapping scope.
- Goals must be sequenced logically (earlier goals enable later ones).
${isKA210 ? '- Keep goals realistic for a small budget and short timeline. Less is more.' : '- Use the larger budget and longer timeline for ambitious but achievable goals.'}
- NEVER use "raise awareness" as a goal. Instead specify the concrete competence, tool, or behavioral change targeted.
- All country references must use ONLY the partner countries from PARTNERSHIP FACTS.
- All numbers must be consistent with the REALISTIC SCALE section in PARTNERSHIP FACTS.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Respond ONLY with a valid JSON array:
[
  {
    "number": 1,
    "statement": "Goal statement here...",
    "rationale": "Because [evidence/data], this goal addresses [specific need]...",
    "measurableOutcome": "By month ${duration}, [specific number] of [specific group] will have [specific achievement]..."
  }
]

No additional text outside the JSON array.`;
}

// ============================================================================
// 6. STARS TARGET GROUPS PROMPT (Section 5)
// ============================================================================

/**
 * Generates exactly 4 target groups in a hierarchical structure.
 * Output: JSON array.
 */
export function getStarsTargetGroupsPrompt(
  targetGroup: string,
  projectIdea: string,
  sector: string,
  challengeText: string,
  partnershipFacts?: string,
  sourceContext?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ proposal writer defining target groups for a project in the ${sector} sector.

${partnershipFacts || ''}

${conceptContext || ''}

TARGET GROUP (as defined by the user):
"${targetGroup}"

PROJECT IDEA:
"${projectIdea}"

THE CHALLENGE CONTEXT:
${challengeText}

RESEARCH EVIDENCE AND SOURCES:
${sourceContext || '(no research sources uploaded)'}
Use data from the uploaded sources to substantiate target group characteristics, needs, and estimated reach numbers. Cite sources by title when referencing statistics or demographics.

TASK: Define exactly 4 target groups in a hierarchical impact model. The hierarchy represents concentric circles of impact, from those directly engaged in project activities to those reached through systemic ripple effects.

THE 4 LEVELS:

1. PRIMARY -- Direct Beneficiaries:
   The people who directly participate in project activities (training, workshops, piloting). They are the hands-on users and testers. Be specific about who they are: profession, age range, geographic context. CRITICAL: The geographic context must reference ONLY the partner countries from PARTNERSHIP FACTS. The participant numbers must match the REALISTIC SCALE from PARTNERSHIP FACTS.

2. SECONDARY -- Intermediaries Who Multiply Impact:
   People who benefit because the primary group changes its practice. For example, if primary beneficiaries are teachers, secondary beneficiaries are their students. Describe the multiplication mechanism.

3. TERTIARY -- Institutional Stakeholders:
   Organizations and institutions in the partner countries that benefit from the project's outputs and can embed them into their structures.

4. QUATERNARY -- Broader Society and Policy Level:
   The widest circle of impact: policy makers, the sector at large, or European-level stakeholders who benefit from the project's knowledge contributions or open educational resources.

FOR EACH TARGET GROUP, PROVIDE:

- "level": One of "PRIMARY", "SECONDARY", "TERTIARY", "QUATERNARY"
- "name": A concise label (e.g., "Adult Education Trainers", "Youth in Rural Communities")
- "description": 2-3 sentences describing who they are and their relevance to the project
- "characteristicsAndNeeds": 2-3 sentences about their specific traits, challenges, and unmet needs. Be concrete -- include demographics, geographic context in partner countries, professional characteristics.
- "roleInProject": 2-3 sentences describing HOW this group participates in or benefits from the project.
- "estimatedReach": A specific estimate with numbers that are CONSISTENT WITH PARTNERSHIP FACTS.

RULES:
- The primary target group must clearly correspond to the user-defined target group "${targetGroup}".
- Each level must have a clear causal chain connecting it to the level above.
- Numbers must be realistic and proportional: primary is smallest, quaternary is largest reach.
- CRITICAL: When writing "across X partner countries", X MUST match the actual partner count from PARTNERSHIP FACTS. Only name countries that are actually in the partnership.
- ALL numbers must be consistent with numbers used in Goals and Project Response sections.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Respond ONLY with a valid JSON array of exactly 4 objects:
[
  {
    "level": "PRIMARY",
    "name": "...",
    "description": "...",
    "characteristicsAndNeeds": "...",
    "roleInProject": "...",
    "estimatedReach": "..."
  },
  {
    "level": "SECONDARY",
    "name": "...",
    "description": "...",
    "characteristicsAndNeeds": "...",
    "roleInProject": "...",
    "estimatedReach": "..."
  },
  {
    "level": "TERTIARY",
    "name": "...",
    "description": "...",
    "characteristicsAndNeeds": "...",
    "roleInProject": "...",
    "estimatedReach": "..."
  },
  {
    "level": "QUATERNARY",
    "name": "...",
    "description": "...",
    "characteristicsAndNeeds": "...",
    "roleInProject": "...",
    "estimatedReach": "..."
  }
]

No additional text outside the JSON array.`;
}

// ============================================================================
// 7. STARS METHODOLOGY PROMPT (Section 6)
// ============================================================================

/**
 * Generates 4-6 named methodological principles.
 * Each has a distinctive name and 60-100 word narrative paragraph.
 * Output: JSON array.
 */
export function getStarsMethodologyPrompt(
  projectIdea: string,
  goals: string,
  innovation: string,
  sector: string,
  partnershipFacts?: string,
  sourceContext?: string,
  conceptContext?: string
): string {
  return `You are an expert Erasmus+ methodologist designing the methodological framework for a project in the ${sector} sector.

${partnershipFacts || ''}

${conceptContext || ''}

PROJECT IDEA:
"${projectIdea}"

PROJECT GOALS:
${goals}

INNOVATION / UNIQUE APPROACH:
"${innovation}"

RESEARCH EVIDENCE AND SOURCES:
${sourceContext || '(no research sources uploaded)'}
Ground your methodological principles in evidence from the uploaded sources. Reference specific findings, frameworks, or best practices documented in the research. Cite sources by title.

TASK: Define 4-6 named methodological principles that form the project's intervention framework. These are NOT work packages or activities -- they are the underlying PRINCIPLES that guide how all project activities are designed and delivered.

WHAT A METHODOLOGICAL PRINCIPLE LOOKS LIKE:
Each principle has:
- A distinctive, memorable NAME that communicates the approach in 3-6 words
  Good examples: "Co-Design with End-Users", "Evidence-Based Intervention Design", "Iterative Prototyping Cycles", "Peer Learning Across Borders", "Train-the-Trainer Cascade", "Participatory Action Research"
  Bad examples: "Innovation", "Quality", "Partnership" (too vague)
- A NARRATIVE PARAGRAPH of 60-100 words explaining:
  - What this principle means in the context of THIS specific project
  - How it will be operationalized (concrete methods, tools, or processes)
  - Why it is essential for achieving the project goals
  - Reference to established methodological frameworks where applicable (e.g., Design Thinking, PDCA cycle, Kirkpatrick evaluation model, Community of Practice theory)

REQUIREMENTS:
- The set of principles must collectively cover: how the project creates knowledge, how it develops outputs, how it involves beneficiaries, how it ensures quality, and how it transfers results.
- Each principle must be distinct and non-overlapping.
- At least one principle must address participatory/co-creation methods.
- At least one principle must address how evidence and data inform the project's activities.
- Principles should reference concrete, established methodologies -- not invented frameworks.
- The narrative must be specific to THIS project, not generic methodology text that could apply to any project.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: Respond ONLY with a valid JSON array:
[
  {
    "name": "Principle Name Here",
    "description": "A 60-100 word narrative paragraph explaining this principle in the specific context of this project..."
  }
]

No additional text outside the JSON array.`;
}

// ============================================================================
// 8. ASSEMBLE FULL STARS EXPOSE PROMPT
// ============================================================================

/**
 * Assembles ALL sections into one cohesive Markdown document.
 * Output: complete Markdown document following the STARS structure.
 */
export function getAssembleStarsExposePrompt(
  projectTitle: string,
  projectAcronym: string,
  sector: string,
  actionType: string,
  duration: number,
  budget: number,
  euPolicyAlignment: string[],
  partnershipNarrative: string,
  partnersTable: string,
  associatedPartners: string,
  challengeText: string,
  opportunityText: string,
  responseText: string,
  goals: string,
  targetGroups: string,
  methodology: string,
  additionalInstructions?: string,
  partnershipFacts?: string
): string {
  return `You are a senior Erasmus+ proposal editor assembling a complete STARS Expose document. Your task is to take pre-written section content and weave it into a single, cohesive, professionally formatted Markdown document.

${partnershipFacts || ''}

PROJECT METADATA:
- Title: "${projectTitle}"
- Acronym: ${projectAcronym}
- Sector: ${sector}
- Action Type: ${actionType}
- Duration: ${duration} months
- Budget: ${budget.toLocaleString()} EUR
- Policy Alignment: ${euPolicyAlignment.join(', ')}

PRE-WRITTEN CONTENT:

=== PARTNERSHIP NARRATIVE ===
${partnershipNarrative}

=== PARTNERS TABLE DATA ===
${partnersTable}

=== ASSOCIATED PARTNERS ===
${associatedPartners}

=== SECTION 3.1: THE CHALLENGE ===
${challengeText}

=== SECTION 3.2: THE OPPORTUNITY ===
${opportunityText}

=== SECTION 3.3: THE PROJECT RESPONSE ===
${responseText}

=== SECTION 4: PROJECT GOALS (JSON) ===
${goals}

=== SECTION 5: TARGET GROUPS (JSON) ===
${targetGroups}

=== SECTION 6: METHODOLOGY (JSON) ===
${methodology}

${additionalInstructions ? `=== ADDITIONAL INSTRUCTIONS ===\n${additionalInstructions}\n` : ''}

TASK: Assemble a complete STARS Expose document in Markdown following this EXACT structure:

---

# ${projectAcronym} -- ${projectTitle}
## STARS Project Expose

---

### Section 1: Project Identification

Create a Markdown table with the following rows:
| Field | Value |
|-------|-------|
| Project Title | ${projectTitle} |
| Acronym | ${projectAcronym} |
| Action Type | ${actionType} |
| Sector | ${sector} |
| Duration | ${duration} months |
| Budget | ${budget.toLocaleString()} EUR |
| European Policy Alignment | ${euPolicyAlignment.join(', ')} |

---

### Section 2: Project Partnership

#### 2.1 Partnership Narrative
Insert the partnership narrative as flowing prose. Lightly edit for smooth transitions with the rest of the document, but preserve the substance.

#### 2.2 Consortium Overview
Insert the partners table data formatted as a clean Markdown table with columns: Role, Organization, Country, Expertise.

#### 2.3 Associated Partners
If associated partners exist, present them. If none, omit this subsection.

---

### Section 3: Project Summary

#### 3.1 The Challenge
Insert the challenge narrative. This must remain flowing prose -- do NOT convert to bullet points. Add a brief transition sentence at the start if needed to connect smoothly from Section 2.

#### 3.2 The Opportunity
Insert the opportunity narrative. Ensure the pivot from Challenge to Opportunity reads naturally. The emotional arc should shift from urgency to possibility.

#### 3.3 The Project Response
Insert the response text. The introductory paragraph should flow from the Opportunity, and the action pillars should be presented as a clean bulleted list.

---

### Section 4: Project Goals

Convert the goals JSON into a structured presentation. For each goal:

**Goal [number]: [statement]**

*Rationale:* [rationale text]

*Measurable Outcome:* [measurable outcome text]

Separate each goal with a blank line. After all goals, add 1-2 sentences reflecting on how the goals collectively address the challenge.

---

### Section 5: Target Groups

Convert the target groups JSON into a Markdown table:

| Level | Target Group | Description | Characteristics and Needs | Role in Project | Estimated Reach |
|-------|-------------|-------------|--------------------------|-----------------|-----------------|

After the table, add 1-2 sentences explaining the cascade logic: how impact flows from primary through to quaternary level.

---

### Section 6: Methodological Approach

For each methodology principle, present it as:

#### [Principle Name]
[Description paragraph]

After all principles, add a brief closing paragraph (2-3 sentences) explaining how these principles work together as an integrated framework.

---

ASSEMBLY RULES:
1. Do NOT rewrite or significantly alter the pre-written content. Your role is to assemble, format, and add transition sentences.
2. Add brief TRANSITION SENTENCES (1-2 sentences max) between major sections to ensure the document reads as a coherent narrative, not disjointed blocks.
3. Ensure all Markdown formatting is clean and consistent: headers use ###, tables use |, bold uses **, emphasis uses *.
4. The document must be self-contained and readable from start to finish as a single professional document.
5. The total document should maintain a consistent tone: professional, evidence-based, specific, and confident.
6. Convert any JSON data into readable formatted sections -- no raw JSON in the output.
7. If associated partners data is empty or "none," simply omit Section 2.3.

CRITICAL CONSISTENCY CHECK (do this BEFORE outputting the document):
8. Scan ALL sections for country names. If ANY country appears that is NOT in the PARTNERSHIP FACTS block, REMOVE or REPLACE it with the correct partner country.
9. Scan ALL sections for "across X countries" statements. X must ALWAYS match the actual partner country count.
10. Scan ALL sections for participant/beneficiary numbers. They must be consistent across Goals, Target Groups, Response, and Methodology. If you find contradictions, use the smaller, more conservative number everywhere.
11. Scan ALL sections for language references. Translation languages must match partner country languages + English.
12. Scan ALL sections for event descriptions. No "European conference" unless the budget exceeds 250,000 EUR. Scale events to local/national multiplier events instead.

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: A complete Markdown document. No wrapping in code blocks. No preamble like "Here is your document." Start directly with the title heading.`;
}
