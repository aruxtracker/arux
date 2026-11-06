import { cn } from '@/lib/utils';
import aruxWordmark from '@/assets/arux-wordmark.png';
import aruxWordmarkWhite from '@/assets/arux-wordmark-white.png';
import { AruxMascot } from './AruxMascot';

export function BrandMark({
  className,
  alt = 'ARUX',
  withMascot = false,
}: {
  className?: string;
  alt?: string;
  withMascot?: boolean;
}) {
  if (withMascot) {
    return (
      <div className={cn('flex items-center gap-2 min-w-0', className)}>
        <AruxMascot size="sm" />
        <span className="block flex-1 min-w-0">
          <img src={aruxWordmark} alt={alt} className="block h-auto w-full dark:hidden" />
          <img src={aruxWordmarkWhite} alt="" aria-hidden="true" className="hidden h-auto w-full dark:block" />
        </span>
      </div>
    );
  }

  return (
    <span className={cn('block', className)}>
      <img src={aruxWordmark} alt={alt} className="block h-auto w-full dark:hidden" />
      <img src={aruxWordmarkWhite} alt="" aria-hidden="true" className="hidden h-auto w-full dark:block" />
    </span>
  );
}
