import { cn } from '@/lib/utils';
import diwaliMascot from '@/assets/diwali-mascot.jpg';

interface AruxMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AruxMascot({
  className,
  size = 'md',
}: AruxMascotProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-16 h-16 rounded-[22px]',
    xl: 'w-24 h-24 rounded-[30px]',
  };

  return (
    <div
      className={cn(
        'overflow-hidden shadow-sm shrink-0 border border-border/60 bg-muted/20 transition-transform duration-200',
        sizeClasses[size],
        className
      )}
    >
      <img
        src={diwaliMascot}
        alt="ARUX Logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
