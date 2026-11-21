import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrders,
  updateOrderStatus,
  type OrderStatus,
} from "../api/orders-api";

export const ORDERS_QUERY_KEY = ["orders"];

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrders,
    refetchInterval: 5_000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORDERS_QUERY_KEY,
      });
    },
  });
}
