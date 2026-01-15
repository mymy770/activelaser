'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { getClient } from '@/lib/supabase/client'
import type { EventRoom, BranchSettings } from '@/lib/supabase/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  branchId: string | null
  rooms: EventRoom[]
  settings: BranchSettings | null
  onUpdate: () => Promise<void>
  isDark: boolean
}

export function SettingsModal({
  isOpen,
  onClose,
  branchId,
  rooms,
  settings,
  onUpdate,
  isDark,
}: SettingsModalProps) {
  const [roomCapacities, setRoomCapacities] = useState<Record<string, number>>({})
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [playersPerSlot, setPlayersPerSlot] = useState<number>(6)
  const [totalSlots, setTotalSlots] = useState<number>(14)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Paramètres d'affichage du texte dans les cellules
  const [textSize, setTextSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm')
  const [textWeight, setTextWeight] = useState<'normal' | 'semibold' | 'bold'>('bold')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')

  // Initialiser les capacités et noms des salles
  useEffect(() => {
    if (rooms && rooms.length > 0) {
      const capacities: Record<string, number> = {}
      const names: Record<string, string> = {}
      rooms.forEach(room => {
        capacities[room.id] = room.capacity
        names[room.id] = room.name || ''
      })
      setRoomCapacities(capacities)
      setRoomNames(names)
    }
  }, [rooms])

  // Initialiser les paramètres depuis les settings de la branche
  useEffect(() => {
    if (settings) {
      // Utiliser max_players_per_slot depuis branch_settings, ou valeur par défaut
      setPlayersPerSlot(settings.max_players_per_slot || 6)
      // Utiliser total_slots depuis branch_settings, ou valeur par défaut
      setTotalSlots(settings.total_slots || 14)
    } else {
      setPlayersPerSlot(6) // Valeur par défaut si pas de settings
      setTotalSlots(14) // Valeur par défaut si pas de settings
    }
  }, [settings, branchId]) // Recharger quand branchId change pour avoir les bons paramètres

  // Charger les paramètres d'affichage depuis localStorage
  useEffect(() => {
    if (branchId) {
      const storageKey = `displaySettings_${branchId}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.textSize) setTextSize(parsed.textSize)
          if (parsed.textWeight) setTextWeight(parsed.textWeight)
          if (parsed.textAlign) setTextAlign(parsed.textAlign)
        } catch (e) {
          console.error('Error loading display settings:', e)
        }
      }
    }
  }, [branchId])

  if (!isOpen || !branchId) return null

  const handleSave = async () => {
    if (!branchId) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = getClient()

      // Mettre à jour les capacités et noms des salles
      for (const room of rooms) {
        const newCapacity = roomCapacities[room.id] !== undefined ? roomCapacities[room.id] : room.capacity
        // Si roomNames[room.id] existe (même vide), on l'utilise, sinon on garde le nom actuel
        const newName = roomNames[room.id] !== undefined ? roomNames[room.id] : room.name
        
        console.log(`Updating room ${room.id}:`, {
          oldName: room.name,
          newName: newName,
          oldCapacity: room.capacity,
          newCapacity: newCapacity,
          roomNamesState: roomNames[room.id]
        })

        const { error: roomError } = await supabase
          .from('event_rooms')
          // @ts-expect-error - Type assertion nécessaire pour contourner le problème de typage Supabase
          .update({ 
            capacity: newCapacity,
            name: newName || `Salle ${room.sort_order + 1}` // Valeur par défaut si vide
          })
          .eq('id', room.id)

        if (roomError) {
          console.error('Error updating room:', roomError)
          throw roomError
        }
      }

      // Mettre à jour les paramètres de slots dans branch_settings
      const maxConcurrentPlayers = playersPerSlot * totalSlots

      const { error: settingsError } = await supabase
        .from('branch_settings')
        // @ts-expect-error - Type assertion nécessaire pour contourner le problème de typage Supabase
        .update({ 
          total_slots: totalSlots,
          max_players_per_slot: playersPerSlot,
          max_concurrent_players: maxConcurrentPlayers
        })
        .eq('branch_id', branchId)

      if (settingsError) throw settingsError

      // Sauvegarder les paramètres d'affichage dans localStorage
      if (branchId) {
        const storageKey = `displaySettings_${branchId}`
        localStorage.setItem(storageKey, JSON.stringify({
          textSize,
          textWeight,
          textAlign,
        }))
      }

      setSuccess(true)
      
      // Rafraîchir les données avant de fermer
      await onUpdate()
      
      // Attendre un peu pour que l'utilisateur voie le message de succès
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const sortedRooms = [...rooms].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Paramètres
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Capacités des salles */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Capacités des salles
            </h3>
            <div className="space-y-3">
              {sortedRooms.map((room, index) => (
                <div
                  key={room.id}
                  className={`space-y-3 p-4 rounded-lg ${
                    isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                >
                  {/* Nom de la salle */}
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Nom de la salle
                    </label>
                    <input
                      type="text"
                      value={roomNames[room.id] !== undefined ? roomNames[room.id] : (room.name || `Salle ${index + 1}`)}
                      onChange={(e) => {
                        const newValue = e.target.value
                        console.log(`Changing room ${room.id} name to:`, newValue)
                        setRoomNames({
                          ...roomNames,
                          [room.id]: newValue,
                        })
                      }}
                      placeholder={`Salle ${index + 1}`}
                      className={`flex-1 max-w-xs px-3 py-2 rounded-lg border ${
                        isDark
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  {/* Capacité de la salle */}
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-sm font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Capacité
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={roomCapacities[room.id] || room.capacity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          setRoomCapacities({
                            ...roomCapacities,
                            [room.id]: value,
                          })
                        }}
                        className={`w-24 px-3 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        personnes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration des slots */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Configuration des slots
            </h3>
            <div className="space-y-4">
              {/* Nombre total de slots */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nombre total de slots
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={totalSlots}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setTotalSlots(value)
                    }}
                    className={`w-24 px-3 py-2 rounded-lg border ${
                      isDark
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    slots
                  </span>
                </div>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Nombre total de slots disponibles pour les réservations.
              </p>

              {/* Personnes par slot */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Personnes par slot
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={playersPerSlot}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setPlayersPerSlot(value)
                    }}
                    className={`w-24 px-3 py-2 rounded-lg border ${
                      isDark
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    personnes
                  </span>
                </div>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Nombre de personnes pouvant occuper un slot de jeu simultanément.
              </p>
            </div>
          </div>

          {/* Configuration de l'affichage du texte */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Affichage des réservations
            </h3>
            <div className="space-y-4">
              {/* Taille de police */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Taille de police
                </label>
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(e.target.value as 'xs' | 'sm' | 'base' | 'lg')}
                  className={`px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="xs">Très petite (xs)</option>
                  <option value="sm">Petite (sm)</option>
                  <option value="base">Normale (base)</option>
                  <option value="lg">Grande (lg)</option>
                </select>
              </div>

              {/* Gras */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Épaisseur du texte
                </label>
                <select
                  value={textWeight}
                  onChange={(e) => setTextWeight(e.target.value as 'normal' | 'semibold' | 'bold')}
                  className={`px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="normal">Normal</option>
                  <option value="semibold">Semi-gras</option>
                  <option value="bold">Gras</option>
                </select>
              </div>

              {/* Alignement */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Alignement
                </label>
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign(e.target.value as 'left' | 'center' | 'right')}
                  className={`px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centre</option>
                  <option value="right">Droite</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages d'erreur/succès */}
          {error && (
            <div className={`p-3 rounded-lg bg-red-500/10 border border-red-500/20`}>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {success && (
            <div className={`p-3 rounded-lg bg-green-500/10 border border-green-500/20`}>
              <p className="text-sm text-green-500">Paramètres sauvegardés avec succès !</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 p-6 border-t ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
