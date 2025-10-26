import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button 
      onClick={toggleTheme} 
      variant="ghost"
      size="icon"
      className={`${className} hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200`}
    >
      <span className="text-xl hover:scale-110 transition-transform">
        {isDark ? '☀️' : '🌙'}
      </span>
    </Button>
  );
}
