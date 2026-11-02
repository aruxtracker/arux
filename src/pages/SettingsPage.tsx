import { useEffect, useState } from 'react';
import {
  Moon, Sun, Download, IndianRupee, LogOut, Instagram, Bell, Smartphone,
  Palette, CheckCircle2, Share2, Copy, ChevronRight, ChevronLeft, User,
  Database, Sparkles, ShieldCheck, Fingerprint, Lock, GraduationCap, Mail, CalendarDays,
  Wallet, ListChecks, Flame, Car, BarChart3, Bookmark, KeyRound, Save, Rocket, History,
  Grid2X2, TrendingUp, CreditCard, Scissors, Lightbulb, ShoppingCart, Calendar, Heart, Play,
  UserRound, CircleUser,

} from 'lucide-react';
import { AppSettings, CURRENCIES, ThemeId, TabId } from '@/types';
import { Income, Expense, Meeting } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, Gender } from '@/hooks/useProfile';
import { AVATAR_PRESETS, getAvatar } from '@/lib/avatars';
import { APP_VERSION, CHANGELOG, ROADMAP } from '@/lib/version';
import { THEMES } from '@/lib/themes';
import { requestNotificationPermission, notificationsSupported } from '@/hooks/useNotifications';
import {
  biometricEnabled, biometricSupported, disableLock, enrollBiometric,
  isLockEnabled, markUnlocked, removeBiometric, setPin as savePin,
} from '@/lib/applock';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BrandMark } from '@/components/BrandMark';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (data: Partial<AppSettings>) => void;
  incomes: Income[];
  expenses: Expense[];
  meetings: Meeting[];
  onNavigate?: (tab: TabId) => void;
  onStartTutorial?: () => void;
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Screen =
  | 'root' | 'profile' | 'appearance' | 'notifications' | 'security' | 'sharing' | 'data'
  | 'tutorial' | 'features' | 'whatsnew' | 'comingsoon';

const ALL_FEATURES: { id: TabId; label: string; icon: any; tint: string }[] = [
  { id: 'income', label: 'Income', icon: TrendingUp, tint: 'var(--income)' },
  { id: 'expenses', label: 'Spend', icon: Wallet, tint: 'var(--expense)' },
  { id: 'lentborrow', label: 'Lent & Borrow', icon: Wallet, tint: 'var(--brand-teal)' },
  { id: 'budgets', label: 'Budgets', icon: BarChart3, tint: 'var(--brand-blue)' },
  { id: 'subscriptions', label: 'Subs', icon: CreditCard, tint: 'var(--brand-purple)' },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, tint: 'var(--brand-purple)' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, tint: 'var(--meeting)' },
  { id: 'meetings', label: 'Meetings', icon: Calendar, tint: 'var(--meeting)' },
  { id: 'habits', label: 'Habits', icon: Flame, tint: 'var(--brand-orange)' },
  { id: 'reminders', label: 'Alerts', icon: Bell, tint: 'var(--brand-yellow)' },
  { id: 'grooming', label: 'Grooming', icon: Scissors, tint: 'var(--brand-pink)' },
  { id: 'vehicles', label: 'Garage', icon: Car, tint: 'var(--brand-teal)' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, tint: 'var(--brand-yellow)' },
  { id: 'dreambucket', label: 'Dreams', icon: ShoppingCart, tint: 'var(--brand-blue)' },
  { id: 'reports', label: 'Reports', icon: BarChart3, tint: 'var(--brand-blue)' },
];

const SHARE_URL = 'https://aruxtracker.vercel.app';
const SHARE_TEXT = 'I am using ARUX to track my income, expenses, tasks and habits. Try it free:';


/* ------------------------------ building blocks ------------------------------ */

