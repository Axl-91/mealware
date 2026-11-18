import type { CreatePaymentInput, CreateRefundInput } from "@mealware/shared";
import * as paymentsRepository from "../repositories/payments.repository.js";

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
