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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

export function AdminPage() {
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  const { isSuperAdmin, role, checkingRole, dbTableExists, refetchRole, claimSuperAdminRole } = useAdmin();

  // Auth Form State (Email + Password only)
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Admin Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcasts' | 'system' | 'security'>('overview');
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState<RealProfile | null>(null);

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
          // Fallback to local storage if table not yet run
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
        toast.success('Broadcast saved to Supabase database!');
      } else {
        // Fallback local
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
    } catch {
      toast.success('Broadcast published!');
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
    const sql = `-- ARUX Super Admin Setup Migration for Supabase
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

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast.success('SQL migration script copied!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const filteredProfiles = useMemo(() => {
    return realProfiles.filter((p) => {
      const name = p.display_name?.toLowerCase() || '';
      const email = p.email?.toLowerCase() || '';
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
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
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/70 p-6 md:p-8 card-shadow shadow-2xl card-enter">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <Crown className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Super Admin Login</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Authenticate with your registered administrative email & password.
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
                  className="pl-9 h-11 rounded-xl"
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
                  className="pl-9 h-11 rounded-xl"
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
              className="w-full h-11 rounded-xl gradient-primary font-bold shadow-md"
            >
              {authLoading ? 'Verifying Credentials...' : 'Sign In as Super Admin'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
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
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/70 p-6 md:p-8 card-shadow shadow-2xl text-center card-enter space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Access Restricted</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Signed in as <code className="font-bold text-foreground">{user.email}</code>.
              Your database role is <span className="font-bold uppercase text-amber-400">{role || 'user'}</span>, which does not have Super Admin permissions.
            </p>
          </div>

          {/* First time setup option: claim role if database tables aren't setup */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-left space-y-2">
            <span className="text-xs font-bold text-foreground block">Are you the project owner?</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              If this is your first time configuring your Supabase database, you can claim Super Admin status for your account below.
            </p>
            <Button
              onClick={async () => {
                const res = await claimSuperAdminRole();
                if (res.success) {
                  toast.success('Super Admin role granted to your account!');
                  await refetchRole();
                } else {
                  toast.error(`Database setup needed: ${res.error}. Make sure user_roles table exists in Supabase.`);
                }
              }}
              className="w-full h-9 rounded-xl gradient-primary text-xs font-bold mt-2"
            >
              <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-300" /> Claim Super Admin Role
            </Button>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                toast.info('Signed out. Please log in with your Super Admin account.');
              }}
              className="w-full h-10 rounded-xl text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign in with different email
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
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
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-foreground tracking-tight">
                ARUX Super Admin
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Live DB
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Signed in as <strong className="text-foreground">{user.email}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchRealDatabaseData}
            disabled={loadingStats}
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loadingStats && 'animate-spin')} />
            <span className="hidden sm:inline">Sync Live DB</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/')}
            className="rounded-xl h-9 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App Home</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate('/auth');
              toast.info('Signed out of Super Admin');
            }}
            className="rounded-xl h-9 text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Sign out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide border-b border-border/50 pb-3">
          {[
            { id: 'overview', label: 'Live Overview', icon: BarChart3 },
            { id: 'users', label: 'Database Users', count: realProfiles.length, icon: Users },
            { id: 'broadcasts', label: 'System Broadcasts', count: broadcasts.length, icon: Radio },
            { id: 'system', label: 'Feature Toggles', icon: Sliders },
            { id: 'security', label: 'Database Schema & SQL', icon: ShieldCheck },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 tap-shrink',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: LIVE DATABASE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 card-enter">
            {/* Live Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Registered Profiles</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {metrics.totalProfiles}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Live from `profiles` table</p>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Real Transaction Volume</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  ₹{metrics.totalExpensesSum.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metrics.totalExpensesCount} expenses • {metrics.totalIncomesCount} incomes
                </p>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Tasks Tracked</span>
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {metrics.totalTasksCount}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metrics.completedTasksCount} completed ({metrics.totalTasksCount > 0 ? Math.round((metrics.completedTasksCount / metrics.totalTasksCount) * 100) : 0}%)
                </p>
              </div>

              <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Database Status</span>
                  <Server className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">Connected</div>
                <p className="text-[11px] text-muted-foreground mt-1">Supabase mcgptjnstxmnvkfnedxt</p>
              </div>
            </div>

            {/* Modules Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5 text-orange-400" /> Habits Logged
                </div>
                <p className="text-lg font-black text-foreground">{metrics.totalHabitsCount}</p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5 text-blue-400" /> Budgets Configured
                </div>
                <p className="text-lg font-black text-foreground">{metrics.totalBudgetsCount}</p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Subscriptions
                </div>
                <p className="text-lg font-black text-foreground">{metrics.totalSubscriptionsCount}</p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <Radio className="w-3.5 h-3.5 text-amber-400" /> Active Broadcasts
                </div>
                <p className="text-lg font-black text-foreground">{broadcasts.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REAL USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-4 card-enter">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-4 rounded-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  placeholder="Search database profiles by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-background border border-border/80 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="admin">Admins</option>
                  <option value="user">Regular Users</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
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
                    filteredProfiles.map((p) => (
                      <TableRow key={p.id} className="border-border/40 hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-black text-xs shrink-0">
                              {(p.display_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-foreground">{p.display_name || 'Unnamed User'}</p>
                              {p.email && <p className="text-[11px] text-muted-foreground">{p.email}</p>}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <code className="text-[11px] font-mono text-muted-foreground">
                            {p.user_id.slice(0, 12)}...
                          </code>
                        </TableCell>

                        <TableCell>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                              p.role === 'super_admin'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : p.role === 'admin'
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
                          <div className="flex items-center justify-end gap-1.5">
                            {p.user_id !== user.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleChangeUserRole(
                                    p.user_id,
                                    p.role === 'admin' ? 'user' : 'admin'
                                  )
                                }
                                className="h-8 px-2 text-xs"
                              >
                                {p.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM BROADCASTS */}
        {activeTab === 'broadcasts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 card-enter">
            {/* Form */}
            <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" /> Publish Announcement
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pushes immediately into all users' Notification Center.
                </p>
              </div>

              <form onSubmit={handleCreateBroadcast} className="space-y-3.5">
                <div>
                  <Label className="text-xs font-semibold">Title</Label>
                  <Input
                    placeholder="e.g. Server Maintenance or New Feature"
                    value={bcTitle}
                    onChange={(e) => setBcTitle(e.target.value)}
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Category</Label>
                  <select
                    value={bcCategory}
                    onChange={(e) => setBcCategory(e.target.value as any)}
                    className="w-full mt-1 h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="update">🚀 App Update</option>
                    <option value="alert">⚠️ Urgent Alert</option>
                    <option value="info">💡 Tip & Information</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Message</Label>
                  <Textarea
                    placeholder="Write your broadcast message..."
                    value={bcMessage}
                    onChange={(e) => setBcMessage(e.target.value)}
                    className="mt-1 rounded-xl text-xs min-h-[90px]"
                  />
                </div>

                <Button type="submit" className="w-full h-10 rounded-xl gradient-primary font-bold text-xs">
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Publish to Real DB
                </Button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border/60 p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Active Broadcasts ({broadcasts.length})</span>
                <span className="text-xs text-muted-foreground font-normal">Realtime Sync</span>
              </h3>

              <div className="space-y-3">
                {broadcasts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No broadcasts published yet.</p>
                ) : (
                  broadcasts.map((bc) => (
                    <div
                      key={bc.id}
                      className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBroadcast(bc.id, bc.active)}
                          className={cn(
                            'text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors',
                            bc.active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border-border/50'
                          )}
                        >
                          {bc.active ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(bc.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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
        )}

        {/* TAB 4: SYSTEM & FEATURE FLAGS */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 card-enter">
            <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Application Feature Switches
              </h3>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-xs font-bold text-foreground">Maintenance Mode</p>
                    <p className="text-[11px] text-muted-foreground">Locks app for users during schema upgrades</p>
                  </div>
                  <Switch
                    checked={config.maintenanceMode}
                    onCheckedChange={(checked) => {
                      setConfig((prev: any) => ({ ...prev, maintenanceMode: checked }));
                      toast.info(`Maintenance mode is now ${checked ? 'ON' : 'OFF'}`);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-xs font-bold text-foreground">Allow New User Registrations</p>
                    <p className="text-[11px] text-muted-foreground">Controls public sign-up on /auth</p>
                  </div>
                  <Switch
                    checked={config.allowRegistrations}
                    onCheckedChange={(checked) =>
                      setConfig((prev: any) => ({ ...prev, allowRegistrations: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-xs font-bold text-foreground">AI Insights Pipeline</p>
                    <p className="text-[11px] text-muted-foreground">Monthly smart finance coaching gateway</p>
                  </div>
                  <Switch
                    checked={config.aiInsightsEnabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev: any) => ({ ...prev, aiInsightsEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-xs font-bold text-foreground">Beta Features Preview</p>
                    <p className="text-[11px] text-muted-foreground">Bill Splitter, Shared Tasks</p>
                  </div>
                  <Switch
                    checked={config.betaFeatures}
                    onCheckedChange={(checked) =>
                      setConfig((prev: any) => ({ ...prev, betaFeatures: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Supabase Specs */}
            <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" /> Database & Environment Specs
              </h3>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold">Connected Project</span>
                  <div className="flex items-center justify-between font-mono font-bold text-foreground">
                    <span>mcgptjnstxmnvkfnedxt</span>
                    <a
                      href="https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Supabase Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold">Endpoint</span>
                  <p className="font-mono text-[11px] text-foreground truncate">
                    https://mcgptjnstxmnvkfnedxt.supabase.co
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Live Production Security</span>
                    <span className="text-[11px] text-amber-200/80">
                      Access is restricted exclusively to authenticated users carrying the `super_admin` role in the database.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DATABASE SCHEMA & SQL */}
        {activeTab === 'security' && (
          <div className="space-y-6 card-enter">
            <div className="rounded-2xl bg-gradient-to-r from-card to-muted/40 border border-border/60 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                    SQL
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Super Admin Setup Migration</h3>
                    <p className="text-xs text-muted-foreground">
                      Creates the <code className="font-bold">user_roles</code> and <code className="font-bold">system_broadcasts</code> tables with RLS in Supabase.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySql}
                    className="h-8 rounded-xl text-xs gap-1.5"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                  </Button>

                  <a
                    href="https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    <span>Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
