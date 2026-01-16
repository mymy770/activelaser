'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Phone, 
  Mail, 
  MessageSquare,
  ExternalLink,
  User,
  Calendar,
  TrendingUp,
  Gamepad2,
  PartyPopper,
  Users,
  Loader2,
  Edit2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/lib/supabase/types'

interface ClientDetailModalProps {
  contactId: string
  onClose: () => void
  onGoToCRM: (contactId: string) => void
  isDark: boolean
}

export function ClientDetailModal({
  contactId,
  onClose,
  onGoToCRM,
  isDark,
}: ClientDetailModalProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContact = async () => {
      setLoading(true)
      const supabase = createClient()

      // Charger le contact
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (contactData) {
        setContact(contactData)

        // Charger les statistiques
        const { data: bookingsData } = await supabase
          .from('booking_contacts')
          .select(`
            booking:bookings (
              id,
              booking_type,
              booking_date,
              start_time,
              participants_count,
              status,
              reference_code
            )
          `)
          .eq('contact_id', contactId)

        if (bookingsData) {
          const bookings = bookingsData
            .map((bc: any) => bc.booking)
            .filter((b: any) => b !== null)

          // Statistiques
          const gameCount = bookings.filter((b: any) => b.booking_type === 'GAME').length
          const eventCount = bookings.filter((b: any) => b.booking_type === 'EVENT').length
          const totalParticipants = bookings.reduce((sum: number, b: any) => sum + (b.participants_count || 0), 0)
          const upcomingCount = bookings.filter((b: any) => 
            new Date(b.booking_date) >= new Date() && b.status !== 'CANCELLED'
          ).length

          setStats({
            totalBookings: bookings.length,
            gameBookings: gameCount,
            eventBookings: eventCount,
            totalParticipants,
            upcomingBookings: upcomingCount,
          })

          // 5 dernières réservations
          const sorted = bookings
            .sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
            .slice(0, 5)
          setRecentBookings(sorted)
        }
      }

      setLoading(false)
    }

    loadContact()
  }, [contactId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (!contact) {
    return null
  }

  const getInitials = () => {
    const first = contact.first_name?.[0] || ''
    const last = contact.last_name?.[0] || ''
    return `${first}${last}`.toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec avatar */}
        <div className="relative p-6 bg-gradient-to-r from-purple-600 to-pink-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white">
              {getInitials()}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {contact.first_name} {contact.last_name || ''}
              </h2>
              <p className="text-white/80 text-sm">
                Client depuis le {new Date(contact.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Contact */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Coordonnées
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                  <Phone className="w-4 h-4 text-blue-500" />
                </div>
                <a href={`tel:${contact.phone}`} className="text-blue-500 hover:underline font-medium">
                  {contact.phone}
                </a>
              </div>
              {contact.email && (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                    <Mail className="w-4 h-4 text-green-500" />
                  </div>
                  <a href={`mailto:${contact.email}`} className="text-blue-500 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Statistiques */}
          {stats && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Statistiques
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-2xl font-bold text-blue-500">{stats.totalBookings}</div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Réservations</div>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-2xl font-bold text-green-500">{stats.upcomingBookings}</div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>À venir</div>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-bold text-yellow-500">{stats.gameBookings}</span>
                    <Gamepad2 className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Games</div>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-bold text-purple-500">{stats.eventBookings}</span>
                    <PartyPopper className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Events</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {(contact.notes || contact.notes_client) && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Notes
              </h3>
              <p className={`whitespace-pre-wrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {contact.notes || contact.notes_client}
              </p>
            </div>
          )}

          {/* Dernières réservations */}
          {recentBookings.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Dernières réservations
              </h3>
              <div className="space-y-2">
                {recentBookings.map((booking: any) => (
                  <div 
                    key={booking.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                  >
                    {booking.booking_type === 'EVENT' ? (
                      <PartyPopper className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Gamepad2 className="w-4 h-4 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(booking.booking_date).toLocaleDateString('fr-FR')} à {booking.start_time?.slice(0, 5)}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {booking.participants_count} pers. • {booking.reference_code}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      booking.status === 'CONFIRMED' 
                        ? 'bg-green-100 text-green-700'
                        : booking.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status === 'CONFIRMED' ? 'Confirmé' : booking.status === 'CANCELLED' ? 'Annulé' : booking.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton accès CRM */}
          <button
            onClick={() => {
              onGoToCRM(contactId)
              onClose()
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <Edit2 className="w-5 h-5" />
            Modifier dans le CRM
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
