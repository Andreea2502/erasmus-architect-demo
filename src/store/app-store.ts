/**
 * APP STORE
 * ==========
 * Central state management with Zustand
 * Persistence via Supabase (PostgreSQL + JSONB)
 *
 * Migration: IndexedDB (local) -> Supabase (cloud)
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import {
  Partner,
  Project,
  ConsortiumMember,
  WorkPackage,
  ProjectResult,
  SavedSnippet,
  SavedConcept,
} from './types';

// ============================================================================
// SUPABASE SYNC HELPERS
// ============================================================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced sync to Supabase. Waits 1s after last change before writing.
 */
function scheduleSyncToSupabase() {
  if (typeof window === 'undefined') return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncAllToSupabase();
  }, 1000);
}

/**
 * Upserts all entities to their respective Supabase tables.
 */
async function syncAllToSupabase() {
  const state = useAppStore.getState();

  try {
    // --- Partners ---
    const partnerRows = state.partners.map((p) => ({
      id: p.id,
      data: p,
      updated_at: new Date().toISOString(),
    }));
    if (partnerRows.length > 0) {
      const { error } = await supabase.from('partners').upsert(partnerRows, { onConflict: 'id' });
      if (error) console.error('[Supabase] partners sync error:', error.message);
    }
    // Delete partners that were removed
    const { data: existingPartners } = await supabase.from('partners').select('id');
    if (existingPartners) {
      const currentIds = new Set(state.partners.map((p) => p.id));
      const toDelete = existingPartners.filter((row) => !currentIds.has(row.id)).map((row) => row.id);
      if (toDelete.length > 0) {
        await supabase.from('partners').delete().in('id', toDelete);
      }
    }

    // --- Projects ---
    const projectRows = state.projects.map((p) => ({
      id: p.id,
      data: p,
      updated_at: new Date().toISOString(),
    }));
    if (projectRows.length > 0) {
      const { error } = await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
      if (error) console.error('[Supabase] projects sync error:', error.message);
    }
    const { data: existingProjects } = await supabase.from('projects').select('id');
    if (existingProjects) {
      const currentIds = new Set(state.projects.map((p) => p.id));
      const toDelete = existingProjects.filter((row) => !currentIds.has(row.id)).map((row) => row.id);
      if (toDelete.length > 0) {
        await supabase.from('projects').delete().in('id', toDelete);
      }
    }

    // --- Snippets ---
    const snippetRows = (state.snippets || []).map((s) => ({
      id: s.id,
      data: s,
      updated_at: new Date().toISOString(),
    }));
    if (snippetRows.length > 0) {
      const { error } = await supabase.from('snippets').upsert(snippetRows, { onConflict: 'id' });
      if (error) console.error('[Supabase] snippets sync error:', error.message);
    }
    const { data: existingSnippets } = await supabase.from('snippets').select('id');
    if (existingSnippets) {
      const currentIds = new Set((state.snippets || []).map((s) => s.id));
      const toDelete = existingSnippets.filter((row) => !currentIds.has(row.id)).map((row) => row.id);
      if (toDelete.length > 0) {
        await supabase.from('snippets').delete().in('id', toDelete);
      }
    }

    // --- Saved Concepts ---
    const conceptRows = (state.savedConcepts || []).map((c) => ({
      id: c.id,
      data: c,
      updated_at: new Date().toISOString(),
    }));
    if (conceptRows.length > 0) {
      const { error } = await supabase.from('saved_concepts').upsert(conceptRows, { onConflict: 'id' });
      if (error) console.error('[Supabase] saved_concepts sync error:', error.message);
    }
    const { data: existingConcepts } = await supabase.from('saved_concepts').select('id');
    if (existingConcepts) {
      const currentIds = new Set((state.savedConcepts || []).map((c) => c.id));
      const toDelete = existingConcepts.filter((row) => !currentIds.has(row.id)).map((row) => row.id);
      if (toDelete.length > 0) {
        await supabase.from('saved_concepts').delete().in('id', toDelete);
      }
    }

    console.log('[Supabase] Sync complete ✓');
  } catch (err) {
    console.error('[Supabase] Sync failed:', err);
  }
}

/**
 * Load all data from Supabase on app start.
 */
