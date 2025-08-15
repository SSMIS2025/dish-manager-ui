import { createContext, useContext, useState, ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  equipment: {
    lnbs: any[];
    switches: any[];
    motors: any[];
    unicables: any[];
    satellites: any[];
  };
}

export interface UserActivity {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  projectId: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  userActivities: UserActivity[];
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description: string, username: string) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  importProjectData: (targetProjectId: string, sourceProject: Project) => void;
  logActivity: (username: string, action: string, details: string, projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Default Project",
      description: "Default satellite equipment project",
      createdBy: "admin",
      createdAt: new Date().toISOString(),
      equipment: {
        lnbs: [],
        switches: [],
        motors: [],
        unicables: [],
        satellites: []
      }
    }
  ]);
  
  const [currentProject, setCurrentProject] = useState<Project | null>(projects[0]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  const createProject = (name: string, description: string, username: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      description,
      createdBy: username,
      createdAt: new Date().toISOString(),
      equipment: {
        lnbs: [],
        switches: [],
        motors: [],
        unicables: [],
        satellites: []
      }
    };
    setProjects([...projects, newProject]);
    logActivity(username, "Project Created", `Created project: ${name}`, newProject.id);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject);
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(projects.length > 1 ? projects[0] : null);
    }
  };

  const importProjectData = (targetProjectId: string, sourceProject: Project) => {
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!targetProject) return;

    const updatedProject = {
      ...targetProject,
      equipment: {
        lnbs: [...targetProject.equipment.lnbs, ...sourceProject.equipment.lnbs],
        switches: [...targetProject.equipment.switches, ...sourceProject.equipment.switches],
        motors: [...targetProject.equipment.motors, ...sourceProject.equipment.motors],
        unicables: [...targetProject.equipment.unicables, ...sourceProject.equipment.unicables],
        satellites: [...targetProject.equipment.satellites, ...sourceProject.equipment.satellites]
      }
    };
    
    updateProject(updatedProject);
  };

  const logActivity = (username: string, action: string, details: string, projectId: string) => {
    const activity: UserActivity = {
      id: Date.now().toString(),
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
      projectId
    };
    setUserActivities([activity, ...userActivities]);
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      userActivities,
      setCurrentProject,
      createProject,
      updateProject,
      deleteProject,
      importProjectData,
      logActivity
    }}>
      {children}
    </ProjectContext.Provider>
  );
};