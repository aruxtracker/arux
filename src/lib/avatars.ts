/**
 * Built-in illustrated avatars. Users pick one of these presets — there is no
 * photo upload, so nothing leaves the device and no storage bucket is needed.
 */
export interface AvatarPreset {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind gradient classes for the circle background. */
  ring: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'fox', label: 'Fox', emoji: '🦊', ring: 'from-orange-400 to-amber-500' },
  { id: 'panda', label: 'Panda', emoji: '🐼', ring: 'from-slate-300 to-slate-500' },
  { id: 'cat', label: 'Cat', emoji: '🐱', ring: 'from-yellow-300 to-orange-400' },
  { id: 'dog', label: 'Dog', emoji: '🐶', ring: 'from-amber-300 to-yellow-500' },
  { id: 'tiger', label: 'Tiger', emoji: '🐯', ring: 'from-orange-500 to-red-500' },
  { id: 'penguin', label: 'Penguin', emoji: '🐧', ring: 'from-sky-400 to-indigo-500' },
  { id: 'owl', label: 'Owl', emoji: '🦉', ring: 'from-teal-400 to-emerald-500' },
  { id: 'koala', label: 'Koala', emoji: '🐨', ring: 'from-zinc-300 to-slate-400' },
  { id: 'lion', label: 'Lion', emoji: '🦁', ring: 'from-amber-400 to-orange-600' },
  { id: 'bunny', label: 'Bunny', emoji: '🐰', ring: 'from-pink-300 to-rose-400' },
  { id: 'astro', label: 'Astronaut', emoji: '🧑‍🚀', ring: 'from-indigo-400 to-violet-600' },
  { id: 'ninja', label: 'Ninja', emoji: '🥷', ring: 'from-slate-600 to-zinc-800' },
];

export function getAvatar(id?: string | null): AvatarPreset | null {
  if (!id) return null;
  return AVATAR_PRESETS.find(a => a.id === id) || null;
}
