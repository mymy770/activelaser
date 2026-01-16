'use client'

import { 
  Clock, 
  CheckCircle, 
  Users,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Gamepad2,
  Target,
  Cake,
  User
} from 'lucide-react'
import Link from 'next/link'
import type { OrderWithRelations, OrderStatus } from '@/lib/supabase/types'

interface OrdersTableProps {
  orders: OrderWithRelations[]
  isDark: boolean
  onConfirm: (orderId: string) => void
  onCancel: (orderId: string) => void
}

export function OrdersTable({ orders, isDark, onConfirm, onCancel }: OrdersTableProps) {
  
  // Formater la date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
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
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          label: 'En attente'
        }
      case 'auto_confirmed':
        return { 
          icon: CheckCircle, 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          label: 'Confirmé auto'
        }
      case 'manually_confirmed':
        return { 
          icon: CheckCircle, 
          color: 'text-blue-600', 
          bg: 'bg-blue-50', 
          label: 'Confirmé manuel'
        }
      case 'cancelled':
        return { 
          icon: CheckCircle, 
          color: 'text-gray-500', 
          bg: 'bg-gray-50', 
          label: 'Annulé'
        }
      default:
        return { 
          icon: Clock, 
          color: 'text-gray-500', 
          bg: 'bg-gray-50', 
          label: status
        }
    }
  }

  // Obtenir l'icône du type de jeu
  const getGameIcon = (orderType: string, gameArea: string | null) => {
    if (orderType === 'EVENT') return Cake
    if (gameArea === 'LASER') return Target
    if (gameArea === 'ACTIVE') return Gamepad2
    return Gamepad2 // Par défaut
  }

  if (orders.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Aucune commande trouvée
      </div>
    )
  }

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
      {/* Header */}
      <div className={`grid grid-cols-12 gap-4 px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
        <div className="col-span-1">Type</div>
        <div className="col-span-1">Statut</div>
        <div className="col-span-2">Client</div>
        <div className="col-span-1">Contact</div>
        <div className="col-span-1">Date</div>
        <div className="col-span-1">Heure</div>
        <div className="col-span-1">Pers.</div>
        <div className="col-span-2">Référence</div>
        <div className="col-span-1">Source</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {orders.map((order) => {
          const statusDisplay = getStatusDisplay(order.status)
          const StatusIcon = statusDisplay.icon
          const GameIcon = getGameIcon(order.order_type, order.game_area)
          
          return (
            <div 
              key={order.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                order.status === 'pending' ? 'bg-red-50/30 dark:bg-red-900/10' : ''
              }`}
            >
              {/* Type */}
              <div className="col-span-1 flex items-center">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <GameIcon className={`w-4 h-4 ${
                    order.order_type === 'EVENT' ? 'text-purple-500' :
                    order.game_area === 'LASER' ? 'text-cyan-500' :
                    'text-blue-500'
                  }`} />
                </div>
              </div>

              {/* Statut */}
              <div className="col-span-1">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="hidden xl:inline">{statusDisplay.label}</span>
                </div>
              </div>

              {/* Client */}
              <div className="col-span-2">
                <Link
                  href={`/admin/clients${order.contact_id ? `?contact=${order.contact_id}` : ''}`}
                  className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {order.customer_first_name} {order.customer_last_name}
                </Link>
              </div>

              {/* Contact */}
              <div className="col-span-1 text-xs">
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Phone className="w-3 h-3" />
                  <span className="hidden xl:inline">{order.customer_phone.slice(-4)}</span>
                </a>
              </div>

              {/* Date */}
              <div className={`col-span-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatDate(order.requested_date)}
              </div>

              {/* Heure */}
              <div className={`col-span-1 text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatTime(order.requested_time)}
              </div>

              {/* Personnes */}
              <div className="col-span-1 flex items-center gap-1 text-sm">
                <Users className="w-3 h-3 text-gray-400" />
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{order.participants_count}</span>
              </div>

              {/* Référence */}
              <div className="col-span-2 text-xs font-mono">
                <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {order.booking?.reference_code || order.request_reference}
                </div>
              </div>

              {/* Source */}
              <div className="col-span-1">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  Site
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-1">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onConfirm(order.id)}
                      className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium"
                      title="Confirmer"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onCancel(order.id)}
                      className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                      title="Annuler"
                    >
                      ✕
                    </button>
                  </>
                )}
                
                {(order.status === 'auto_confirmed' || order.status === 'manually_confirmed') && order.booking && (
                  <Link
                    href={`/admin?booking=${order.booking.id}`}
                    className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                    title="Voir réservation"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                
                {order.contact && (
                  <Link
                    href={`/admin/clients?contact=${order.contact.id}`}
                    className="p-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded"
                    title="Fiche client"
                  >
                    <User className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
