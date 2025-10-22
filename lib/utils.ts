import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function calculateFocusScore(
  estimatedMinutes: number,
  actualMinutes: number,
  interruptions: number = 0
): number {
  const timeEfficiency = Math.min((estimatedMinutes / actualMinutes) * 100, 100);
  const interruptionPenalty = Math.max(0, 100 - (interruptions * 10));
  return Math.round((timeEfficiency * 0.7 + interruptionPenalty * 0.3));
}
