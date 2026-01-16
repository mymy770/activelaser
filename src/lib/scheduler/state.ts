/**
 * Construction de l'état d'occupation
 * Build l'état à partir des bookings + settings
 * Zéro UI, pure logique
 */

import type {
  Booking,
  OccupancyState,
  GameSlotState,
  EventRoomState,
  Allocation,
  SlotAllocation,
  RoomAllocation,
  RoomConfig,
  TimeKey
} from './types'
import {
  toTimeKey,
  rangeToKeys,
  calculateCenteredGameTime,
  toMinutes
} from './time'

/**
 * Construit l'état d'occupation des slots de jeu
 */
export function buildGameSlotsState(
  bookings: Booking[],
  date: string
): GameSlotState {
  const state: GameSlotState = {}
  
  // Filtrer les bookings de la date
  const dateBookings = bookings.filter(b => b.date === date)
  
  for (const booking of dateBookings) {
    if (!booking.assignedSlots || booking.assignedSlots.length === 0) continue
    
    // Calculer le temps de jeu (centré si événement avec salle)
    const gameTime = calculateCenteredGameTime(
      booking.hour,
      booking.minute,
      booking.gameDurationMinutes || booking.durationMinutes || 60
    )
    
    // Générer toutes les TimeKey pour la durée du jeu
    const timeKeys = rangeToKeys(
      gameTime.gameStartHour,
      gameTime.gameStartMinute,
      gameTime.gameStartHour + Math.floor((gameTime.gameStartMinute + gameTime.gameDurationMinutes) / 60),
      (gameTime.gameStartMinute + gameTime.gameDurationMinutes) % 60
    )
    
    // Marquer chaque slot comme occupé pour chaque TimeKey
    for (const timeKey of timeKeys) {
      if (!state[timeKey]) {
        state[timeKey] = {}
      }
      for (const slotId of booking.assignedSlots) {
        state[timeKey][slotId] = booking.id
      }
    }
  }
  
  return state
}

/**
 * Construit l'état d'occupation des salles d'événements
 */
export function buildEventRoomsState(
  bookings: Booking[],
  date: string
): EventRoomState {
  const state: EventRoomState = {}
  
  // Filtrer les bookings de la date qui ont une salle
  const dateBookings = bookings.filter(
    b => b.date === date && b.type === 'event' && b.assignedRoom
  )
  
  for (const booking of dateBookings) {
    if (!booking.assignedRoom) continue
    
    // Pour les événements, utiliser durationMinutes (ex: 120 min)
    const eventDuration = booking.durationMinutes || 120
    
    // Calculer l'heure de fin
    const startMinutes = toMinutes(booking.hour, booking.minute)
    const endMinutes = startMinutes + eventDuration
    const { hour: endHour, minute: endMinute } = {
      hour: Math.floor(endMinutes / 60),
      minute: endMinutes % 60
    }
    
    // Générer toutes les TimeKey pour la durée de l'événement
    const timeKeys = rangeToKeys(
      booking.hour,
      booking.minute,
      endHour,
      endMinute
    )
    
    // Marquer la salle comme occupée pour chaque TimeKey
    for (const timeKey of timeKeys) {
      if (!state[timeKey]) {
        state[timeKey] = {}
      }
      state[timeKey][booking.assignedRoom] = booking.id
    }
  }
  
  return state
}

/**
 * Construit les allocations pour chaque booking
 */
