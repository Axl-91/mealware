
import { useForm } from "react-hook-form";
import { useLogin } from "../hooks/use-auth";
import { useNavigate } from "react-router";
import type { LoginRequest } from "../api/auth-api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/", { replace: true });
      },
    });
  };

  return (
    <Card className="w-full max-w-lg border-0 bg-transparent shadow-none p-5">
      <CardHeader className="space-y-3 px-0">
        <div className="mb-2 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Bienvenido de nuevo
        </div>

        <CardTitle className="text-3xl font-bold tracking-tight">
          Iniciar sesión
        </CardTitle>

        <CardDescription className="text-sm leading-relaxed">
          Ingresá tus credenciales para acceder al panel de administración de
          Mealware.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

            <Input
              id="email"
              type="email"
              placeholder="admin@mealware.com"
              autoComplete="email"
              className="h-11 bg-background"
              {...register("email", {
                required: "El email es obligatorio",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Ingresá un email válido",
                },
              })}
            />

            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresá tu contraseña"
              className="h-11 bg-background"
              {...register("password", {
                required: "La contraseña es obligatoria",
              })}
            />

            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {loginMutation.isError && (
            <p
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {loginMutation.error.message}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full font-medium"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
