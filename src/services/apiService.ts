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
  getProjectBuilds: (projectId: string) => Promise<ApiResponse<any[]>>;
  createProjectBuild: (data: any) => Promise<ApiResponse<any>>;
  updateProjectBuild: (id: string, data: any) => Promise<ApiResponse<any>>;
  deleteProjectBuild: (id: string) => Promise<ApiResponse<void>>;
  getBuildMappings: (buildId: string) => Promise<ApiResponse<any[]>>;
  createBuildMapping: (data: any) => Promise<ApiResponse<void>>;
  deleteBuildMapping: (buildId: string, equipmentType: string, equipmentId: string) => Promise<ApiResponse<void>>;
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
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        } catch { return false; }
      }
      return false;
    }
    const result = await this.fetch<{ message: string }>('/health');
    return result.success;
  }

  // Authentication - supports web service URL
  async verifyLogin(username: string, password: string): Promise<{ valid: boolean; isAdmin: boolean }> {
    if (this.currentMode === 'local') {
      // Try web service first
      try {
        const wsUrl = `http://191.168.1.23/giwes?user=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(wsUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 0) {
            const isOnDuty = data.empstatus === 'onduty';
            const isQA = data.empteam === 'QA';
            if (isOnDuty && isQA) {
              return { valid: true, isAdmin: data.isAdmin === true };
            }
            return { valid: false, isAdmin: false };
          }
        }
      } catch {
        // Web service unavailable, fall back to local auth
      }

      // Fallback local users
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
        try { return await electron.auth.verifyLogin(username, password); }
        catch { return { valid: false, isAdmin: false }; }
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
    if (this.currentMode === 'local') return storageService.getProjects();
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getProjects()).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<Project[]>('/projects')).data || [];
  }

  async checkProjectDuplicate(name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.checkDuplicate('projects', { name }, excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.checkProjectDuplicate(name, excludeId)).data?.exists || false; } catch { return false; } }
      return false;
    }
    return (await this.fetch<{ exists: boolean }>(`/projects/check-duplicate?name=${encodeURIComponent(name)}${excludeId ? `&excludeId=${excludeId}` : ''}`)).data?.exists || false;
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> {
    if (this.currentMode === 'local') return storageService.saveProject(project);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createProject(project)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Project>('/projects', { method: 'POST', body: JSON.stringify(project) })).data || null;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (this.currentMode === 'local') return storageService.updateProject(id, updates);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.updateProject(id, updates)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) })).data || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (this.currentMode === 'local') return storageService.deleteProject(id);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteProject(id)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/projects/${id}`, { method: 'DELETE' })).success;
  }

  // Equipment (Global Bucket)
  async getEquipment(type: string): Promise<Equipment[]> {
    if (this.currentMode === 'local') return storageService.getEquipment(type);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getEquipment(type)).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<Equipment[]>(`/equipment/${type}`)).data || [];
  }

  async saveEquipment(type: string, equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment | null> {
    if (this.currentMode === 'local') return storageService.saveEquipment(type, equipment, 'global');
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createEquipment(type, equipment)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Equipment>(`/equipment/${type}`, { method: 'POST', body: JSON.stringify(equipment) })).data || null;
  }

  async updateEquipment(type: string, id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
    if (this.currentMode === 'local') return storageService.updateEquipment(type, id, updates);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.updateEquipment(type, id, updates)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Equipment>(`/equipment/${type}/${id}`, { method: 'PUT', body: JSON.stringify(updates) })).data || null;
  }

  async deleteEquipment(type: string, id: string): Promise<boolean> {
    if (this.currentMode === 'local') return storageService.deleteEquipment(type, id);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteEquipment(type, id)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/equipment/${type}/${id}`, { method: 'DELETE' })).success;
  }

  // Enhanced duplicate check - supports multiple fields
  async checkDuplicate(type: string, name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.checkDuplicate(type, { name }, excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.checkEquipmentDuplicate(type, name, excludeId)).data?.exists || false; } catch { return false; } }
      return false;
    }
    return (await this.fetch<{ exists: boolean }>(`/equipment/${type}/check-duplicate?name=${encodeURIComponent(name)}&excludeId=${excludeId || ''}`)).data?.exists || false;
  }

  // Multi-field duplicate check (e.g., name + frequency for LNB)
  async checkDuplicateByFields(type: string, fields: Record<string, string>, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.checkDuplicate(type, fields, excludeId);
    }
    // For non-local modes, fall back to name-only check
    if (fields.name) {
      return this.checkDuplicate(type, fields.name, excludeId);
    }
    return false;
  }

  // Custom Types (admin-managed)
  getCustomTypes(category: 'lnb_band' | 'switch_type' | 'motor_type'): string[] {
    return storageService.getCustomTypes(category);
  }

  addCustomType(category: 'lnb_band' | 'switch_type' | 'motor_type', value: string): boolean {
    return storageService.addCustomType(category, value);
  }

  deleteCustomType(category: 'lnb_band' | 'switch_type' | 'motor_type', value: string): void {
    storageService.deleteCustomType(category, value);
  }

  // Satellites
  async getSatellites(): Promise<Equipment[]> {
    if (this.currentMode === 'local') return storageService.getEquipment('satellites');
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getSatellites()).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<Equipment[]>('/satellites')).data || [];
  }

  async checkSatelliteDuplicate(name: string, excludeId?: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      return storageService.checkDuplicate('satellites', { name }, excludeId);
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.checkSatelliteDuplicate(name, excludeId)).data?.exists || false; } catch { return false; } }
      return false;
    }
    return (await this.fetch<{ exists: boolean }>(`/satellites/check-duplicate?name=${encodeURIComponent(name)}${excludeId ? `&excludeId=${excludeId}` : ''}`)).data?.exists || false;
  }

  async saveSatellite(satellite: any): Promise<Equipment | null> {
    if (this.currentMode === 'local') return storageService.saveEquipment('satellites', satellite, 'global');
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createSatellite(satellite)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Equipment>('/satellites', { method: 'POST', body: JSON.stringify(satellite) })).data || null;
  }

  async updateSatellite(id: string, updates: any): Promise<Equipment | null> {
    if (this.currentMode === 'local') return storageService.updateEquipment('satellites', id, updates);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.updateSatellite(id, updates)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<Equipment>(`/satellites/${id}`, { method: 'PUT', body: JSON.stringify(updates) })).data || null;
  }

  async deleteSatellite(id: string): Promise<boolean> {
    if (this.currentMode === 'local') return storageService.deleteEquipment('satellites', id);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteSatellite(id)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/satellites/${id}`, { method: 'DELETE' })).success;
  }

  // Project Mappings
  async getProjectMappings(projectId: string): Promise<any[]> {
    if (this.currentMode === 'local') return storageService.getProjectMappings(projectId);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getProjectMappings(projectId)).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<any[]>(`/project-mappings/${projectId}`)).data || [];
  }

  async addProjectMapping(projectId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      storageService.addProjectMapping({ projectId, equipmentType, equipmentId });
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createProjectMapping({ projectId, equipmentType, equipmentId })).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch('/project-mappings', { method: 'POST', body: JSON.stringify({ projectId, equipmentType, equipmentId }) })).success;
  }

  async removeProjectMapping(projectId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') {
      storageService.removeProjectMapping(projectId, equipmentType, equipmentId);
      return true;
    }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteProjectMapping(projectId, equipmentType, equipmentId)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/project-mappings/${projectId}/${equipmentType}/${equipmentId}`, { method: 'DELETE' })).success;
  }

  // BIN operations
  async generateBin(xmlData: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return await electron.bin.generate(xmlData); } catch (error) { return { success: false, error: String(error) }; } }
    }
    return await this.fetch<string>('/bin/generate', { method: 'POST', body: JSON.stringify({ xmlData }) });
  }

  async importBin(binData: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return await electron.bin.import(binData); } catch (error) { return { success: false, error: String(error) }; } }
    }
    return await this.fetch<string>('/bin/import', { method: 'POST', body: JSON.stringify({ binData }) });
  }

  // File operations (Electron only)
  async saveFile(data: any, filename: string, type: string): Promise<{ success: boolean; filePath?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { const r = await electron.file.saveFile(data, filename, type); return { success: r.success, filePath: r.data?.filePath }; } catch { return { success: false }; } }
    }
    return { success: false };
  }

  async openFile(filters?: any[]): Promise<{ success: boolean; data?: string; filename?: string }> {
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { const r = await electron.file.openFile(filters); return { success: r.success, data: r.data?.data, filename: r.data?.filename }; } catch { return { success: false }; } }
    }
    return { success: false };
  }

  // Create project from XML data
  async createProjectFromXML(projectData: any, createdBy: string): Promise<Project | null> {
    const project = await this.saveProject({ name: projectData.name, description: projectData.description || '', createdBy });
    if (!project) return null;
    const equipmentTypes = ['lnbs', 'switches', 'motors', 'unicables', 'satellites'];
    for (const type of equipmentTypes) {
      if (projectData[type]) {
        for (const item of projectData[type]) {
          const saved = type === 'satellites' ? await this.saveSatellite(item) : await this.saveEquipment(type, item);
          if (saved) await this.addProjectMapping(project.id, type, saved.id);
        }
      }
    }
    return project;
  }

  // Activities
  async getActivities(): Promise<UserActivity[]> {
    if (this.currentMode === 'local') return storageService.getActivities();
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) {
        try {
          const result = await electron.database.getActivities();
          return Array.isArray(result) ? result : (result?.data || []);
        } catch (error) {
          console.error('Failed to get activities from Electron:', error);
          return [];
        }
      }
      return [];
    }
    return (await this.fetch<UserActivity[]>('/activities')).data || [];
  }

  async logActivity(username: string, action: string, details: string, projectId: string): Promise<void> {
    if (this.currentMode === 'local') { storageService.logActivity(username, action, details, projectId); return; }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { await electron.database.createActivity({ username, action, details, projectId }); } catch (error) { console.error('Failed to log activity:', error); } }
      return;
    }
    await this.fetch('/activities', { method: 'POST', body: JSON.stringify({ username, action, details, projectId }) });
  }

  // Project Builds
  async getProjectBuilds(projectId: string): Promise<any[]> {
    if (this.currentMode === 'local') return storageService.getProjectBuilds(projectId);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getProjectBuilds(projectId)).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<any[]>(`/builds/project/${projectId}`)).data || [];
  }

  async createProjectBuild(data: { projectId: string; name: string; description?: string; xmlData?: string; createdBy?: string }): Promise<any | null> {
    if (this.currentMode === 'local') return storageService.createProjectBuild(data);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createProjectBuild(data)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<any>('/builds', { method: 'POST', body: JSON.stringify(data) })).data || null;
  }

  async updateProjectBuild(id: string, data: any): Promise<any | null> {
    if (this.currentMode === 'local') return storageService.updateProjectBuild(id, data);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.updateProjectBuild(id, data)).data || null; } catch { return null; } }
      return null;
    }
    return (await this.fetch<any>(`/builds/${id}`, { method: 'PUT', body: JSON.stringify(data) })).data || null;
  }

  async deleteProjectBuild(id: string): Promise<boolean> {
    if (this.currentMode === 'local') return storageService.deleteProjectBuild(id);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteProjectBuild(id)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/builds/${id}`, { method: 'DELETE' })).success;
  }

  // Build Mappings
  async getBuildMappings(buildId: string): Promise<any[]> {
    if (this.currentMode === 'local') return storageService.getBuildMappings(buildId);
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.getBuildMappings(buildId)).data || []; } catch { return []; } }
      return [];
    }
    return (await this.fetch<any[]>(`/builds/${buildId}/mappings`)).data || [];
  }

  async addBuildMapping(buildId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') { storageService.addBuildMapping({ buildId, equipmentType, equipmentId }); return true; }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.createBuildMapping({ buildId, equipmentType, equipmentId })).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/builds/${buildId}/mappings`, { method: 'POST', body: JSON.stringify({ equipmentType, equipmentId }) })).success;
  }

  async removeBuildMapping(buildId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (this.currentMode === 'local') { storageService.removeBuildMapping(buildId, equipmentType, equipmentId); return true; }
    if (this.currentMode === 'electron') {
      const electron = this.getElectronAPI();
      if (electron) { try { return (await electron.database.deleteBuildMapping(buildId, equipmentType, equipmentId)).success; } catch { return false; } }
      return false;
    }
    return (await this.fetch(`/builds/${buildId}/mappings/${equipmentType}/${equipmentId}`, { method: 'DELETE' })).success;
  }
}

export const apiService = new ApiService();
