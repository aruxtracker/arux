import { useRef, useState, useCallback, ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** rounded radius class for the outer clip */
  radiusClass?: string;
  style?: React.CSSProperties;
}

const ACTION_WIDTH = 132; // px revealed when fully open

/**
 * iOS-style swipe row. Swipe left to reveal Edit / Delete actions.
 * Falls back gracefully on desktop (actions revealed on hover-drag or via keyboard-focusable buttons).
 */
export function SwipeRow({ children, onEdit, onDelete, className, radiusClass = 'rounded-2xl', style }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const lockedRef = useRef<null | 'x' | 'y'>(null);
  const startY = useRef(0);

  const close = useCallback(() => setOffset(0), []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startOffset.current = offset;
    lockedRef.current = null;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (lockedRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (lockedRef.current !== 'x') return;
    const next = Math.min(0, Math.max(-ACTION_WIDTH - 24, startOffset.current + dx));
    setOffset(next);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (lockedRef.current !== 'x') return;
    setOffset(offset < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0);
  };

  const runAction = (fn?: () => void) => {
    close();
    fn?.();
  };

  return (
    <div className={cn('relative overflow-hidden', radiusClass, className)} style={style}>
      {/* Action layer */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {onEdit && (
          <button
            type="button"
            onClick={() => runAction(onEdit)}
            aria-label="Edit"
            className="w-[66px] flex flex-col items-center justify-center gap-1 bg-primary/90 text-primary-foreground active:opacity-80"
          >
            <Pencil className="w-[18px] h-[18px]" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold">Edit</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => runAction(onDelete)}
            aria-label="Delete"
            className="w-[66px] flex flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground active:opacity-80"
          >
            <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold">Delete</span>
          </button>
        )}
      </div>

      {/* Content layer */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translate3d(${offset}px,0,0)`,
          transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}
        className="relative will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
