// Unified JSON-based storage service - ALL equipment in single store

import type { CustomTypeCategory } from '@/config/equipmentTypes';

export interface Equipment {
  id: string;
  name?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  [key: string]: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivity {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  projectId: string;
}

export interface CustomType {
  id: string;
  category: CustomTypeCategory;
  value: string;
  createdAt: string;
}

// Unified data store structure
interface SDBStore {
  projects: Project[];
  lnbs: Equipment[];
  switches: Equipment[];
  motors: Equipment[];
  unicables: Equipment[];
  satellites: Equipment[];
  project_mappings: any[];
  build_mappings: any[];
  project_builds: any[];
  activities: UserActivity[];
  custom_types: CustomType[];
  mapping_overrides: Record<string, any>;
  user_favorites: Record<string, string[]>; // username -> [projectId]
  last_selected_project: string; // last selected project ID
}

const STORE_KEY = 'sdb_unified_store';

class StorageService {
  private store: SDBStore;

  constructor() {
    this.store = this.loadStore();
  }

  private loadStore(): SDBStore {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.ensureDefaults(parsed);
      }
    } catch {}
    return this.migrateFromLegacy();
  }

  private ensureDefaults(store: Partial<SDBStore>): SDBStore {
    return {
      projects: store.projects || [],
      lnbs: store.lnbs || [],
      switches: store.switches || [],
      motors: store.motors || [],
      unicables: store.unicables || [],
      satellites: store.satellites || [],
      project_mappings: store.project_mappings || [],
      build_mappings: store.build_mappings || [],
      project_builds: store.project_builds || [],
      activities: store.activities || [],
      custom_types: store.custom_types || [],
      mapping_overrides: store.mapping_overrides || {},
      user_favorites: store.user_favorites || {},
      last_selected_project: store.last_selected_project || '',
    };
  }

  private migrateFromLegacy(): SDBStore {
    const parse = (key: string) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    };
    const store: SDBStore = {
      projects: parse('sdb_projects'),
      lnbs: parse('sdb_lnbs'),
      switches: parse('sdb_switches'),
      motors: parse('sdb_motors'),
      unicables: parse('sdb_unicables'),
      satellites: parse('sdb_satellites'),
      project_mappings: parse('sdb_project_mappings'),
      build_mappings: parse('sdb_build_mappings'),
      project_builds: parse('sdb_project_builds'),
      activities: parse('sdb_activities'),
      custom_types: [],
      mapping_overrides: {},
      user_favorites: {},
      last_selected_project: '',
    };
    this.saveStore(store);
    ['sdb_projects','sdb_lnbs','sdb_switches','sdb_motors','sdb_unicables','sdb_satellites',
     'sdb_project_mappings','sdb_build_mappings','sdb_project_builds','sdb_activities'].forEach(k => localStorage.removeItem(k));
    return store;
  }

  private saveStore(store?: SDBStore) {
    if (store) this.store = store;
    localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========== Custom Types (admin-managed) ==========
  getCustomTypes(category: CustomTypeCategory): string[] {
    return this.store.custom_types.filter(t => t.category === category).map(t => t.value);
  }

  addCustomType(category: CustomTypeCategory, value: string): boolean {
    const exists = this.store.custom_types.some(t => t.category === category && t.value.toLowerCase() === value.toLowerCase());
    if (exists) return false;
    this.store.custom_types.push({ id: this.generateId(), category, value, createdAt: new Date().toISOString() });
    this.saveStore();
    return true;
  }

  deleteCustomType(category: CustomTypeCategory, value: string): void {
    this.store.custom_types = this.store.custom_types.filter(t => !(t.category === category && t.value === value));
    this.saveStore();
  }

  // ========== Mapping Overrides ==========
  private overrideKey(buildId: string, type: string, id: string): string {
    return `${buildId}_${type}_${id}`;
  }

  getMappingOverride(buildId: string, type: string, id: string): any | null {
    return this.store.mapping_overrides[this.overrideKey(buildId, type, id)] || null;
  }

  setMappingOverride(buildId: string, type: string, id: string, data: any): void {
    this.store.mapping_overrides[this.overrideKey(buildId, type, id)] = {
      ...data,
      _overrideUpdatedAt: new Date().toISOString(),
    };
    this.saveStore();
  }

  getEquipmentWithOverrides(type: string, buildId: string): Equipment[] {
    const items = this.getEquipment(type);
    if (!buildId) return items;
    return items.map(item => {
      const override = this.getMappingOverride(buildId, type, item.id);
      if (override) {
        return { ...item, ...override, id: item.id };
      }
      return item;
    });
  }

  // ========== User Favorites ==========
  getUserFavorites(username: string): string[] {
    return this.store.user_favorites[username] || [];
  }

  toggleUserFavorite(username: string, projectId: string): boolean {
    const current = this.store.user_favorites[username] || [];
    const idx = current.indexOf(projectId);
    if (idx >= 0) {
      current.splice(idx, 1);
      this.store.user_favorites[username] = current;
      this.saveStore();
      return false; // removed
    } else {
      this.store.user_favorites[username] = [...current, projectId];
      this.saveStore();
      return true; // added
    }
  }

  // ========== Last Selected Project ==========
  getLastSelectedProject(): string | null {
    return this.store.last_selected_project || null;
  }

  setLastSelectedProject(projectId: string): void {
    this.store.last_selected_project = projectId;
    this.saveStore();
  }

  // ========== Projects ==========
  getProjects(): Project[] {
    return this.store.projects;
  }

  saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const newProject: Project = {
      ...project,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.store.projects.push(newProject);
    this.saveStore();
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const index = this.store.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.store.projects[index] = { ...this.store.projects[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveStore();
    return this.store.projects[index];
  }

  deleteProject(id: string): boolean {
    this.store.projects = this.store.projects.filter(p => p.id !== id);
    this.store.project_mappings = this.store.project_mappings.filter(m => m.projectId !== id);
    const buildIds = this.store.project_builds.filter(b => b.projectId === id).map(b => b.id);
    this.store.project_builds = this.store.project_builds.filter(b => b.projectId !== id);
    this.store.build_mappings = this.store.build_mappings.filter(m => !buildIds.includes(m.buildId));
    buildIds.forEach(bId => {
      Object.keys(this.store.mapping_overrides).forEach(key => {
        if (key.startsWith(`${bId}_`)) delete this.store.mapping_overrides[key];
      });
    });
    // Clean favorites
    Object.keys(this.store.user_favorites).forEach(username => {
      this.store.user_favorites[username] = (this.store.user_favorites[username] || []).filter(pid => pid !== id);
    });
    this.saveStore();
    return true;
  }

  // ========== Equipment ==========
  getEquipment(type: string, projectId?: string): Equipment[] {
    const key = type as keyof SDBStore;
    const items = (this.store[key] as Equipment[]) || [];
    return projectId ? items.filter(e => e.projectId === projectId) : items;
  }

  saveEquipment(type: string, equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>, projectId: string): Equipment {
    const newEquipment: Equipment = {
      ...equipment,
      id: this.generateId(),
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const key = type as keyof SDBStore;
    (this.store[key] as Equipment[]).push(newEquipment);
    this.saveStore();
    return newEquipment;
  }

  updateEquipment(type: string, id: string, updates: Partial<Equipment>): Equipment | null {
    const key = type as keyof SDBStore;
    const items = this.store[key] as Equipment[];
    const index = items.findIndex(e => e.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveStore();
    return items[index];
  }

  deleteEquipment(type: string, id: string): boolean {
    const key = type as keyof SDBStore;
    (this.store[key] as Equipment[]) = (this.store[key] as Equipment[]).filter(e => e.id !== id);
    this.store.project_mappings = this.store.project_mappings.filter(m => !(m.equipmentType === type && m.equipmentId === id));
    this.store.build_mappings = this.store.build_mappings.filter(m => !(m.equipmentType === type && m.equipmentId === id));
    Object.keys(this.store.mapping_overrides).forEach(oKey => {
      if (oKey.endsWith(`_${type}_${id}`)) delete this.store.mapping_overrides[oKey];
    });
    this.saveStore();
    return true;
  }

  checkDuplicate(type: string, fields: Record<string, string>, excludeId?: string): boolean {
    const key = type as keyof SDBStore;
    const items = (this.store[key] as Equipment[]) || [];
    return items.some(item => {
      if (item.id === excludeId) return false;
      return Object.entries(fields).every(([k, v]) => {
        const itemVal = String(item[k] || '').toLowerCase().trim();
        const checkVal = String(v || '').toLowerCase().trim();
        return itemVal === checkVal && checkVal !== '';
      });
    });
  }

  // ========== User Activities ==========
  getActivities(): UserActivity[] {
    return this.store.activities;
  }

  logActivity(username: string, action: string, details: string, projectId: string): void {
    const activity: UserActivity = {
      id: this.generateId(),
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
      projectId
    };
    this.store.activities.unshift(activity);
    if (this.store.activities.length > 1000) {
      this.store.activities.splice(1000);
    }
    this.saveStore();
  }

  // ========== Project Mappings ==========
  getProjectMappings(projectId: string): any[] {
    return this.store.project_mappings.filter(m => m.projectId === projectId);
  }

  addProjectMapping(data: any): void {
    const exists = this.store.project_mappings.some(m => 
      m.projectId === data.projectId && m.equipmentType === data.equipmentType && m.equipmentId === data.equipmentId
    );
    if (!exists) {
      this.store.project_mappings.push({ id: this.generateId(), ...data, createdAt: new Date().toISOString() });
      this.saveStore();
    }
  }

  removeProjectMapping(projectId: string, equipmentType: string, equipmentId: string): void {
    this.store.project_mappings = this.store.project_mappings.filter(m => 
      !(m.projectId === projectId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
    );
    this.saveStore();
  }

  // ========== Project Builds ==========
  getProjectBuilds(projectId: string): any[] {
    return this.store.project_builds.filter(b => b.projectId === projectId);
  }

  createProjectBuild(data: any): any {
    const build = { id: this.generateId(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.store.project_builds.push(build);
    this.saveStore();
    return build;
  }

  updateProjectBuild(id: string, data: any): any | null {
    const index = this.store.project_builds.findIndex(b => b.id === id);
    if (index === -1) return null;
    this.store.project_builds[index] = { ...this.store.project_builds[index], ...data, updatedAt: new Date().toISOString() };
    this.saveStore();
    return this.store.project_builds[index];
  }

  deleteProjectBuild(id: string): boolean {
    this.store.project_builds = this.store.project_builds.filter(b => b.id !== id);
    this.store.build_mappings = this.store.build_mappings.filter(m => m.buildId !== id);
    Object.keys(this.store.mapping_overrides).forEach(key => {
      if (key.startsWith(`${id}_`)) delete this.store.mapping_overrides[key];
    });
    this.saveStore();
    return true;
  }

  // ========== Build Mappings ==========
  getBuildMappings(buildId: string): any[] {
    return this.store.build_mappings.filter(m => m.buildId === buildId);
  }

  addBuildMapping(data: any): void {
    const exists = this.store.build_mappings.some(m => 
      m.buildId === data.buildId && m.equipmentType === data.equipmentType && m.equipmentId === data.equipmentId
    );
    if (!exists) {
      this.store.build_mappings.push({ id: this.generateId(), ...data, createdAt: new Date().toISOString() });
      this.saveStore();
    }
  }

  removeBuildMapping(buildId: string, equipmentType: string, equipmentId: string): void {
    this.store.build_mappings = this.store.build_mappings.filter(m => 
      !(m.buildId === buildId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
    );
    delete this.store.mapping_overrides[this.overrideKey(buildId, equipmentType, equipmentId)];
    this.saveStore();
  }

  // ========== Import/Export ==========
  exportProject(projectId: string): any {
    const project = this.store.projects.find(p => p.id === projectId);
    if (!project) return null;
    return {
      project,
      equipment: {
        lnbs: this.getEquipment('lnbs', projectId),
        switches: this.getEquipment('switches', projectId),
        motors: this.getEquipment('motors', projectId),
        unicables: this.getEquipment('unicables', projectId),
        satellites: this.getEquipment('satellites', projectId)
      }
    };
  }

  importProject(data: any, targetProjectId: string): boolean {
    try {
      const { equipment } = data;
      Object.keys(equipment).forEach(type => {
        const items = equipment[type];
        items.forEach((item: any) => {
          const { id, projectId, createdAt, updatedAt, ...equipmentData } = item;
          this.saveEquipment(type, equipmentData, targetProjectId);
        });
      });
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  initialize(): void {
    if (this.store.projects.length === 0) {
      this.saveProject({
        name: "Default Project",
        description: "Default satellite equipment project",
        createdBy: "admin"
      });
    }
  }
}

export const storageService = new StorageService();
