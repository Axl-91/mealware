import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@mealware/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "../api/users-api";
import { useCreateUser, useUpdateUser } from "../hooks/use-users";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

type UserFormValues = Omit<CreateUserInput, "password"> & {
  password?: string;
};

export function UserDialog({
  open,
  onOpenChange,
  user,
}: UserDialogProps) {
  const isEditing = Boolean(user);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing ? updateUserSchema : createUserSchema,
    ) as unknown as Resolver<UserFormValues>,
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      ...(!isEditing && { password: "" }),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: user?.name ?? "",
        email: user?.email ?? "",
        ...(!isEditing && { password: "" }),
      });
    }
  }, [open, user, isEditing, form]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (user) {
        const input: UpdateUserInput = {
          name: values.name,
          email: values.email,
        };

        await updateMutation.mutateAsync({
          userId: user.id,
          input,
        });
      } else {
        const input: CreateUserInput = {
          name: values.name,
          email: values.email,
          password: values.password!,
        };

        await createMutation.mutateAsync(input);
      }

      onOpenChange(false);
      form.reset();
    } catch {
      // The mutation error is handled by the UI below.
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del usuario."
              : "Ingresá los datos del nuevo usuario."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre</Label>
            <Input
              id="user-name"
              placeholder="Ej. Juan Pérez"
              maxLength={120}
              {...form.register("name")}
              disabled={isPending}
            />

            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="usuario@ejemplo.com"
              maxLength={255}
              {...form.register("email")}
              disabled={isPending}
            />

            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="user-password">Contraseña</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
                disabled={isPending}
              />

              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </p>
            </div>
          )}

          {mutationError && (
            <p className="text-sm text-destructive">
              {mutationError.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
