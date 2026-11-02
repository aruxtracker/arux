import { useState, useEffect } from 'react';
import { Users, Mail, X, Loader2, UserPlus, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskList } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email?: string;
}
interface Invite {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
}

export function ShareListDialog({
  list, open, onOpenChange,
}: {
  list: TaskList | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwner = list && user && list.ownerId === user.id;

  useEffect(() => {
    if (!list || !open) return;
    setLoading(true);
    Promise.all([
      supabase.from('task_list_members').select('*').eq('list_id', list.id),
      supabase.from('task_list_invites').select('*').eq('list_id', list.id).eq('status', 'pending'),
    ]).then(([m, i]) => {
      setMembers(m.data || []);
      setInvites(i.data || []);
      setLoading(false);
    });
  }, [list, open]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !email.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-task-list', {
        body: { listId: list.id, email: email.trim() },
      });
      if (error) throw error;
      if (data?.status === 'member_added') toast.success(`${data.email} added to "${list.name}"`);
      else if (data?.status === 'invite_pending') toast.success(`Invite sent — ${data.email} will join on next login`);
      setEmail('');
      // Refresh
      const [m, i] = await Promise.all([
        supabase.from('task_list_members').select('*').eq('list_id', list.id),
        supabase.from('task_list_invites').select('*').eq('list_id', list.id).eq('status', 'pending'),
      ]);
      setMembers(m.data || []); setInvites(i.data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to invite');
    } finally { setBusy(false); }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('task_list_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed');
  };
  const cancelInvite = async (id: string) => {
    await supabase.from('task_list_invites').delete().eq('id', id);
    setInvites(prev => prev.filter(i => i.id !== id));
  };

  if (!list) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Share "{list.name}"
          </DialogTitle>
        </DialogHeader>

        {isOwner ? (
          <>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email" placeholder="teammate@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required disabled={busy}
              />
              <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground -mt-1">
              They'll join instantly if they have an ARUX account, otherwise they'll get a pending invite.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Only the owner can manage members.</p>
        )}

        {/* Owner */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
              <span className="text-sm flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-yellow-500" /> Owner
              </span>
              <span className="text-xs text-muted-foreground">{isOwner ? 'You' : ''}</span>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto my-2" />}
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                <span className="text-sm flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> {m.user_id.slice(0, 8)}…
                </span>
                {isOwner && (
                  <button onClick={() => removeMember(m.id)} className="text-destructive hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {invites.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending invites</p>
            <div className="flex flex-col gap-1.5">
              {invites.map(i => (
                <div key={i.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <span className="text-sm flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5" /> {i.invited_email}
                  </span>
                  {isOwner && (
                    <button onClick={() => cancelInvite(i.id)} className="text-destructive hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
