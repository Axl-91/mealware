import { LoginForm } from "../components/login-form";

export function LoginPage() {
  return (
    <main className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Branding panel */}
      <section className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full border border-primary-foreground/10" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-primary-foreground/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-primary-foreground/5" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 text-xl font-bold">
            M
          </div>

          <span className="text-xl font-semibold tracking-tight">
            Mealware
          </span>
        </div>

        <div className="relative max-w-lg space-y-6">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
            Gestión gastronómica
          </span>

          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Todo tu restaurante,
            <br />
            en un solo lugar.
          </h1>

          <p className="max-w-md text-base leading-relaxed text-primary-foreground/75 xl:text-lg">
            Organizá tus pedidos, administrá tus productos y mantené el control
            de tu negocio desde una sola plataforma.
          </p>

          <div className="flex flex-col gap-3 pt-4 text-sm text-primary-foreground/85">
            <div className="flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-primary-foreground/80" />
              Gestión de pedidos y ventas
            </div>

            <div className="flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-primary-foreground/80" />
              Control de productos y categorías
            </div>

            <div className="flex items-center gap-3">
              <span className="size-1.5 rounded-full bg-primary-foreground/80" />
              Información de tu negocio en tiempo real
            </div>
          </div>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Mealware. Todos los derechos reservados.
        </p>
      </section>

      {/* Login section */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            M
          </div>

          <span className="text-xl font-semibold tracking-tight">
            Mealware
          </span>
        </div>

        <LoginForm />

        <p className="mt-10 text-center text-xs text-muted-foreground lg:hidden">
          © {new Date().getFullYear()} Mealware.
        </p>
      </section>
    </main>
  );
}
