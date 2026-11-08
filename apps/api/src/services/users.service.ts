import type { CreateUserInput, UpdateUserInput } from "@mealware/shared";
import { hashPassword } from "../auth/password.js";
import * as usersRepository from "../repositories/users.repository.js";

export const createUser = async (
  input: CreateUserInput,
  restaurantId: string,
) => {
  const passwordHash = await hashPassword(input.password);

  return usersRepository.createUser({
    restaurantId,
    name: input.name,
    email: input.email,
    passwordHash,
  });
};

export const getUsers = async (restaurantId: string) => {
  return usersRepository.getUsers(restaurantId);
};

export const getUserById = async (userId: string, restaurantId: string) => {
  return usersRepository.getUserById(userId, restaurantId);
};

export const updateUser = async (
  userId: string,
  restaurantId: string,
  input: UpdateUserInput,
) => {
  return usersRepository.updateUser(userId, restaurantId, input);
};
