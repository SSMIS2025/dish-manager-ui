// JSON-based storage service for local data persistence

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

class StorageService {
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Projects
  getProjects(): Project[] {
    const projects = localStorage.getItem('sdb_projects');
    return projects ? JSON.parse(projects) : [];
  }

  saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const projects = this.getProjects();
    const newProject: Project = {
      ...project,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.push(newProject);
    localStorage.setItem('sdb_projects', JSON.stringify(projects));
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('sdb_projects', JSON.stringify(projects));
    return projects[index];
  }

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem('sdb_projects', JSON.stringify(filtered));
    
    // Also delete all equipment for this project
    ['lnbs', 'switches', 'motors', 'unicables', 'satellites'].forEach(type => {
      const equipment = this.getEquipment(type);
      const filtered = equipment.filter(e => e.projectId !== id);
      localStorage.setItem(`sdb_${type}`, JSON.stringify(filtered));
    });
    
    return true;
  }

  // Equipment (LNB, Switch, Motor, Unicable, Satellite)
  getEquipment(type: string, projectId?: string): Equipment[] {
    const equipment = localStorage.getItem(`sdb_${type}`);
    const allEquipment = equipment ? JSON.parse(equipment) : [];
    return projectId ? allEquipment.filter((e: Equipment) => e.projectId === projectId) : allEquipment;
  }

  saveEquipment(type: string, equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>, projectId: string): Equipment {
    const allEquipment = this.getEquipment(type);
    const newEquipment: Equipment = {
      ...equipment,
      id: this.generateId(),
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    allEquipment.push(newEquipment);
    localStorage.setItem(`sdb_${type}`, JSON.stringify(allEquipment));
    return newEquipment;
  }

  updateEquipment(type: string, id: string, updates: Partial<Equipment>): Equipment | null {
    const allEquipment = this.getEquipment(type);
    const index = allEquipment.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    allEquipment[index] = { ...allEquipment[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(`sdb_${type}`, JSON.stringify(allEquipment));
    return allEquipment[index];
  }

  deleteEquipment(type: string, id: string): boolean {
    const allEquipment = this.getEquipment(type);
    const filtered = allEquipment.filter(e => e.id !== id);
    localStorage.setItem(`sdb_${type}`, JSON.stringify(filtered));
    return true;
  }

  // User Activities
  getActivities(): UserActivity[] {
    const activities = localStorage.getItem('sdb_activities');
    return activities ? JSON.parse(activities) : [];
  }

  logActivity(username: string, action: string, details: string, projectId: string): void {
    const activities = this.getActivities();
    const activity: UserActivity = {
      id: this.generateId(),
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
      projectId
    };
    activities.unshift(activity); // Add to beginning
    
    // Keep only last 1000 activities
    if (activities.length > 1000) {
      activities.splice(1000);
    }
    
    localStorage.setItem('sdb_activities', JSON.stringify(activities));
  }

  // Import/Export
  exportProject(projectId: string): any {
    const project = this.getProjects().find(p => p.id === projectId);
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

  // Initialize with default data if empty
  initialize(): void {
    if (this.getProjects().length === 0) {
      this.saveProject({
        name: "Default Project",
        description: "Default satellite equipment project",
        createdBy: "admin"
      });
    }
  }
}

export const storageService = new StorageService();
