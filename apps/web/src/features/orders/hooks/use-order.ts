import { useQuery } from "@tanstack/react-query";
import { getOrderById } from "../api/orders-api";
import { ORDERS_QUERY_KEY } from "./use-orders";

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "detail", orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await getOrderById(orderId);

      return response.order;
    },
    enabled: Boolean(orderId),
  });
}
