// API Service for MySQL backend communication
import { STORAGE_MODE, API_BASE_URL } from '@/config/database';
import { storageService, Equipment, Project, UserActivity } from './storageService';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

class ApiService {
  private loading = false;

  isLoading() {
    return this.loading;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    this.loading = true;
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: String(error) };
    } finally {
      this.loading = false;
    }
  }

  // Authentication
  async verifyLogin(username: string, password: string): Promise<{ valid: boolean; isAdmin: boolean }> {
    if (STORAGE_MODE === 'local') {
      // Local authentication
      const users = [
        { username: "admin", password: "admin123", isAdmin: true },
        { username: "user", password: "user123", isAdmin: false },
        { username: "operator", password: "op123", isAdmin: false }
      ];
      const user = users.find(u => u.username === username && u.password === password);
      return { valid: !!user, isAdmin: user?.isAdmin || false };
    }
    const result = await this.fetch<{ valid: boolean; isAdmin: boolean }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return result.data || { valid: false, isAdmin: false };
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    if (STORAGE_MODE === 'local') {
      return storageService.getProjects();
    }
    const result = await this.fetch<Project[]>('/projects');
    return result.data || [];
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.saveProject(project);
    }
    const result = await this.fetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
    return result.data || null;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.updateProject(id, updates);
    }
    const result = await this.fetch<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      return storageService.deleteProject(id);
    }
    const result = await this.fetch(`/projects/${id}`, { method: 'DELETE' });
    return result.success;
  }

  // Equipment (Global Bucket - no project filtering)
  async getEquipment(type: string): Promise<Equipment[]> {
    if (STORAGE_MODE === 'local') {
      return storageService.getEquipment(type);
    }
    const result = await this.fetch<Equipment[]>(`/equipment/${type}`);
    return result.data || [];
  }

  async saveEquipment(type: string, equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.saveEquipment(type, equipment, 'global');
    }
    const result = await this.fetch<Equipment>(`/equipment/${type}`, {
      method: 'POST',
      body: JSON.stringify(equipment),
    });
    return result.data || null;
  }

  async updateEquipment(type: string, id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.updateEquipment(type, id, updates);
    }
    const result = await this.fetch<Equipment>(`/equipment/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  async deleteEquipment(type: string, id: string): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      return storageService.deleteEquipment(type, id);
    }
    const result = await this.fetch(`/equipment/${type}/${id}`, { method: 'DELETE' });
    return result.success;
  }

  async checkDuplicate(type: string, name: string, excludeId?: string): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      const equipment = storageService.getEquipment(type);
      return equipment.some(e => e.name.toLowerCase() === name.toLowerCase() && e.id !== excludeId);
    }
    const result = await this.fetch<{ exists: boolean }>(`/equipment/${type}/check-duplicate?name=${encodeURIComponent(name)}&excludeId=${excludeId || ''}`);
    return result.data?.exists || false;
  }

  // Satellites with Carriers and Services
  async getSatellites(): Promise<Equipment[]> {
    if (STORAGE_MODE === 'local') {
      return storageService.getEquipment('satellites');
    }
    const result = await this.fetch<Equipment[]>('/satellites');
    return result.data || [];
  }

  async saveSatellite(satellite: any): Promise<Equipment | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.saveEquipment('satellites', satellite, 'global');
    }
    const result = await this.fetch<Equipment>('/satellites', {
      method: 'POST',
      body: JSON.stringify(satellite),
    });
    return result.data || null;
  }

  async updateSatellite(id: string, updates: any): Promise<Equipment | null> {
    if (STORAGE_MODE === 'local') {
      return storageService.updateEquipment('satellites', id, updates);
    }
    const result = await this.fetch<Equipment>(`/satellites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.data || null;
  }

  // Project Equipment Mappings
  async getProjectMappings(projectId: string): Promise<any[]> {
    if (STORAGE_MODE === 'local') {
      const mappings = localStorage.getItem('sdb_project_mappings');
      const allMappings = mappings ? JSON.parse(mappings) : [];
      return allMappings.filter((m: any) => m.projectId === projectId);
    }
    const result = await this.fetch<any[]>(`/project-mappings/${projectId}`);
    return result.data || [];
  }

  async saveProjectMapping(mapping: { projectId: string; equipmentType: string; equipmentId: string }): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      const mappings = localStorage.getItem('sdb_project_mappings');
      const allMappings = mappings ? JSON.parse(mappings) : [];
      
      // Check if mapping already exists
      const exists = allMappings.some((m: any) => 
        m.projectId === mapping.projectId && 
        m.equipmentType === mapping.equipmentType && 
        m.equipmentId === mapping.equipmentId
      );
      
      if (!exists) {
        allMappings.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...mapping,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('sdb_project_mappings', JSON.stringify(allMappings));
      }
      return true;
    }
    const result = await this.fetch('/project-mappings', {
      method: 'POST',
      body: JSON.stringify(mapping),
    });
    return result.success;
  }

  async deleteProjectMapping(projectId: string, equipmentType: string, equipmentId: string): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      const mappings = localStorage.getItem('sdb_project_mappings');
      const allMappings = mappings ? JSON.parse(mappings) : [];
      const filtered = allMappings.filter((m: any) => 
        !(m.projectId === projectId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
      );
      localStorage.setItem('sdb_project_mappings', JSON.stringify(filtered));
      return true;
    }
    const result = await this.fetch(`/project-mappings/${projectId}/${equipmentType}/${equipmentId}`, {
      method: 'DELETE',
    });
    return result.success;
  }

  async importProjectMappings(sourceProjectId: string, targetProjectId: string): Promise<boolean> {
    if (STORAGE_MODE === 'local') {
      const mappings = localStorage.getItem('sdb_project_mappings');
      const allMappings = mappings ? JSON.parse(mappings) : [];
      const sourceMappings = allMappings.filter((m: any) => m.projectId === sourceProjectId);
      
      sourceMappings.forEach((m: any) => {
        const exists = allMappings.some((em: any) => 
          em.projectId === targetProjectId && 
          em.equipmentType === m.equipmentType && 
          em.equipmentId === m.equipmentId
        );
        
        if (!exists) {
          allMappings.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId: targetProjectId,
            equipmentType: m.equipmentType,
            equipmentId: m.equipmentId,
            createdAt: new Date().toISOString()
          });
        }
      });
      
      localStorage.setItem('sdb_project_mappings', JSON.stringify(allMappings));
      return true;
    }
    const result = await this.fetch('/project-mappings/import', {
      method: 'POST',
      body: JSON.stringify({ sourceProjectId, targetProjectId }),
    });
    return result.success;
  }

  // Activities
  async getActivities(): Promise<UserActivity[]> {
    if (STORAGE_MODE === 'local') {
      return storageService.getActivities();
    }
    const result = await this.fetch<UserActivity[]>('/activities');
    return result.data || [];
  }

  async logActivity(username: string, action: string, details: string, projectId: string): Promise<void> {
    if (STORAGE_MODE === 'local') {
      storageService.logActivity(username, action, details, projectId);
      return;
    }
    await this.fetch('/activities', {
      method: 'POST',
      body: JSON.stringify({ username, action, details, projectId }),
    });
  }

  // Bin Generation
  async generateBin(projectId: string, xmlData: string): Promise<{ success: boolean; binPath?: string; error?: string }> {
    if (STORAGE_MODE === 'local') {
      // Mock response for local mode
      return { 
        success: true, 
        binPath: `/tmp/project_${projectId}.bin`,
        error: 'Bin generation requires MySQL mode with backend server'
      };
    }
    const result = await this.fetch<{ binPath: string }>('/projects/generate-bin', {
      method: 'POST',
      body: JSON.stringify({ projectId, xmlData }),
    });
    return { 
      success: result.success, 
      binPath: result.data?.binPath,
      error: result.error 
    };
  }

  async createProjectFromBin(binPath: string): Promise<{ success: boolean; xmlData?: string; error?: string }> {
    if (STORAGE_MODE === 'local') {
      return { 
        success: false, 
        error: 'Bin import requires MySQL mode with backend server'
      };
    }
    const result = await this.fetch<{ xmlData: string }>('/projects/import-bin', {
      method: 'POST',
      body: JSON.stringify({ binPath }),
    });
    return { 
      success: result.success, 
      xmlData: result.data?.xmlData,
      error: result.error 
    };
  }
}

export const apiService = new ApiService();