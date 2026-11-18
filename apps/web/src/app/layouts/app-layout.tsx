import { Outlet } from "react-router";

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-16 items-center border-b bg-white px-6">
        <h1 className="text-xl font-bold">Mealware</h1>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
