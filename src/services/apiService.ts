// API Service for multi-mode backend communication (Local, MySQL, Electron)
import { STORAGE_MODE, API_BASE_URL, isElectron, StorageMode } from '@/config/database';
import { storageService, Equipment, Project, UserActivity } from './storageService';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

// Electron IPC interface matching preload.js
interface ElectronDatabaseAPI {
  getProjects: () => Promise<ApiResponse<Project[]>>;
  createProject: (data: any) => Promise<ApiResponse<Project>>;
  updateProject: (id: string, data: any) => Promise<ApiResponse<Project>>;
  deleteProject: (id: string) => Promise<ApiResponse<void>>;
  checkProjectDuplicate: (name: string, excludeId?: string) => Promise<ApiResponse<{ exists: boolean }>>;
  getEquipment: (type: string) => Promise<ApiResponse<Equipment[]>>;
  createEquipment: (type: string, data: any) => Promise<ApiResponse<Equipment>>;
  updateEquipment: (type: string, id: string, data: any) => Promise<ApiResponse<Equipment>>;
  deleteEquipment: (type: string, id: string) => Promise<ApiResponse<void>>;
  checkEquipmentDuplicate: (type: string, name: string, excludeId?: string) => Promise<ApiResponse<{ exists: boolean }>>;
  getSatellites: () => Promise<ApiResponse<Equipment[]>>;
  createSatellite: (data: any) => Promise<ApiResponse<Equipment>>;
  updateSatellite: (id: string, data: any) => Promise<ApiResponse<Equipment>>;
  deleteSatellite: (id: string) => Promise<ApiResponse<void>>;
  checkSatelliteDuplicate: (name: string, excludeId?: string) => Promise<ApiResponse<{ exists: boolean }>>;
  getProjectMappings: (projectId: string) => Promise<ApiResponse<any[]>>;
  createProjectMapping: (data: any) => Promise<ApiResponse<void>>;
  deleteProjectMapping: (projectId: string, equipmentType: string, equipmentId: string) => Promise<ApiResponse<void>>;
  // Project Builds
  getProjectBuilds: (projectId: string) => Promise<ApiResponse<any[]>>;
  createProjectBuild: (data: any) => Promise<ApiResponse<any>>;
  updateProjectBuild: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteProjectBuild: (id: string) => Promise<ApiResponse<void>>;
  // Build Mappings
  getBuildMappings: (buildId: string) => Promise<ApiResponse<any[]>>;
  createBuildMapping: (data: any) => Promise<ApiResponse<void>>;
  deleteBuildMapping: (buildId: string, equipmentType: string, equipmentId: string) => Promise<ApiResponse<void>>;
  // Activities
  getActivities: () => Promise<ApiResponse<UserActivity[]>>;
  createActivity: (data: any) => Promise<ApiResponse<void>>;
}

interface ElectronAuthAPI {
  verifyLogin: (username: string, password: string) => Promise<{ valid: boolean; isAdmin: boolean }>;
}

interface ElectronBinAPI {
  generate: (xmlData: string) => Promise<ApiResponse<string>>;
  import: (binData: string) => Promise<ApiResponse<string>>;
  checkExecutables: () => Promise<{ generator: boolean; parser: boolean }>;
  getExecutablePaths: () => Promise<{ generator: string; parser: string }>;
  setExecutablePaths: (generatorPath: string, parserPath: string) => Promise<ApiResponse<void>>;
}

interface ElectronFileAPI {
  saveFile: (data: any, filename: string, type: string) => Promise<ApiResponse<{ filePath: string }>>;
  openFile: (filters?: any[]) => Promise<ApiResponse<{ data: string; filename: string }>>;
  exportPdf: (data: string) => Promise<ApiResponse<{ filePath: string }>>;
  exportExcel: (data: string) => Promise<ApiResponse<{ filePath: string }>>;
  browseExecutable: () => Promise<ApiResponse<{ path: string }>>;
}

interface ElectronAPI {
  database: ElectronDatabaseAPI;
  auth: ElectronAuthAPI;
  bin: ElectronBinAPI;
  file: ElectronFileAPI;
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
  };
}

class ApiService {
  private loading = false;
  private currentMode: StorageMode;

  constructor() {
    // Auto-detect Electron mode
    this.currentMode = isElectron() ? 'electron' : STORAGE_MODE;
  }

  getStorageMode(): StorageMode {
    return this.currentMode;
  }

