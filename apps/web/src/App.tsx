import { Button } from "@/components/ui/button";

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950">
      <h1 className="text-4xl font-bold text-white">
        Mealware
      </h1>

      <div className="flex gap-3">
        <Button>Iniciar sesión</Button>
        <Button variant="outline">Crear cuenta</Button>
        <Button variant="secondary">Más información</Button>
      </div>
    </main>
  );
}

export default App;
