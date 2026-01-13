'use client'

import { ChevronDown, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Branch } from '@/lib/supabase/types'

interface BranchSelectorProps {
  branches: Branch[]
  selectedBranch: Branch | null
  onSelect: (branchId: string) => void
  disabled?: boolean
}

export function BranchSelector({
  branches,
  selectedBranch,
  onSelect,
  disabled = false,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (branches.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-gray-400">
        <Building2 className="w-5 h-5" />
        <span>Aucune agence disponible</span>
      </div>
    )
  }

  if (branches.length === 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-white">
        <Building2 className="w-5 h-5 text-blue-400" />
        <span>{selectedBranch?.name || branches[0].name}</span>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <Building2 className="w-5 h-5 text-blue-400" />
        <span>{selectedBranch?.name || 'Sélectionner une agence'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => {
                onSelect(branch.id)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                selectedBranch?.id === branch.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-white'
              }`}
            >
              <div className="font-medium">{branch.name}</div>
              {branch.name_en && (
                <div className="text-sm text-gray-400">{branch.name_en}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
