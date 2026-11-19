import { LoaderCircle } from "lucide-react";

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Cargando..." }: PageLoaderProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-background">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
