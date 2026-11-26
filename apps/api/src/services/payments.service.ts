import type { CreatePaymentInput, CreateRefundInput } from "@mealware/shared";
import * as paymentsRepository from "../repositories/payments.repository.js";
import { DatePeriod } from "../utils/date-range.js";

interface CreatePaymentServiceInput extends CreatePaymentInput {
  orderId: string;
  restaurantId: string;
  createdBy: string;
}

interface GetPaymentsByOrderServiceInput {
  orderId: string;
  restaurantId: string;
}

interface CreateRefundServiceInput extends CreateRefundInput {
  paymentId: string;
  restaurantId: string;
  createdBy: string;
}

interface GetRefundsByPaymentServiceInput {
  paymentId: string;
  restaurantId: string;
}

interface GetPaymentsPaginatedServiceInput {
  restaurantId: string;
  page: number;
  limit: number;
  period: DatePeriod;
  method?: CreatePaymentInput["method"];
  orderNumber?: number;
}

export const createPayment = async ({
  orderId,
  restaurantId,
  createdBy,
  ...input
}: CreatePaymentServiceInput) => {
  return paymentsRepository.createPayment({
    orderId,
    restaurantId,
    createdBy,
    ...input,
  });
};

export const getPaymentsByOrder = async ({
  orderId,
  restaurantId,
}: GetPaymentsByOrderServiceInput) => {
  return paymentsRepository.getPaymentsByOrder({
    orderId,
    restaurantId,
  });
};

export const createRefund = async ({
  paymentId,
  restaurantId,
  createdBy,
  ...input
}: CreateRefundServiceInput) => {
  return paymentsRepository.createRefund({
    paymentId,
    restaurantId,
    createdBy,
    ...input,
  });
};

export const getRefundsByPayment = async ({
  paymentId,
  restaurantId,
}: GetRefundsByPaymentServiceInput) => {
  return paymentsRepository.getRefundsByPayment({
    paymentId,
    restaurantId,
  });
};

export const getPaymentsPaginated = async (
  input: GetPaymentsPaginatedServiceInput,
) => {
  return paymentsRepository.getPaymentsPaginated(input);
};
