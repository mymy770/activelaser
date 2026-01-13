'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, LogOut, User, ChevronDown, Sun, Moon, ChevronLeft, ChevronRight, Calendar, Users, PartyPopper, Gamepad2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBookings, type BookingWithSlots, type CreateBookingData } from '@/hooks/useBookings'
import { BookingModal } from './components/BookingModal'

type Theme = 'light' | 'dark'

interface UserData {
  id: string
  email: string
  profile: { id: string; role: string; full_name: string | null } | null
  branches: Array<{ id: string; name: string; slug: string }>
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [showBranchMenu, setShowBranchMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [modalInitialHour, setModalInitialHour] = useState(10)
  const [modalInitialMinute, setModalInitialMinute] = useState(0)

  // Format de date pour l'API
  const dateString = selectedDate.toISOString().split('T')[0]

  // Hook pour les réservations
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
    createBooking
  } = useBookings(selectedBranchId, dateString)

  // Ouvrir le modal de réservation
  const openBookingModal = (hour?: number, minute?: number) => {
    setModalInitialHour(hour ?? 10)
    setModalInitialMinute(minute ?? 0)
    setShowBookingModal(true)
  }

  // Créer une réservation
  const handleCreateBooking = async (data: CreateBookingData): Promise<boolean> => {
    const result = await createBooking(data)
    return result !== null
  }

