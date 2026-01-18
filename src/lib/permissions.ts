/**
 * Utilitaires de gestion des permissions utilisateurs
 *
 * Ce module centralise toute la logique de permissions pour garantir
 * la cohérence dans toute l'application.
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { UserRole, ResourceType, Branch, Profile } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

// Types pour les vérifications de permissions
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export interface PermissionCheckResult {
  allowed: boolean
  user: {
    id: string
    role: UserRole
    profile: Profile
  } | null
  error?: {
    status: number
    code: string
    message: string
    messageKey: string // Clé de traduction pour le frontend
  }
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  profile: Profile
  branchIds: string[]
}

/**
 * Vérifie l'authentification et récupère l'utilisateur avec son profil
 */
export async function getAuthenticatedUser(): Promise<{
  user: AuthenticatedUser | null
  error?: { status: number; code: string; message: string; messageKey: string }
}> {
  const supabase = await createClient()

  // Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action',
        messageKey: 'errors.unauthorized'
      }
    }
  }

  // Récupérer le profil avec le service role pour éviter les problèmes RLS
  const serviceClient = createServiceRoleClient()
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (profileError || !profile) {
    return {
      user: null,
      error: {
        status: 403,
        code: 'NO_PROFILE',
        message: 'User profile not found',
        messageKey: 'errors.noProfile'
      }
    }
  }

  // Récupérer les branches de l'utilisateur
  const { data: userBranches } = await serviceClient
    .from('user_branches')
    .select('branch_id')
    .eq('user_id', user.id)
    .returns<Array<{ branch_id: string }>>()

  const branchIds = userBranches?.map(ub => ub.branch_id) || []

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: profile.role as UserRole,
      profile,
      branchIds
    }
  }
}

/**
 * Vérifie si un utilisateur a une permission spécifique sur une ressource
 */
// Type pour les permissions de rôle
interface RolePermissionRow {
  id: string
  role: string
  resource: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export async function checkPermission(
  userRole: UserRole,
  resource: ResourceType,
  action: PermissionAction
): Promise<boolean> {
  // Super admin a toutes les permissions
  if (userRole === 'super_admin') {
    return true
  }

  const serviceClient = createServiceRoleClient()

  const { data: permission } = await serviceClient
    .from('role_permissions')
    .select('*')
    .eq('role', userRole)
    .eq('resource', resource)
    .single<RolePermissionRow>()

  if (!permission) {
    return false
  }

  switch (action) {
    case 'view':
      return permission.can_view
    case 'create':
      return permission.can_create
    case 'edit':
      return permission.can_edit
    case 'delete':
      return permission.can_delete
    default:
      return false
  }
}

/**
 * Vérifie si un utilisateur a accès à une branche spécifique
 */
export async function checkBranchAccess(
  userId: string,
  userRole: UserRole,
  branchId: string
): Promise<boolean> {
  // Super admin a accès à toutes les branches
  if (userRole === 'super_admin') {
    return true
  }

  const serviceClient = createServiceRoleClient()

  const { data: userBranch } = await serviceClient
    .from('user_branches')
    .select('id')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .single()

  return !!userBranch
}

/**
 * Fonction complète de vérification pour les API routes
 * Vérifie: authentification + permission + accès branche (optionnel)
 */
export async function verifyApiPermission(
  resource: ResourceType,
  action: PermissionAction,
  branchId?: string
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  errorResponse?: NextResponse
}> {
  // 1. Vérifier l'authentification
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: authError?.code || 'UNAUTHORIZED',
          message: authError?.message || 'Authentication required',
          messageKey: authError?.messageKey || 'errors.unauthorized'
        },
        { status: authError?.status || 401 }
      )
    }
  }

  // 2. Vérifier la permission sur la ressource
  const hasPermission = await checkPermission(user.role, resource, action)

  if (!hasPermission) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'PERMISSION_DENIED',
          message: `You don't have permission to ${action} ${resource}`,
          messageKey: `errors.permission.${action}.${resource}`
        },
        { status: 403 }
      )
    }
  }

  // 3. Vérifier l'accès à la branche si spécifiée
  if (branchId) {
    const hasBranchAccess = await checkBranchAccess(user.id, user.role, branchId)

    if (!hasBranchAccess) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: 'BRANCH_ACCESS_DENIED',
            message: 'You don\'t have access to this branch',
            messageKey: 'errors.branchAccessDenied'
          },
          { status: 403 }
        )
      }
    }
  }

  return {
    success: true,
    user
  }
}

