import { StudySummary } from "@/store/types";

export interface AggregatedPartnerProfile {
    executiveSummary: string;
    mission: string;
    staffSize: string;
    erasmusData: {
        oid?: string;
        pic?: string;
        accreditation?: string;
    };
    competences: string[];
    targetGroups: string[];
    sectors: string[];
    completedProjects: {
        title: string;
        role: 'COORDINATOR' | 'PARTNER';
        programme: string;
        year?: number;
        topic?: string;
        sourceDoc?: string;
    }[];
    keyFindings: {
        finding: string;
        relevance: string;
        sourceDoc: string;
    }[];
}

export function aggregatePartnerAnalysis(documents: { name: string, summary?: StudySummary }[]): AggregatedPartnerProfile {
    const summaries = documents.map(d => ({ ...d.summary, docName: d.name })).filter(s => s && s.executiveSummary) as (StudySummary & { docName: string })[];

    const profile: AggregatedPartnerProfile = {
        executiveSummary: "",
        mission: "",
        staffSize: "",
        erasmusData: {},
        competences: [],
        targetGroups: [],
        sectors: [],
        completedProjects: [],
        keyFindings: []
    };

    if (summaries.length === 0) return profile;

    // 1. Merge Text Fields (simple concatenation for now, potentially smarter later)
    // We prioritize the longest "Mission" statement found
    profile.mission = summaries
        .map(s => s.mission || "")
        .sort((a, b) => b.length - a.length)[0] || "";

    // Staff Size: Look for the first non-empty one
    profile.staffSize = summaries.find(s => s.staffSize)?.staffSize || "";

    // Erasmus Data: Merge
    summaries.forEach(s => {
        if (s.erasmusData?.oid) profile.erasmusData.oid = s.erasmusData.oid;
        if (s.erasmusData?.pic) profile.erasmusData.pic = s.erasmusData.pic;
        if (s.erasmusData?.accreditation) profile.erasmusData.accreditation = s.erasmusData.accreditation;
    });

    // 2. Aggregate Arrays (Deduplicate)
    const allCompetences = new Set<string>();
    const allTargetGroups = new Set<string>();
    const allSectors = new Set<string>();

    summaries.forEach(s => {
        s.competences?.forEach(c => allCompetences.add(c));
        s.targetGroups?.forEach(t => allTargetGroups.add(t));
        s.relevantSectors?.forEach(sec => allSectors.add(sec));

        // Key Findings merging
        s.keyFindings?.forEach(kf => {
            profile.keyFindings.push({
                finding: kf.finding,
                relevance: kf.relevance,
                sourceDoc: s.docName
            });
        });

        // Projects merging
        s.completedProjects?.forEach(p => {
            profile.completedProjects.push({
                ...p,
                sourceDoc: s.docName
            });
        });
    });

    profile.competences = Array.from(allCompetences);
    profile.targetGroups = Array.from(allTargetGroups);
    profile.sectors = Array.from(allSectors);

    // 3. Consolidated Executive Summary
    // Instead of just joining them, we try to pick the "best" one (Profile/PIF usually better than generic study summary)
    const pifSummary = summaries.find(s => s.docName?.toLowerCase().includes('pif') || s.title?.toLowerCase().includes('profile'));
    if (pifSummary) {
        profile.executiveSummary = pifSummary.executiveSummary;
    } else {
        // Fallback: Use the first one
        profile.executiveSummary = summaries[0]?.executiveSummary || "";
    }

    return profile;
}
