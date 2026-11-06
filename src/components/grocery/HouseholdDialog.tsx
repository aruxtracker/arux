import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroceryHousehold, GroceryHouseholdMember } from '@/types/grocery';
import {
  Users,
  Copy,
  Check,
  Plus,
  Mail,
  UserPlus,
  Building,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Crown,
  User,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface HouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  households: GroceryHousehold[];
  activeHousehold: GroceryHousehold | null;
  members: GroceryHouseholdMember[];
  currentUserId?: string;
  currentUserEmail?: string;
  onSwitchHousehold: (id: string | null) => void;
  onCreateHousehold: (name: string) => void;
  onInviteByEmail: (email: string) => Promise<boolean>;
  onRemoveMember?: (memberId: string) => Promise<boolean>;
  onDeleteHousehold?: (id: string) => void;
}

export function HouseholdDialog({
  open,
  onOpenChange,
  households,
  activeHousehold,
  members,
  currentUserId,
  currentUserEmail,
  onSwitchHousehold,
  onCreateHousehold,
  onInviteByEmail,
  onRemoveMember,
  onDeleteHousehold,
}: HouseholdDialogProps) {
  const [tab, setTab] = useState<'current' | 'create'>('current');
  const [newName, setNewName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isOwner = activeHousehold && currentUserId && activeHousehold.owner_id === currentUserId;

  const handleCopyMyEmail = () => {
    if (!currentUserEmail) return;
    navigator.clipboard.writeText(currentUserEmail).catch(() => {
      const el = document.createElement('textarea');
      el.value = currentUserEmail;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopiedEmail(true);
    toast.success('Your email copied! Share with your flatmate to be added.');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateHousehold(newName.trim());
    setNewName('');
    setTab('current');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const success = await onInviteByEmail(inviteEmail.trim());
    setInviting(false);
    if (success) {
      setInviteEmail('');
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
              <div className="space-y-3">
                {/* Active Household Info Card */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">{activeHousehold.name}</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isOwner ? '👑 You are the household owner' : '👥 Shared flat member'}
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

                {/* Invite Roommate by Email (Only for owner) */}
                {isOwner && (
                  <form onSubmit={handleInviteSubmit} className="p-4 rounded-2xl bg-card border border-border/70 space-y-3">
                    <div>
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-primary" />
                        <span>Add Roommate by Registered Email</span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Enter the email your friend uses to sign in to ARUX.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          required
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="roommate@example.com"
                          className="h-10 pl-9 rounded-xl bg-muted/40 text-xs font-medium"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={inviting || !inviteEmail.trim()}
                        className="h-10 px-3.5 rounded-xl gradient-primary text-xs font-bold gap-1.5 tap-shrink shrink-0"
                      >
                        {inviting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Roommates / Members List */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>Flatmates ({members.length || 1})</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Shared access</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {/* Owner row if not already in members */}
                    {isOwner && !members.some((m) => m.role === 'owner') && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">You (Owner)</p>
                            {currentUserEmail && (
                              <p className="text-[10px] text-muted-foreground truncate">{currentUserEmail}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 uppercase">
                          Owner
                        </span>
                      </div>
                    )}

                    {members.map((m) => {
                      const isMemberOwner = m.role === 'owner';
                      const isMe = currentUserId && m.user_id === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                                isMemberOwner
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {isMemberOwner ? <Crown className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">
                                {m.displayName || m.email?.split('@')[0] || (isMe ? 'You' : 'Roommate')}
                                {isMe && <span className="text-muted-foreground font-normal ml-1">(You)</span>}
                              </p>
                              {m.email && (
                                <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isMemberOwner
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {m.role}
                            </span>
                            {/* Owner can remove members (except self) */}
                            {isOwner && !isMemberOwner && !isMe && onRemoveMember && (
                              <button
                                type="button"
                                onClick={() => onRemoveMember(m.id)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors tap-shrink"
                                title="Remove roommate"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Solo / Personal Mode</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-0.5">
                    Managing your groceries privately. Want to share with roommates?
                  </p>
                </div>

                {currentUserEmail && (
                  <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between gap-2 text-left">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Your Registered Email</p>
                      <p className="text-xs font-bold text-foreground truncate">{currentUserEmail}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Ask your flatmate to invite this email.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyMyEmail}
                      className="h-8 px-2.5 rounded-lg text-xs gap-1 tap-shrink shrink-0"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => setTab('create')}
                  className="w-full h-10 rounded-xl gradient-primary text-xs font-bold shadow-pop tap-shrink"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Shared Flat
                </Button>
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
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {h.owner_id === currentUserId ? 'Owner' : 'Member'}
                        </span>
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

        {/* TAB 2: Create Household */}
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
                After creating your flat, you can invite your roommates using their registered email.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!newName.trim()}
              className="w-full h-11 rounded-xl gradient-primary text-xs font-bold shadow-pop tap-shrink"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Shared Flat
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
