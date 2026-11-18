import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Mealware
        </p>

        <h1 className="mt-6 text-8xl font-bold tracking-tight text-primary">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          Página no encontrada
        </h2>

        <p className="mt-3 text-muted-foreground">
          La página que estás buscando no existe o fue movida.
          Revisá la dirección o volvé al inicio.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate("/")}>
            Ir al dashboard
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Volver atrás
          </Button>
        </div>
      </div>
    </main>
  );
}
