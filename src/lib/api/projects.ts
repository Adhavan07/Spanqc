import { apiClient } from "./client";
import { Project } from "@/types";

export async function listProjectsApi(): Promise<Project[]> {
  return await apiClient<Project[]>("/api/v1/projects");
}

export async function getProjectApi(projectId: string): Promise<Project> {
  return await apiClient<Project>(`/api/v1/projects/${projectId}`);
}

export async function createProjectApi(data: {
  name: string;
  description?: string;
  customer?: string;
  standard?: string;
}): Promise<Project> {
  return await apiClient<Project>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
