'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, Save, Shield, Users, UserCog } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import type { RolePermission, UserRole, ResourceType, PermissionSet } from '@/lib/supabase/types'

interface PermissionsTableProps {
  permissions: RolePermission[]
  isDark: boolean
  onSavePermissions: (changes: Array<{ id: string; updates: Partial<PermissionSet> }>) => Promise<boolean>
}

// Resource display order
const RESOURCE_ORDER: ResourceType[] = ['agenda', 'orders', 'clients', 'users', 'logs', 'settings', 'permissions']

// Role display order
const ROLE_ORDER: UserRole[] = ['super_admin', 'branch_admin', 'agent']

// Permission columns
const PERMISSION_COLUMNS: (keyof PermissionSet)[] = ['can_view', 'can_create', 'can_edit', 'can_delete']

// Role icons and colors
const ROLE_CONFIG: Record<UserRole, { icon: typeof Shield; bgColor: string; textColor: string; borderColor: string }> = {
  super_admin: {
    icon: Shield,
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/50'
  },
  branch_admin: {
    icon: UserCog,
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/50'
  },
  agent: {
    icon: Users,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50'
  }
}

export function PermissionsTable({ permissions, isDark, onSavePermissions }: PermissionsTableProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('branch_admin')

  // Local state for pending changes
  const [localPermissions, setLocalPermissions] = useState<Map<string, RolePermission>>(new Map())
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<PermissionSet>>>(new Map())

  // Initialize local permissions from props
  useEffect(() => {
    const permMap = new Map<string, RolePermission>()
    permissions.forEach(p => permMap.set(p.id, { ...p }))
    setLocalPermissions(permMap)
    setPendingChanges(new Map())
  }, [permissions])

  // Get permission for a specific role and resource
  const getPermission = useCallback((role: UserRole, resource: ResourceType): RolePermission | undefined => {
    return Array.from(localPermissions.values()).find(p => p.role === role && p.resource === resource)
  }, [localPermissions])

  // Get all permissions for the selected role
  const getPermissionsForRole = useCallback((role: UserRole): RolePermission[] => {
    return RESOURCE_ORDER.map(resource => getPermission(role, resource)).filter((p): p is RolePermission => p !== undefined)
  }, [getPermission])

  // Handle toggle (local only, no API call)
  const handleToggle = (perm: RolePermission, column: keyof PermissionSet) => {
    // Don't allow editing super_admin permissions
    if (perm.role === 'super_admin') return

    const newValue = !perm[column]

    // Update local state
    setLocalPermissions(prev => {
      const updated = new Map(prev)
      const current = updated.get(perm.id)
      if (current) {
        updated.set(perm.id, { ...current, [column]: newValue })
      }
      return updated
    })

    // Track changes
    setPendingChanges(prev => {
      const updated = new Map(prev)
      const existing = updated.get(perm.id) || {}

      // Get original value from permissions prop
      const original = permissions.find(p => p.id === perm.id)
      if (original && original[column] === newValue) {
        // If back to original, remove from pending
        delete existing[column]
        if (Object.keys(existing).length === 0) {
          updated.delete(perm.id)
        } else {
          updated.set(perm.id, existing)
        }
      } else {
        updated.set(perm.id, { ...existing, [column]: newValue })
      }
      return updated
    })
  }

  // Save all pending changes
  const handleSave = async () => {
    if (pendingChanges.size === 0) return

    setSaving(true)
    const changes = Array.from(pendingChanges.entries()).map(([id, updates]) => ({ id, updates }))
    const success = await onSavePermissions(changes)

    if (success) {
      setPendingChanges(new Map())
    }
    setSaving(false)
  }

  const hasChanges = pendingChanges.size > 0
  const isSuperAdmin = selectedRole === 'super_admin'
  const roleConfig = ROLE_CONFIG[selectedRole]
  const RoleIcon = roleConfig.icon

  return (
    <div className="space-y-6">
      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-3">
        {ROLE_ORDER.map(role => {
          const config = ROLE_CONFIG[role]
          const Icon = config.icon
          const isSelected = selectedRole === role
          const isLocked = role === 'super_admin'

          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all
                ${isSelected
                  ? isDark
                    ? `${config.bgColor} ${config.borderColor} ${config.textColor}`
                    : `bg-opacity-10 ${config.borderColor} ${config.textColor.replace('400', '600')}`
                  : isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <div className="text-left">
                <div className={`font-medium ${isSelected ? '' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t(`admin.roles.${role}`)}
                </div>
                {isLocked && (
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('admin.permissions.locked')}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Role Header */}
      <div className={`flex items-center gap-4 p-4 rounded-xl ${
        isDark ? roleConfig.bgColor : 'bg-opacity-10'
      } border ${roleConfig.borderColor}`}>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${roleConfig.bgColor}`}>
          <RoleIcon className={`w-6 h-6 ${roleConfig.textColor}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t(`admin.roles.${selectedRole}`)}
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t(`admin.permissions.role_description_${selectedRole}`)}
          </p>
        </div>
        {isSuperAdmin && (
          <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
            isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-700'
          }`}>
            {t('admin.permissions.all_permissions_locked')}
          </div>
        )}
      </div>

      {/* Permissions Grid */}
      <div className={`rounded-xl border overflow-hidden ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <th className={`px-6 py-4 text-left text-sm font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {t('admin.permissions.table.resource')}
                </th>
                {PERMISSION_COLUMNS.map(col => (
                  <th key={col} className={`px-4 py-4 text-center text-sm font-medium uppercase tracking-wider ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {t(`admin.permissions.table.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {RESOURCE_ORDER.map(resource => {
                const perm = getPermission(selectedRole, resource)

                return (
                  <tr
                    key={resource}
                    className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
                  >
                    <td className={`px-6 py-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${getResourceColor(resource)}`} />
                        <span className="font-medium">
                          {t(`admin.permissions.resources.${resource}`)}
                        </span>
                      </div>
                    </td>
                    {PERMISSION_COLUMNS.map(col => {
                      if (!perm) {
                        return (
                          <td key={col} className={`px-4 py-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            -
                          </td>
                        )
                      }

                      const isEnabled = perm[col]
                      const hasChange = pendingChanges.get(perm.id)?.[col] !== undefined

                      return (
                        <td key={col} className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggle(perm, col)}
                            disabled={isSuperAdmin}
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center mx-auto transition-all
                              ${isSuperAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
                              ${hasChange ? 'ring-2 ring-blue-500 ring-offset-2 ' + (isDark ? 'ring-offset-gray-800' : 'ring-offset-white') : ''}
                              ${isEnabled
                                ? isDark
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-green-100 text-green-600'
                                : isDark
                                  ? 'bg-gray-700 text-gray-500'
                                  : 'bg-gray-100 text-gray-400'
                              }
                            `}
                            title={isSuperAdmin ? t('admin.permissions.super_admin_locked') : ''}
                          >
                            {isEnabled ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || isSuperAdmin}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            ${hasChanges && !isSuperAdmin
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : isDark
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t('admin.permissions.save')}
          {hasChanges && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
              {pendingChanges.size}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// Helper function for resource colors
function getResourceColor(resource: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    agenda: 'bg-blue-500',
    orders: 'bg-orange-500',
    clients: 'bg-green-500',
    users: 'bg-purple-500',
    logs: 'bg-yellow-500',
    settings: 'bg-pink-500',
    permissions: 'bg-red-500'
  }
  return colors[resource] || 'bg-gray-500'
}
