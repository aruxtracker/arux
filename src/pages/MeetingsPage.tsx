import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { SwipeRow } from '@/components/SwipeRow';
import { Plus, Pencil, Trash2, Calendar, Clock, Bell } from 'lucide-react';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface MeetingsPageProps {
  meetings: Meeting[];
  upcomingMeetings: Meeting[];
  onAdd: (data: Omit<Meeting, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Meeting, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM = {
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  time: format(new Date(), 'HH:mm'),
  notes: ''
};

function getMeetingLabel(dateStr: string, timeStr: string) {
  const dt = new Date(`${dateStr}T${timeStr}`);
  if (isPast(dt)) return { label: 'Past', cls: 'bg-muted text-muted-foreground' };
  if (isToday(new Date(dateStr))) return { label: 'Today', cls: 'gradient-primary text-white' };
  if (isTomorrow(new Date(dateStr))) return { label: 'Tomorrow', cls: 'meeting-bg meeting-text' };
  return { label: format(new Date(dateStr), 'd MMM'), cls: 'bg-secondary text-secondary-foreground' };
}

export function MeetingsPage({ meetings, upcomingMeetings, onAdd, onUpdate, onDelete }: MeetingsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPast, setShowPast] = useState(false);

  const pastMeetings = meetings.filter(m => isPast(new Date(`${m.date}T${m.time}`))).sort((a, b) =>
    new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
  );

  const handleOpen = (meeting?: Meeting) => {
    if (meeting) {
      setEditingId(meeting.id);
      setForm({ title: meeting.title, date: meeting.date, time: meeting.time, notes: meeting.notes || '' });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title || !form.date || !form.time) return;
    const data = { title: form.title, date: form.date, time: form.time, notes: form.notes };
    if (editingId) {
      onUpdate(editingId, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const scheduleReminder = (meeting: Meeting) => {
    const dt = new Date(`${meeting.date}T${meeting.time}`);
    const reminderTime = dt.getTime() - 15 * 60 * 1000;
    const now = Date.now();
    if (reminderTime > now && 'Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification(`Meeting in 15 min: ${meeting.title}`, { body: `Scheduled at ${meeting.time}` });
      }, reminderTime - now);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">{upcomingMeetings.length} upcoming</p>
        </div>
        <Button onClick={() => handleOpen()} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0 text-white hover:opacity-90">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {upcomingMeetings.length === 0 && pastMeetings.length === 0 ? (
        <div className="mx-4 md:mx-0 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl meeting-bg flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 meeting-text" />
          </div>
          <p className="text-muted-foreground text-sm">No meetings scheduled</p>
          <p className="text-muted-foreground text-xs mt-1">Tap "Add" to schedule one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 md:px-0">
          {upcomingMeetings.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
              {upcomingMeetings.map(meeting => {
                const { label, cls } = getMeetingLabel(meeting.date, meeting.time);
                return (
                  <MeetingCard key={meeting.id} meeting={meeting} label={label} labelCls={cls}
                    onEdit={() => handleOpen(meeting)} onDelete={() => setDeleteId(meeting.id)}
                    onReminder={() => scheduleReminder(meeting)} />
                );
              })}
            </>
          )}

          {pastMeetings.length > 0 && (
            <>
              <button onClick={() => setShowPast(p => !p)}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left mt-2 flex items-center gap-1">
                Past Meetings ({pastMeetings.length}) {showPast ? '▲' : '▼'}
              </button>
              {showPast && pastMeetings.map(meeting => {
                const { label, cls } = getMeetingLabel(meeting.date, meeting.time);
                return (
                  <MeetingCard key={meeting.id} meeting={meeting} label={label} labelCls={cls}
                    onEdit={() => handleOpen(meeting)} onDelete={() => setDeleteId(meeting.id)} />
                );
              })}
            </>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Meeting' : 'Add Meeting'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Title *</Label>
              <Input placeholder="Meeting title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Time *</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.date || !form.time} className="gradient-primary border-0 text-white">
              {editingId ? 'Update' : 'Add Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MeetingCard({ meeting, label, labelCls, onEdit, onDelete, onReminder }: {
  meeting: Meeting; label: string; labelCls: string;
  onEdit: () => void; onDelete: () => void; onReminder?: () => void;
}) {
  return (
    <SwipeRow onEdit={onEdit} onDelete={onDelete} radiusClass="rounded-2xl" className="card-enter">
      <div className="glass rounded-2xl p-4 card-press">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', labelCls)}>{label}</span>
            </div>
            <p className="font-semibold truncate">{meeting.title}</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(meeting.date), 'd MMM yyyy')}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {meeting.time}
              </div>
            </div>
            {meeting.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{meeting.notes}</p>}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {onReminder && (
              <button onClick={onReminder} title="Set 15 minute reminder" className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <button onClick={onEdit} className="hidden md:inline-flex tap-target p-2 rounded-xl hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="hidden md:inline-flex tap-target p-2 rounded-xl hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </SwipeRow>
  );
}

