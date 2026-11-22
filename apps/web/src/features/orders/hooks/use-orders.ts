import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPayment,
  createRefund,
  getOrders,
  updateOrderStatus,
  type OrderStatus,
} from "../api/orders-api";
import type { CreatePaymentInput, CreateRefundInput } from "@mealware/shared";

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

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: CreatePaymentInput;
    }) => createPayment(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORDERS_QUERY_KEY,
      });
    },
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: CreateRefundInput;
    }) => createRefund(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORDERS_QUERY_KEY,
      });
    },
  });
}