  isLoading() {
    return this.loading;
  }

  private getElectronAPI(): ElectronAPI | null {
    if (typeof window !== 'undefined' && (window as any).electron) {
      return (window as any).electron as ElectronAPI;
    }
    return null;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    this.loading = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('abort')) {
        return { success: false, error: 'Connection timeout. Please check if the backend server is running.' };
      }
      return { success: false, error: errorMessage };
    } finally {
      this.loading = false;
    }
  }

  // Database connection check
  async checkDatabaseConnection(): Promise<boolean> {
    if (this.currentMode === 'local') return true;
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getProjects();
          return result?.success || true;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch<{ message: string }>('/health');
    return result.success;
  }

  // Authentication
  async verifyLogin(username: string, password: string): Promise<{ valid: boolean; isAdmin: boolean }> {
    if (this.currentMode === 'local') {
      const users = [
        { username: "admin", password: "admin123", isAdmin: true },
        { username: "user", password: "user123", isAdmin: false },
        { username: "operator", password: "op123", isAdmin: false }
      ];
      const user = users.find(u => u.username === username && u.password === password);
      return { valid: !!user, isAdmin: user?.isAdmin || false };
    }
    
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          return await electron.auth.verifyLogin(username, password);
        } catch {
          return { valid: false, isAdmin: false };
        }
      }
      return { valid: false, isAdmin: false };
    }

    const result = await this.fetch<{ valid: boolean; isAdmin: boolean }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return result.data || { valid: false, isAdmin: false };
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    if (this.currentMode === 'local') {
      return storageService.getProjects();
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getProjects();
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<Project[]>('/projects');
    return result.data || [];
  }

  async checkProjectDuplicate(name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const projects = storageService.getProjects();
      return projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.checkProjectDuplicate(name, excludeId);
          return result.data?.exists || false;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch<{ exists: boolean }>(`/projects/check-duplicate?name=${encodeURIComponent(name)}${excludeId ? `&excludeId=${excludeId}` : ''}`);
    return result.data?.exists || false;
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> {
    if (this.currentMode === 'local') {
      return storageService.saveProject(project);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createProject(project);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
    return result.data || null;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (this.currentMode === 'local') {
      return storageService.updateProject(id, updates);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.updateProject(id, updates);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.deleteProject(id);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteProject(id);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/projects/${id}`, { method: 'DELETE' });
    return result.success;
  }

  // Equipment (Global Bucket)
  async getEquipment(type: string): Promise<Equipment[]> {
    if (this.currentMode === 'local') {
      return storageService.getEquipment(type);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getEquipment(type);
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<Equipment[]>(`/equipment/${type}`);
    return result.data || [];
  }

  async saveEquipment(type: string, equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment | null> {
    if (this.currentMode === 'local') {
      return storageService.saveEquipment(type, equipment, 'global');
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createEquipment(type, equipment);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Equipment>(`/equipment/${type}`, {
      method: 'POST',
      body: JSON.stringify(equipment),
    });
    return result.data || null;
  }

  async updateEquipment(type: string, id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
    if (this.currentMode === 'local') {
      return storageService.updateEquipment(type, id, updates);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.updateEquipment(type, id, updates);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Equipment>(`/equipment/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  async deleteEquipment(type: string, id: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.deleteEquipment(type, id);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteEquipment(type, id);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/equipment/${type}/${id}`, { method: 'DELETE' });
    return result.success;
  }

  async checkDuplicate(type: string, name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const equipment = storageService.getEquipment(type);
      return equipment.some(e => e.name.toLowerCase() === name.toLowerCase() && e.id !== excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.checkEquipmentDuplicate(type, name, excludeId);
          return result.data?.exists || false;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch<{ exists: boolean }>(`/equipment/${type}/check-duplicate?name=${encodeURIComponent(name)}&excludeId=${excludeId || ''}`);
    return result.data?.exists || false;
  }

  // Satellites with Carriers and Services
  async getSatellites(): Promise<Equipment[]> {
    if (this.currentMode === 'local') {
      return storageService.getEquipment('satellites');
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getSatellites();
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<Equipment[]>('/satellites');
    return result.data || [];
  }

  async checkSatelliteDuplicate(name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const satellites = storageService.getEquipment('satellites');
      return satellites.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.checkSatelliteDuplicate(name, excludeId);
          return result.data?.exists || false;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch<{ exists: boolean }>(`/satellites/check-duplicate?name=${encodeURIComponent(name)}${excludeId ? `&excludeId=${excludeId}` : ''}`);
    return result.data?.exists || false;
  }

  async saveSatellite(satellite: any): Promise<Equipment | null> {
    if (this.currentMode === 'local') {
      return storageService.saveEquipment('satellites', satellite, 'global');
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createSatellite(satellite);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Equipment>('/satellites', {
      method: 'POST',
      body: JSON.stringify(satellite),
    });
    return result.data || null;
  }

  async updateSatellite(id: string, updates: any): Promise<Equipment | null> {
    if (this.currentMode === 'local') {
      return storageService.updateEquipment('satellites', id, updates);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.updateSatellite(id, updates);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<Equipment>(`/satellites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  async deleteSatellite(id: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.deleteEquipment('satellites', id);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteSatellite(id);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/satellites/${id}`, { method: 'DELETE' });
    return result.success;
  }

  // Project Mappings
  async getProjectMappings(projectId: string): Promise<any[]> {
    if (this.currentMode === 'local') {
      const mappings = JSON.parse(localStorage.getItem('sdb_project_mappings') || '[]');
      return mappings.filter((m: any) => m.projectId === projectId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getProjectMappings(projectId);
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<any[]>(`/project-mappings/${projectId}`);
    return result.data || [];
  }

  async addProjectMapping(projectId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const mappingsKey = 'sdb_project_mappings';
      const mappings = JSON.parse(localStorage.getItem(mappingsKey) || '[]');
      const exists = mappings.some((m: any) => 
        m.projectId === projectId && m.equipmentType === equipmentType && m.equipmentId === equipmentId
      );
      if (!exists) {
        mappings.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          equipmentType,
          equipmentId,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(mappingsKey, JSON.stringify(mappings));
      }
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createProjectMapping({ projectId, equipmentType, equipmentId });
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch('/project-mappings', {
      method: 'POST',
      body: JSON.stringify({ projectId, equipmentType, equipmentId }),
    });
    return result.success;
  }

  async removeProjectMapping(projectId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const mappingsKey = 'sdb_project_mappings';
      const mappings = JSON.parse(localStorage.getItem(mappingsKey) || '[]');
      const filtered = mappings.filter((m: any) => 
        !(m.projectId === projectId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
      );
      localStorage.setItem(mappingsKey, JSON.stringify(filtered));
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteProjectMapping(projectId, equipmentType, equipmentId);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/project-mappings/${projectId}/${equipmentType}/${equipmentId}`, {
      method: 'DELETE',
    });
    return result.success;
  }

  // BIN operations
  async generateBin(xmlData: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          return await electron.bin.generate(xmlData);
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
    }
    const result = await this.fetch<string>('/bin/generate', {
      method: 'POST',
      body: JSON.stringify({ xmlData }),
    });
    return result;
  }

  async importBin(binData: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          return await electron.bin.import(binData);
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
    }
    const result = await this.fetch<string>('/bin/import', {
      method: 'POST',
      body: JSON.stringify({ binData }),
    });
    return result;
  }

  // File operations (Electron only)
  async saveFile(data: any, filename: string, type: string): Promise<{ success: boolean; filePath?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.file.saveFile(data, filename, type);
          return { success: result.success, filePath: result.data?.filePath };
        } catch {
          return { success: false };
        }
      }
    }
    // For non-electron, use browser download
    return { success: false };
  }

  async openFile(filters?: any[]): Promise<{ success: boolean; data?: string; filename?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.file.openFile(filters);
          return { success: result.success, data: result.data?.data, filename: result.data?.filename };
        } catch {
          return { success: false };
        }
      }
    }
    return { success: false };
  }

  // Create project from XML data
  async createProjectFromXML(projectData: any, createdBy: string): Promise<Project | null> {
    const project = await this.saveProject({
      name: projectData.name,
      description: projectData.description || '',
      createdBy
    });
    
    if (!project) return null;
    
    // Create equipment and mappings
    const equipmentTypes = ['lnbs', 'switches', 'motors', 'unicables', 'satellites'];
    
    for (const type of equipmentTypes) {
      if (projectData[type]) {
        for (const item of projectData[type]) {
          const saved = type === 'satellites' 
            ? await this.saveSatellite(item)
            : await this.saveEquipment(type, item);
          if (saved) {
            await this.addProjectMapping(project.id, type, saved.id);
          }
        }
      }
    }
    
    return project;
  }

  // Activities
  async getActivities(): Promise<UserActivity[]> {
    if (this.currentMode === 'local') {
      return storageService.getActivities();
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getActivities();
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<UserActivity[]>('/activities');
    return result.data || [];
  }

  async logActivity(username: string, action: string, details: string, projectId: string): Promise<void> {
    if (this.currentMode === 'local') {
      storageService.logActivity(username, action, details, projectId);
      return;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          await electron.database.createActivity({ username, action, details, projectId });
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
      }
      return;
    }
    await this.fetch('/activities', {
      method: 'POST',
      body: JSON.stringify({ username, action, details, projectId }),
    });
  }

  // Project Builds
  async getProjectBuilds(projectId: string): Promise<any[]> {
    if (this.currentMode === 'local') {
      const builds = JSON.parse(localStorage.getItem('sdb_project_builds') || '[]');
      return builds.filter((b: any) => b.projectId === projectId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getProjectBuilds(projectId);
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<any[]>(`/builds/project/${projectId}`);
    return result.data || [];
  }

  async createProjectBuild(data: { projectId: string; name: string; description?: string; xmlData?: string; createdBy?: string }): Promise<any | null> {
    if (this.currentMode === 'local') {
      const builds = JSON.parse(localStorage.getItem('sdb_project_builds') || '[]');
      const newBuild = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      builds.push(newBuild);
      localStorage.setItem('sdb_project_builds', JSON.stringify(builds));
      return newBuild;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createProjectBuild(data);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<any>('/builds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data || null;
  }

  async updateProjectBuild(id: string, data: any): Promise<any | null> {
    if (this.currentMode === 'local') {
      const builds = JSON.parse(localStorage.getItem('sdb_project_builds') || '[]');
      const index = builds.findIndex((b: any) => b.id === id);
      if (index === -1) return null;
      builds[index] = { ...builds[index], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem('sdb_project_builds', JSON.stringify(builds));
      return builds[index];
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.updateProjectBuild(id, data);
          return result.data || null;
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await this.fetch<any>(`/builds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.data || null;
  }

  async deleteProjectBuild(id: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const builds = JSON.parse(localStorage.getItem('sdb_project_builds') || '[]');
      const filtered = builds.filter((b: any) => b.id !== id);
      localStorage.setItem('sdb_project_builds', JSON.stringify(filtered));
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteProjectBuild(id);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/builds/${id}`, { method: 'DELETE' });
    return result.success;
  }

  // Build Mappings
  async getBuildMappings(buildId: string): Promise<any[]> {
    if (this.currentMode === 'local') {
      const mappings = JSON.parse(localStorage.getItem('sdb_build_mappings') || '[]');
      return mappings.filter((m: any) => m.buildId === buildId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getBuildMappings(buildId);
          return result.data || [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const result = await this.fetch<any[]>(`/builds/${buildId}/mappings`);
    return result.data || [];
  }

  async addBuildMapping(buildId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const mappings = JSON.parse(localStorage.getItem('sdb_build_mappings') || '[]');
      const exists = mappings.some((m: any) => 
        m.buildId === buildId && m.equipmentType === equipmentType && m.equipmentId === equipmentId
      );
      if (!exists) {
        mappings.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildId,
          equipmentType,
          equipmentId,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('sdb_build_mappings', JSON.stringify(mappings));
      }
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.createBuildMapping({ buildId, equipmentType, equipmentId });
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/builds/${buildId}/mappings`, {
      method: 'POST',
      body: JSON.stringify({ equipmentType, equipmentId }),
    });
    return result.success;
  }

  async removeBuildMapping(buildId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      const mappings = JSON.parse(localStorage.getItem('sdb_build_mappings') || '[]');
      const filtered = mappings.filter((m: any) => 
        !(m.buildId === buildId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
      );
      localStorage.setItem('sdb_build_mappings', JSON.stringify(filtered));
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.deleteBuildMapping(buildId, equipmentType, equipmentId);
          return result.success;
        } catch {
          return false;
        }
      }
      return false;
    }
    const result = await this.fetch(`/builds/${buildId}/mappings/${equipmentType}/${equipmentId}`, {
      method: 'DELETE',
    });
    return result.success;
  }
}

export const apiService = new ApiService();
