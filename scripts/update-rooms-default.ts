/**
 * Script pour mettre à jour les noms et capacités des salles par défaut
 * 
 * Usage: npx tsx scripts/update-rooms-default.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateRoomsDefaults() {
  console.log('🔄 Mise à jour des salles par défaut...\n')

  try {
    // Récupérer toutes les branches actives
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)

    if (branchesError) {
      console.error('❌ Erreur lors de la récupération des branches:', branchesError)
      return
    }

    if (!branches || branches.length === 0) {
      console.log('⚠️  Aucune branche active trouvée')
      return
    }

    // Pour chaque branche, mettre à jour les salles
    for (const branch of branches) {
      console.log(`\n📋 Branche: ${branch.name} (${branch.id})`)

      // Récupérer les salles de cette branche
      const { data: rooms, error: roomsError } = await supabase
        .from('event_rooms')
        .select('id, name, capacity, sort_order')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('sort_order')

      if (roomsError) {
        console.error(`  ❌ Erreur lors de la récupération des salles:`, roomsError)
        continue
      }

      if (!rooms || rooms.length === 0) {
        console.log(`  ⚠️  Aucune salle trouvée pour cette branche`)
        continue
      }

      // Définir les valeurs par défaut selon le sort_order
      const defaultValues = [
        { name: 'Salle 1', capacity: 20 },
        { name: 'Salle 2', capacity: 25 },
        { name: 'Salle 3', capacity: 50 },
        { name: 'Salle 4', capacity: 50 },
      ]

      // Mettre à jour chaque salle
      for (let i = 0; i < rooms.length && i < 4; i++) {
        const room = rooms[i]
        const defaults = defaultValues[i]

        console.log(`  🔄 Salle ${i + 1} (sort_order: ${room.sort_order})`)
        console.log(`     Ancien nom: "${room.name}" → Nouveau nom: "${defaults.name}"`)
        console.log(`     Ancienne capacité: ${room.capacity} → Nouvelle capacité: ${defaults.capacity}`)

        const { error: updateError } = await supabase
          .from('event_rooms')
          .update({
            name: defaults.name,
            capacity: defaults.capacity,
          })
          .eq('id', room.id)

        if (updateError) {
          console.error(`     ❌ Erreur lors de la mise à jour:`, updateError)
        } else {
          console.log(`     ✅ Salle mise à jour avec succès`)
        }
      }
    }

    console.log('\n✅ Mise à jour terminée!')
  } catch (error) {
    console.error('❌ Erreur générale:', error)
    process.exit(1)
  }
}

updateRoomsDefaults()
  .then(() => {
    console.log('\n✨ Script terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
