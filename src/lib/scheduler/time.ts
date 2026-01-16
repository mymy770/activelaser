/**
 * Helpers pour la gestion du temps
 * Granularité : 15 minutes
 * Labels affichés : 30 minutes
 */

import type { TimeKey } from './types'

const GRANULARITY_MINUTES = 15
const LABEL_INTERVAL_MINUTES = 30

/**
 * Convertit une heure (hour, minute) en minutes depuis minuit
 */
export function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute
}

/**
 * Convertit des minutes depuis minuit en (hour, minute)
 */
export function fromMinutes(totalMinutes: number): { hour: number; minute: number } {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return { hour, minute }
}

/**
 * Arrondit une heure à la granularité (15 minutes)
 */
export function roundToGrid(hour: number, minute: number): { hour: number; minute: number } {
  const totalMinutes = toMinutes(hour, minute)
  const rounded = Math.round(totalMinutes / GRANULARITY_MINUTES) * GRANULARITY_MINUTES
  return fromMinutes(rounded)
}

/**
 * Génère une clé de temps (TimeKey) au format "HH:MM"
 */
export function toTimeKey(hour: number, minute: number): TimeKey {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * Parse une TimeKey en (hour, minute)
 */
export function fromTimeKey(timeKey: TimeKey): { hour: number; minute: number } {
  const [hourStr, minuteStr] = timeKey.split(':')
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10)
  }
}

/**
 * Génère toutes les TimeKey entre start et end (par incréments de 15 min)
 */
export function rangeToKeys(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): TimeKey[] {
  const keys: TimeKey[] = []
  const startMinutes = toMinutes(startHour, startMinute)
  const endMinutes = toMinutes(endHour, endMinute)
  
  for (let min = startMinutes; min < endMinutes; min += GRANULARITY_MINUTES) {
    const { hour, minute } = fromMinutes(min)
    keys.push(toTimeKey(hour, minute))
  }
  
  return keys
}

/**
 * Vérifie si une TimeKey doit avoir un label (toutes les 30 min)
 */
export function shouldShowLabel(hour: number, minute: number): boolean {
  return minute === 0 || minute === 30
}

/**
 * Formate une TimeKey pour affichage (label)
 */
export function formatTimeLabel(timeKey: TimeKey): string {
  return timeKey // Déjà au format "HH:MM"
}

/**
 * Calcule la durée en nombre de créneaux de 15 minutes
 */
export function durationToSlots(durationMinutes: number): number {
  return Math.ceil(durationMinutes / GRANULARITY_MINUTES)
}

/**
 * Calcule le temps de jeu centré pour un événement avec salle
 * Si l'événement a une durée > 60 min, le jeu dure 60 min et est centré
 */
export function calculateCenteredGameTime(
  eventStartHour: number,
  eventStartMinute: number,
  eventDurationMinutes: number
): { gameStartHour: number; gameStartMinute: number; gameDurationMinutes: number } {
  if (eventDurationMinutes <= 60) {
    // Pas de centrage, jeu = événement
    return {
      gameStartHour: eventStartHour,
      gameStartMinute: eventStartMinute,
      gameDurationMinutes: eventDurationMinutes
    }
  }
  
  // Jeu centré : toujours 60 min
  const gameDurationMinutes = 60
  const gameStartOffset = (eventDurationMinutes - gameDurationMinutes) / 2
  const eventStartMinutes = toMinutes(eventStartHour, eventStartMinute)
  const gameStartMinutes = eventStartMinutes + gameStartOffset
  const { hour, minute } = fromMinutes(gameStartMinutes)
  
  return {
    gameStartHour: hour,
    gameStartMinute: minute,
    gameDurationMinutes
  }
}
