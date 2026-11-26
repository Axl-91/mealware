import { useQuery } from "@tanstack/react-query";
import { getPayments, type GetPaymentsParams } from "../api/payments-api";

export const PAYMENTS_QUERY_KEY = ["payments"];

export function usePayments(params: GetPaymentsParams) {
  return useQuery({
    queryKey: [...PAYMENTS_QUERY_KEY, params],
    queryFn: () => getPayments(params),
  });
}
