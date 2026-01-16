'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  X
} from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { useBranches } from '@/hooks/useBranches'
import { useAuth } from '@/hooks/useAuth'
import { AdminHeader } from '../components/AdminHeader'
import { OrdersTable } from './components/OrdersTable'
import { OrderDetailModal } from './components/OrderDetailModal'
import { ContactDetailsModal } from '../components/ContactDetailsModal'
import { createClient } from '@/lib/supabase/client'
import type { OrderWithRelations } from '@/lib/supabase/types'

type Theme = 'light' | 'dark'

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const branchesHook = useBranches()
  const selectedBranchId = branchesHook.selectedBranchId
  const branches = branchesHook.branches
  const branchesLoading = branchesHook.loading
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  
  const { 
    orders, 
    loading, 
    error, 
    stats, 
    pendingCount,
    confirmOrder, 
    cancelOrder
  } = useOrders(selectedBranchId)

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  // Toggle thème
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
  }

  // Rediriger si pas authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Sélectionner la première branche par défaut si aucune n'est sélectionnée
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      branchesHook.selectBranch(branches[0].id)
    }
  }, [branches, selectedBranchId, branchesHook])

  // Filtrer les commandes par recherche uniquement (les autres filtres sont dans le tableau)
  const filteredOrders = orders.filter(order => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesName = `${order.customer_first_name} ${order.customer_last_name}`.toLowerCase().includes(query)
      const matchesPhone = order.customer_phone.toLowerCase().includes(query)
      const matchesEmail = order.customer_email?.toLowerCase().includes(query)
      const matchesReference = order.request_reference.toLowerCase().includes(query)
      const matchesBookingRef = order.booking?.reference_code?.toLowerCase().includes(query)
      
      return matchesName || matchesPhone || matchesEmail || matchesReference || matchesBookingRef
    }
    
    return true
  })

  // Formater la date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Formater l'heure
  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  // Obtenir l'icône et la couleur du statut
  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          color: 'text-yellow-500', 
          bg: 'bg-yellow-500/10', 
          border: 'border-yellow-500/30',
          label: 'En attente'
        }
      case 'auto_confirmed':
        return { 
          icon: CheckCircle, 
          color: 'text-green-500', 
          bg: 'bg-green-500/10', 
          border: 'border-green-500/30',
          label: 'Confirmé auto'
        }
      case 'manually_confirmed':
        return { 
          icon: CheckCircle, 
          color: 'text-blue-500', 
          bg: 'bg-blue-500/10', 
          border: 'border-blue-500/30',
          label: 'Confirmé manuel'
        }
      case 'cancelled':
        return { 
          icon: XCircle, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10', 
          border: 'border-red-500/30',
          label: 'Annulé'
        }
      default:
        return { 
          icon: AlertCircle, 
          color: 'text-gray-500', 
          bg: 'bg-gray-500/10', 
          border: 'border-gray-500/30',
          label: status
        }
    }
  }

  // Obtenir l'icône du type de commande
  const getTypeIcon = (orderType: string, gameArea: string | null) => {
    if (orderType === 'EVENT') return PartyPopper
    if (gameArea === 'LASER') return Target
    return Gamepad2
  }

  const handleConfirm = async (orderId: string) => {
    if (confirm('Confirmer cette commande et créer la réservation ?')) {
      await confirmOrder(orderId)
    }
  }

  const handleCancel = async (orderId: string) => {
    if (confirm('Annuler cette commande ?')) {
      await cancelOrder(orderId)
    }
  }

  const handleViewOrder = (order: OrderWithRelations) => {
    setSelectedOrder(order)
  }

  // Ouvrir la fiche client dans une modal (comme dans la section Clients)
  const handleViewClient = (contactId: string) => {
    setSelectedContactId(contactId)
  }

  const closeClientModal = () => {
    setSelectedContactId(null)
  }

  const closeOrderModal = () => {
    setSelectedOrder(null)
  }


  // Navigation vers l'agenda avec la date et booking
  const handleGoToAgenda = (date: string, bookingId?: string) => {
    if (bookingId) {
      router.push(`/admin?date=${date}&booking=${bookingId}`)
    } else {
      router.push(`/admin?date=${date}`)
    }
  }

  // Navigation vers le CRM
  const handleGoToCRM = (contactId: string) => {
    router.push(`/admin/clients?contact=${contactId}`)
  }

  // Recréer une réservation annulée
  const handleRecreate = async (orderId: string) => {
    if (confirm('Voulez-vous recréer cette réservation ? Une nouvelle réservation sera créée avec les mêmes informations.')) {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'recreate' })
        })
        
        const data = await response.json()
        if (data.success) {
          alert('Réservation recréée avec succès !')
          closeOrderModal()
          // Rafraîchir la liste
          window.location.reload()
        } else {
          alert(`Erreur: ${data.error}`)
        }
      } catch (err) {
        console.error('Error recreating order:', err)
        alert('Erreur lors de la recréation')
      }
    }
  }

  const isDark = theme === 'dark'

  if (authLoading || branchesLoading || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <AdminHeader
        user={user}
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchSelect={(branchId) => branchesHook.selectBranch(branchId)}
        onSignOut={signOut}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="p-6">
        {/* Barre de recherche */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une commande (nom, téléphone, email, référence)..."
                className={`w-full pl-10 pr-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg text-base placeholder-gray-500 focus:border-blue-500 focus:outline-none`}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
          </div>
          <div className={`p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30`}>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-yellow-500/70">En attente</div>
          </div>
          <div className={`p-4 rounded-xl bg-green-500/10 border border-green-500/30`}>
            <div className="text-2xl font-bold text-green-500">{stats.auto_confirmed}</div>
            <div className="text-sm text-green-500/70">Confirmés auto</div>
          </div>
          <div className={`p-4 rounded-xl bg-blue-500/10 border border-blue-500/30`}>
            <div className="text-2xl font-bold text-blue-500">{stats.manually_confirmed}</div>
            <div className="text-sm text-blue-500/70">Confirmés manuel</div>
          </div>
          <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30`}>
            <div className="text-2xl font-bold text-red-500">{stats.cancelled}</div>
            <div className="text-sm text-red-500/70">Annulés</div>
          </div>
        </div>

        {/* Conversion Rate */}
        {stats.total > 0 && (
          <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Taux de conversion</span>
              <span className="text-2xl font-bold text-cyan-500">
                {Math.round(((stats.auto_confirmed + stats.manually_confirmed) / stats.total) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"
                style={{ width: `${((stats.auto_confirmed + stats.manually_confirmed) / stats.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <OrdersTable
            orders={filteredOrders}
            isDark={isDark}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onViewOrder={handleViewOrder}
            onViewClient={handleViewClient}
          />
        )}
      </main>

      {/* Modal Détail Commande */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={closeOrderModal}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onRecreate={handleRecreate}
          onGoToAgenda={handleGoToAgenda}
          onGoToClient={handleViewClient}
          isDark={isDark}
        />
      )}

      {/* Modal Fiche Client - Identique à section Clients */}
      {selectedContactId && (
        <ContactDetailsModal
          contactId={selectedContactId}
          onClose={closeClientModal}
          isDark={isDark}
        />
      )}
    </div>
  )
}
