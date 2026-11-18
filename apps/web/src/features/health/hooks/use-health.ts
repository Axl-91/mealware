import { useQuery } from "@tanstack/react-query";
import { getHealth, getReadiness } from "../api/health-api";

export const useHealth = () => {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
  });
};

export const useReadiness = () => {
  return useQuery({
    queryKey: ["health", "readiness"],
    queryFn: getReadiness,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
};