async function loadFromSupabase(): Promise<{
  partners: Partner[];
  projects: Project[];
  snippets: SavedSnippet[];
  savedConcepts: SavedConcept[];
  currentProjectId: string | null;
}> {
  try {
    const [partnersRes, projectsRes, snippetsRes, conceptsRes] = await Promise.all([
      supabase.from('partners').select('data'),
      supabase.from('projects').select('data'),
      supabase.from('snippets').select('data'),
      supabase.from('saved_concepts').select('data'),
    ]);

    const partners: Partner[] = (partnersRes.data || []).map((row) => row.data as Partner);
    const projects: Project[] = (projectsRes.data || []).map((row) => row.data as Project);
    const snippets: SavedSnippet[] = (snippetsRes.data || []).map((row) => row.data as SavedSnippet);
    const savedConcepts: SavedConcept[] = (conceptsRes.data || []).map((row) => row.data as SavedConcept);

    console.log(
      '[Supabase] Loaded:',
      partners.length, 'partners,',
      projects.length, 'projects,',
      snippets.length, 'snippets,',
      savedConcepts.length, 'concepts'
    );

    return {
      partners,
      projects,
      snippets,
      savedConcepts,
      currentProjectId: projects[0]?.id || null,
    };
  } catch (err) {
    console.error('[Supabase] Load failed:', err);
    return { partners: [], projects: [], snippets: [], savedConcepts: [], currentProjectId: null };
  }
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AppState {
  // Hydration status
  isHydrated: boolean;

  // Partners
  partners: Partner[];
  addPartner: (partner: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  getPartner: (id: string) => Partner | undefined;

  // Projects
  projects: Project[];
  currentProjectId: string | null;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | undefined;

  // Consortium Management
  addConsortiumMember: (projectId: string, partnerId: string, role: 'COORDINATOR' | 'PARTNER') => void;
  removeConsortiumMember: (projectId: string, memberId: string) => void;
  updateConsortiumMember: (projectId: string, memberId: string, updates: Partial<ConsortiumMember>) => void;

  // Work Package Management
  addWorkPackage: (projectId: string, wp: Omit<WorkPackage, 'id'>) => string;
  updateWorkPackage: (projectId: string, wpId: string, updates: Partial<WorkPackage>) => void;
  deleteWorkPackage: (projectId: string, wpId: string) => void;

  // Results Management
  addResult: (projectId: string, result: Omit<ProjectResult, 'id'>) => string;
  updateResult: (projectId: string, resultId: string, updates: Partial<ProjectResult>) => void;
  deleteResult: (projectId: string, resultId: string) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Text-Snippets
  snippets: SavedSnippet[];
  addSnippet: (snippet: Omit<SavedSnippet, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSnippet: (id: string, updates: Partial<SavedSnippet>) => void;
  deleteSnippet: (id: string) => void;

  // Saved Concepts
  savedConcepts: SavedConcept[];
  addSavedConcept: (concept: Omit<SavedConcept, 'id' | 'createdAt'>) => string;
  deleteSavedConcept: (id: string) => void;

  // Import/Export
  exportData: () => string;
  importData: (jsonString: string) => void;
  clearAllData: () => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const createDefaultProject = (): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  acronym: '',
  status: 'DRAFT',
  actionType: 'KA220',
  sector: 'VET',
  budgetTier: 250000,
  duration: 24,
  callYear: new Date().getFullYear(),
  horizontalPriorities: [],
  problemStatement: '',
  rootCauses: [],
  statistics: [],
  targetGroups: [],
  objectives: [],
  consortium: [],
  workPackages: [],
  results: [],
  indicators: [],
  disseminationChannels: [],
  multiplierEvents: [],
});

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppState>()(
  (set, get) => ({
    // ========== HYDRATION ==========
    isHydrated: false,

    // ========== PARTNERS ==========
    partners: [],

    addPartner: (partnerData) => {
      const id = uuidv4();
      const now = new Date();
      const partner: Partner = {
        ...partnerData,
        id,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        partners: [...state.partners, partner],
      }));
      scheduleSyncToSupabase();
      return id;
    },

    updatePartner: (id, updates) => {
      set((state) => ({
        partners: state.partners.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    deletePartner: (id) => {
      set((state) => ({
        partners: state.partners.filter((p) => p.id !== id),
        // Also remove from any project consortiums
        projects: state.projects.map((proj) => ({
          ...proj,
          consortium: proj.consortium.filter((m) => m.partnerId !== id),
        })),
      }));
      scheduleSyncToSupabase();
    },

    getPartner: (id) => {
      return get().partners.find((p) => p.id === id);
    },

    // ========== PROJECTS ==========
    projects: [],
    currentProjectId: null,

    addProject: (projectData) => {
      const id = uuidv4();
      const now = new Date();
      const project: Project = {
        ...projectData,
        id,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        projects: [...state.projects, project],
        currentProjectId: id,
      }));
      scheduleSyncToSupabase();
      return id;
    },

    updateProject: (id, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    deleteProject: (id) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      }));
      scheduleSyncToSupabase();
    },

    setCurrentProject: (id) => {
      set({ currentProjectId: id });
      // Don't sync currentProjectId to Supabase (local UI state)
    },

    getCurrentProject: () => {
      const state = get();
      return state.projects.find((p) => p.id === state.currentProjectId);
    },

    // ========== CONSORTIUM MANAGEMENT ==========
    addConsortiumMember: (projectId, partnerId, role) => {
      const memberId = uuidv4();
      const project = get().projects.find((p) => p.id === projectId);
      if (!project) return;

      // Check if partner already in consortium
      if (project.consortium.some((m) => m.partnerId === partnerId)) return;

      // If adding coordinator, demote existing coordinator
      let updatedConsortium = [...project.consortium];
      if (role === 'COORDINATOR') {
        updatedConsortium = updatedConsortium.map((m) =>
          m.role === 'COORDINATOR' ? { ...m, role: 'PARTNER' as const } : m
        );
      }

      const newMember: ConsortiumMember = {
        id: memberId,
        partnerId,
        role,
        budgetShare: 0,
        workPackageLeadership: [],
      };

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              consortium: [...updatedConsortium, newMember],
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    removeConsortiumMember: (projectId, memberId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              consortium: p.consortium.filter((m) => m.id !== memberId),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    updateConsortiumMember: (projectId, memberId, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              consortium: p.consortium.map((m) =>
                m.id === memberId ? { ...m, ...updates } : m
              ),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    // ========== WORK PACKAGE MANAGEMENT ==========
    addWorkPackage: (projectId, wpData) => {
      const id = uuidv4();
      const wp: WorkPackage = { ...wpData, id };

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              workPackages: [...p.workPackages, wp],
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
      return id;
    },

    updateWorkPackage: (projectId, wpId, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              workPackages: p.workPackages.map((wp) =>
                wp.id === wpId ? { ...wp, ...updates } : wp
              ),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    deleteWorkPackage: (projectId, wpId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              workPackages: p.workPackages.filter((wp) => wp.id !== wpId),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    // ========== RESULTS MANAGEMENT ==========
    addResult: (projectId, resultData) => {
      const id = uuidv4();
      const result: ProjectResult = { ...resultData, id };

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              results: [...p.results, result],
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
      return id;
    },

    updateResult: (projectId, resultId, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              results: p.results.map((r) =>
                r.id === resultId ? { ...r, ...updates } : r
              ),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    deleteResult: (projectId, resultId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              results: p.results.filter((r) => r.id !== resultId),
              updatedAt: new Date(),
            }
            : p
        ),
      }));
      scheduleSyncToSupabase();
    },

    // ========== UI STATE ==========
    sidebarOpen: true,

    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }));
    },

    // ========== TEXT-SNIPPETS ==========
    snippets: [],

    addSnippet: (snippetData) => {
      const id = uuidv4();
      const now = new Date();
      const snippet: SavedSnippet = {
        ...snippetData,
        id,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        snippets: [...state.snippets, snippet],
      }));
      scheduleSyncToSupabase();
      return id;
    },

    updateSnippet: (id, updates) => {
      set((state) => ({
        snippets: state.snippets.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
        ),
      }));
      scheduleSyncToSupabase();
    },

    deleteSnippet: (id) => {
      set((state) => ({
        snippets: state.snippets.filter((s) => s.id !== id),
      }));
      scheduleSyncToSupabase();
    },

    // ========== SAVED CONCEPTS ==========
    savedConcepts: [],

    addSavedConcept: (conceptData) => {
      const id = uuidv4();
      const now = new Date();
      const concept: SavedConcept = {
        ...conceptData,
        id,
        createdAt: now,
      };
      set((state) => ({
        savedConcepts: [...state.savedConcepts, concept],
      }));
      scheduleSyncToSupabase();
      return id;
    },

    deleteSavedConcept: (id) => {
      set((state) => ({
        savedConcepts: state.savedConcepts.filter((c) => c.id !== id),
      }));
      scheduleSyncToSupabase();
    },

    // ========== IMPORT/EXPORT ==========
    exportData: () => {
      const state = get();
      return JSON.stringify(
        {
          partners: state.partners,
          projects: state.projects,
          snippets: state.snippets,
          savedConcepts: state.savedConcepts,
          exportedAt: new Date().toISOString(),
          version: '2.0-supabase',
        },
        null,
        2
      );
    },

    importData: (jsonString) => {
      try {
        const data = JSON.parse(jsonString);
        if (data.partners && data.projects) {
          set({
            partners: data.partners,
            projects: data.projects,
            snippets: data.snippets || [],
            savedConcepts: data.savedConcepts || [],
            currentProjectId: data.projects[0]?.id || null,
          });
          scheduleSyncToSupabase();
        }
      } catch (e) {
        console.error('Import failed:', e);
      }
    },

    clearAllData: () => {
      set({
        partners: [],
        projects: [],
        currentProjectId: null,
        snippets: [],
        savedConcepts: [],
      });
      scheduleSyncToSupabase();
    },
  })
);

// ============================================================================
// HYDRATE FROM SUPABASE ON APP START
// ============================================================================

if (typeof window !== 'undefined') {
  loadFromSupabase().then((data) => {
    useAppStore.setState({
      partners: data.partners,
      projects: data.projects,
      snippets: data.snippets,
      savedConcepts: data.savedConcepts,
      currentProjectId: data.currentProjectId,
      isHydrated: true,
    });
    console.log('[Store] Hydrated from Supabase ✓');
  }).catch((err) => {
    console.error('[Store] Hydration failed, starting with empty state:', err);
    useAppStore.setState({ isHydrated: true });
  });
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

export const usePartners = () => useAppStore((state) => state.partners);
export const useProjects = () => useAppStore((state) => state.projects);
export const useCurrentProject = () => {
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  return projects.find((p) => p.id === currentProjectId);
};
