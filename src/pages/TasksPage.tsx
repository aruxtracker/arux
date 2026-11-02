import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
  CheckCircle2, Circle, Plus, Trash2, Calendar, Star, ChevronDown, ChevronRight,
  ListPlus, Pencil, X, Search, MoreVertical, Link2, Share2, GripVertical, Flag, ArrowUpDown, Repeat, Check,
  SlidersHorizontal, Tag as TagIcon, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Meeting, Task, TaskList, TaskPriority, TASK_PRIORITIES, TASK_TAGS, getTaskTag, LIST_COLORS, Subtask } from '@/types';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareListDialog } from '@/components/ShareListDialog';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const RECURRING_OPTIONS: { value: Task['recurring']; label: string }[] = [
  { value: null, label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface TasksPageProps {
  tasks: Task[];
  taskLists: TaskList[];
  meetings: Meeting[];
  subtasks: Subtask[];
  onAdd: (data: Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string; listId?: string }) => void;
  onUpdate: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (id: string, data: Partial<Pick<Subtask, 'title' | 'completed' | 'position'>>) => void;
  onDeleteSubtask: (id: string) => void;
  onAddList: (data: { name: string; color?: string }) => void;
  onUpdateList: (id: string, data: Partial<{ name: string; color: string }>) => void;
  onDeleteList: (id: string) => void;
}


function OptionRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 w-full min-w-0 max-w-full">
      <span className="text-[11px] font-bold text-muted-foreground shrink-0 pr-1 flex items-center gap-1 w-[68px]">
        {icon} {label}
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
        {children}
      </div>
    </div>
  );
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 h-9 rounded-full text-[11px] font-bold border transition-all tap-shrink flex items-center gap-1.5',
        active ? 'text-white border-transparent shadow-sm' : 'border-border/60 text-muted-foreground'
      )}
      style={active ? { backgroundColor: color || 'hsl(var(--primary))' } : undefined}
    >
      {color && !active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}

