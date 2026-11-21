import { ORDER_STATUSES, ORDER_TYPES } from "@mealware/shared";
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

export const getOrders = () => apiRequest<GetOrdersResponse>("/orders");

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

interface GetOrderByIdResponse {
  order: OrderDetail;
}

export const getOrderById = (id: string) =>
  apiRequest<GetOrderByIdResponse>(`/orders/${id}`);

export const updateOrderStatus = (orderId: string, status: OrderStatus) =>
  apiRequest<GetOrderByIdResponse>(`/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