/**
 * Récupère les branches autorisées pour un utilisateur
 * 
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @returns Liste des branches autorisées
 */
export async function getUserAuthorizedBranches(
  userId: string,
  userRole: UserRole
): Promise<Branch[]> {
  const supabase = await createClient()

  if (userRole === 'super_admin') {
    // Super admin voit toutes les branches actives
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .returns<Branch[]>()

    if (error) {
      console.error('Error fetching all branches for super_admin:', error)
      return []
    }

    return branches || []
  } else {
    // Branch admin et agent voient uniquement leurs branches assignées
    const { data: userBranches, error } = await supabase
      .from('user_branches')
      .select('branch_id, branches(*)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user branches:', error)
      return []
    }

    if (!userBranches || userBranches.length === 0) {
      return []
    }

    // Extraire les branches depuis les résultats
    const branches = userBranches
      .map((ub: any) => ub.branches)
      .filter(Boolean) as Branch[]

    return branches
  }
}

/**
 * Vérifie si un utilisateur a accès à une branche spécifique
 * 
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @param branchId - ID de la branche à vérifier
 * @returns true si l'utilisateur a accès, false sinon
 */
export async function checkUserBranchAccess(
  userId: string,
  userRole: UserRole,
  branchId: string
): Promise<boolean> {
  if (userRole === 'super_admin') {
    return true // Super admin a accès à tout
  }

  const authorizedBranches = await getUserAuthorizedBranches(userId, userRole)
  return authorizedBranches.some(b => b.id === branchId)
}

/**
 * Vérifie si un utilisateur peut gérer un autre utilisateur
 * 
 * @param currentUserId - ID de l'utilisateur connecté
 * @param currentUserRole - Rôle de l'utilisateur connecté
 * @param targetUserId - ID de l'utilisateur cible
 * @returns true si l'utilisateur peut gérer la cible, false sinon
 */
export async function canManageUser(
  currentUserId: string,
  currentUserRole: UserRole,
  targetUserId: string
): Promise<boolean> {
  // Super admin peut gérer tout le monde (sauf se supprimer lui-même, géré ailleurs)
  if (currentUserRole === 'super_admin') {
    return true
  }

  // Branch admin peut gérer les utilisateurs qui partagent au moins une branche
  if (currentUserRole === 'branch_admin') {
    const supabase = await createClient()

    // Récupérer les branches du branch_admin
    const { data: adminBranches } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', currentUserId)
      .returns<Array<{ branch_id: string }>>()

    if (!adminBranches || adminBranches.length === 0) {
      return false
    }

    const adminBranchIds = adminBranches.map((b: { branch_id: string }) => b.branch_id)

    // Récupérer les branches de l'utilisateur cible
    const { data: targetBranches } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', targetUserId)
      .returns<Array<{ branch_id: string }>>()

    if (!targetBranches || targetBranches.length === 0) {
      return false
    }

    const targetBranchIds = targetBranches.map((b: { branch_id: string }) => b.branch_id)

    // Vérifier s'il y a au moins une branche en commun
    return targetBranchIds.some(id => adminBranchIds.includes(id))
  }

  // Agent ne peut gérer personne
  return false
}

/**
 * Récupère tous les IDs de branches autorisées pour un utilisateur
 * 
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @returns Liste des IDs de branches autorisées
 */
export async function getUserAuthorizedBranchIds(
  userId: string,
  userRole: UserRole
): Promise<string[]> {
  const branches = await getUserAuthorizedBranches(userId, userRole)
  return branches.map(b => b.id)
}
