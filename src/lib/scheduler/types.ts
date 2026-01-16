/**
 * Types pour le scheduler d'agenda
 * Source de vérité pour les structures de données
 */

// Types de base
export type SlotId = number // 1-14
export type RoomId = number // 1-4
export type TimeKey = string // Format: "HH:MM" (ex: "17:30")
export type DateKey = string // Format: "YYYY-MM-DD" (ex: "2026-01-15")

// Types de booking
export type BookingType = 'game' | 'event'

// Allocation d'un booking
export interface SlotAllocation {
  slots: SlotId[] // Slots assignés (peuvent être non-contigus si split)
  isSplit: boolean // true si les slots ne sont pas contigus
  splitParts?: number // Nombre de parties si split (ex: 3 pour "SPLIT 1/3")
  splitIndex?: number // Index de cette partie (ex: 1 pour "SPLIT 1/3")
}

export interface RoomAllocation {
  roomId: RoomId
  startTimeKey: TimeKey
  endTimeKey: TimeKey
}

export interface Allocation {
  slotAllocation?: SlotAllocation
  roomAllocation?: RoomAllocation
}

// Résultat d'une tentative d'allocation
export type ConflictType = 
  | 'NONE' // Pas de conflit, allocation réussie
  | 'FULL' // Tous les slots sont occupés
  | 'NO_ROOM' // Aucune salle disponible
  | 'ROOM_OVERCAP' // Salle disponible mais capacité dépassée
  | 'NEED_SURBOOK_CONFIRM' // Besoin de confirmation pour surbooking
  | 'NEED_ROOM_OVERCAP_CONFIRM' // Besoin de confirmation pour dépassement capacité salle
  | 'OVERLAP_DETECTED' // Chevauchement détecté après réorganisation

export interface Conflict {
  type: ConflictType
  message: string
  details?: {
    availableSlots?: number
    neededSlots?: number
    roomId?: RoomId
    roomCapacity?: number
    participants?: number
    excessParticipants?: number
  }
}

export interface AllocationResult {
  success: boolean
  allocation?: Allocation
  conflict?: Conflict
}

// Booking complet (version simplifiée pour le scheduler)
export interface Booking {
  id: string
  type: BookingType
  date: DateKey
  hour: number // 0-23
  minute: number // 0-59
  participants: number
  durationMinutes: number // Durée totale de l'événement (pour EVENT = 120, pour GAME = 60)
  gameDurationMinutes?: number // Durée du jeu (pour EVENT = 60 centré, pour GAME = durationMinutes)
  
  // Allocations
  assignedSlots?: SlotId[]
  assignedRoom?: RoomId
  
  // Liens pour séparation room/jeu
  linkedGameId?: string // Pour EVENT : ID du GAME associé (les slots de jeu)
  linkedRoomId?: string // Pour GAME : ID du EVENT associé (la room)
  
  // Exceptions/confirmations
  surbooked?: boolean
  surbookedParticipants?: number // Nombre de personnes en trop
  roomOvercap?: boolean
  roomOvercapParticipants?: number // Nombre de personnes en trop pour la salle
  split?: boolean // Indique si le booking a été splitté visuellement
  splitParts?: number // Nombre total de parties si splitté
  splitIndex?: number // Index de la partie actuelle si splitté (0-indexed)
  
  // Métadonnées (pour affichage)
  customerFirstName?: string
  customerLastName?: string
  customerPhone?: string
  customerEmail?: string
  customerNotes?: string
  color?: string
}

// État d'occupation (construit par state.ts)
export interface GameSlotState {
  [timeKey: TimeKey]: {
    [slotId: SlotId]: string | null // bookingId ou null
  }
}

export interface EventRoomState {
  [timeKey: TimeKey]: {
    [roomId: RoomId]: string | null // bookingId ou null
  }
}

export interface OccupancyState {
  gameSlots: GameSlotState
  eventRooms: EventRoomState
  bookingAllocations: Map<string, Allocation> // bookingId → Allocation
}

// Configuration des salles
export interface RoomConfig {
  id: RoomId
  name: string
  maxCapacity: number
}

// Paramètres de recherche d'allocation
export interface AllocationParams {
  date: DateKey
  hour: number
  minute: number
  participants: number
  type: BookingType
  durationMinutes: number
  gameDurationMinutes?: number
  excludeBookingId?: string // Pour l'édition (exclure le booking en cours de modification)
}
