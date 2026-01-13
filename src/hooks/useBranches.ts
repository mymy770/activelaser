'use client'

import { useState, useEffect, useCallback } from 'react'
import { getClient } from '@/lib/supabase/client'
import type { Branch, BranchSettings, EventRoom } from '@/lib/supabase/types'

interface BranchWithDetails extends Branch {
  settings: BranchSettings | null
  rooms: EventRoom[]
}

export function useBranches() {
  const [branches, setBranches] = useState<BranchWithDetails[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les branches avec leurs détails
  const fetchBranches = useCallback(async () => {
    const supabase = getClient()
    setLoading(true)
    setError(null)

    try {
      // Les politiques RLS filtreront automatiquement selon l'utilisateur
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .returns<Branch[]>()

      if (branchesError) throw branchesError

      if (!branchesData || branchesData.length === 0) {
        setBranches([])
        setLoading(false)
        return
      }

      // Charger les settings et rooms pour chaque branche
      const branchesWithDetails: BranchWithDetails[] = await Promise.all(
        branchesData.map(async (branch) => {
          // Settings
          const { data: settings } = await supabase
            .from('branch_settings')
            .select('*')
            .eq('branch_id', branch.id)
            .single<BranchSettings>()

          // Rooms
          const { data: rooms } = await supabase
            .from('event_rooms')
            .select('*')
            .eq('branch_id', branch.id)
            .eq('is_active', true)
            .order('sort_order')
            .returns<EventRoom[]>()

          return {
            ...branch,
            settings: settings || null,
            rooms: rooms || [],
          }
        })
      )

      setBranches(branchesWithDetails)

      // Sélectionner la première branche par défaut si aucune n'est sélectionnée
      setSelectedBranchId(prev => {
        if (!prev && branchesWithDetails.length > 0) {
          return branchesWithDetails[0].id
        }
        return prev
      })
    } catch (err) {
      console.error('Error fetching branches:', err)
      setError('Erreur lors du chargement des agences')
    } finally {
      setLoading(false)
    }
  }, []) // Plus de dépendance sur selectedBranchId

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  // Branche actuellement sélectionnée
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null

  // Changer de branche
  const selectBranch = useCallback((branchId: string) => {
    setSelectedBranchId(branchId)
  }, [])

  return {
    branches,
    selectedBranch,
    selectedBranchId,
    selectBranch,
    loading,
    error,
    refresh: fetchBranches,
  }
}
