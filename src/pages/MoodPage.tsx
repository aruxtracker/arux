import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Brain, Zap, Moon, Target, TrendingUp, Trash2 } from 'lucide-react';
import { MoodEntry } from '@/types';

interface MoodPageProps {
  entries: MoodEntry[];
  onAdd: (data: Omit<MoodEntry, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MOOD_LABELS = ['😢', '😔', '😐', '🙂', '😄'];
const ENERGY_LABELS = ['🔋', '🪫', '⚡', '💪', '🚀'];

function RatingSelector({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="flex gap-2 justify-center">
      {labels.map((label, i) => (
        <button key={i} onClick={() => onChange(i + 1)}
          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all duration-200 ${
            value === i + 1 ? 'gradient-primary scale-110 shadow-lg' : 'bg-muted hover:bg-accent'
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function MoodPage({ entries, onAdd, onDelete }: MoodPageProps) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [productivity, setProductivity] = useState(3);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async () => {
    await onAdd({ date, mood, energy, sleepQuality, productivity, notes: notes.trim() || undefined });
    setMood(3); setEnergy(3); setSleepQuality(3); setProductivity(3); setNotes(''); setOpen(false);
  };

  const weeklyInsights = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
    if (weekEntries.length === 0) return null;

    const avg = (field: keyof Pick<MoodEntry, 'mood' | 'energy' | 'sleepQuality' | 'productivity'>) =>
      +(weekEntries.reduce((s, e) => s + e[field], 0) / weekEntries.length).toFixed(1);

    const dayAvgs: Record<string, { mood: number; count: number }> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    weekEntries.forEach(e => {
      const day = days[new Date(e.date).getDay()];
      if (!dayAvgs[day]) dayAvgs[day] = { mood: 0, count: 0 };
      dayAvgs[day].mood += e.mood; dayAvgs[day].count++;
    });

    let lowestDay = '', lowestAvg = 6;
    Object.entries(dayAvgs).forEach(([day, { mood: m, count }]) => {
      const a = m / count;
      if (a < lowestAvg) { lowestAvg = a; lowestDay = day; }
    });

    return { avgMood: avg('mood'), avgEnergy: avg('energy'), avgSleep: avg('sleepQuality'), avgProd: avg('productivity'), lowestDay, entryCount: weekEntries.length };
  }, [entries]);

  const todayEntry = entries.find(e => e.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Mood & Energy</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Log</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>How are you feeling?</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <div><p className="text-sm font-medium mb-2 flex items-center gap-1"><Brain className="w-4 h-4" /> Mood</p>
                <RatingSelector value={mood} onChange={setMood} labels={MOOD_LABELS} /></div>
              <div><p className="text-sm font-medium mb-2 flex items-center gap-1"><Zap className="w-4 h-4" /> Energy</p>
                <RatingSelector value={energy} onChange={setEnergy} labels={ENERGY_LABELS} /></div>
              <div><p className="text-sm font-medium mb-2 flex items-center gap-1"><Moon className="w-4 h-4" /> Sleep Quality</p>
                <RatingSelector value={sleepQuality} onChange={setSleepQuality} labels={['😴', '🥱', '😑', '😊', '🌟']} /></div>
              <div><p className="text-sm font-medium mb-2 flex items-center gap-1"><Target className="w-4 h-4" /> Productivity</p>
                <RatingSelector value={productivity} onChange={setProductivity} labels={['📉', '📊', '📈', '🔥', '🏆']} /></div>
              <Textarea placeholder="Notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} />
              <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground">Save Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {todayEntry && (
        <Card className="glass border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-primary mb-2">TODAY</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div><span className="text-2xl">{MOOD_LABELS[todayEntry.mood - 1]}</span><p className="text-[10px] text-muted-foreground mt-1">Mood</p></div>
              <div><span className="text-2xl">{ENERGY_LABELS[todayEntry.energy - 1]}</span><p className="text-[10px] text-muted-foreground mt-1">Energy</p></div>
              <div><span className="text-2xl">{['😴', '🥱', '😑', '😊', '🌟'][todayEntry.sleepQuality - 1]}</span><p className="text-[10px] text-muted-foreground mt-1">Sleep</p></div>
              <div><span className="text-2xl">{['📉', '📊', '📈', '🔥', '🏆'][todayEntry.productivity - 1]}</span><p className="text-[10px] text-muted-foreground mt-1">Productivity</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {weeklyInsights && (
        <Card className="glass">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Weekly Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{weeklyInsights.avgMood}/5</p><p className="text-xs text-muted-foreground">Avg Mood</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{weeklyInsights.avgEnergy}/5</p><p className="text-xs text-muted-foreground">Avg Energy</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{weeklyInsights.avgSleep}/5</p><p className="text-xs text-muted-foreground">Avg Sleep</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{weeklyInsights.avgProd}/5</p><p className="text-xs text-muted-foreground">Avg Productivity</p>
              </div>
            </div>
            {weeklyInsights.lowestDay && (
              <p className="text-sm text-center text-muted-foreground py-2">
                💡 You tend to feel low on <span className="font-semibold text-foreground">{weeklyInsights.lowestDay}s</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Recent Entries</h3>
        {entries.slice(0, 14).map((entry, i) => (
          <Card key={entry.id} className="glass hover:card-shadow-hover transition-all duration-300" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{MOOD_LABELS[entry.mood - 1]}</span>
                  <div>
                    <p className="text-sm font-medium">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>⚡{entry.energy}</span> <span>😴{entry.sleepQuality}</span> <span>🎯{entry.productivity}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(entry.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {entry.notes && <p className="text-xs text-muted-foreground mt-2 pl-9">{entry.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
