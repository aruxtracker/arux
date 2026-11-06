import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { AruxMascot } from '@/components/AruxMascot';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else if (mode === 'signup') {
        if (!displayName.trim()) { toast.error('Please enter your name'); setLoading(false); return; }
        const { error } = await signUp(email, password, displayName);
        if (error) toast.error(error.message);
        else toast.success('Check your email to confirm your account!');
      } else {
        const { error } = await resetPassword(email);
        if (error) toast.error(error.message);
        else toast.success('Password reset link sent to your email!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <AruxMascot size="xl" className="mb-3 animate-float-slow" />
          <BrandMark className="w-36 mb-2" />
          <h1 className="sr-only">ARUX Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-3xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-10 rounded-xl" required />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 rounded-xl" required />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-xl"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline self-end -mt-1">
                Forgot password?
              </button>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-xl gradient-primary border-0 text-white gap-2 mt-2">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <p>Don't have an account?{' '}<button onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">Sign up</button></p>
            ) : (
              <p>Already have an account?{' '}<button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Sign in</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
