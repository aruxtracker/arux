import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroceryHousehold, GroceryHouseholdMember } from '@/types/grocery';
import { Users, Copy, Check, Plus, KeyRound, Building, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface HouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  households: GroceryHousehold[];
  activeHousehold: GroceryHousehold | null;
  members: GroceryHouseholdMember[];
  currentUserId?: string;
  onSwitchHousehold: (id: string | null) => void;
  onCreateHousehold: (name: string) => void;
  onJoinHousehold: (code: string) => Promise<boolean>;
  onDeleteHousehold?: (id: string) => void;
}

export function HouseholdDialog({
  open,
  onOpenChange,
  households,
  activeHousehold,
  members,
  currentUserId,
  onSwitchHousehold,
  onCreateHousehold,
  onJoinHousehold,
  onDeleteHousehold,
}: HouseholdDialogProps) {
  const [tab, setTab] = useState<'current' | 'create' | 'join'>('current');
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isOwner = activeHousehold && currentUserId && activeHousehold.owner_id === currentUserId;

  const handleCopyCode = () => {
    if (!activeHousehold?.code) return;
    navigator.clipboard.writeText(activeHousehold.code).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = activeHousehold.code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    toast.success('Household invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateHousehold(newName.trim());
    setNewName('');
    setTab('current');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    const success = await onJoinHousehold(joinCode.trim());
    setJoining(false);
    if (success) {
      setJoinCode('');
      setTab('current');
    }
  };

  const handleDeleteConfirmed = () => {
    if (!confirmDeleteId || !onDeleteHousehold) return;
    onDeleteHousehold(confirmDeleteId);
    setConfirmDeleteId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80 max-h-[90vh] overflow-y-auto">

        {/* Delete confirmation overlay */}
        {confirmDeleteId && (
          <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-1">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-foreground">Delete Household?</h4>
              <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
                This will permanently remove the household and all its data. Roommates will lose access.
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 h-11 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirmed}
                className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold"
              >
                Yes, Delete
              </Button>
            </div>
          </div>
        )}

        <DialogHeader className="text-left">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
            <Users className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
            Hostel & Flat Sharing
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share grocery shopping and pantry stock with your roommates.
          </p>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex p-1 rounded-2xl bg-muted/50 border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('current')}
            className={`flex-1 py-1.5 rounded-xl transition-all tap-shrink ${
              tab === 'current'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Household
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 py-1.5 rounded-xl transition-all tap-shrink ${
              tab === 'join'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Join Code
          </button>
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 py-1.5 rounded-xl transition-all tap-shrink ${
              tab === 'create'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New Flat
          </button>
        </div>

        {/* TAB 1: Current Household */}
        {tab === 'current' && (
          <div className="space-y-4 pt-1">
            {activeHousehold ? (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">{activeHousehold.name}</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isOwner ? 'You are the owner' : 'Active shared flat / hostel group'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                      Active
                    </span>
                    {/* Delete button — only for owner */}
                    {isOwner && onDeleteHousehold && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(activeHousehold.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors tap-shrink"
                        title="Delete household"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Invite Code card */}
                <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Roommate Invite Code
                    </p>
                    <p className="text-base font-extrabold text-foreground tracking-widest font-mono mt-0.5 truncate">
                      {activeHousehold.code}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="h-8 px-2.5 rounded-lg text-xs gap-1.5 tap-shrink shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>

                {/* Switch to Personal Mode */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSwitchHousehold(null)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Switch to Personal (Solo) Groceries
                </Button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Solo / Personal Mode</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  You are managing your groceries privately. Want to share with roommates in your flat or hostel?
                </p>
                <div className="pt-2 flex gap-2">
                  <Button
                    onClick={() => setTab('create')}
                    className="flex-1 h-9 rounded-xl gradient-primary text-xs font-bold"
                  >
                    Create Flat Group
                  </Button>
                  <Button
                    onClick={() => setTab('join')}
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs font-bold"
                  >
                    Join with Code
                  </Button>
                </div>
              </div>
            )}

            {/* Other households list if any */}
            {households.length > 1 && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-muted-foreground">Your other households</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {households.map((h) => (
                    <div key={h.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSwitchHousehold(h.id)}
                        className={`flex-1 p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-colors ${
                          activeHousehold?.id === h.id
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-card border-border/60 hover:bg-muted text-foreground'
                        }`}
                      >
                        <span>{h.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{h.code}</span>
                      </button>
                      {/* Delete for non-active households that user owns */}
                      {currentUserId && h.owner_id === currentUserId && onDeleteHousehold && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(h.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors tap-shrink shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Join Household */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-1">
              <KeyRound className="w-7 h-7 text-primary mx-auto" />
              <p className="text-xs font-bold text-foreground">Enter the invite code from your flatmate</p>
              <p className="text-[11px] text-muted-foreground">Ask your roommate or admin to share their household invite code.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                <span>Invite Code</span>
              </Label>
              <Input
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A9B2C4"
                maxLength={10}
                className="h-14 rounded-xl bg-muted/40 font-mono font-black tracking-widest text-center text-2xl uppercase"
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">
                Code is case-insensitive. e.g. <span className="font-mono font-bold">A9B2C4</span>
              </p>
            </div>

            <Button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="w-full h-12 rounded-xl gradient-primary text-sm font-bold shadow-pop tap-shrink"
            >
              {joining ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Shared Household'
              )}
            </Button>
          </form>
        )}

        {/* TAB 3: Create Household */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Flat / Hostel Name *</Label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Flat 302, Green Hostel Wing B"
                className="h-11 rounded-xl bg-muted/40 font-semibold"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                A shared household lets everyone check off shopping items and see available pantry stock.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!newName.trim()}
              className="w-full h-11 rounded-xl gradient-primary text-xs font-bold shadow-pop tap-shrink"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Shared Household
            </Button>
          </form>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-muted-foreground h-10"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
