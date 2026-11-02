import { cn } from '@/lib/utils';
import aruxWordmark from '@/assets/arux-wordmark.png';
import aruxWordmarkWhite from '@/assets/arux-wordmark-white.png';

export function BrandMark({ className, alt = 'ARUX' }: { className?: string; alt?: string }) {
  return (
    <span className={cn('block', className)}>
      <img src={aruxWordmark} alt={alt} className="block h-auto w-full dark:hidden" />
      <img src={aruxWordmarkWhite} alt="" aria-hidden="true" className="hidden h-auto w-full dark:block" />
    </span>
  );
}