export function TasksPage({
  tasks, taskLists, meetings, subtasks, onAdd, onUpdate, onDelete,
  onAddSubtask, onUpdateSubtask, onDeleteSubtask,
  onAddList, onUpdateList, onDeleteList,
}: TasksPageProps) {
  const sortedLists = useMemo(
    () => [...taskLists].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    [taskLists]
  );
  const [activeListId, setActiveListId] = useState<string | 'all' | 'starred'>('all');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>(0);
  const [newRecurring, setNewRecurring] = useState<Task['recurring']>(null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [editList, setEditList] = useState<TaskList | null>(null);
  const [shareList, setShareList] = useState<TaskList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileComposer, setShowMobileComposer] = useState(false);


  // Default to first list if available
  useEffect(() => {
    if (activeListId === 'all' && sortedLists.length > 0 && !sortedLists.find(l => l.id === 'all')) {
      // keep "all" — that's intentional
    }
  }, [sortedLists, activeListId]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (activeListId === 'starred') list = list.filter(t => t.starred);
    else if (activeListId !== 'all') list = list.filter(t => t.listId === activeListId);
    if (priorityFilter !== 'all') list = list.filter(t => (t.priority ?? 0) === priorityFilter);
    if (tagFilter.length > 0) list = list.filter(t => (t.tags || []).some(tag => tagFilter.includes(tag)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q));
    }
    return list;
  }, [tasks, activeListId, search, priorityFilter, tagFilter]);

  const activeFilterCount = (priorityFilter === 'all' ? 0 : 1) + tagFilter.length + (sortByPriority ? 1 : 0);
  const toggleTagFilter = (id: string) =>
    setTagFilter(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const toggleNewTag = (id: string) =>
    setNewTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const pending = useMemo(() => {
    return filteredTasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        if (sortByPriority && (b.priority ?? 0) !== (a.priority ?? 0)) {
          return (b.priority ?? 0) - (a.priority ?? 0);
        }
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
      });
  }, [filteredTasks, sortByPriority]);

  const completed = useMemo(
    () => filteredTasks
      .filter(t => t.completed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filteredTasks]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const targetListId = activeListId !== 'all' && activeListId !== 'starred'
      ? activeListId
      : sortedLists[0]?.id;
    if (!targetListId) {
      toast.info('Create a list first to add tasks');
      setShowNewListDialog(true);
      return;
    }
    onAdd({
      title: newTitle.trim(),
      completed: false,
      starred: activeListId === 'starred',
      listId: targetListId,
      priority: newPriority,
      recurring: newRecurring,
      tags: newTags,
    });
    setNewTitle('');
    setNewRecurring(null);
    setNewTags([]);
    setShowMobileComposer(false);
    inputRef.current?.focus();
  };

  const handleAddList = () => {
    if (!newListName.trim()) return;
    onAddList({ name: newListName.trim(), color: newListColor });
    setNewListName('');
    setNewListColor(LIST_COLORS[0]);
    setShowNewListDialog(false);
  };

  const activeList = activeListId !== 'all' && activeListId !== 'starred'
    ? sortedLists.find(l => l.id === activeListId)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pending.findIndex(t => t.id === active.id);
    const newIndex = pending.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(pending, oldIndex, newIndex);
    // Persist new positions (sequential within filtered set)
    reordered.forEach((t, idx) => {
      if (t.position !== idx) onUpdate(t.id, { position: idx });
    });
  };

  return (
    <div className="flex flex-col gap-3 pb-2 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="px-4 md:px-0 pt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">Tasks</h1>
          <p className="text-[11px] text-muted-foreground font-semibold">
            {pending.length} pending · {completed.length} done
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost" size="icon"
            onClick={() => {
              const next = !showSearch;
              setShowSearch(next);
              if (!next) setSearch('');
              else setTimeout(() => searchRef.current?.focus(), 60);
            }}
            className={cn('h-10 w-10 rounded-full tap-shrink', showSearch ? 'bg-primary/12 text-primary' : 'surface')}
            title="Search tasks"
            aria-label="Search tasks"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </Button>
          {activeList && (
            <Button
              variant="ghost" size="icon"
              onClick={() => setShareList(activeList)}
              className="h-10 w-10 rounded-full surface tap-shrink"
              title="Share list"
              aria-label="Share list"
            >
              <Share2 className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            onClick={() => setShowNewListDialog(true)}
            className="h-10 w-10 rounded-full surface tap-shrink"
            title="New list"
            aria-label="New list"
          >
            <ListPlus className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </Button>
        </div>
      </div>

      {/* Search (opens from the header icon) */}
      {showSearch && (
        <div className="px-4 md:px-0 animate-fade-in">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder="Search tasks"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-10 rounded-full surface border-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground tap-shrink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List tabs — isolated touch rail so horizontal swipes never trigger pull-to-refresh */}
      <div
        className="w-full min-w-0 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x md:overflow-visible"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={event => event.stopPropagation()}
      >
        <div className="flex w-max min-w-full gap-2 px-4 pb-1 md:w-full md:min-w-0 md:flex-wrap md:px-0">
          <ListChip
            label="All"
            active={activeListId === 'all'}
            color="hsl(var(--primary))"
            onClick={() => setActiveListId('all')}
          />
          <ListChip
            label="Starred"
            icon={Star}
            active={activeListId === 'starred'}
            color="hsl(var(--brand-yellow))"
            onClick={() => setActiveListId('starred')}
          />
          {sortedLists.map(l => (
            <ListChip
              key={l.id}
              label={l.name}
              active={activeListId === l.id}
              color={l.color}
              onClick={() => setActiveListId(l.id)}
              onLongPress={() => setEditList(l)}
            />
          ))}
          <span className="w-2 shrink-0 md:hidden" aria-hidden="true" />
        </div>
      </div>

      {/* Add task */}
      <form onSubmit={handleAdd} className={cn(
        'px-4 md:px-0 w-full min-w-0 max-w-full overflow-hidden',
        'hidden md:block',
        showMobileComposer && 'block'
      )}>
        <div className="rounded-3xl glass p-2 flex flex-col gap-2 w-full min-w-0 max-w-full overflow-hidden">
          {showAddOptions && (
            <div className="flex items-center justify-between px-1.5 pt-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Task options</p>
              <button
                type="button"
                onClick={() => setShowAddOptions(false)}
                className="h-8 px-3 rounded-full text-[11px] font-bold bg-muted text-foreground tap-shrink flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" /> Done
              </button>
            </div>
          )}
          <div className="flex gap-2 w-full min-w-0">
            <Input
              ref={inputRef}
              placeholder={`Add a task${activeList ? ` to ${activeList.name}` : ''}...`}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="flex-1 min-w-0 rounded-2xl bg-transparent border-0 shadow-none"
            />
            <button
              type="button"
              onClick={() => setShowAddOptions(o => !o)}
              aria-label="Task options"
              className={cn(
                'w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center tap-shrink transition-all',
                showAddOptions || newPriority !== 0 || newRecurring || newTags.length > 0
                  ? 'bg-primary/12 text-primary' : 'text-muted-foreground'
              )}
            >
              {showAddOptions ? <ChevronUp className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
            </button>
            <Button
              type="submit" size="icon"
              className="gradient-primary text-primary-foreground rounded-2xl shrink-0 tap-shrink w-10 h-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showAddOptions && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border/50 card-enter">
              <OptionRow icon={<Flag className="w-3 h-3" />} label="Priority">
                {TASK_PRIORITIES.map(p => (
                  <Chip
                    key={p.value}
                    active={newPriority === p.value}
                    color={p.value === 0 ? undefined : p.color}
                    onClick={() => setNewPriority(p.value)}
                  >
                    {p.short}
                  </Chip>
                ))}
              </OptionRow>
              <OptionRow icon={<Repeat className="w-3 h-3" />} label="Repeat">
                {RECURRING_OPTIONS.map(r => (
                  <Chip
                    key={r.label}
                    active={newRecurring === r.value}
                    onClick={() => setNewRecurring(r.value)}
                  >
                    {r.label}
                  </Chip>
                ))}
              </OptionRow>
              <OptionRow icon={<TagIcon className="w-3 h-3" />} label="Labels">
                {TASK_TAGS.map(t => (
                  <Chip
                    key={t.id}
                    active={newTags.includes(t.id)}
                    color={t.color}
                    onClick={() => toggleNewTag(t.id)}
                  >
                    {t.label}
                  </Chip>
                ))}
              </OptionRow>
            </div>
          )}
        </div>
      </form>

      {!showMobileComposer && createPortal(
        <Button
          type="button"
          size="icon"
          onClick={() => {
            setShowMobileComposer(true);
            window.setTimeout(() => inputRef.current?.focus(), 60);
          }}
          className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] right-5 z-40 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-pop tap-shrink md:hidden"
          aria-label="Add task"
          title="Add task"
        >
          <Plus className="h-6 w-6" strokeWidth={2.25} />
        </Button>,
        document.body,
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 md:px-0">
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            'h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 tap-shrink transition-all',
            activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </button>
        <button
          onClick={() => setSortByPriority(s => !s)}
          className={cn(
            'h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 tap-shrink transition-all',
            sortByPriority ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground'
          )}
        >
          <ArrowUpDown className="w-3.5 h-3.5" /> {sortByPriority ? 'By priority' : 'Manual'}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setPriorityFilter('all'); setTagFilter([]); setSortByPriority(false); }}
            className="h-9 px-3 rounded-full text-xs font-bold glass text-muted-foreground tap-shrink ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="px-4 md:px-0 card-enter">
          <div className="rounded-3xl glass p-3 flex flex-col gap-2">
            <OptionRow icon={<Flag className="w-3 h-3" />} label="Priority">
              <Chip active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')}>All</Chip>
              {TASK_PRIORITIES.filter(p => p.value !== 0).map(p => (
                <Chip
                  key={p.value}
                  active={priorityFilter === p.value}
                  color={p.color}
                  onClick={() => setPriorityFilter(priorityFilter === p.value ? 'all' : p.value)}
                >
                  {p.label}
                </Chip>
              ))}
            </OptionRow>
            <OptionRow icon={<TagIcon className="w-3 h-3" />} label="Labels">
              {TASK_TAGS.map(t => (
                <Chip
                  key={t.id}
                  active={tagFilter.includes(t.id)}
                  color={t.color}
                  onClick={() => toggleTagFilter(t.id)}
                >
                  {t.label}
                </Chip>
              ))}
            </OptionRow>
          </div>
        </div>
      )}


      {/* Pending tasks */}
      <div className="px-4 md:px-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {pending.length === 0 ? 'No tasks' : `${pending.length} pending`}
        </p>
        {pending.length === 0 && completed.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground card-enter">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">All clear! Add a task above to get started.</p>
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pending.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {pending.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  index={i}
                  meetings={meetings}
                  taskLists={sortedLists}
                  subtasks={subtasks.filter(s => s.taskId === task.id)}
                  showListBadge={activeListId === 'all' || activeListId === 'starred'}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                  onUpdateSubtask={onUpdateSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  draggable={!sortByPriority}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div className="px-4 md:px-0">
          <button
            onClick={() => setShowCompleted(s => !s)}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-1.5">
              {completed.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  meetings={meetings}
                  taskLists={sortedLists}
                  subtasks={subtasks.filter(s => s.taskId === task.id)}
                  showListBadge={activeListId === 'all' || activeListId === 'starred'}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                  onUpdateSubtask={onUpdateSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* New List Dialog */}
      <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>New list</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="List name (e.g., Work, Shopping)"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {LIST_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewListColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      newListColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewListDialog(false)}>Cancel</Button>
            <Button onClick={handleAddList} className="gradient-primary text-primary-foreground">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete list dialog */}
      {editList && (
        <Dialog open={!!editList} onOpenChange={(o) => !o && setEditList(null)}>
          <DialogContent className="glass max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit list</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={editList.name}
                onChange={e => setEditList({ ...editList, name: e.target.value })}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {LIST_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditList({ ...editList, color: c })}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        editList.color === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-row justify-between">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete list "${editList.name}" and all its tasks?`)) {
                    onDeleteList(editList.id);
                    if (activeListId === editList.id) setActiveListId('all');
                    setEditList(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditList(null)}>Cancel</Button>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={() => {
                    onUpdateList(editList.id, { name: editList.name, color: editList.color });
                    setEditList(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Share dialog */}
      <ShareListDialog list={shareList} open={!!shareList} onOpenChange={(o) => !o && setShareList(null)} />
    </div>
  );
}

function ListChip({
  label, active, color, onClick, onLongPress, icon: Icon,
}: {
  label: string; active: boolean; color: string;
  onClick: () => void; onLongPress?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const pressTimerRef = useRef<number | null>(null);
  const startPress = () => {
    if (!onLongPress) return;
    pressTimerRef.current = window.setTimeout(() => onLongPress(), 600);
  };
  const cancelPress = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <button
      onClick={onClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      className={cn(
        'shrink-0 snap-start min-h-10 px-4 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 tap-shrink whitespace-nowrap',
        active ? 'text-primary-foreground shadow-md' : 'surface text-foreground/80'
      )}
      style={active ? { backgroundColor: color } : undefined}
    >
      {Icon ? (
        <Icon className="w-[13px] h-[13px]" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'currentColor' : color }} />
      )}
      <span className="truncate max-w-[8rem] md:max-w-[9rem]">{label}</span>
    </button>
  );
}


function TaskRow({
  task, index = 0, meetings, taskLists, subtasks, showListBadge, onUpdate, onDelete,
  onAddSubtask, onUpdateSubtask, onDeleteSubtask, draggable = false,
}: {
  task: Task;
  index?: number;
  meetings: Meeting[];
  taskLists: TaskList[];
  subtasks: Subtask[];
  showListBadge: boolean;
  onUpdate: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (id: string, data: Partial<Pick<Subtask, 'title' | 'completed' | 'position'>>) => void;
  onDeleteSubtask: (id: string) => void;
  draggable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNotes, setEditNotes] = useState(task.notes || '');
  const [newSubtask, setNewSubtask] = useState('');

  const sortable = useSortable({ id: task.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const dragStyle = draggable
    ? { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }
    : undefined;

  const linkedMeeting = task.meetingId ? meetings.find(m => m.id === task.meetingId) : null;
  const list = taskLists.find(l => l.id === task.listId);
  const prio = TASK_PRIORITIES.find(p => p.value === (task.priority ?? 0)) || TASK_PRIORITIES[0];

  const dueLabel = task.dueDate ? formatDue(task.dueDate) : null;
  const isOverdue = task.dueDate && !task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));

  const saveEdit = () => {
    if (editTitle.trim() && editTitle !== task.title) onUpdate(task.id, { title: editTitle.trim() });
    if (editNotes !== (task.notes || '')) onUpdate(task.id, { notes: editNotes });
  };

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={{
        ...(dragStyle || {}),
        ...(task.priority ? { borderLeft: `4px solid ${prio.color}` } : {}),
        ...(isDragging ? {} : { animationDelay: `${Math.min(index, 8) * 35}ms` }),
      }}
      className={cn(
        'glass rounded-xl transition-all overflow-hidden card-enter card-press',
        task.completed && 'opacity-60',
        isDragging && 'shadow-2xl ring-2 ring-primary/40 scale-[1.02]',
      )}
    >
      <div className="p-3 flex items-start gap-2">
        {draggable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="shrink-0 mt-0.5 -ml-1 p-1 text-muted-foreground/60 hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onUpdate(task.id, { completed: !task.completed })}
          className="shrink-0 mt-0.5"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed
            ? <CheckCircle2 className="w-5 h-5 income-text" />
            : <Circle className="w-5 h-5 text-muted-foreground" />}
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <p className={cn(
            'text-sm font-medium break-words',
            task.completed && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {!!task.priority && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ backgroundColor: `${prio.color}22`, color: prio.color }}
              >
                <Flag className="w-2.5 h-2.5" /> {prio.short}
              </span>
            )}
            {dueLabel && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                isOverdue ? 'text-destructive' : 'text-muted-foreground'
              )}>
                <Calendar className="w-3 h-3" /> {dueLabel}
              </span>
            )}
            {linkedMeeting && (
              <span className="text-xs meeting-text flex items-center gap-1">
                <Link2 className="w-3 h-3" /> {linkedMeeting.title}
              </span>
            )}
            {showListBadge && list && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${list.color}33`, color: list.color }}
              >
                {list.name}
              </span>
            )}
            {(task.tags || []).map(tagId => {
              const t = getTaskTag(tagId);
              return (
                <span
                  key={tagId}
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${t.color}26`, color: t.color }}
                >
                  {t.label}
                </span>
              );
            })}
            {task.recurring && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" /> {task.recurring}
              </span>
            )}
            {subtasks.length > 0 && !expanded && (
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                {subtasks.filter(s => s.completed).length}/{subtasks.length}
              </span>
            )}
            {task.notes && !expanded && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                · {task.notes}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onUpdate(task.id, { starred: !task.starred })}
          className="shrink-0 p-1"
          aria-label={task.starred ? 'Unstar' : 'Star'}
        >
          <Star className={cn(
            'w-4 h-4 transition-colors',
            task.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )} />
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button className="tap-target shrink-0 p-2 rounded-xl hover:bg-muted/50">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="glass w-48 p-2" align="end">
            <div className="flex flex-col">
              <Button
                variant="ghost" size="sm" className="justify-start"
                onClick={() => setExpanded(true)}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit details
              </Button>
              <Select
                value={task.listId || ''}
                onValueChange={(v) => onUpdate(task.id, { listId: v })}
              >
                <SelectTrigger className="border-0 bg-transparent justify-start h-9 px-3 text-sm font-normal">
                  <SelectValue placeholder="Move to list..." />
                </SelectTrigger>
                <SelectContent>
                  {taskLists.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost" size="sm"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 flex flex-col gap-2 border-t border-border/30">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            placeholder="Title"
            className="rounded-lg"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground pr-0.5 flex items-center gap-1">
              <TagIcon className="w-3 h-3" /> Labels
            </span>
            {TASK_TAGS.map(t => {
              const on = (task.tags || []).includes(t.id);
              return (
                <Chip
                  key={t.id}
                  active={on}
                  color={t.color}
                  onClick={() => onUpdate(task.id, {
                    tags: on ? (task.tags || []).filter(x => x !== t.id) : [...(task.tags || []), t.id],
                  })}
                >
                  {t.label}
                </Chip>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground pr-0.5">Priority</span>
            {TASK_PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => onUpdate(task.id, { priority: p.value })}
                className={cn(
                  'px-2.5 h-8 rounded-full text-[11px] font-bold border transition-all tap-shrink',
                  (task.priority ?? 0) === p.value ? 'text-white border-transparent shadow-sm' : 'border-border/60 text-muted-foreground'
                )}
                style={(task.priority ?? 0) === p.value && p.value !== 0 ? { backgroundColor: p.color } : undefined}
              >
                {p.short}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={task.dueDate || ''}
              onChange={e => onUpdate(task.id, { dueDate: e.target.value })}
              className="flex-1 rounded-lg"
            />
            {task.dueDate && (
              <Button
                variant="ghost" size="icon"
                onClick={() => onUpdate(task.id, { dueDate: undefined })}
                className="rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {/* Subtasks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Subtasks</span>
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => onUpdateSubtask(s.id, { completed: !s.completed })}
                  className="shrink-0"
                >
                  {s.completed
                    ? <CheckCircle2 className="w-4 h-4 income-text" />
                    : <Circle className="w-4 h-4 text-muted-foreground" />}
                </button>
                <span className={cn(
                  'flex-1 text-sm break-words',
                  s.completed && 'line-through text-muted-foreground'
                )}>
                  {s.title}
                </span>
                <button
                  onClick={() => onDeleteSubtask(s.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSubtask.trim()) {
                  onAddSubtask(task.id, newSubtask.trim());
                  setNewSubtask('');
                }
              }}
              className="flex gap-1.5"
            >
              <Input
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                className="flex-1 rounded-lg text-sm h-9"
              />
              <Button type="submit" size="icon" className="gradient-primary text-primary-foreground rounded-lg h-9 w-9 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>

          {/* Recurring selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground pr-0.5 flex items-center gap-0.5">
              <Repeat className="w-3 h-3" /> Repeat
            </span>
            {RECURRING_OPTIONS.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => onUpdate(task.id, { recurring: r.value })}
                className={cn(
                  'px-2.5 h-8 rounded-full text-[11px] font-bold border transition-all tap-shrink',
                  (task.recurring ?? null) === r.value ? 'bg-primary text-primary-foreground border-transparent shadow-sm' : 'border-border/60 text-muted-foreground'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Notes..."
            value={editNotes}
            onChange={e => setEditNotes(e.target.value)}
            onBlur={saveEdit}
            className="rounded-lg min-h-[60px]"
          />
        </div>
      )}
    </div>
  );
}

function formatDue(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    return format(d, 'MMM d');
  } catch {
    return dateStr;
  }
}
