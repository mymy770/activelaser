-- Migration: Mettre à jour les salles pour Rishon LeZion (4 salles) et Petah Tikva (3 salles)
-- Date: 2025-01-XX

DO $$
DECLARE
  rishon_branch_id UUID;
  petah_branch_id UUID;
BEGIN
  -- Trouver les IDs des branches
  SELECT id INTO rishon_branch_id
  FROM branches 
  WHERE slug = 'rishon-lezion' 
     OR name ILIKE '%rishon%'
     OR name ILIKE '%rly%'
  LIMIT 1;

  SELECT id INTO petah_branch_id
  FROM branches 
  WHERE slug = 'petah-tikva' 
     OR name ILIKE '%petah%'
  LIMIT 1;

  -- Supprimer toutes les salles existantes pour Rishon LeZion
  IF rishon_branch_id IS NOT NULL THEN
    DELETE FROM event_rooms WHERE branch_id = rishon_branch_id;
    
    -- Insérer 4 salles pour Rishon LeZion
    INSERT INTO event_rooms (branch_id, slug, name, name_en, capacity, sort_order, is_active) VALUES
      (rishon_branch_id, 'room-1', 'Salle 1', 'Room 1', 20, 0, true),
      (rishon_branch_id, 'room-2', 'Salle 2', 'Room 2', 20, 1, true),
      (rishon_branch_id, 'room-3', 'Salle 3', 'Room 3', 20, 2, true),
      (rishon_branch_id, 'room-4', 'Salle 4', 'Room 4', 20, 3, true);
    
    RAISE NOTICE '4 salles créées pour Rishon LeZion (branch_id: %)', rishon_branch_id;
    
    -- Mettre à jour les paramètres de slots pour Rishon LeZion (14 slots)
    IF EXISTS (SELECT 1 FROM branch_settings WHERE branch_id = rishon_branch_id) THEN
      -- Mettre à jour les settings existants
      UPDATE branch_settings
      SET 
        total_slots = 14,
        max_players_per_slot = 6,
        max_concurrent_players = 84,
        updated_at = NOW()
      WHERE branch_id = rishon_branch_id;
      
      RAISE NOTICE 'Paramètres mis à jour pour Rishon LeZion : 14 slots, 6 joueurs/slot';
    ELSE
      -- Créer de nouveaux settings
      INSERT INTO branch_settings (branch_id, total_slots, max_players_per_slot, max_concurrent_players)
      VALUES (rishon_branch_id, 14, 6, 84);
      
      RAISE NOTICE 'Paramètres créés pour Rishon LeZion : 14 slots, 6 joueurs/slot';
    END IF;
  ELSE
    RAISE WARNING 'Branche Rishon LeZion non trouvée';
  END IF;

  -- Supprimer toutes les salles existantes pour Petah Tikva
  IF petah_branch_id IS NOT NULL THEN
    DELETE FROM event_rooms WHERE branch_id = petah_branch_id;
    
    -- Insérer 3 salles pour Petah Tikva
    INSERT INTO event_rooms (branch_id, slug, name, name_en, capacity, sort_order, is_active) VALUES
      (petah_branch_id, 'room-1', 'Salle 1', 'Room 1', 20, 0, true),
      (petah_branch_id, 'room-2', 'Salle 2', 'Room 2', 20, 1, true),
      (petah_branch_id, 'room-3', 'Salle 3', 'Room 3', 20, 2, true);
    
    RAISE NOTICE '3 salles créées pour Petah Tikva (branch_id: %)', petah_branch_id;
    
    -- Mettre à jour les paramètres de slots pour Petah Tikva (10 slots au lieu de 14)
    -- Vérifier si des settings existent déjà pour cette branche
    IF EXISTS (SELECT 1 FROM branch_settings WHERE branch_id = petah_branch_id) THEN
      -- Mettre à jour les settings existants
      UPDATE branch_settings
      SET 
        total_slots = 10,
        max_players_per_slot = 6,
        max_concurrent_players = 60,
        updated_at = NOW()
      WHERE branch_id = petah_branch_id;
      
      RAISE NOTICE 'Paramètres mis à jour pour Petah Tikva : 10 slots, 6 joueurs/slot';
    ELSE
      -- Créer de nouveaux settings
      INSERT INTO branch_settings (branch_id, total_slots, max_players_per_slot, max_concurrent_players)
      VALUES (petah_branch_id, 10, 6, 60);
      
      RAISE NOTICE 'Paramètres créés pour Petah Tikva : 10 slots, 6 joueurs/slot';
    END IF;
  ELSE
    RAISE WARNING 'Branche Petah Tikva non trouvée';
  END IF;
END $$;

-- Vérification: Afficher le nombre de salles et slots par branche
SELECT 
  b.name as branch_name,
  b.slug,
  COUNT(er.id) as room_count,
  STRING_AGG(er.name, ', ' ORDER BY er.sort_order) as room_names,
  bs.total_slots,
  bs.max_players_per_slot,
  bs.max_concurrent_players
FROM branches b
LEFT JOIN event_rooms er ON er.branch_id = b.id AND er.is_active = true
LEFT JOIN branch_settings bs ON bs.branch_id = b.id
WHERE b.slug IN ('rishon-lezion', 'petah-tikva') 
   OR b.name ILIKE '%rishon%' 
   OR b.name ILIKE '%petah%'
GROUP BY b.id, b.name, b.slug, bs.total_slots, bs.max_players_per_slot, bs.max_concurrent_players
ORDER BY b.name;
