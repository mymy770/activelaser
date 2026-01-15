-- Script de nettoyage complet de la base de données
-- ATTENTION: Ce script supprime TOUTES les données (réservations, contacts, etc.)
-- Exécuter uniquement en développement ou pour réinitialiser complètement la base

-- Désactiver temporairement les contraintes de clés étrangères
SET session_replication_role = 'replica';

-- Supprimer toutes les données dans l'ordre pour respecter les contraintes

-- 1. Supprimer les réservations (bookings)
DELETE FROM booking_slots;
DELETE FROM booking_contacts;
DELETE FROM bookings;

-- 2. Supprimer les contacts
DELETE FROM contacts;

-- 3. Supprimer les salles d'événements (garder la structure)
DELETE FROM event_rooms;

-- 4. Supprimer les paramètres de slots (si la table existe)
DROP TABLE IF EXISTS slot_settings CASCADE;

-- 5. Réinitialiser les paramètres de branche (garder la structure mais réinitialiser les valeurs)
UPDATE branch_settings 
SET 
  total_slots = 14,
  max_players_per_slot = 6,
  max_concurrent_players = 84
WHERE total_slots IS NOT NULL OR max_players_per_slot IS NOT NULL;

-- Réactiver les contraintes
SET session_replication_role = 'origin';

-- Vérification: Afficher le nombre de lignes restantes (devrait être 0 pour bookings et contacts)
SELECT 
  (SELECT COUNT(*) FROM bookings) as bookings_count,
  (SELECT COUNT(*) FROM contacts) as contacts_count,
  (SELECT COUNT(*) FROM booking_contacts) as booking_contacts_count,
  (SELECT COUNT(*) FROM booking_slots) as booking_slots_count;
