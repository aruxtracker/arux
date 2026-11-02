import { useRef, useState, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 72;
const MAX_PULL = 120;

/** Native-feeling pull-to-refresh for the scrollable app shell. */
export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || refreshing) return;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setDistance(0); return; }
    // rubber-band resistance
    setDistance(Math.min(MAX_PULL, dy * 0.5));
  };

  const finish = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (distance >= THRESHOLD) {
      setRefreshing(true);
      setDistance(56);
      try { await onRefresh(); } finally {
        setTimeout(() => { setRefreshing(false); setDistance(0); }, 450);
      }
    } else {
      setDistance(0);
    }
  };

  const progress = Math.min(1, distance / THRESHOLD);

  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finish}
      onTouchCancel={finish}
      className={cn('relative flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide', className)}
    >
      {/* Indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{ height: distance, opacity: progress }}
      >
        <div
          className="mt-2 h-9 w-9 rounded-full glass flex items-center justify-center"
          style={{ transform: `scale(${0.7 + progress * 0.3})` }}
        >
          <RefreshCw
            className={cn('w-4 h-4 text-primary', refreshing && 'animate-spin')}
            strokeWidth={2}
            style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : undefined}
          />
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${distance}px)`,
          transition: pulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
