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
`.trim();

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
  sector: string
): string {
  return `You are an expert Erasmus+ proposal writer specializing in ${sector} projects.

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
  duration: number
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.1 "The Challenge" for a ${actionType} project in the ${sector} sector.

THE PROBLEM TO ADDRESS:
"${problem}"

TARGET GROUP: ${targetGroup}
PROJECT DURATION: ${duration} months

RESEARCH EVIDENCE AND SOURCES:
${sourceContext}

TASK: Write a compelling challenge narrative of 400-600 words structured as follows:

OPENING (first 50-80 words):
Start with a concrete human scenario -- a specific person or situation that illustrates the problem viscerally. For example: "A 52-year-old social worker in rural Romania opens her laptop to a cascade of AI-generated misinformation targeting her elderly clients..." This is NOT a fictional story; it is a representative scenario grounded in the data below.

MACRO LEVEL (100-150 words):
Present the European-wide dimensions of the problem. Draw on international data from organizations such as OECD, CEDEFOP, Eurydice, or Eurostat. Cite specific reports with title, institution, and year. Use concrete numbers and percentages.

MESO LEVEL (100-150 words):
Narrow to the national and regional level. Show how the problem manifests differently across European countries, particularly in the regions where the project partners operate. Reference national statistics, ministry reports, or sector-specific studies.

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
  sector: string
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.2 "The Opportunity" for a project in the ${sector} sector.

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
- Successful pilot projects or predecessor initiatives in Europe
- Policy momentum (European strategies, action plans, frameworks that support this type of work)
- Technological or methodological developments that make this intervention newly feasible
Cite sources with institution, title, and year.

TRANSFORMED SCENARIO (80-120 words):
Paint a concrete picture of what the situation looks like AFTER a successful intervention. Mirror the opening scenario from the Challenge section but show the transformed outcome. Be specific and grounded -- not utopian.

STRATEGIC WINDOW (60-80 words):
Explain why NOW is the right moment for this project. Reference the Erasmus+ programme cycle, relevant European policy timelines, or sector-specific developments that create urgency and alignment.

WRITING STYLE:
- Flowing academic prose, NO bullet points.
- Maintain the emotional thread from the Challenge but shift the tone toward possibility and agency.
- Each paragraph must contain at least one concrete data point or source reference.
- The tone is confident but not grandiose. Show evidence, not aspiration.

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
  innovation: string
): string {
  return `You are an expert Erasmus+ proposal writer crafting Section 3.3 "The Project Response."

THE CHALLENGE (Section 3.1):
${challengeText}

THE OPPORTUNITY (Section 3.2):
${opportunityText}

THE PROJECT IDEA:
"${projectIdea}"

INNOVATION / UNIQUE APPROACH:
"${innovation}"

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
- Be 1-2 sentences long

The bullets should collectively cover the full scope of the project: from research/analysis through development, testing, training, and dissemination.

WRITING STYLE:
- The introductory paragraph must flow naturally from the Opportunity section.
- Bullets are the ONLY place where a list format is permitted.
- Every bullet must describe something tangible and verifiable -- no vague intentions.

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
  actionType: string
): string {
  const isKA210 = actionType === 'KA210';
  const goalCount = isKA210 ? '3' : '4-5';

  return `You are an expert Erasmus+ project designer defining project goals for a ${actionType} project.

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

4. "measurableOutcome": A concrete, quantified outcome that proves the goal was achieved. Must include SPECIFIC NUMBERS (e.g., "120 practitioners across 4 countries complete the certification program with a minimum pass rate of 75%"). All time references must fit within the ${duration}-month project duration.

GOAL DESIGN RULES:
- Goals must collectively cover the full project scope: capacity building, output creation, testing/piloting, and knowledge transfer.
- Each goal must be distinct -- no overlapping scope.
- Goals must be sequenced logically (earlier goals enable later ones).
${isKA210 ? '- Keep goals realistic for a small budget and short timeline. Less is more.' : '- Use the larger budget and longer timeline for ambitious but achievable goals.'}
- NEVER use "raise awareness" as a goal. Instead specify the concrete competence, tool, or behavioral change targeted.

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
  challengeText: string
): string {
  return `You are an expert Erasmus+ proposal writer defining target groups for a project in the ${sector} sector.

TARGET GROUP (as defined by the user):
"${targetGroup}"

PROJECT IDEA:
"${projectIdea}"

THE CHALLENGE CONTEXT:
${challengeText}

TASK: Define exactly 4 target groups in a hierarchical impact model. The hierarchy represents concentric circles of impact, from those directly engaged in project activities to those reached through systemic ripple effects.

THE 4 LEVELS:

1. PRIMARY -- Direct Beneficiaries:
   The people who directly participate in project activities (training, workshops, piloting). They are the hands-on users and testers. Be specific about who they are: profession, age range, geographic context, and approximate numbers.

2. SECONDARY -- Intermediaries Who Multiply Impact:
   People who benefit because the primary group changes its practice. For example, if primary beneficiaries are teachers, secondary beneficiaries are their students. If primary beneficiaries are NGO staff, secondary beneficiaries are the communities they serve. Describe the multiplication mechanism.

3. TERTIARY -- Institutional Stakeholders:
   Organizations and institutions that benefit from the project's outputs and can embed them into their structures. Examples: educational institutions adopting new curricula, employers using new competence frameworks, professional associations integrating project tools. Describe how they engage.

4. QUATERNARY -- Broader Society and Policy Level:
   The widest circle of impact: policy makers, the sector at large, or European-level stakeholders who benefit from the project's knowledge contributions, policy recommendations, or open educational resources. This level is about systemic change.

FOR EACH TARGET GROUP, PROVIDE:

- "level": One of "PRIMARY", "SECONDARY", "TERTIARY", "QUATERNARY"
- "name": A concise label (e.g., "Adult Education Trainers", "Youth in Rural Communities", "National VET Agencies")
- "description": 2-3 sentences describing who they are and their relevance to the project
- "characteristicsAndNeeds": 2-3 sentences about their specific traits, challenges, and unmet needs that the project addresses. Be concrete -- include demographics, geographic context, professional characteristics.
- "roleInProject": 2-3 sentences describing HOW this group participates in or benefits from the project. For primary groups, this is active participation. For quaternary groups, this may be through policy papers or open resources.
- "estimatedReach": A specific estimate with numbers (e.g., "80 trainers directly engaged across 4 partner countries", "3,000+ learners reached indirectly through trained facilitators", "50+ institutions accessing open resources")

RULES:
- The primary target group must clearly correspond to the user-defined target group "${targetGroup}".
- Each level must have a clear causal chain connecting it to the level above: primary actions lead to secondary impact, which leads to tertiary adoption, which leads to quaternary systemic effects.
- Numbers must be realistic and proportional: primary is smallest, quaternary is largest reach.
- Be specific about geographic scope: mention European regions, countries, or contexts.

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
  sector: string
): string {
  return `You are an expert Erasmus+ methodologist designing the methodological framework for a project in the ${sector} sector.

PROJECT IDEA:
"${projectIdea}"

PROJECT GOALS:
${goals}

INNOVATION / UNIQUE APPROACH:
"${innovation}"

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
  additionalInstructions?: string
): string {
  return `You are a senior Erasmus+ proposal editor assembling a complete STARS Expose document. Your task is to take pre-written section content and weave it into a single, cohesive, professionally formatted Markdown document.

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

${ANTI_BUZZWORD_RULES}

OUTPUT FORMAT: A complete Markdown document. No wrapping in code blocks. No preamble like "Here is your document." Start directly with the title heading.`;
}