/** WhatsApp style grouped list container. */
function Group({ children, label, delay = 0 }: { children: React.ReactNode; label?: string; delay?: number }) {
  return (
    <div className="card-enter" style={{ animationDelay: `${delay}ms` }}>
      {label && (
        <p className="px-6 md:px-1 pb-1.5 text-[11px] font-bold text-primary uppercase tracking-[0.14em]">{label}</p>
      )}
      <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon, tint, title, subtitle, onClick, right, danger,
}: {
  icon: any; tint?: string; title: string; subtitle?: string;
  onClick?: () => void; right?: React.ReactNode; danger?: boolean;
}) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3.5 px-4 py-3 text-left min-h-[56px]',
        onClick && 'active:bg-muted/60 transition-colors'
      )}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: `hsl(${danger ? 'var(--destructive)' : tint || 'var(--primary)'} / 0.14)`,
          color: `hsl(${danger ? 'var(--destructive)' : tint || 'var(--primary)'})`,
        }}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn('block text-[15px] font-semibold truncate', danger ? 'text-destructive' : 'text-foreground')}>
          {title}
        </span>
        {subtitle && <span className="block text-xs text-muted-foreground truncate mt-0.5">{subtitle}</span>}
      </span>
      {right !== undefined ? right : onClick ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : null}
    </Wrapper>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="px-4 md:px-0 pt-2 flex items-center gap-2">
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-foreground tap-shrink active:bg-muted"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export function SettingsPage({ settings, onUpdateSettings, incomes, expenses, meetings, onNavigate, onStartTutorial }: SettingsPageProps) {
  const { user, signOut, updatePassword } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [screen, setScreen] = useState<Screen>('root');
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    notificationsSupported() ? Notification.permission : 'denied'
  );
  const [lockOn, setLockOn] = useState(() => isLockEnabled());
  const [bioOn, setBioOn] = useState(() => biometricEnabled());
  const [pinDialog, setPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [pwDialog, setPwDialog] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const displayName = profile.displayName
    || (user?.user_metadata?.display_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'ARUX user';
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const avatar = getAvatar(profile.avatarPreset);

  const handleSaveName = async () => {
    const next = nameDraft.trim();
    if (next.length < 2) { toast.error('Name must be at least 2 characters'); return; }
    const ok = await updateProfile({ displayName: next });
    if (ok) toast.success('Name updated');
  };

  const handleSavePassword = async () => {
    if (pw1.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pw1 !== pw2) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    const { error } = await updatePassword(pw1);
    setSavingPw(false);
    if (error) { toast.error(error.message || 'Could not update password'); return; }
    setPwDialog(false); setPw1(''); setPw2('');
    toast.success('Password updated');
  };

  const handleGender = async (g: Gender) => {
    const ok = await updateProfile({ gender: g });
    if (ok) toast.success('Gender saved');
  };

  const passwordDialogNode = () => (
    <Dialog open={pwDialog} onOpenChange={setPwDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="pw1" className="text-sm">New password</Label>
            <Input id="pw1" type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="At least 6 characters" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pw2" className="text-sm">Confirm password</Label>
            <Input id="pw2" type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-2xl" onClick={() => setPwDialog(false)}>Cancel</Button>
          <Button className="gradient-primary border-0 text-primary-foreground rounded-2xl" disabled={savingPw} onClick={handleSavePassword}>
            {savingPw ? 'Saving…' : 'Update password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );



  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(pinValue)) { toast.error('PIN must be 4 digits'); return; }
    if (pinValue !== pinConfirm) { toast.error('PINs do not match'); return; }
    await savePin(pinValue);
    markUnlocked();
    setLockOn(true);
    setPinDialog(false);
    setPinValue(''); setPinConfirm('');
    toast.success('App lock enabled');
  };

  const handleToggleLock = (checked: boolean) => {
    if (checked) { setPinDialog(true); return; }
    disableLock();
    setLockOn(false);
    setBioOn(false);
    toast.success('App lock disabled');
  };

  const handleToggleBiometric = async (checked: boolean) => {
    if (!checked) { removeBiometric(); setBioOn(false); toast.success('Biometric unlock off'); return; }
    try {
      const ok = await enrollBiometric(user?.email || 'ARUX user');
      if (ok) { setBioOn(true); toast.success('Face ID / fingerprint unlock enabled'); }
      else toast.error('Could not set up biometric unlock');
    } catch {
      toast.error('Biometric setup cancelled or unavailable');
    }
  };

  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsInstalled(standalone);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') { toast.success('App installed'); setInstallEvent(null); }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      toast.info(
        isIOS ? 'Tap the Share icon, then Add to Home Screen' : 'Open the browser menu, then choose Install app',
        { duration: 6000 }
      );
    }
  };

  const handleShareApp = async () => {
    const shareData = { title: 'ARUX Tracker', text: SHARE_TEXT, url: SHARE_URL };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (e: any) { if (e?.name !== 'AbortError') toast.error('Share failed'); }
    } else {
      try {
        await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
        toast.success('Share link copied to clipboard');
      } catch { toast.error('Could not copy link'); }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast.success('Link copied');
    } catch { toast.error('Could not copy'); }
  };

  const exportCSV = () => {
    try {
      const rows: string[] = [];
      rows.push('INCOME');
      rows.push('Date,Source,Amount,Notes');
      incomes.forEach(i => rows.push(`${i.date},${i.source},${i.amount},"${i.notes || ''}"`));
      rows.push(''); rows.push('EXPENSES');
      rows.push('Date,Category,Amount,Notes');
      expenses.forEach(e => rows.push(`${e.date},${e.category},${e.amount},"${e.notes || ''}"`));
      rows.push(''); rows.push('MEETINGS');
      rows.push('Date,Time,Title,Notes');
      meetings.forEach(m => rows.push(`${m.date},${m.time},"${m.title}","${m.notes || ''}"`));
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `arux-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Could not export CSV');
    }
  };

  const handleToggleDark = (checked: boolean) => {
    onUpdateSettings({ darkMode: checked });
    toast.success(checked ? 'Dark mode on' : 'Light mode on');
  };

  const handleCurrencyChange = (v: string) => {
    onUpdateSettings({ currency: v });
    toast.success(`Currency set to ${v}`);
  };

  const handleThemeChange = (id: ThemeId) => {
    onUpdateSettings({ theme: id });
    const t = THEMES.find(x => x.id === id);
    if (t) toast.success(`${t.label} applied`);
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') toast.success('Notifications enabled');
    else if (perm === 'denied') toast.error('Notifications blocked. Update your browser settings.');
  };

  const stats = { incomes: incomes.length, expenses: expenses.length, meetings: meetings.length };
  const currentTheme: ThemeId = settings.theme || 'purple';
  const currentThemeLabel = THEMES.find(t => t.id === currentTheme)?.label || 'Midnight Purple';
  const back = () => setScreen('root');

  /* ------------------------------ sub screens ------------------------------ */

  if (screen === 'profile') {
    const joined = user?.created_at ? new Date(user.created_at) : null;
    const GENDERS: { value: Gender; label: string; icon: any }[] = [
      { value: 'male', label: 'Male', icon: User },
      { value: 'female', label: 'Female', icon: UserRound },
      { value: 'other', label: 'Prefer not to say', icon: CircleUser },
    ];

    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Profile" onBack={back} />

        {/* Avatar + name */}
        <div className="mx-4 md:mx-0 rounded-[26px] bg-card border border-border/60 card-shadow p-6 flex flex-col items-center card-enter">
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center shadow-pop bg-gradient-to-br',
            avatar ? avatar.ring : 'from-primary to-accent'
          )}>
            {avatar
              ? <span className="text-5xl leading-none">{avatar.emoji}</span>
              : <span className="text-3xl font-extrabold text-primary-foreground">{initials}</span>}
          </div>
          <p className="mt-3 text-xl font-bold text-foreground truncate max-w-full">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate max-w-full">{user?.email}</p>
        </div>

        {/* Preset avatars */}
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter" style={{ animationDelay: '60ms' }}>
          <Label className="text-sm font-semibold block">Choose your avatar</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Pick one of the built in illustrations. No photo upload needed.</p>
          <div className="grid grid-cols-4 gap-2.5">
            {AVATAR_PRESETS.map(a => {
              const active = profile.avatarPreset === a.id;
              return (
                <button
                  key={a.id}
                  onClick={async () => { const ok = await updateProfile({ avatarPreset: a.id }); if (ok) toast.success(`${a.label} avatar set`); }}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 py-2.5 rounded-2xl border-2 transition-all active:scale-[0.97]',
                    active ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40'
                  )}
                >
                  <span className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br', a.ring)}>
                    <span className="text-2xl leading-none">{a.emoji}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-foreground/80 leading-tight">{a.label}</span>
                  {active && <CheckCircle2 className="absolute top-1 right-1 w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display name */}
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter" style={{ animationDelay: '100ms' }}>
          <Label htmlFor="dn" className="text-sm font-semibold block mb-2">Display name</Label>
          <div className="flex gap-2">
            <Input
              id="dn" value={nameDraft || displayName}
              onChange={e => setNameDraft(e.target.value)}
              placeholder="Your name" maxLength={40} className="min-w-0"
            />
            <Button onClick={handleSaveName} className="gradient-primary border-0 text-primary-foreground gap-1.5 rounded-2xl shrink-0">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>

        {/* Gender */}
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter" style={{ animationDelay: '140ms' }}>
          <Label className="text-sm font-semibold block">Gender</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Used to personalise your profile.</p>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map(g => {
              const active = profile.gender === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => handleGender(g.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-[0.97]',
                    active ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40'
                  )}
                >
                  <g.icon className={cn('w-[18px] h-[18px]', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.9} />
                  <span className="text-[11px] font-semibold text-foreground/80 text-center leading-tight">{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>


        <Group label="Security" delay={200}>
          <Row icon={KeyRound} tint="var(--brand-purple)" title="Change password" subtitle="Set a new sign in password" onClick={() => setPwDialog(true)} />
          <Row icon={Lock} tint="var(--brand-orange)" title="App lock" subtitle={lockOn ? 'Enabled on this device' : 'Disabled'} onClick={() => setScreen('security')} />
        </Group>

        <Group label="Account details" delay={240}>
          <Row icon={Mail} title="Email" subtitle={user?.email || '—'} right={null} />
          <Row
            icon={CalendarDays} tint="var(--brand-blue)" title="Member since"
            subtitle={joined ? joined.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            right={null}
          />
          <Row
            icon={ShieldCheck} tint="var(--income)" title="Sign in method"
            subtitle={(user?.app_metadata?.provider as string | undefined) || 'email'}
            right={null}
          />
        </Group>

        <Group label="Your data" delay={280}>
          <Row icon={Wallet} tint="var(--income)" title="Income entries" right={<span className="text-sm font-bold tabular-nums">{stats.incomes}</span>} />
          <Row icon={BarChart3} tint="var(--expense)" title="Expense entries" right={<span className="text-sm font-bold tabular-nums">{stats.expenses}</span>} />
          <Row icon={CalendarDays} tint="var(--meeting)" title="Meetings" right={<span className="text-sm font-bold tabular-nums">{stats.meetings}</span>} />
        </Group>

        <div className="mx-4 md:mx-0">
          <Button onClick={signOut} variant="outline" className="w-full gap-2 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
        {passwordDialogNode()}
      </div>
    );
  }


  if (screen === 'features') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="All features" onBack={back} />
        <div className="mx-4 md:mx-0 rounded-[26px] bg-card border border-border/60 card-shadow p-3 card-enter">
          <div className="grid grid-cols-4 gap-1">
            {ALL_FEATURES.map(({ id, label, icon: Icon, tint }) => (
              <button
                key={id}
                onClick={() => onNavigate?.(id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-muted/60 transition-colors tap-shrink"
              >
                <span className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: `hsl(${tint} / 0.14)`, color: `hsl(${tint})` }}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'whatsnew') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="What's new" onBack={back} />
        {CHANGELOG.map((rel, idx) => (
          <div key={rel.version}
            className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter"
            style={{ animationDelay: `${idx * 60}ms` }}>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-primary/12 text-primary text-xs font-bold">v{rel.version}</span>
              {idx === 0 && <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--income))]/15 income-text text-[10px] font-bold">Current</span>}
              <span className="ml-auto text-[11px] text-muted-foreground">{rel.date}</span>
            </div>
            {([['Added', rel.added], ['Improved', rel.improved], ['Fixed', rel.fixed]] as const).map(([label, items]) =>
              items && items.length > 0 ? (
                <div key={label} className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {items.map(t => (
                      <li key={t} className="flex gap-2 text-sm text-foreground/80">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="min-w-0">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        ))}
      </div>
    );
  }

  if (screen === 'comingsoon') {
    const badge = { building: 'In progress', planned: 'Planned', idea: 'Idea' } as const;
    const tint = { building: 'var(--income)', planned: 'var(--brand-blue)', idea: 'var(--brand-yellow)' } as const;
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Coming soon" onBack={back} />
        {ROADMAP.map((item, idx) => (
          <div key={item.title}
            className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 flex gap-3.5 card-enter"
            style={{ animationDelay: `${idx * 50}ms` }}>
            <span className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center text-xl shrink-0">{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground truncate">{item.title}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: `hsl(${tint[item.status]} / 0.15)`, color: `hsl(${tint[item.status]})` }}>
                  {badge[item.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }


  if (screen === 'appearance') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Appearance" onBack={back} />
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter">
          <Label className="text-sm font-semibold mb-2.5 block">Color theme</Label>
          <div className="grid grid-cols-3 gap-2.5">
            {THEMES.map(t => {
              const active = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-[0.97]',
                    active ? 'border-primary shadow-pop bg-primary/5' : 'border-transparent bg-muted/40'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br shadow-md', t.swatch)} />
                  <span className="text-[10px] font-bold text-center leading-tight text-foreground">{t.label}</span>
                  {active && <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <Group delay={60}>
          <Row
            icon={settings.darkMode ? Moon : Sun} tint="var(--brand-purple)"
            title="Dark mode" subtitle={settings.darkMode ? 'Dark theme active' : 'Light theme active'}
            right={<Switch checked={settings.darkMode} onCheckedChange={handleToggleDark} />}
          />
          <Row
            icon={IndianRupee} tint="var(--income)" title="Currency" subtitle={`Currently ${settings.currency}`}
            right={
              <Select value={settings.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-28 shrink-0 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (<SelectItem key={c.code} value={c.symbol}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            }
          />
        </Group>
      </div>
    );
  }

  if (screen === 'notifications') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Notifications" onBack={back} />
        <Group delay={40}>
          <Row
            icon={Bell} tint="var(--brand-yellow)" title="In-app reminders"
            subtitle={
              notifPerm === 'granted' ? 'Enabled. Alerts fire while ARUX is open.'
                : notifPerm === 'denied' ? 'Blocked. Update your browser settings.'
                  : 'Get reminders, service and meeting alerts.'
            }
            right={
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                disabled={notifPerm === 'granted' || notifPerm === 'denied'}
                className={cn('rounded-full', notifPerm === 'default' && 'gradient-primary border-0 text-primary-foreground')}
                variant={notifPerm === 'granted' ? 'outline' : 'default'}
              >
                {notifPerm === 'granted' ? 'On' : 'Enable'}
              </Button>
            }
          />
          {!isInstalled ? (
            <Row
              icon={Smartphone} tint="var(--brand-teal)" title="Install ARUX as an app"
              subtitle="Best reminder experience on your phone" onClick={handleInstall}
            />
          ) : (
            <Row icon={CheckCircle2} tint="var(--income)" title="App installed" subtitle="Running as an installed app" right={null} />
          )}
        </Group>
      </div>
    );
  }

  if (screen === 'security') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Privacy and security" onBack={back} />
        <Group delay={40}>
          <Row
            icon={Lock} tint="var(--brand-purple)" title="App lock"
            subtitle={lockOn ? 'A 4 digit PIN is required to open ARUX' : 'Protect your finance data with a PIN'}
            right={<Switch checked={lockOn} onCheckedChange={handleToggleLock} />}
          />
          {lockOn && (
            <>
              <Row
                icon={Fingerprint} tint="var(--brand-blue)" title="Face ID / fingerprint"
                subtitle={biometricSupported() ? 'Unlock instantly with device biometrics' : 'Not supported on this device'}
                right={<Switch checked={bioOn} disabled={!biometricSupported()} onCheckedChange={handleToggleBiometric} />}
              />
              <Row icon={ShieldCheck} tint="var(--brand-orange)" title="Change PIN" onClick={() => setPinDialog(true)} />
            </>
          )}
        </Group>
        <p className="px-6 md:px-1 text-[11px] text-muted-foreground">
          Your PIN is stored only on this device. If you forget it, sign out and sign in again in a fresh browser profile.
        </p>
        {pinDialogNode()}
      </div>
    );
  }

  if (screen === 'sharing') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Invite a friend" onBack={back} />
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 flex flex-col gap-3 card-enter">
          <p className="text-sm text-foreground">
            Share ARUX via WhatsApp, Messages or copy the link.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShareApp} className="gradient-primary border-0 text-primary-foreground gap-2 rounded-2xl">
              <Share2 className="w-4 h-4" /> Share app
            </Button>
            <Button onClick={handleCopyLink} variant="outline" className="gap-2 rounded-2xl">
              <Copy className="w-4 h-4" /> Copy link
            </Button>
          </div>
          <div className="bg-muted/40 rounded-2xl p-2.5 text-[11px] text-muted-foreground break-all">{SHARE_URL}</div>
        </div>
      </div>
    );
  }

  if (screen === 'data') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="Data and storage" onBack={back} />
        <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter">
          <div className="grid grid-cols-3 divide-x divide-border/50">
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-2xl font-bold income-text tabular-nums">{stats.incomes}</p>
              <p className="text-xs text-muted-foreground">Incomes</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-2xl font-bold expense-text tabular-nums">{stats.expenses}</p>
              <p className="text-xs text-muted-foreground">Expenses</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-2xl font-bold meeting-text tabular-nums">{stats.meetings}</p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
          </div>
        </div>
        <Group delay={60}>
          <Row icon={Download} tint="var(--brand-teal)" title="Export all data as CSV" subtitle="Income, expenses and meetings" onClick={exportCSV} />
        </Group>
      </div>
    );
  }

  if (screen === 'tutorial') {
    return (
      <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <SubHeader title="How to use ARUX" onBack={back} />
        {TUTORIALS.map((t, idx) => (
          <div
            key={t.title}
            className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 card-enter"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `hsl(${t.tint} / 0.14)`, color: `hsl(${t.tint})` }}
              >
                <t.icon className="w-5 h-5" strokeWidth={1.9} />
              </span>
              <p className="font-bold text-foreground">{t.title}</p>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {t.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-muted text-[11px] font-bold text-foreground flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  /* ------------------------------ root screen ------------------------------ */

  function pinDialogNode() {
    return (
      <Dialog open={pinDialog} onOpenChange={(o) => { setPinDialog(o); if (!o) { setPinValue(''); setPinConfirm(''); } }}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader><DialogTitle>{lockOn ? 'Change PIN' : 'Set a 4 digit PIN'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              inputMode="numeric" type="password" maxLength={4} placeholder="New PIN"
              value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} autoFocus
            />
            <Input
              inputMode="numeric" type="password" maxLength={4} placeholder="Confirm PIN"
              value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPinDialog(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleSavePin}>Save PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="px-4 md:px-0 pt-2 flex items-center gap-3">
        <BrandMark className="w-24 shrink-0" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Profile card */}
      <button
        onClick={() => setScreen('profile')}
        className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 flex items-center gap-3.5 text-left active:bg-muted/50 transition-colors card-enter card-press"
      >
        <span className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br',
          avatar ? avatar.ring : 'from-primary to-accent'
        )}>
          {avatar
            ? <span className="text-3xl leading-none">{avatar.emoji}</span>
            : <span className="text-lg font-extrabold text-primary-foreground">{initials}</span>}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-bold text-foreground truncate">{displayName}</span>
          <span className="block text-xs text-muted-foreground truncate">{user?.email}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      <Group delay={60}>
        <Row icon={User} title="Profile" subtitle="Avatar, name, gender, password" onClick={() => setScreen('profile')} />
        <Row icon={Grid2X2} tint="var(--brand-blue)" title="All features" subtitle="Jump to every tracker in ARUX" onClick={() => setScreen('features')} />
        <Row icon={Palette} tint="var(--brand-pink)" title="Appearance" subtitle={`${currentThemeLabel} · ${settings.darkMode ? 'Dark' : 'Light'}`} onClick={() => setScreen('appearance')} />
        <Row
          icon={Bell} tint="var(--brand-yellow)" title="Notifications"
          subtitle={notifPerm === 'granted' ? 'Reminders enabled' : 'Reminder alerts and app install'}
          onClick={() => setScreen('notifications')}
        />
        <Row
          icon={ShieldCheck} tint="var(--brand-teal)" title="Privacy and security"
          subtitle={lockOn ? 'App lock on' : 'App lock, PIN and biometrics'}
          onClick={() => setScreen('security')}
        />
      </Group>

      <Group delay={120}>
        <Row icon={Database} tint="var(--brand-blue)" title="Data and storage" subtitle="Usage and CSV export" onClick={() => setScreen('data')} />
        <Row icon={GraduationCap} tint="var(--brand-orange)" title="How to use ARUX" subtitle="Quick tutorial for every feature" onClick={() => setScreen('tutorial')} />
        {onStartTutorial && (
          <Row icon={Play} tint="var(--income)" title="Replay intro tour" subtitle="Show the welcome screens again" onClick={() => { onStartTutorial(); toast.success('Intro tour started'); }} />
        )}
        <Row icon={Share2} tint="var(--brand-purple)" title="Invite a friend" subtitle="Share ARUX with your contacts" onClick={() => setScreen('sharing')} />
      </Group>

      <Group label="About" delay={160}>
        <Row icon={Rocket} tint="var(--brand-purple)" title="Coming soon" subtitle={`${ROADMAP.length} features on the roadmap`} onClick={() => setScreen('comingsoon')} />
        <Row icon={History} tint="var(--brand-teal)" title="What's new" subtitle={`Version ${APP_VERSION} · changelog and fixes`} onClick={() => setScreen('whatsnew')} />
      </Group>

      <Group delay={200}>
        <Row icon={LogOut} danger title="Sign out" onClick={signOut} right={null} />
      </Group>

      {/* Credits */}
      <div className="mx-4 md:mx-0 rounded-[22px] bg-card border border-border/60 card-shadow p-4 text-center card-enter" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Made by <span className="font-bold gradient-text">arshddux</span>
          </p>
        </div>
        <a href="https://www.instagram.com/stories/arshddux" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Instagram className="w-3.5 h-3.5" /> @arshddux
        </a>
        <p className="text-xs text-muted-foreground mt-2">ARUX Tracker v{APP_VERSION}</p>
      </div>

      {pinDialogNode()}
      {passwordDialogNode()}

    </div>
  );
}

const TUTORIALS: { title: string; icon: any; tint: string; steps: string[] }[] = [
  {
    title: 'Track money',
    icon: Wallet,
    tint: 'var(--income)',
    steps: [
      'Open Home and tap Add expense or Add income.',
      'Pick a category, enter the amount and save. The balance updates instantly.',
      'Tap Reset on the balance card to start fresh — you get a 10 second Undo if it was a mistake.',
      'Swipe any row left on Income or Spend to edit or delete it.',
    ],
  },
  {
    title: 'Tasks and lists',
    icon: ListChecks,
    tint: 'var(--brand-purple)',
    steps: [
      'Create lists like Inbox or Purchase list from the list bar.',
      'Type a task and tap the sliders icon to set Priority, Repeat and Labels, then tap Done.',
      'Hold the grip handle to drag tasks into the order you want.',
      'Use Filters to view only urgent or labelled tasks.',
    ],
  },
  {
    title: 'Habits and reminders',
    icon: Flame,
    tint: 'var(--brand-orange)',
    steps: [
      'Add a habit and tap today’s circle to log it — streaks build automatically.',
      'Add recurring bills or obligations in Alerts.',
      'Enable notifications in Settings so alerts fire while ARUX is open.',
    ],
  },
  {
    title: 'Garage and grooming',
    icon: Car,
    tint: 'var(--brand-teal)',
    steps: [
      'Add your vehicles, then log services with the next due date.',
      'Fuel and repair costs flow into your expense reports.',
      'Log haircuts and grooming spend to see the monthly total.',
    ],
  },
  {
    title: 'Reports and insights',
    icon: BarChart3,
    tint: 'var(--brand-blue)',
    steps: [
      'Reports shows charts for income, spending and category splits.',
      'Forecast cards predict next month based on your history.',
      'Smart Insights on Home compares this week with last week.',
    ],
  },
  {
    title: 'Save and secure',
    icon: Bookmark,
    tint: 'var(--brand-pink)',
    steps: [
      'Store plans in Ideas and future purchases in Dreams.',
      'Turn on App lock in Privacy and security for a PIN or Face ID.',
      'Export everything to CSV any time from Data and storage.',
    ],
  },
];
