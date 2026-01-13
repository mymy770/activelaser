-- Script SQL pour mettre à jour les noms et capacités des salles par défaut
-- À exécuter dans Supabase SQL Editor
--
-- Ce script met à jour :
-- - Salle 1 : "Salle 1", capacité 20
-- - Salle 2 : "Salle 2", capacité 25
-- - Salle 3 : "Salle 3", capacité 50
-- - Salle 4 : "Salle 4", capacité 50

-- Mise à jour pour la première salle (sort_order = 0)
UPDATE event_rooms
SET 
  name = 'Salle 1',
  capacity = 20
WHERE sort_order = 0 AND is_active = true;

-- Mise à jour pour la deuxième salle (sort_order = 1)
UPDATE event_rooms
SET 
  name = 'Salle 2',
  capacity = 25
WHERE sort_order = 1 AND is_active = true;

-- Mise à jour pour la troisième salle (sort_order = 2)
UPDATE event_rooms
SET 
  name = 'Salle 3',
  capacity = 50
WHERE sort_order = 2 AND is_active = true;

-- Mise à jour pour la quatrième salle (sort_order = 3)
UPDATE event_rooms
SET 
  name = 'Salle 4',
  capacity = 50
WHERE sort_order = 3 AND is_active = true;

-- Vérifier les résultats
SELECT 
  id,
  branch_id,
  name,
  capacity,
  sort_order,
  is_active
FROM event_rooms
WHERE is_active = true
ORDER BY branch_id, sort_order;
