import { apiRequest } from "@/lib/api";

export type PaymentMethod = "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";

export type PaymentPeriod =
  "today" | "yesterday" | "last_7_days" | "last_30_days" | "all";

export type PaymentMovementType = "PAYMENT" | "REFUND";

export interface PaymentMovement {
  id: string;
  type: PaymentMovementType;
  order_id: string;
  order_number: number;
  method: PaymentMethod;
  amount: string;
  created_at: string;
  payment_id: string | null;
}

export interface GetPaymentsParams {
  page: number;
  limit: number;
  period: PaymentPeriod;
  method?: PaymentMethod;
  orderNumber?: number;
}

export interface GetPaymentsResponse {
  movements: PaymentMovement[];
  summary: {
    totalReceived: string;
    totalRefunded: string;
    netTotal: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getPayments = (params: GetPaymentsParams) => {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    period: params.period,
  });

  if (params.method) {
    searchParams.set("method", params.method);
  }

  if (params.orderNumber) {
    searchParams.set("orderNumber", String(params.orderNumber));
  }

  return apiRequest<GetPaymentsResponse>(
    `/payments?${searchParams.toString()}`,
  );
};
