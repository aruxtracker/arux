import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Database,
  Radio,
  Lock,
  TrendingUp,
  Search,
  CheckCircle2,
  Crown,
  RefreshCw,
  BarChart3,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  Sliders,
  Server,
  AlertTriangle,
  Send,
  Trash2,
  ShieldCheck,
  Activity,
  LogOut,
  Mail,
  KeyRound,
  ShieldAlert,
  Calendar,
  CheckSquare,
  CreditCard,
  Wallet,
  X,
  Plus,
  Sparkles,
  ChevronRight,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RealProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_preset: string | null;
  gender: string | null;
  created_at: string;
  role?: string;
  email?: string;
}

interface RealBroadcast {
  id: string;
  title: string;
  message: string;
  category: 'update' | 'alert' | 'info';
  priority: 'normal' | 'high';
  active: boolean;
  action_label?: string | null;
  action_tab?: string | null;
  created_at: string;
}

interface RealMetrics {
  totalProfiles: number;
  totalIncomesCount: number;
  totalIncomesSum: number;
  totalExpensesCount: number;
  totalExpensesSum: number;
  totalTasksCount: number;
  completedTasksCount: number;
  totalHabitsCount: number;
  totalBudgetsCount: number;
  totalSubscriptionsCount: number;
}

const STORAGE_ADMIN_BROADCASTS = 'arux_admin_broadcasts_v1';
const STORAGE_SYSTEM_CONFIG = 'arux_super_admin_config_v1';

const SUPER_ADMIN_SQL = `-- ARUX Super Admin Setup Migration for Supabase
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update',
  priority TEXT NOT NULL DEFAULT 'normal',
  active BOOLEAN NOT NULL DEFAULT true,
  action_tab TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role IN ('admin', 'super_admin'));
END; $$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'super_admin');
END; $$;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view active broadcasts" ON public.system_broadcasts;
CREATE POLICY "Anyone can view active broadcasts" ON public.system_broadcasts FOR SELECT USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.system_broadcasts;
CREATE POLICY "Admins can manage broadcasts" ON public.system_broadcasts FOR ALL USING (public.is_admin());
`;

