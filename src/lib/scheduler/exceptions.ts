/**
 * Gestion des exceptions et confirmations
 * Surbooking et dépassement de capacité de salle
 */

import type { Booking, Conflict } from './types'

/**
 * Autorise le surbooking pour un booking
 * Stocke les flags dans le booking pour traçabilité
 */
export function allowSurbook(
  booking: Booking,
  excessParticipants: number
): Booking {
  return {
    ...booking,
    surbooked: true,
    surbookedParticipants: excessParticipants
  }
}

/**
 * Autorise le dépassement de capacité de salle
 * Stocke les flags dans le booking pour traçabilité
 */
export function allowRoomOvercap(
  booking: Booking,
  excessParticipants: number
): Booking {
  return {
    ...booking,
    roomOvercap: true,
    roomOvercapParticipants: excessParticipants
  }
}

/**
 * Vérifie si un booking a des exceptions
 */
export function hasExceptions(booking: Booking): boolean {
  return booking.surbooked === true || booking.roomOvercap === true
}

/**
 * Récupère le message d'exception pour affichage
 */
export function getExceptionMessage(booking: Booking): string | null {
  if (booking.surbooked && booking.surbookedParticipants) {
    return `Surbooking: +${booking.surbookedParticipants} personnes`
  }
  if (booking.roomOvercap && booking.roomOvercapParticipants) {
    return `Capacité dépassée: +${booking.roomOvercapParticipants} personnes`
  }
  return null
}

/**
 * Formate le label "+X" pour affichage dans la colonne horaire
 */
export function formatSurbookLabel(booking: Booking): string | null {
  if (booking.surbooked && booking.surbookedParticipants) {
    return `+${booking.surbookedParticipants}`
  }
  return null
}

/**
 * Vérifie si un conflict nécessite une confirmation
 */
export function requiresConfirmation(conflict: Conflict): boolean {
  return conflict.type === 'NEED_SURBOOK_CONFIRM' || 
         conflict.type === 'NEED_ROOM_OVERCAP_CONFIRM'
}

/**
 * Extrait les détails d'un conflict pour affichage dans une popup de confirmation
 */
export function getConflictDetails(conflict: Conflict): {
  title: string
  message: string
  excessParticipants?: number
  roomName?: string
  roomCapacity?: number
} {
  switch (conflict.type) {
    case 'NEED_SURBOOK_CONFIRM':
      return {
        title: 'Surbooking nécessaire',
        message: conflict.message,
        excessParticipants: conflict.details?.excessParticipants
      }
    
    case 'NEED_ROOM_OVERCAP_CONFIRM':
      return {
        title: 'Capacité de salle dépassée',
        message: conflict.message,
        excessParticipants: conflict.details?.excessParticipants,
        roomName: `Salle ${conflict.details?.roomId}`,
        roomCapacity: conflict.details?.roomCapacity
      }
    
    default:
      return {
        title: 'Conflit',
        message: conflict.message
      }
  }
}
