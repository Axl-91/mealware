import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  createPayment,
  createRefund,
  getOrders,
  updateOrderStatus,
  type OrderStatus,
} from "../api/orders-api";
import type {
  CreateOrderInput,
  CreatePaymentInput,
  CreateRefundInput,
} from "@mealware/shared";

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
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
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
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
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
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderInput) => createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORDERS_QUERY_KEY,
      });
    },
  });
}