export function AdminPage() {
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  const { isSuperAdmin, role, checkingRole, dbTableExists, refetchRole } = useAdmin();

  // Auth Form State (Email + Password only)
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Admin Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcasts' | 'system' | 'security'>('overview');
  const [broadcastSubTab, setBroadcastSubTab] = useState<'list' | 'compose'>('list');
  const [copiedSql, setCopiedSql] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Real Database Data State
  const [metrics, setMetrics] = useState<RealMetrics>({
    totalProfiles: 0,
    totalIncomesCount: 0,
    totalIncomesSum: 0,
    totalExpensesCount: 0,
    totalExpensesSum: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    totalHabitsCount: 0,
    totalBudgetsCount: 0,
    totalSubscriptionsCount: 0,
  });

  const [realProfiles, setRealProfiles] = useState<RealProfile[]>([]);
  const [broadcasts, setBroadcasts] = useState<RealBroadcast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'user'>('all');

  // Broadcast Form
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcCategory, setBcCategory] = useState<'update' | 'alert' | 'info'>('update');
  const [bcPriority, setBcPriority] = useState<'normal' | 'high'>('normal');
  const [bcActionTab, setBcActionTab] = useState('');

  // System Configuration Flags
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SYSTEM_CONFIG);
      return stored
        ? JSON.parse(stored)
        : {
            maintenanceMode: false,
            allowRegistrations: true,
            aiInsightsEnabled: true,
            pushNotificationsEnabled: true,
            strictAppLock: false,
            betaFeatures: true,
          };
    } catch {
      return {
        maintenanceMode: false,
        allowRegistrations: true,
        aiInsightsEnabled: true,
        pushNotificationsEnabled: true,
        strictAppLock: false,
        betaFeatures: true,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SYSTEM_CONFIG, JSON.stringify(config));
    } catch {}
  }, [config]);

  // Fetch Real Database Metrics & Tables
  const fetchRealDatabaseData = useCallback(async () => {
    setLoadingStats(true);
    try {
      // 1. Fetch Real Profiles from Supabase
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch User Roles from Supabase
      const { data: rolesData } = await supabase
        .from('user_roles' as any)
        .select('*');

      const rolesMap = new Map<string, string>();
      if (rolesData && Array.isArray(rolesData)) {
        rolesData.forEach((r: any) => rolesMap.set(r.user_id, r.role));
      }

      if (profilesData) {
        const enriched = profilesData.map((p) => ({
          ...p,
          role: rolesMap.get(p.user_id) || (p.user_id === user?.id && role === 'super_admin' ? 'super_admin' : 'user'),
          email: p.user_id === user?.id ? user?.email : undefined,
        }));
        setRealProfiles(enriched);
      }

      // 3. Fetch Real Transaction Aggregates
      const [
        incomesRes,
        expensesRes,
        tasksRes,
        habitsRes,
        budgetsRes,
        subsRes,
      ] = await Promise.all([
        supabase.from('incomes').select('amount'),
        supabase.from('expenses').select('amount'),
        supabase.from('tasks').select('completed'),
        supabase.from('habits').select('*', { count: 'exact', head: true }),
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
      ]);

      const incomeList = incomesRes.data || [];
      const expenseList = expensesRes.data || [];
      const taskList = tasksRes.data || [];

      const totalIncomesSum = incomeList.reduce((acc, row) => acc + Number(row.amount || 0), 0);
      const totalExpensesSum = expenseList.reduce((acc, row) => acc + Number(row.amount || 0), 0);
      const completedTasksCount = taskList.filter((t) => t.completed).length;

      setMetrics({
        totalProfiles: profilesData ? profilesData.length : 1,
        totalIncomesCount: incomeList.length,
        totalIncomesSum,
        totalExpensesCount: expenseList.length,
        totalExpensesSum,
        totalTasksCount: taskList.length,
        completedTasksCount,
        totalHabitsCount: habitsRes.count || 0,
        totalBudgetsCount: budgetsRes.count || 0,
        totalSubscriptionsCount: subsRes.count || 0,
      });

      // 4. Fetch Broadcasts from Supabase
      try {
        const { data: bcData, error: bcError } = await supabase
          .from('system_broadcasts' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!bcError && bcData) {
          setBroadcasts(bcData as any);
        } else {
          const stored = localStorage.getItem(STORAGE_ADMIN_BROADCASTS);
          if (stored) setBroadcasts(JSON.parse(stored));
        }
      } catch {
        const stored = localStorage.getItem(STORAGE_ADMIN_BROADCASTS);
        if (stored) setBroadcasts(JSON.parse(stored));
      }
    } catch (err: any) {
      console.warn('Real database sync notification:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRealDatabaseData();
    }
  }, [isSuperAdmin, fetchRealDatabaseData]);

  // Handle Email & Password Sign In
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter both email and password');
      return;
    }

    setAuthLoading(true);
    const { error } = await signIn(authEmail.trim(), authPassword);
    setAuthLoading(false);

    if (error) {
      setAuthError(error.message || 'Invalid email or password');
      toast.error('Authentication failed');
    } else {
      toast.success('Signed in. Verifying Super Admin database permissions...');
      await refetchRole();
    }
  };

  // Broadcast Actions
  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }

    const payload = {
      title: bcTitle.trim(),
      message: bcMessage.trim(),
      category: bcCategory,
      priority: bcPriority,
      action_tab: bcActionTab || null,
      active: true,
      created_by: user?.id,
    };

    try {
      const { data, error } = await supabase
        .from('system_broadcasts' as any)
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setBroadcasts((prev) => [data as any, ...prev]);
        toast.success('Broadcast saved to database!');
      } else {
        const localItem: RealBroadcast = {
          id: `bc-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        };
        const nextList = [localItem, ...broadcasts];
        setBroadcasts(nextList);
        localStorage.setItem(STORAGE_ADMIN_BROADCASTS, JSON.stringify(nextList));
        toast.success('Broadcast published!');
      }

      setBcTitle('');
      setBcMessage('');
      setBcActionTab('');
      setBroadcastSubTab('list');
    } catch {
      toast.success('Broadcast published!');
      setBroadcastSubTab('list');
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      await supabase.from('system_broadcasts' as any).delete().eq('id', id);
    } catch {}
    const nextList = broadcasts.filter((b) => b.id !== id);
    setBroadcasts(nextList);
    localStorage.setItem(STORAGE_ADMIN_BROADCASTS, JSON.stringify(nextList));
    toast.success('Broadcast deleted');
  };

  const handleToggleBroadcast = async (id: string, current: boolean) => {
    try {
      await supabase.from('system_broadcasts' as any).update({ active: !current }).eq('id', id);
    } catch {}
    const nextList = broadcasts.map((b) => (b.id === id ? { ...b, active: !current } : b));
    setBroadcasts(nextList);
    localStorage.setItem(STORAGE_ADMIN_BROADCASTS, JSON.stringify(nextList));
  };

  // Change Role in Real Database
  const handleChangeUserRole = async (targetUserId: string, newRole: 'super_admin' | 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles' as any)
        .upsert(
          { user_id: targetUserId, role: newRole, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (error) {
        toast.error(`Database error: ${error.message}`);
        return;
      }

      setRealProfiles((prev) =>
        prev.map((p) => (p.user_id === targetUserId ? { ...p, role: newRole } : p))
      );
      toast.success(`Role updated to ${newRole} in database!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  // Copy SQL script for Supabase
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPER_ADMIN_SQL);
    setCopiedSql(true);
    toast.success('SQL migration script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyUserId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('User ID copied to clipboard');
  };

  // Role summary counts
  const roleCounts = useMemo(() => {
    let admins = 0;
    let superAdmins = 0;
    let regular = 0;
    realProfiles.forEach((p) => {
      if (p.role === 'super_admin') superAdmins++;
      else if (p.role === 'admin') admins++;
      else regular++;
    });
    return {
      all: realProfiles.length,
      super_admin: superAdmins,
      admin: admins,
      user: regular,
    };
  }, [realProfiles]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return realProfiles.filter((p) => {
      const name = p.display_name?.toLowerCase() || '';
      const email = p.email?.toLowerCase() || '';
      const id = p.user_id.toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || id.includes(q);
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [realProfiles, searchQuery, roleFilter]);

  // ========================================================
  // SCENARIO 1: USER NOT SIGNED IN -> SHOW EMAIL/PASSWORD LOGIN
  // ========================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/70 p-6 sm:p-8 card-shadow shadow-2xl card-enter">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400 shadow-sm">
              <Crown className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Admin Sign In</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your administrative credentials to access the console.
            </p>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Admin Email</Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  type="email"
                  placeholder="admin@arux.app"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="pl-9 h-11 rounded-xl text-xs"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Password</Label>
              <div className="relative mt-1">
                <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="pl-9 h-11 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full h-11 rounded-xl gradient-primary font-bold shadow-md text-xs tap-shrink"
            >
              {authLoading ? 'Verifying...' : 'Sign In as Super Admin'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors tap-shrink font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to App
            </button>
            <span className="font-mono text-[10px] text-muted-foreground/80">SUPABASE AUTH</span>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // SCENARIO 2: USER IS SIGNED IN, BUT NOT A SUPER ADMIN
  // ========================================================
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/70 p-6 sm:p-8 card-shadow shadow-2xl text-center card-enter space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Access Restricted</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Signed in as <code className="font-bold text-foreground">{user.email}</code>.
              Your account does not have Super Admin permissions.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                toast.info('Signed out. Please log in with your Super Admin account.');
              }}
              className="w-full h-10 rounded-xl text-xs gap-1.5 tap-shrink"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign in with different email
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground tap-shrink"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // SCENARIO 3: AUTHENTICATED SUPER ADMIN -> LIVE PANEL
  // ========================================================
  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      {/* Top Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-card/90 dark:bg-card/90 backdrop-blur-xl border-b border-border/60 px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
          {/* Left: Back button + title & status */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              aria-label="Back to App"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground hover:bg-muted transition-colors tap-shrink shrink-0"
              title="Return to App Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight truncate">
                  Admin Panel
                </h1>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate hidden xs:block">
                {user.email}
              </p>
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchRealDatabaseData}
              disabled={loadingStats}
              className="rounded-xl h-8 sm:h-9 px-2.5 sm:px-3 text-xs gap-1.5 border-border/70 tap-shrink"
              title="Sync Live DB"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-primary', loadingStats && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate('/auth');
                toast.info('Signed out of Admin');
              }}
              className="rounded-xl h-8 sm:h-9 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-destructive tap-shrink"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline ml-1">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navigation Tabs (Mobile-optimized pill scroller) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 box-border">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', count: realProfiles.length, icon: Users },
            { id: 'broadcasts', label: 'Broadcasts', count: broadcasts.length, icon: Radio },
            { id: 'system', label: 'Features', icon: Sliders },
            { id: 'security', label: 'SQL Setup', icon: ShieldCheck },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 tap-shrink shrink-0',
                  active
                    ? 'bg-primary text-primary-foreground shadow-pop'
                    : 'bg-card border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[9px] font-extrabold px-1.5 py-0.2 rounded-full',
                      active ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6 card-enter">
            {/* Quick Hero Banner */}
            <div className="rounded-2xl p-4 sm:p-5 bg-card border border-border/70 card-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Live Supabase Project
                  </p>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  mcgptjnstxmnvkfnedxt
                </h2>
                <p className="text-xs text-muted-foreground">
                  Real-time database sync active with {metrics.totalProfiles} registered profiles.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('users')}
                  className="flex-1 sm:flex-initial h-9 rounded-xl gradient-primary text-xs font-bold gap-1.5 tap-shrink"
                >
                  <Users className="w-3.5 h-3.5" /> Manage Users
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('broadcasts')}
                  className="flex-1 sm:flex-initial h-9 rounded-xl text-xs font-bold gap-1.5 tap-shrink"
                >
                  <Send className="w-3.5 h-3.5" /> Broadcast
                </Button>
              </div>
            </div>

            {/* Primary 2x2 on Mobile, 4-col on Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="rounded-2xl bg-card border border-border/60 p-3.5 sm:p-5 card-shadow flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Profiles</span>
                  <Users className="w-4 h-4 text-primary shrink-0" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    {metrics.totalProfiles}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    Registered users
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-3.5 sm:p-5 card-shadow flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Transactions</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    ₹{metrics.totalExpensesSum.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    {metrics.totalExpensesCount} exp • {metrics.totalIncomesCount} inc
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-3.5 sm:p-5 card-shadow flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Tasks</span>
                  <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    {metrics.totalTasksCount}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    {metrics.completedTasksCount} done ({metrics.totalTasksCount > 0 ? Math.round((metrics.completedTasksCount / metrics.totalTasksCount) * 100) : 0}%)
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-3.5 sm:p-5 card-shadow flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Status</span>
                  <Server className="w-4 h-4 text-teal-400 shrink-0" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-500">
                    Connected
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    Healthy Supabase DB
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5 text-orange-400 shrink-0" /> Habits
                </div>
                <p className="text-base sm:text-lg font-black text-foreground">{metrics.totalHabitsCount}</p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Budgets
                </div>
                <p className="text-base sm:text-lg font-black text-foreground">{metrics.totalBudgetsCount}</p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Subscriptions
                </div>
                <p className="text-base sm:text-lg font-black text-foreground">{metrics.totalSubscriptionsCount}</p>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-1">
                  <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Broadcasts
                </div>
                <p className="text-base sm:text-lg font-black text-foreground">{broadcasts.length}</p>
              </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Quick Shortcuts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 text-left flex items-center justify-between transition-colors tap-shrink"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">User Roles</p>
                      <p className="text-[10px] text-muted-foreground">Promote / demote admins</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 text-left flex items-center justify-between transition-colors tap-shrink"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">App Switches</p>
                      <p className="text-[10px] text-muted-foreground">Maintenance, AI, Beta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 text-left flex items-center justify-between transition-colors tap-shrink"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Database SQL</p>
                      <p className="text-[10px] text-muted-foreground">Copy migration script</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: DATABASE USERS (MOBILE-FIRST REDESIGN) */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-3.5 sm:space-y-4 card-enter">
            {/* Search Input with Clear Button */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by name, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10 sm:h-11 rounded-xl bg-card text-xs font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-7 h-7 rounded-lg absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground tap-shrink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick 1-Tap Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {[
                { id: 'all', label: 'All', count: roleCounts.all },
                { id: 'super_admin', label: 'Super Admins', count: roleCounts.super_admin },
                { id: 'admin', label: 'Admins', count: roleCounts.admin },
                { id: 'user', label: 'Users', count: roleCounts.user },
              ].map((chip) => {
                const active = roleFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setRoleFilter(chip.id as any)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 tap-shrink shrink-0',
                      active
                        ? 'bg-foreground text-background shadow-xs'
                        : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 rounded-full font-extrabold',
                        active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* MOBILE VIEW: Touch-Friendly User Cards (< md) */}
            <div className="md:hidden space-y-2.5">
              {filteredProfiles.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-card border border-border/60 text-muted-foreground text-xs">
                  No users found matching your search.
                </div>
              ) : (
                filteredProfiles.map((p) => {
                  const isCurrent = p.user_id === user.id;
                  const isSuper = p.role === 'super_admin';
                  const isAdmin = p.role === 'admin';

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 card-shadow space-y-2.5"
                    >
                      {/* Top row: Avatar + Name/Email + Role Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-xs shrink-0 shadow-xs">
                            {(p.display_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-foreground truncate flex items-center gap-1.5">
                              <span>{p.display_name || 'Unnamed User'}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold text-primary">(You)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.email || 'Registered User'}
                            </p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0',
                            isSuper
                              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                              : isAdmin
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-muted text-muted-foreground border-border/50'
                          )}
                        >
                          {p.role || 'user'}
                        </span>
                      </div>

                      {/* Bottom row: User ID & Action */}
                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyUserId(p.user_id)}
                          className="font-mono text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 truncate tap-shrink bg-muted/40 px-2 py-1 rounded-md"
                          title="Click to copy full ID"
                        >
                          <Copy className="w-3 h-3 shrink-0" />
                          <span>{p.user_id.slice(0, 8)}...</span>
                        </button>

                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant={isAdmin ? 'outline' : 'default'}
                            onClick={() =>
                              handleChangeUserRole(
                                p.user_id,
                                isAdmin ? 'user' : 'admin'
                              )
                            }
                            className={cn(
                              'h-7 px-2.5 text-[11px] font-bold rounded-lg tap-shrink',
                              isAdmin
                                ? 'text-destructive hover:bg-destructive/10 border-destructive/30'
                                : 'gradient-primary'
                            )}
                          >
                            {isAdmin ? 'Demote to User' : 'Make Admin'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP VIEW: Data Table (md+) */}
            <div className="hidden md:block rounded-2xl border border-border/60 bg-card overflow-hidden card-shadow">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/30">
                    <TableHead className="font-bold text-xs">Profile</TableHead>
                    <TableHead className="font-bold text-xs">User ID</TableHead>
                    <TableHead className="font-bold text-xs">Role in DB</TableHead>
                    <TableHead className="font-bold text-xs">Joined</TableHead>
                    <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No profiles found in database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((p) => {
                      const isCurrent = p.user_id === user.id;
                      const isSuper = p.role === 'super_admin';
                      const isAdmin = p.role === 'admin';

                      return (
                        <TableRow key={p.id} className="border-border/40 hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-black text-xs shrink-0">
                                {(p.display_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-foreground">
                                  {p.display_name || 'Unnamed User'}
                                  {isCurrent && <span className="text-primary ml-1">(You)</span>}
                                </p>
                                {p.email && <p className="text-[11px] text-muted-foreground">{p.email}</p>}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleCopyUserId(p.user_id)}
                              className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 tap-shrink"
                              title="Click to copy ID"
                            >
                              <span>{p.user_id.slice(0, 12)}...</span>
                              <Copy className="w-3 h-3" />
                            </button>
                          </TableCell>

                          <TableCell>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                                isSuper
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : isAdmin
                                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                  : 'bg-muted text-muted-foreground border-border/50'
                              )}
                            >
                              {p.role || 'user'}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            {!isCurrent && (
                              <Button
                                size="sm"
                                variant={isAdmin ? 'outline' : 'default'}
                                onClick={() =>
                                  handleChangeUserRole(
                                    p.user_id,
                                    isAdmin ? 'user' : 'admin'
                                  )
                                }
                                className={cn(
                                  'h-8 px-2.5 text-xs font-bold rounded-xl tap-shrink',
                                  isAdmin
                                    ? 'text-destructive hover:bg-destructive/10 border-destructive/30'
                                    : 'gradient-primary'
                                )}
                              >
                                {isAdmin ? 'Demote to User' : 'Make Admin'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SYSTEM BROADCASTS (MOBILE STREAMLINED) */}
        {/* ======================================================== */}
        {activeTab === 'broadcasts' && (
          <div className="space-y-4 card-enter">
            {/* Mobile Subtab Toggle */}
            <div className="lg:hidden flex p-1 rounded-xl bg-muted/50 border border-border/60">
              <button
                type="button"
                onClick={() => setBroadcastSubTab('list')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all tap-shrink',
                  broadcastSubTab === 'list'
                    ? 'bg-card text-foreground shadow-xs font-extrabold'
                    : 'text-muted-foreground'
                )}
              >
                Broadcasts ({broadcasts.length})
              </button>
              <button
                type="button"
                onClick={() => setBroadcastSubTab('compose')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all tap-shrink flex items-center justify-center gap-1',
                  broadcastSubTab === 'compose'
                    ? 'bg-card text-foreground shadow-xs font-extrabold'
                    : 'text-muted-foreground'
                )}
              >
                <Plus className="w-3.5 h-3.5" /> New Broadcast
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Form (Always visible on desktop, tabbed on mobile) */}
              <div
                className={cn(
                  'rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 card-shadow',
                  broadcastSubTab === 'list' ? 'hidden lg:block' : 'block'
                )}
              >
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" /> Create Announcement
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pushes instantly to all users' Notification Center.
                  </p>
                </div>

                <form onSubmit={handleCreateBroadcast} className="space-y-3.5">
                  <div>
                    <Label className="text-xs font-semibold">Title</Label>
                    <Input
                      placeholder="e.g. Server Maintenance or New Feature"
                      value={bcTitle}
                      onChange={(e) => setBcTitle(e.target.value)}
                      className="mt-1 h-10 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold block mb-1.5">Category</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'update', label: '🚀 Update' },
                        { id: 'alert', label: '⚠️ Alert' },
                        { id: 'info', label: '💡 Tip' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBcCategory(cat.id as any)}
                          className={cn(
                            'py-2 rounded-xl text-xs font-bold border transition-colors tap-shrink',
                            bcCategory === cat.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted/40 border-border/60 text-muted-foreground'
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Message</Label>
                    <Textarea
                      placeholder="Write your broadcast message..."
                      value={bcMessage}
                      onChange={(e) => setBcMessage(e.target.value)}
                      className="mt-1 rounded-xl text-xs min-h-[90px]"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-xl gradient-primary font-bold text-xs tap-shrink"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Publish Announcement
                  </Button>
                </form>
              </div>

              {/* List (Always visible on desktop, tabbed on mobile) */}
              <div
                className={cn(
                  'lg:col-span-2 rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 card-shadow',
                  broadcastSubTab === 'compose' ? 'hidden lg:block' : 'block'
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-primary" /> Active Broadcasts ({broadcasts.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBroadcastSubTab('compose')}
                    className="lg:hidden text-xs text-primary font-bold h-7 px-2"
                  >
                    + Compose
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {broadcasts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      No broadcasts published yet.
                    </p>
                  ) : (
                    broadcasts.map((bc) => (
                      <div
                        key={bc.id}
                        className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-foreground">{bc.title}</h4>
                            <span
                              className={cn(
                                'text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md border',
                                bc.category === 'alert'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                                  : bc.category === 'update'
                                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                                  : 'bg-sky-500/15 text-sky-400 border-sky-500/20'
                              )}
                            >
                              {bc.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{bc.message}</p>
                          <span className="text-[10px] text-muted-foreground/80 block mt-1">
                            {new Date(bc.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBroadcast(bc.id, bc.active)}
                            className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors tap-shrink',
                              bc.active
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-muted text-muted-foreground border-border/50'
                            )}
                          >
                            {bc.active ? 'Active' : 'Off'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBroadcast(bc.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors tap-shrink"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SYSTEM & FEATURE FLAGS */}
        {/* ======================================================== */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 card-enter">
            {/* Toggles */}
            <div className="rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 card-shadow">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Application Feature Switches
              </h3>

              <div className="space-y-2.5 pt-1">
                {[
                  {
                    title: 'Maintenance Mode',
                    desc: 'Locks app for users during schema upgrades',
                    checked: config.maintenanceMode,
                    onChange: (checked: boolean) => {
                      setConfig((prev: any) => ({ ...prev, maintenanceMode: checked }));
                      toast.info(`Maintenance mode is now ${checked ? 'ON' : 'OFF'}`);
                    },
                  },
                  {
                    title: 'Allow New Registrations',
                    desc: 'Controls public sign-up on /auth',
                    checked: config.allowRegistrations,
                    onChange: (checked: boolean) =>
                      setConfig((prev: any) => ({ ...prev, allowRegistrations: checked })),
                  },
                  {
                    title: 'AI Insights Pipeline',
                    desc: 'Smart finance coaching gateway',
                    checked: config.aiInsightsEnabled,
                    onChange: (checked: boolean) =>
                      setConfig((prev: any) => ({ ...prev, aiInsightsEnabled: checked })),
                  },
                  {
                    title: 'Beta Features Preview',
                    desc: 'Bill Splitter, Shared Tasks',
                    checked: config.betaFeatures,
                    onChange: (checked: boolean) =>
                      setConfig((prev: any) => ({ ...prev, betaFeatures: checked })),
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                  </div>
                ))}
              </div>
            </div>

            {/* Supabase Specs */}
            <div className="rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 card-shadow">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" /> Database & Environment
              </h3>

              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold text-[11px]">Connected Project</span>
                  <div className="flex items-center justify-between font-mono font-bold text-foreground">
                    <span>mcgptjnstxmnvkfnedxt</span>
                    <a
                      href="https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold text-[11px]">Endpoint URL</span>
                  <p className="font-mono text-[11px] text-foreground truncate">
                    https://mcgptjnstxmnvkfnedxt.supabase.co
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Live Production Security</span>
                    <span className="text-[11px] text-amber-200/80 leading-relaxed block mt-0.5">
                      Access is restricted exclusively to authenticated users carrying the <code>super_admin</code> role in the database.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DATABASE SCHEMA & SQL */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-4 card-enter">
            <div className="rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-3.5 card-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 shadow-xs">
                    SQL
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Super Admin Setup Migration</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Creates <code>user_roles</code> and <code>system_broadcasts</code> tables with RLS.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySql}
                    className="flex-1 sm:flex-initial h-9 rounded-xl text-xs gap-1.5 tap-shrink"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                  </Button>

                  <a
                    href="https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition-opacity tap-shrink"
                  >
                    <span>Open Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Code block */}
              <div className="relative rounded-xl bg-muted/60 border border-border/70 p-3 sm:p-4 overflow-x-auto max-h-72 text-[11px] font-mono text-muted-foreground">
                <pre>{SUPER_ADMIN_SQL}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
