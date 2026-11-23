import {
  ORDER_STATUSES,
  ORDER_TYPES,
  type CreateOrderInput,
  type CreatePaymentInput,
  type CreateRefundInput,
} from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: number;
  order_date: string;
  type: OrderType;
  status: OrderStatus;
  customer_name: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  payment_status: PaymentStatus | null;
  outstanding_amount: string | null;
}

export interface GetOrdersResponse {
  orders: Order[];
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  unit_price: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface OrderRefund {
  id: string;
  amount: string;
  created_by: string;
  created_at: string;
}

export interface OrderPayment {
  id: string;
  method: "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";
  amount: string;
  created_by: string;
  created_at: string;
  refunds: OrderRefund[];
}

export interface OrderDetail extends Omit<Order, "outstanding_amount"> {
  total: string;
  items: OrderItem[];
  payments: OrderPayment[];
}

export interface GetOrderByIdResponse {
  order: OrderDetail;
}

export interface CreatePaymentResponse {
  payment: OrderPayment;
}

export interface CreateRefundResponse {
  refund: OrderRefund;
}

export interface CreateOrderResponse {
  order: OrderDetail;
}

export const getOrders = () => apiRequest<GetOrdersResponse>("/orders");

export const getOrderById = (id: string) =>
  apiRequest<GetOrderByIdResponse>(`/orders/${id}`);

export const updateOrderStatus = (orderId: string, status: OrderStatus) =>
  apiRequest<GetOrderByIdResponse>(`/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const createPayment = (orderId: string, data: CreatePaymentInput) =>
  apiRequest<CreatePaymentResponse>(`/orders/${orderId}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createRefund = (paymentId: string, data: CreateRefundInput) =>
  apiRequest<CreateRefundResponse>(`/payments/${paymentId}/refunds`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const createOrder = (data: CreateOrderInput) =>
  apiRequest<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
