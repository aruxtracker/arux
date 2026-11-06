import { cn } from '@/lib/utils';
import diwaliMascot from '@/assets/diwali-mascot.jpg';

interface AruxMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiyaBadge?: boolean;
}

export function AruxMascot({
  className,
  size = 'md',
  showDiyaBadge = true,
}: AruxMascotProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-16 h-16 rounded-[22px]',
    xl: 'w-24 h-24 rounded-[30px]',
  };

  return (
    <div className={cn('relative shrink-0 inline-block', className)}>
      <div
        className={cn(
          'overflow-hidden shadow-sm border border-amber-400/50 bg-amber-500/10 p-0.5 transition-transform hover:scale-105 duration-200',
          sizeClasses[size]
        )}
      >
        <img
          src={diwaliMascot}
          alt="ARUX Diwali Mascot"
          className="w-full h-full object-cover rounded-[inherit]"
        />
      </div>
      {showDiyaBadge && (
        <span
          className={cn(
            'absolute leading-none select-none drop-shadow-sm',
            size === 'sm' && '-bottom-0.5 -right-0.5 text-[10px]',
            size === 'md' && '-bottom-1 -right-1 text-xs',
            size === 'lg' && '-bottom-1.5 -right-1.5 text-base',
            size === 'xl' && '-bottom-2 -right-2 text-xl'
          )}
          role="img"
          aria-label="Diwali Diya"
        >
          🪔
        </span>
      )}
    </div>
  );
}

