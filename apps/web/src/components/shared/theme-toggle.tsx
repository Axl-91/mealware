import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Cambiar tema"
      onClick={toggleTheme}
      className={`relative flex h-9 w-18 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 ${isDark ? "bg-[#344967]" : "bg-slate-200"
        }`}
    >
      <Sun
        size={17}
        className={`absolute left-2 transition-colors ${isDark ? "text-slate-400" : "text-amber-500"
          }`}
      />

      <Moon
        size={17}
        className={`absolute right-2 transition-colors ${isDark ? "text-blue-100" : "text-slate-400"
          }`}
      />

      <span
        className={`relative z-10 flex size-7 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${isDark ? "translate-x-9" : "translate-x-0"
          }`}
      >
        {isDark ? (
          <Moon size={15} className="text-[#243B61]" />
        ) : (
          <Sun size={15} className="text-amber-500" />
        )}
      </span>
    </button>
  );
}
