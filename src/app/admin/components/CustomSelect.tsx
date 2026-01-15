'use client'

import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  isDark: boolean
  disabled?: boolean
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  isDark,
  disabled = false,
}: CustomSelectProps) {
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

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg transition-colors ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex-1 text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        } ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-full rounded-lg shadow-xl z-50 overflow-hidden ${
          isDark
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 text-left transition-colors ${
                value === option.value
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-100 text-blue-700'
                  : isDark
                  ? 'text-white hover:bg-gray-700'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
