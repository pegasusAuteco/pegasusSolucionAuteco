/**
 * Dark/light theme toggle button.
 *
 * Uses the themeStore to toggle between light and dark modes,
 * displaying a Moon icon in light mode and Sun icon in dark mode.
 */
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@store/themeStore';

export default function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors flex items-center justify-center"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
    </button>
  );
}
