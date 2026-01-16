'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getClient()
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          setIsAuthenticated(false)
          // Rediriger vers la page de login Supabase ou une page d'erreur
          // Pour l'instant, on affiche juste un message
          console.log('No authenticated user found')
        } else {
          setIsAuthenticated(true)
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        setIsAuthenticated(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()

    // Écouter les changements d'authentification
    const supabase = getClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          setIsAuthenticated(true)
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Pendant la vérification de l'auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  // Non authentifié
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-gray-400 mb-6">Vous devez être connecté pour accéder à cette page.</p>
          <button
            onClick={() => {
              // Essayer de rafraîchir la session
              const supabase = getClient()
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                  setIsAuthenticated(true)
                } else {
                  // Pas de page de login, afficher un message
                  alert('Veuillez vous connecter via Supabase Dashboard ou configurer une page de login.')
                }
              })
            }}
            className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  // Authentifié - afficher le contenu
  return <>{children}</>
}
