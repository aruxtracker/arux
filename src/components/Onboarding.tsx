import { useState } from 'react';
import { Wallet, ListChecks, LineChart, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/BrandMark';

export const ONBOARDING_KEY = 'arux.onboarded.v1';

export function onboardingSeen() {
  try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return true; }
}

const SLIDES = [
  {
    icon: Wallet,
    title: 'Track every rupee',
    body: 'Log income and expenses in seconds, see your live balance and where the money actually goes each month.',
    tint: 'var(--income)',
  },
  {
    icon: ListChecks,
    title: 'Plan your day',
    body: 'Google style task lists with colour coded priorities, habits, meetings, reminders and vehicle services in one place.',
    tint: 'var(--brand-purple)',
  },
  {
    icon: LineChart,
    title: 'See what comes next',
    body: 'Smart reports and forecasts show your spending trends and predict the months ahead so nothing surprises you.',
    tint: 'var(--brand-blue)',
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background gradient-mesh-bg flex flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <BrandMark className="w-24 animate-float-slow" />
        {!last && (
          <button onClick={finish} className="text-sm font-semibold text-muted-foreground px-3 py-2 rounded-xl tap-shrink">
            Skip
          </button>
        )}
      </div>

      <div key={step} className="flex-1 flex flex-col items-center justify-center text-center card-enter">
        <div
          className="w-28 h-28 rounded-[36px] flex items-center justify-center animate-float-slow"
          style={{ background: `hsl(${slide.tint} / 0.14)`, color: `hsl(${slide.tint})` }}
        >
          <Icon className="w-12 h-12" strokeWidth={1.6} />
        </div>
        <h2 className="text-2xl font-extrabold mt-8 tracking-tight">{slide.title}</h2>
        <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">{slide.body}</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      <Button
        onClick={() => (last ? finish() : setStep(s => s + 1))}
        className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground text-base font-bold gap-2 tap-shrink"
      >
        {last ? <>Get started <Check className="w-5 h-5" /></> : <>Next <ChevronRight className="w-5 h-5" /></>}
      </Button>
    </div>
  );
}
