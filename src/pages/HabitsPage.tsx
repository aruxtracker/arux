import { useState, useMemo } from 'react';
import { format, subDays, differenceInCalendarDays } from 'date-fns';
import { Plus, Trash2, Flame } from 'lucide-react';
import { Habit, HabitLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface HabitsPageProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onAdd: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
}

const EMOJI_OPTIONS = ['✅', '💪', '📖', '🏋️', '🧘', '💻', '🎯', '🏃', '✍️', '🎵', '💧', '🥗'];

export function HabitsPage({ habits, habitLogs, onAdd, onDelete, onToggleLog }: HabitsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '✅' });
  const today = format(new Date(), 'yyyy-MM-dd');

  // Last 7 days
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), day: format(d, 'd') };
    }), []);

  const isLogged = (habitId: string, date: string) =>
    habitLogs.some(l => l.habitId === habitId && l.date === date);

  // Calculate streaks
  const getStreak = (habitId: string): number => {
    let streak = 0;
    let checkDate = new Date();
    // If today not logged yet, start from yesterday
    if (!isLogged(habitId, format(checkDate, 'yyyy-MM-dd'))) {
      checkDate = subDays(checkDate, 1);
    }
    while (isLogged(habitId, format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    return streak;
  };

  const todayCompleted = habits.filter(h => isLogged(h.id, today)).length;

  const handleAdd = () => {
    if (!form.title.trim()) return;
    onAdd({ title: form.title.trim(), emoji: form.emoji });
    setForm({ title: '', emoji: '✅' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Today: {todayCompleted}/{habits.length} completed
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0 text-white hover:opacity-90">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {habits.length === 0 ? (
        <div className="mx-4 md:mx-0 flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🔥</div>
          <p className="text-muted-foreground text-sm">No habits yet</p>
          <p className="text-muted-foreground text-xs mt-1">Start building your streaks!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 md:px-0">
          {habits.map(habit => {
            const streak = getStreak(habit.id);
            return (
              <div key={habit.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{habit.emoji}</span>
                    <span className="font-semibold">{habit.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                        <Flame className="w-3.5 h-3.5" /> {streak}
                      </span>
                    )}
                    <button onClick={() => onDelete(habit.id)} className="tap-target p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map(d => {
                    const done = isLogged(habit.id, d.date);
                    return (
                      <button
                        key={d.date}
                        onClick={() => onToggleLog(habit.id, d.date)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-xs',
                          done
                            ? 'gradient-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <span className="text-[10px] font-medium">{d.label}</span>
                        <span className="font-bold">{d.day}</span>
                        <span className="text-sm">{done ? '✅' : '○'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass">
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Habit Name *</Label>
              <Input placeholder="e.g. Gym, Reading, Coding" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all',
                      form.emoji === e ? 'gradient-primary shadow-lg scale-110' : 'bg-muted hover:bg-muted/80')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.title.trim()} className="gradient-primary border-0 text-white">Add Habit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
