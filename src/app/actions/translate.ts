'use server';

import { Project } from '@/store/types';
import { generateContentAction } from './gemini';

export async function translateProjectContent(project: Project): Promise<Project> {
    // Create a simplified version of the project with only translatable fields
    // We map the IDs back later
    const translatableContent = {
        title: project.title,
        acronym: project.acronym,
        problemStatement: project.problemStatement,
        objectives: project.objectives.map(o => ({ id: o.id, description: o.description })),
        workPackages: project.workPackages.map(wp => ({
            id: wp.id,
            title: wp.title,
            description: wp.description,
            activities: wp.activities.map(a => ({ id: a.id, title: a.title, description: a.description })),
            deliverables: wp.deliverables.map(d => ({ id: d.id, title: d.title, description: d.description }))
        })),
        results: project.results.map(r => ({ id: r.id, title: r.title, description: r.description }))
    };

    const systemPrompt = `You are a professional translator for Erasmus+ project applications.
  Translate the following JSON content to ACADEMIC ENGLISH.
  
  RULES:
  1. Maintain the exact JSON structure.
  2. Do NOT translate IDs, codes, or keys.
  3. Translate values to high-quality, formal English.
  4. Keep markdown formatting.
  5. Return ONLY the valid JSON string. No markdown code blocks.`;

    try {
        const jsonString = JSON.stringify(translatableContent, null, 2);
        const translationResponse = await generateContentAction(jsonString, systemPrompt);

        // Clean up response if it contains markdown code blocks
        const cleanJson = translationResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const translatedContent = JSON.parse(cleanJson);

        // Merge back into original project
        const p = JSON.parse(JSON.stringify(project)); // Deep clone

        if (translatedContent.title) p.title = translatedContent.title;
        if (translatedContent.acronym) p.acronym = translatedContent.acronym;
        if (translatedContent.problemStatement) p.problemStatement = translatedContent.problemStatement;

        // Map Objectives
        if (translatedContent.objectives) {
            p.objectives = p.objectives.map((obj: any) => {
                const tObj = translatedContent.objectives.find((t: any) => t.id === obj.id);
                return tObj ? { ...obj, description: tObj.description } : obj;
            });
        }

        // Map Work Packages
        if (translatedContent.workPackages) {
            p.workPackages = p.workPackages.map((wp: any) => {
                const tWp = translatedContent.workPackages.find((t: any) => t.id === wp.id);
                if (!tWp) return wp;

                return {
                    ...wp,
                    title: tWp.title,
                    description: tWp.description,
                    activities: wp.activities.map((act: any) => {
                        const tAct = tWp.activities?.find((t: any) => t.id === act.id);
                        return tAct ? { ...act, title: tAct.title, description: tAct.description } : act;
                    }),
                    deliverables: wp.deliverables.map((del: any) => {
                        const tDel = tWp.deliverables?.find((t: any) => t.id === del.id);
                        return tDel ? { ...del, title: tDel.title, description: tDel.description } : del;
                    })
                };
            });
        }

        // Map Results
        if (translatedContent.results) {
            p.results = p.results.map((res: any) => {
                const tRes = translatedContent.results.find((t: any) => t.id === res.id);
                return tRes ? { ...res, title: tRes.title, description: tRes.description } : res;
            });
        }

        return p;

    } catch (error) {
        console.error('Batch translation failed:', error);
        throw new Error('Translation failed. Please try again later.');
    }
}
