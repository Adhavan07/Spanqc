import { apiClient } from "./client";
import { Project } from "@/types";
import { INITIAL_PROJECTS } from "../data/sample-data";

export async function listProjectsApi(): Promise<Project[]> {
  try {
    return await apiClient<Project[]>("/api/v1/projects");
  } catch {
    return INITIAL_PROJECTS;
  }
}

export async function getProjectApi(projectId: string): Promise<Project> {
  try {
    return await apiClient<Project>(`/api/v1/projects/${projectId}`);
  } catch {
    const found = INITIAL_PROJECTS.find((p) => p.id === projectId);
    if (!found) throw new Error("Project not found");
    return found;
  }
}

export async function createProjectApi(data: { name: string; description?: string; standard?: string }): Promise<Project> {
  try {
    return await apiClient<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      organization_id: "org-spandsons",
      name: data.name,
      description: data.description || "",
      standard: data.standard || "IPC/WHMA-A-620D",
      created_at: new Date().toISOString(),
      document_count: 0,
      report_count: 0,
      status: "ACTIVE",
    };
    INITIAL_PROJECTS.unshift(newProj);
    return newProj;
  }
}
