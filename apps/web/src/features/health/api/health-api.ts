import { apiRequest } from "@/lib/api";

export interface HealthResponse {
  status: "ok";
}

export interface ReadinessResponse {
  status: "ok";
  checks: {
    database: "ok";
  };
}

export const getHealth = () => apiRequest<HealthResponse>("/health");

export const getReadiness = () =>
  apiRequest<ReadinessResponse>("/health/ready");
