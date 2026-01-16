/**
 * Adapters pour convertir entre SimpleAppointment (UI) et Booking (scheduler)
 */

import type { Booking, RoomConfig } from './types'

// Type SimpleAppointment depuis page.tsx (copié pour référence)
export type SimpleAppointment = {
  id: string
  date: string
  hour: number
  minute?: number
  title: string
  branch?: string
  eventType?: string
  durationMinutes?: number
  color?: string
  eventNotes?: string
  customerFirstName?: string
  customerLastName?: string
  customerPhone?: string
  customerEmail?: string
  customerNotes?: string
  gameDurationMinutes?: number
  participants?: number
  assignedSlots?: number[]
  assignedRoom?: number
  hasInsufficientSlots?: boolean
  // Nouveaux champs pour exceptions
  surbooked?: boolean
  surbookedParticipants?: number
  roomOvercap?: boolean
  roomOvercapParticipants?: number
}

/**
 * Convertit SimpleAppointment en Booking
 * RÈGLE CRITIQUE : Seuls les EVENT (anniversaire avec eventType !== 'game') bloquent une room
 * GAME (eventType === 'game' ou vide/null/undefined) = uniquement game-slots
 */
export function toBooking(appointment: SimpleAppointment): Booking {
  // DÉCISION : Si eventType est vide/null/undefined ou explicitement 'game' → 'game'
  // Seul eventType explicitement défini ET différent de 'game' → 'event'
  const isEvent = appointment.eventType && appointment.eventType !== 'game' && appointment.eventType.trim() !== ''
  
  return {
    id: appointment.id,
    type: (isEvent ? 'event' : 'game') as 'game' | 'event',
    date: appointment.date,
    hour: appointment.hour,
    minute: appointment.minute || 0,
    participants: appointment.participants || 0,
    durationMinutes: appointment.durationMinutes || (isEvent ? 120 : 60),
    gameDurationMinutes: appointment.gameDurationMinutes,
    assignedSlots: appointment.assignedSlots,
    assignedRoom: isEvent ? appointment.assignedRoom : undefined, // GAME ne peut pas avoir de room
    surbooked: appointment.surbooked,
    surbookedParticipants: appointment.surbookedParticipants,
    roomOvercap: appointment.roomOvercap,
    roomOvercapParticipants: appointment.roomOvercapParticipants,
    customerFirstName: appointment.customerFirstName,
    customerLastName: appointment.customerLastName,
    customerPhone: appointment.customerPhone,
    customerEmail: appointment.customerEmail,
    customerNotes: appointment.customerNotes,
    color: appointment.color
  }
}

/**
 * Convertit Booking en SimpleAppointment
 */
export function fromBooking(booking: Booking, originalAppointment?: SimpleAppointment): SimpleAppointment {
  return {
    id: booking.id,
    date: booking.date,
    hour: booking.hour,
    minute: booking.minute,
    title: originalAppointment?.title || `${booking.customerFirstName || ''} ${booking.customerLastName || ''}`.trim() || 'Nouvel événement',
    branch: originalAppointment?.branch,
    eventType: booking.type === 'game' ? 'game' : 'event',
    durationMinutes: booking.durationMinutes,
    color: booking.color || originalAppointment?.color || '#3b82f6',
    eventNotes: originalAppointment?.eventNotes,
    customerFirstName: booking.customerFirstName || originalAppointment?.customerFirstName,
    customerLastName: booking.customerLastName || originalAppointment?.customerLastName,
    customerPhone: booking.customerPhone || originalAppointment?.customerPhone,
    customerEmail: booking.customerEmail || originalAppointment?.customerEmail,
    customerNotes: booking.customerNotes || originalAppointment?.customerNotes,
    gameDurationMinutes: booking.gameDurationMinutes,
    participants: booking.participants,
    assignedSlots: booking.assignedSlots,
    assignedRoom: booking.assignedRoom,
    // Ne plus utiliser hasInsufficientSlots (supprimé)
    surbooked: booking.surbooked,
    surbookedParticipants: booking.surbookedParticipants,
    roomOvercap: booking.roomOvercap,
    roomOvercapParticipants: booking.roomOvercapParticipants
  }
}

/**
 * Convertit RoomCapacity Map en RoomConfig Map
 */
export function toRoomConfigs(roomCapacities: Map<number, { name?: string; maxCapacity: number }>): Map<number, RoomConfig> {
  const configs = new Map<number, RoomConfig>()
  for (const [id, capacity] of roomCapacities.entries()) {
    configs.set(id, {
      id,
      name: capacity.name || `Salle ${id}`,
      maxCapacity: capacity.maxCapacity
    })
  }
  return configs
}