  // Charger les données utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient()

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/admin/login')
          return
        }

        // Récupérer le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Récupérer les branches
        let branches: Array<{ id: string; name: string; slug: string }> = []

        if (profile?.role === 'super_admin') {
          const { data } = await supabase
            .from('branches')
            .select('id, name, slug')
            .eq('is_active', true)
            .order('name')
          branches = data || []
        } else {
          const { data: userBranches } = await supabase
            .from('user_branches')
            .select('branch_id')
            .eq('user_id', user.id)

          if (userBranches && userBranches.length > 0) {
            const branchIds = userBranches.map(ub => ub.branch_id)
            const { data } = await supabase
              .from('branches')
              .select('id, name, slug')
              .in('id', branchIds)
              .eq('is_active', true)
              .order('name')
            branches = data || []
          }
        }

        setUserData({
          id: user.id,
          email: user.email || '',
          profile,
          branches,
          role: profile?.role || 'agent'
        })

        if (branches.length > 0) {
          setSelectedBranchId(branches[0].id)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  // Charger le thème
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin_theme') as Theme
    if (savedTheme) setTheme(savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('admin_theme', newTheme)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setSelectedDate(today)
  }

  // Calculer les stats
  const gameBookings = bookings.filter(b => b.type === 'GAME')
  const eventBookings = bookings.filter(b => b.type === 'EVENT')
  const totalParticipants = bookings.reduce((sum, b) => sum + b.participants_count, 0)

  // Vérifier si un créneau contient une réservation
  const getBookingForCell = (hour: number, minute: number, slotIndex: number, isRoom: boolean): BookingWithSlots | null => {
    const cellTime = hour * 60 + minute

    for (const booking of bookings) {
      const startTime = new Date(booking.start_datetime)
      const endTime = new Date(booking.end_datetime)
      const bookingStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
      const bookingEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()

      // Vérifier si le créneau est dans la plage de la réservation
      if (cellTime >= bookingStartMinutes && cellTime < bookingEndMinutes) {
        if (isRoom && booking.type === 'EVENT') {
          return booking
        }
        if (!isRoom && booking.type === 'GAME') {
          // Pour les jeux, on vérifie les slots occupés
          const slotsNeeded = Math.ceil(booking.participants_count / 6)
          if (slotIndex < slotsNeeded) {
            return booking
          }
        }
      }
    }
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!userData) {
    return null
  }

  const selectedBranch = userData.branches.find(b => b.id === selectedBranchId)
  const isDark = theme === 'dark'
  const TOTAL_SLOTS = 14
  const TOTAL_ROOMS = 4

  // Générer les créneaux horaires (toutes les 30 minutes)
  const timeSlots: { hour: number; minute: number; label: string }[] = []
  for (let h = 10; h <= 22; h++) {
    for (const m of [0, 30]) {
      timeSlots.push({
        hour: h,
        minute: m,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      })
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">
              Active Games
              <span className="text-blue-400 ml-2">Admin</span>
            </h1>

            {/* Sélecteur d'agence */}
            {userData.branches.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  <span>{selectedBranch?.name || 'Sélectionner'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showBranchMenu ? 'rotate-180' : ''}`} />
                </button>

                {showBranchMenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {userData.branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranchId(branch.id)
                          setShowBranchMenu(false)
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-700 ${
                          branch.id === selectedBranchId ? 'bg-blue-600 text-white' : 'text-gray-300'
                        }`}
                      >
                        {branch.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle thème */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Menu utilisateur */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm text-white font-medium">
                    {userData.profile?.full_name || userData.email}
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                    {userData.role === 'super_admin' ? 'Super Admin' :
                     userData.role === 'branch_admin' ? 'Admin Agence' : 'Agent'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="text-sm text-white font-medium">{userData.profile?.full_name || 'Utilisateur'}</div>
                    <div className="text-xs text-gray-400">{userData.email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="p-6">
        {/* Stats en haut */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Réservations</div>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{bookings.length}</div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Gamepad2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Jeux</div>
              <div className="text-2xl font-bold text-blue-500">{gameBookings.length}</div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <PartyPopper className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Événements</div>
              <div className="text-2xl font-bold text-green-500">{eventBookings.length}</div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Participants</div>
              <div className="text-2xl font-bold text-purple-500">{totalParticipants}</div>
            </div>
          </div>
        </div>

        {/* Navigation de date */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={goToPrevDay} className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToToday} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <Calendar className="w-4 h-4" />
                Aujourd'hui
              </button>
              <button onClick={goToNextDay} className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className={`text-xl font-semibold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedDate)}</h2>
          </div>

          <button
            onClick={() => openBookingModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Nouvelle réservation
          </button>
        </div>

        {/* Erreur */}
        {bookingsError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {bookingsError}
          </div>
        )}

        {/* Grille de l'agenda */}
        <div className={`rounded-xl border overflow-hidden relative ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Loader sur la grille */}
          {bookingsLoading && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}

          {/* En-tête */}
          <div className={`grid border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} style={{
            gridTemplateColumns: `80px repeat(${TOTAL_SLOTS}, 1fr) repeat(${TOTAL_ROOMS}, 1fr)`,
          }}>
            <div className={`p-3 text-center font-medium ${isDark ? 'text-gray-400 bg-gray-900' : 'text-gray-600 bg-gray-50'}`}>
              Heure
            </div>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div key={`slot-${i}`} className={`p-3 text-center font-medium border-l ${isDark ? 'text-blue-400 bg-gray-900 border-gray-700' : 'text-blue-600 bg-gray-50 border-gray-200'}`}>
                S{i + 1}
              </div>
            ))}
            {Array.from({ length: TOTAL_ROOMS }, (_, i) => (
              <div key={`room-${i}`} className={`p-3 text-center font-medium border-l ${isDark ? 'text-green-400 bg-gray-900 border-gray-700' : 'text-green-600 bg-gray-50 border-gray-200'}`}>
                Salle {i + 1}
              </div>
            ))}
          </div>

          {/* Corps */}
          {timeSlots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className={`grid border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
              style={{
                gridTemplateColumns: `80px repeat(${TOTAL_SLOTS}, 1fr) repeat(${TOTAL_ROOMS}, 1fr)`,
                minHeight: '40px',
              }}
            >
              <div className={`p-2 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {slot.minute === 0 ? slot.label : ''}
              </div>
              {/* Slots de jeu */}
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                const booking = getBookingForCell(slot.hour, slot.minute, i, false)
                return (
                  <div
                    key={`cell-slot-${i}`}
                    onClick={() => !booking && openBookingModal(slot.hour, slot.minute)}
                    className={`border-l p-1 ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                      booking
                        ? 'bg-blue-500/30 cursor-pointer hover:bg-blue-500/50'
                        : `${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} cursor-pointer`
                    }`}
                    title={booking ? `${booking.customer_first_name} ${booking.customer_last_name} - ${booking.participants_count} pers.` : 'Cliquer pour réserver'}
                  />
                )
              })}
              {/* Salles d'événements */}
              {Array.from({ length: TOTAL_ROOMS }, (_, i) => {
                const booking = getBookingForCell(slot.hour, slot.minute, i, true)
                return (
                  <div
                    key={`cell-room-${i}`}
                    onClick={() => !booking && openBookingModal(slot.hour, slot.minute)}
                    className={`border-l p-1 ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                      booking
                        ? 'bg-green-500/30 cursor-pointer hover:bg-green-500/50'
                        : `${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} cursor-pointer`
                    }`}
                    title={booking ? `${booking.customer_first_name} ${booking.customer_last_name} - ${booking.participants_count} pers.` : 'Cliquer pour réserver'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </main>

      {/* Modal de réservation */}
      {selectedBranchId && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSubmit={handleCreateBooking}
          branchId={selectedBranchId}
          selectedDate={selectedDate}
          initialHour={modalInitialHour}
          initialMinute={modalInitialMinute}
          isDark={isDark}
        />
      )}
    </div>
  )
}
