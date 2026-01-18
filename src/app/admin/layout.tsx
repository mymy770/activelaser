'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { LanguageProvider, useTranslation } from '@/contexts/LanguageContext'

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Fonction de refresh de session réutilisable
  const refreshSession = useCallback(async () => {
    const supabase = getClient()
    try {
      // Utiliser getSession() qui refresh automatiquement si le token est expiré
      // mais le refresh_token est encore valide
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Tenter un refresh explicite au cas où
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData.session) {
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }, [])

  // Vérification initiale d'authentification - seulement au montage
  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsAuthenticated(true)
      setIsChecking(false)
      return
    }

    const checkAuth = async () => {
      const supabase = getClient()

      try {
        // D'abord essayer de refresh la session (au cas où token expiré mais refresh_token valide)
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // Tenter un refresh explicite
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData.session) {
            setIsAuthenticated(false)
            setIsChecking(false)
            return
          }
        }

        // Vérifier que l'utilisateur existe
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setIsAuthenticated(false)
        } else {
          setIsAuthenticated(true)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [pathname])

  // Setup des listeners et interval de refresh - une seule fois
  useEffect(() => {
    if (pathname === '/admin/login') {
      return
    }

    const supabase = getClient()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthenticated(true)
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false)
        }
      }
    )
    subscriptionRef.current = subscription

    // Refresh automatique de la session toutes les 4 minutes
    // (avant l'expiration du token qui est généralement de 1h,
    // mais on veut refresh fréquemment pour éviter tout problème)
    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(async () => {
        const success = await refreshSession()
        if (!success) {
          setIsAuthenticated(false)
        }
      }, 4 * 60 * 1000) // 4 minutes
    }

    // Aussi refresh quand l'onglet redevient visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const success = await refreshSession()
        if (!success) {
          setIsAuthenticated(false)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Refresh quand le focus revient sur la fenêtre
    const handleFocus = async () => {
      const success = await refreshSession()
      if (!success) {
        setIsAuthenticated(false)
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [pathname, refreshSession])

  // Cleanup de l'interval au démontage complet
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [])

  // Pendant la vérification de l'auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-gray-400">{t('admin.common.loading')}</p>
        </div>
      </div>
    )
  }

  // Non authentifié - rediriger vers login
  if (!isAuthenticated) {
    router.push('/admin/login')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-gray-400">{t('admin.common.loading')}</p>
        </div>
      </div>
    )
  }

  // Authentifié - afficher le contenu
  return <>{children}</>
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider isAdmin={true}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </LanguageProvider>
  )
}
