'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Users, Clock, User, Phone, Mail, MessageSquare, Gamepad2, PartyPopper, Palette, Home } from 'lucide-react'
import type { CreateBookingData } from '@/hooks/useBookings'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateBookingData) => Promise<boolean>
  branchId: string
  selectedDate: Date
  initialHour?: number
  initialMinute?: number
  isDark: boolean
}

type BookingType = 'GAME' | 'EVENT'

// Configuration des slots
const SLOT_DURATION = 15 // minutes
const MAX_PLAYERS_PER_SLOT = 6
const TOTAL_SLOTS = 14
const TOTAL_CAPACITY = TOTAL_SLOTS * MAX_PLAYERS_PER_SLOT // 84 joueurs max

// Horaires d'ouverture
const OPENING_HOUR = 10
const CLOSING_HOUR = 23

// Couleurs disponibles
const COLORS = [
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Vert', value: '#22C55E' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Violet', value: '#A855F7' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Jaune', value: '#EAB308' },
]

export function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  branchId,
  selectedDate,
  initialHour = 10,
  initialMinute = 0,
  isDark
}: BookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Formulaire
  const [bookingType, setBookingType] = useState<BookingType>('GAME')
  const [hour, setHour] = useState(initialHour)
  const [minute, setMinute] = useState(initialMinute)
  const [durationMinutes, setDurationMinutes] = useState('60') // Durée en minutes (champ libre)
  const [participants, setParticipants] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(COLORS[0].value) // Couleur par défaut bleu

  // Pour les événements avec salle
  const [includeRoom, setIncludeRoom] = useState(false)
  const [roomStartHour, setRoomStartHour] = useState(initialHour)
  const [roomStartMinute, setRoomStartMinute] = useState(initialMinute)
  const [roomDurationMinutes, setRoomDurationMinutes] = useState('120') // Durée salle

  // Reset le formulaire quand on ouvre/ferme
  useEffect(() => {
    if (isOpen) {
      setHour(initialHour)
      setMinute(initialMinute)
      setRoomStartHour(initialHour)
      setRoomStartMinute(initialMinute)
      setError(null)
      // Couleur par défaut selon le type
      setColor(bookingType === 'GAME' ? COLORS[0].value : COLORS[1].value)
    }
  }, [isOpen, initialHour, initialMinute, bookingType])

  // Changer la couleur par défaut quand on change de type
  useEffect(() => {
    setColor(bookingType === 'GAME' ? COLORS[0].value : COLORS[1].value)
    // Reset includeRoom si on passe en GAME simple
    if (bookingType === 'GAME') {
      setIncludeRoom(false)
    }
  }, [bookingType])

  // Générer les options d'heures
  const hourOptions = []
  for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
    hourOptions.push(h)
  }

  // Parser les valeurs
  const parsedParticipants = parseInt(participants) || 0
  const parsedDuration = parseInt(durationMinutes) || 60
  const parsedRoomDuration = parseInt(roomDurationMinutes) || 120

  // Calculer les slots nécessaires (logique Tetris)
  const calculateSlots = () => {
    const slotsNeeded = Math.ceil(parsedParticipants / MAX_PLAYERS_PER_SLOT)
    return Math.min(slotsNeeded, TOTAL_SLOTS)
  }

  // Calculer l'heure de fin du jeu
  const calculateGameEndTime = () => {
    const startMinutes = hour * 60 + minute
    const endMinutes = startMinutes + parsedDuration
    return {
      endHour: Math.floor(endMinutes / 60),
      endMinute: endMinutes % 60
    }
  }

  // Calculer l'heure de fin de la salle
  const calculateRoomEndTime = () => {
    const startMinutes = roomStartHour * 60 + roomStartMinute
    const endMinutes = startMinutes + parsedRoomDuration
    return {
      endHour: Math.floor(endMinutes / 60),
      endMinute: endMinutes % 60
    }
  }

  // Vérifier si la capacité est dépassée
  const isOverCapacity = parsedParticipants > TOTAL_CAPACITY

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le nom et prénom sont requis')
      return
    }
    if (!phone.trim()) {
      setError('Le numéro de téléphone est requis')
      return
    }
    if (parsedParticipants < 1) {
      setError('Le nombre de participants doit être au moins 1')
      return
    }
    if (isOverCapacity) {
      setError(`Capacité maximale dépassée (${TOTAL_CAPACITY} joueurs max)`)
      return
    }
    if (parsedDuration < 15) {
      setError('La durée minimum est de 15 minutes')
      return
    }

    setLoading(true)

    try {
      // Construire les dates du jeu
      const gameStartDate = new Date(selectedDate)
      gameStartDate.setHours(hour, minute, 0, 0)

      const { endHour: gameEndHour, endMinute: gameEndMinute } = calculateGameEndTime()
      const gameEndDate = new Date(selectedDate)
      gameEndDate.setHours(gameEndHour, gameEndMinute, 0, 0)

      // Dates globales (jeu par défaut, ou salle si elle est plus large)
      let startDate = gameStartDate
      let endDate = gameEndDate

      // Si salle incluse, calculer les dates de la salle
      if (includeRoom) {
        const roomStartDate = new Date(selectedDate)
        roomStartDate.setHours(roomStartHour, roomStartMinute, 0, 0)

        const { endHour: roomEndHour, endMinute: roomEndMinute } = calculateRoomEndTime()
        const roomEndDate = new Date(selectedDate)
        roomEndDate.setHours(roomEndHour, roomEndMinute, 0, 0)

        // Prendre les dates les plus larges
        if (roomStartDate < gameStartDate) startDate = roomStartDate
        if (roomEndDate > gameEndDate) endDate = roomEndDate
      }

      // Construire les slots (logique Tetris)
      const slots: CreateBookingData['slots'] = []
      const slotsNeeded = calculateSlots()

      // Pour chaque slot de 15 minutes pendant la durée du jeu
      for (let i = 0; i < parsedDuration / SLOT_DURATION; i++) {
        const slotStartMinutes = hour * 60 + minute + (i * SLOT_DURATION)
        const slotEndMinutes = slotStartMinutes + SLOT_DURATION

        const slotStart = new Date(selectedDate)
        slotStart.setHours(Math.floor(slotStartMinutes / 60), slotStartMinutes % 60, 0, 0)

        const slotEnd = new Date(selectedDate)
        slotEnd.setHours(Math.floor(slotEndMinutes / 60), slotEndMinutes % 60, 0, 0)

        slots.push({
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
          participants_count: Math.min(parsedParticipants, slotsNeeded * MAX_PLAYERS_PER_SLOT)
        })
      }

      const bookingData: CreateBookingData = {
        branch_id: branchId,
        type: bookingType,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        game_start_datetime: gameStartDate.toISOString(),
        game_end_datetime: gameEndDate.toISOString(),
        participants_count: parsedParticipants,
        customer_first_name: firstName.trim(),
        customer_last_name: lastName.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        slots
      }

      console.log('Submitting booking:', bookingData)
      const success = await onSubmit(bookingData)

      if (success) {
        // Reset et fermer
        setFirstName('')
        setLastName('')
        setPhone('')
        setEmail('')
        setNotes('')
        setParticipants('')
        setDurationMinutes('60')
        setIncludeRoom(false)
        onClose()
      } else {
        setError('Erreur lors de la création de la réservation')
      }
    } catch (err) {
      console.error('Error creating booking:', err)
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const slotsNeeded = calculateSlots()
  const { endHour: gameEndHour, endMinute: gameEndMinute } = calculateGameEndTime()
  const { endHour: roomEndHour, endMinute: roomEndMinute } = calculateRoomEndTime()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Nouvelle réservation
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Type de réservation + Couleur */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Type de réservation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingType('GAME')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    bookingType === 'GAME'
                      ? 'border-blue-500 bg-blue-500/10'
                      : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Gamepad2 className={`w-6 h-6 ${bookingType === 'GAME' ? 'text-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`font-medium ${bookingType === 'GAME' ? 'text-blue-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Jeu
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('EVENT')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    bookingType === 'EVENT'
                      ? 'border-green-500 bg-green-500/10'
                      : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PartyPopper className={`w-6 h-6 ${bookingType === 'EVENT' ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`font-medium ${bookingType === 'EVENT' ? 'text-green-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Anniversaire
                  </span>
                </button>
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Palette className="w-4 h-4 inline mr-1" />
                Couleur
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      color === c.value ? 'ring-2 ring-offset-2 ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Temps de jeu */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-5 h-5 text-blue-400" />
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Temps de jeu</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Début
                </label>
                <div className="flex gap-1">
                  <select
                    value={hour}
                    onChange={(e) => setHour(parseInt(e.target.value))}
                    className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {hourOptions.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>
                    ))}
                  </select>
                  <select
                    value={minute}
                    onChange={(e) => setMinute(parseInt(e.target.value))}
                    className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {[0, 15, 30, 45].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Durée (min)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={`w-full px-2 py-2 rounded-lg border text-sm ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="60"
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Fin
                </label>
                <div className={`px-2 py-2 rounded-lg border text-sm ${
                  isDark ? 'bg-gray-700/50 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}>
                  {String(gameEndHour).padStart(2, '0')}:{String(gameEndMinute).padStart(2, '0')}
                </div>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Participants
                </label>
                <input
                  type="number"
                  min="1"
                  max={TOTAL_CAPACITY}
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className={`w-full px-2 py-2 rounded-lg border text-sm ${
                    isOverCapacity
                      ? 'border-red-500 bg-red-500/10'
                      : isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="1"
                />
              </div>
            </div>
            {/* Info slots Tetris */}
            {parsedParticipants > 0 && (
              <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="text-blue-400">{slotsNeeded} slot{slotsNeeded > 1 ? 's' : ''}</span>
                {' '}seront réservés ({slotsNeeded * MAX_PLAYERS_PER_SLOT} places max)
                {isOverCapacity && <span className="text-red-400 ml-2">Capacité max: {TOTAL_CAPACITY}</span>}
              </div>
            )}
          </div>

          {/* Option salle (pour jeux avec salle ou anniversaires) */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRoom}
                onChange={(e) => setIncludeRoom(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500"
              />
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-green-400" />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Inclure une salle
                </span>
              </div>
            </label>

            {includeRoom && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Début salle
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={roomStartHour}
                      onChange={(e) => setRoomStartHour(parseInt(e.target.value))}
                      className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {hourOptions.map(h => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>
                      ))}
                    </select>
                    <select
                      value={roomStartMinute}
                      onChange={(e) => setRoomStartMinute(parseInt(e.target.value))}
                      className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Durée salle (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={roomDurationMinutes}
                    onChange={(e) => setRoomDurationMinutes(e.target.value)}
                    className={`w-full px-2 py-2 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Fin salle
                  </label>
                  <div className={`px-2 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700/50 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}>
                    {String(roomEndHour).padStart(2, '0')}:{String(roomEndMinute).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Infos client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <User className="w-4 h-4 inline mr-1" />
                Prénom *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Nom *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Phone className="w-4 h-4 inline mr-1" />
                Téléphone *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="05X XXX XXXX"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="email@exemple.com"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border resize-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded-lg ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || isOverCapacity || parsedParticipants < 1}
            className="px-6 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la réservation'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
