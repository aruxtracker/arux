import { useCallback, useEffect, useState } from 'react';
import { Delete, Fingerprint, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  biometricEnabled, clearUnlocked, isLockEnabled, isUnlocked, markUnlocked,
  unlockWithBiometric, verifyPin, RELOCK_AFTER_MS,
} from '@/lib/applock';
import { BrandMark } from '@/components/BrandMark';
import { AruxMascot } from '@/components/AruxMascot';

const PIN_LENGTH = 4;

/** Wraps the app and requires a PIN / biometric unlock when the lock is enabled. */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(() => isLockEnabled() && !isUnlocked());
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const hiddenAt = useState<{ t: number }>(() => ({ t: 0 }))[0];

  const unlock = useCallback(() => {
    markUnlocked();
    setPin('');
    setError(false);
    setLocked(false);
  }, []);

  const tryBiometric = useCallback(async () => {
    try {
      if (await unlockWithBiometric()) unlock();
    } catch { /* user cancelled */ }
  }, [unlock]);

  // Auto-lock when the app goes to the background for a while
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.t = Date.now();
      } else if (hiddenAt.t && Date.now() - hiddenAt.t > RELOCK_AFTER_MS && isLockEnabled()) {
        clearUnlocked();
        setLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [hiddenAt]);

  useEffect(() => {
    if (locked && biometricEnabled()) void tryBiometric();
  }, [locked, tryBiometric]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let active = true;
    void (async () => {
      const ok = await verifyPin(pin);
      if (!active) return;
      if (ok) unlock();
      else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 550);
      }
    })();
    return () => { active = false; };
  }, [pin, unlock]);

  if (!locked) return <>{children}</>;

  const press = (d: string) => setPin(p => (p.length < PIN_LENGTH ? p + d : p));

  return (
    <div className="fixed inset-0 z-[100] bg-background gradient-mesh-bg flex flex-col items-center justify-center px-8">
      <AruxMascot size="xl" className="mb-4 animate-float-slow" />
      <BrandMark className="w-32" />
      <div className="mt-4 flex items-center gap-2 text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">ARUX is locked</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Enter your PIN to continue</p>

      <div className={cn('flex gap-3.5 mt-7', error && 'animate-shake')}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 transition-all duration-200',
              error ? 'border-destructive bg-destructive' :
                i < pin.length ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/40'
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-9 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <KeyButton key={d} onClick={() => press(d)}>{d}</KeyButton>
        ))}
        <KeyButton onClick={biometricEnabled() ? tryBiometric : undefined} muted>
          {biometricEnabled() ? <Fingerprint className="w-6 h-6" /> : ''}
        </KeyButton>
        <KeyButton onClick={() => press('0')}>0</KeyButton>
        <KeyButton onClick={() => setPin(p => p.slice(0, -1))} muted>
          <Delete className="w-5 h-5" />
        </KeyButton>
      </div>
    </div>
  );
}

function KeyButton({ children, onClick, muted }: { children: React.ReactNode; onClick?: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'h-16 rounded-3xl text-2xl font-semibold flex items-center justify-center tap-shrink transition-colors',
        muted ? 'text-muted-foreground disabled:opacity-30' : 'glass text-foreground'
      )}
    >
      {children}
    </button>
  );
}
