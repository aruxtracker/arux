import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, X, Lightbulb, Trash2 } from 'lucide-react';
import { Idea, IdeaCategory, IDEA_CATEGORIES } from '@/types';

interface IdeasPageProps {
  ideas: Idea[];
  onAdd: (data: Omit<Idea, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function IdeasPage({ ideas, onAdd, onDelete }: IdeasPageProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('random');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onAdd({ title: title.trim(), description: description.trim() || undefined, category, tags });
    setTitle(''); setDescription(''); setCategory('random'); setTags([]); setOpen(false);
  };

  const filtered = ideas.filter(idea => {
    const matchesSearch = !searchQuery || idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.tags.some(t => t.includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || idea.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (cat: IdeaCategory) => IDEA_CATEGORIES.find(c => c.value === cat)!;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Idea Vault</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add Idea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Idea</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Idea title..." value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Description (optional)..." value={description} onChange={e => setDescription(e.target.value)} />
              <Select value={category} onValueChange={v => setCategory(v as IdeaCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDEA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map(t => (
                    <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                      {t} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground">Save Idea</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search ideas..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {IDEA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ideas yet</p><p className="text-sm">Start capturing your brilliant ideas!</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((idea, i) => {
            const info = getCategoryInfo(idea.category);
            return (
              <Card key={idea.id} className="glass hover:card-shadow-hover transition-all duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{info.emoji}</span>
                        <h3 className="font-semibold truncate">{idea.title}</h3>
                      </div>
                      {idea.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{idea.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">{info.label}</Badge>
                        {idea.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDelete(idea.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(idea.createdAt).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