export function buildBookingAllocations(bookings: Booking[]): Map<string, Allocation> {
  const allocations = new Map<string, Allocation>()
  
  for (const booking of bookings) {
    const allocation: Allocation = {}
    
    // Allocation slots
    if (booking.assignedSlots && booking.assignedSlots.length > 0) {
      // Vérifier si les slots sont contigus
      const sortedSlots = [...booking.assignedSlots].sort((a, b) => a - b)
      const isContiguous = sortedSlots.every((slot, index) => 
        index === 0 || slot === sortedSlots[index - 1] + 1
      )
      
      // Si non-contigus, calculer les parties (pour split)
      let splitParts = 1
      let splitIndex = 1
      if (!isContiguous) {
        // Compter les groupes contigus
        let currentGroup = 1
        for (let i = 1; i < sortedSlots.length; i++) {
          if (sortedSlots[i] !== sortedSlots[i - 1] + 1) {
            currentGroup++
          }
        }
        splitParts = currentGroup
        
        // Déterminer l'index de cette partie (basé sur le premier slot)
        const firstSlot = sortedSlots[0]
        // Trouver dans quel groupe se trouve le premier slot
        let groupIndex = 1
        for (let i = 1; i < sortedSlots.length; i++) {
          if (sortedSlots[i] !== sortedSlots[i - 1] + 1) {
            groupIndex++
          }
          if (sortedSlots[i] === firstSlot) {
            break
          }
        }
        splitIndex = groupIndex
      }
      
      allocation.slotAllocation = {
        slots: booking.assignedSlots,
        isSplit: !isContiguous,
        splitParts: !isContiguous ? splitParts : undefined,
        splitIndex: !isContiguous ? splitIndex : undefined
      }
    }
    
    // Allocation room
    if (booking.assignedRoom) {
      const startTimeKey = toTimeKey(booking.hour, booking.minute)
      const eventDuration = booking.durationMinutes || 120
      const startMinutes = toMinutes(booking.hour, booking.minute)
      const endMinutes = startMinutes + eventDuration
      const { hour: endHour, minute: endMinute } = {
        hour: Math.floor(endMinutes / 60),
        minute: endMinutes % 60
      }
      const endTimeKey = toTimeKey(endHour, endMinute)
      
      allocation.roomAllocation = {
        roomId: booking.assignedRoom,
        startTimeKey,
        endTimeKey
      }
    }
    
    allocations.set(booking.id, allocation)
  }
  
  return allocations
}

/**
 * Construit l'état d'occupation complet
 */
export function buildOccupancyState(
  bookings: Booking[],
  date: string
): OccupancyState {
  return {
    gameSlots: buildGameSlotsState(bookings, date),
    eventRooms: buildEventRoomsState(bookings, date),
    bookingAllocations: buildBookingAllocations(bookings)
  }
}

/**
 * Vérifie si un slot est libre à un moment donné
 */
export function isSlotFree(
  state: OccupancyState,
  slotId: number,
  timeKey: TimeKey,
  excludeBookingId?: string
): boolean {
  const occupied = state.gameSlots[timeKey]?.[slotId]
  if (!occupied) return true
  if (excludeBookingId && occupied === excludeBookingId) return true
  return false
}

/**
 * Vérifie si une salle est libre à un moment donné
 */
export function isRoomFree(
  state: OccupancyState,
  roomId: number,
  timeKey: TimeKey,
  excludeBookingId?: string
): boolean {
  const occupied = state.eventRooms[timeKey]?.[roomId]
  if (!occupied) return true
  if (excludeBookingId && occupied === excludeBookingId) return true
  return false
}

/**
 * Vérifie si plusieurs slots sont libres pour une plage de temps
 */
export function areSlotsFree(
  state: OccupancyState,
  slotIds: number[],
  timeKeys: TimeKey[],
  excludeBookingId?: string
): boolean {
  for (const timeKey of timeKeys) {
    for (const slotId of slotIds) {
      if (!isSlotFree(state, slotId, timeKey, excludeBookingId)) {
        return false
      }
    }
  }
  return true
}

/**
 * Vérifie si une salle est libre pour une plage de temps
 */
export function isRoomFreeForTimeRange(
  state: OccupancyState,
  roomId: number,
  timeKeys: TimeKey[],
  excludeBookingId?: string
): boolean {
  for (const timeKey of timeKeys) {
    if (!isRoomFree(state, roomId, timeKey, excludeBookingId)) {
      return false
    }
  }
  return true
}
