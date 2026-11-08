export type ThemeId =
  | 'purple' | 'ocean' | 'sunset' | 'forest' | 'rose' | 'mono'
  | 'candy' | 'cyber' | 'sand' | 'arctic' | 'diwali';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  emoji: string;
  swatch: string; // tailwind gradient classes for the swatch
}

export const THEMES: ThemeOption[] = [
  { id: 'purple', label: 'Midnight Purple', emoji: '🟣', swatch: 'from-violet-500 via-fuchsia-500 to-pink-500' },
  { id: 'diwali', label: 'Diwali Glow',     emoji: '🪔', swatch: 'from-amber-400 via-orange-500 to-purple-600' },
  { id: 'ocean',  label: 'Ocean Blue',      emoji: '🌊', swatch: 'from-cyan-400 via-sky-500 to-blue-600' },
  { id: 'sunset', label: 'Sunset Orange',   emoji: '🌅', swatch: 'from-yellow-400 via-orange-500 to-rose-500' },
  { id: 'forest', label: 'Forest Green',    emoji: '🌿', swatch: 'from-lime-400 via-emerald-500 to-teal-600' },
  { id: 'rose',   label: 'Rose Blush',      emoji: '🌸', swatch: 'from-rose-400 via-pink-500 to-fuchsia-600' },
  { id: 'mono',   label: 'Graphite Mono',   emoji: '⚫️', swatch: 'from-zinc-400 via-slate-600 to-neutral-900' },
  { id: 'candy',  label: 'Candy Pop',       emoji: '🍬', swatch: 'from-pink-500 via-purple-500 to-orange-400' },
  { id: 'cyber',  label: 'Cyber Neon',      emoji: '⚡️', swatch: 'from-cyan-400 via-indigo-500 to-emerald-400' },
  { id: 'sand',   label: 'Desert Sand',     emoji: '🏜️', swatch: 'from-amber-400 via-orange-400 to-yellow-500' },
  { id: 'arctic', label: 'Arctic Ice',      emoji: '❄️', swatch: 'from-sky-300 via-blue-400 to-indigo-500' },
];

export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', id);
}
