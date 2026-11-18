import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, login, logout, type LoginRequest } from "../api/auth-api";

export const AUTH_QUERY_KEY = ["auth", "me"];

export const useAuth = () => {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      await login(credentials);

      return getMe();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: AUTH_QUERY_KEY,
      });
    },
  });
};
