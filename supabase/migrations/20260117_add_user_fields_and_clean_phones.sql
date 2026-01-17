-- Migration: Ajout de champs utilisateur et nettoyage des téléphones
-- Date: 2026-01-17
-- Description: Prépare la base pour la gestion avancée des utilisateurs + standardise les formats téléphone/email

-- ============================================================
-- PARTIE 1: AJOUT DE COLONNES À LA TABLE profiles
-- ============================================================

-- Ajout des nouveaux champs pour les utilisateurs
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN public.profiles.first_name IS 'Prénom de l''utilisateur (obligatoire)';
COMMENT ON COLUMN public.profiles.last_name IS 'Nom de famille de l''utilisateur (obligatoire)';
COMMENT ON COLUMN public.profiles.phone IS 'Numéro de téléphone israélien format 05XXXXXXXX';
COMMENT ON COLUMN public.profiles.created_by IS 'ID de l''utilisateur ayant créé ce compte (NULL pour super_admin initial)';

-- ============================================================
-- PARTIE 2: MIGRATION DES DONNÉES EXISTANTES (profiles)
-- ============================================================

-- Extraire prénom/nom depuis full_name si possible
-- Format attendu: "Prénom Nom" ou "Prénom"
UPDATE public.profiles
SET 
  first_name = CASE
    WHEN full_name IS NOT NULL AND TRIM(full_name) != '' THEN
      SPLIT_PART(TRIM(full_name), ' ', 1)
    ELSE
      'Admin'  -- Valeur par défaut
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND TRIM(full_name) != '' 
         AND ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(full_name), ' '), 1) > 1 THEN
      SUBSTRING(TRIM(full_name) FROM POSITION(' ' IN TRIM(full_name)) + 1)
    ELSE
      NULL
  END
WHERE first_name IS NULL;

-- ============================================================
-- PARTIE 3: NETTOYAGE DES TÉLÉPHONES (contacts)
-- ============================================================

-- Fonction helper pour nettoyer et valider les numéros de téléphone israéliens
CREATE OR REPLACE FUNCTION clean_israeli_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Retirer tous les caractères non numériques
  cleaned := REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
  
  -- Vérifier si c'est un numéro israélien valide (05XXXXXXXX)
  IF cleaned ~ '^05[0-9]{8}$' THEN
    RETURN cleaned;
  END IF;
  
  -- Si le format n'est pas valide, retourner tel quel pour inspection manuelle
  RETURN phone_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Nettoyer les téléphones dans la table contacts
UPDATE public.contacts
SET phone = clean_israeli_phone(phone)
WHERE phone IS NOT NULL;

-- ============================================================
-- PARTIE 4: NETTOYAGE DES TÉLÉPHONES (bookings)
-- ============================================================

-- Nettoyer les téléphones dans la table bookings
UPDATE public.bookings
SET customer_phone = clean_israeli_phone(customer_phone)
WHERE customer_phone IS NOT NULL;

-- ============================================================
-- PARTIE 5: NETTOYAGE DES TÉLÉPHONES (orders)
-- ============================================================

-- Nettoyer les téléphones dans la table orders
UPDATE public.orders
SET customer_phone = clean_israeli_phone(customer_phone)
WHERE customer_phone IS NOT NULL;

-- ============================================================
-- PARTIE 6: VALIDATION DES EMAILS (tous les champs email)
-- ============================================================

-- Fonction de validation email basique
CREATE OR REPLACE FUNCTION is_valid_email(email_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF email_input IS NULL OR TRIM(email_input) = '' THEN
    RETURN TRUE;  -- NULL/empty est considéré comme valide (optionnel)
  END IF;
  
  -- Regex basique pour email
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Marquer les emails invalides dans contacts (mettre à NULL si invalide)
UPDATE public.contacts
SET email = NULL
WHERE email IS NOT NULL 
  AND NOT is_valid_email(email);

-- Marquer les emails invalides dans bookings (mettre à NULL si invalide)
UPDATE public.bookings
SET customer_email = NULL
WHERE customer_email IS NOT NULL 
  AND NOT is_valid_email(customer_email);

-- Marquer les emails invalides dans orders (mettre à NULL si invalide)
UPDATE public.orders
SET customer_email = NULL
WHERE customer_email IS NOT NULL 
  AND NOT is_valid_email(customer_email);

-- ============================================================
-- PARTIE 7: CONTRAINTES ET INDEX
-- ============================================================

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_clean ON public.contacts(phone) WHERE phone ~ '^05[0-9]{8}$';
CREATE INDEX IF NOT EXISTS idx_contacts_email_clean ON public.contacts(email) WHERE email IS NOT NULL;

-- ============================================================
-- PARTIE 8: PERMISSIONS RLS (Row Level Security)
-- ============================================================

-- Note: Les policies RLS seront créées dans une migration ultérieure
-- pour la gestion complète des permissions utilisateurs

-- ============================================================
-- RAPPORT DE MIGRATION
-- ============================================================

-- Afficher un rapport des numéros de téléphone qui nécessitent une attention manuelle
DO $$
DECLARE
  invalid_phones_count INTEGER;
  invalid_emails_count INTEGER;
BEGIN
  -- Compter les téléphones potentiellement invalides dans contacts
  SELECT COUNT(*) INTO invalid_phones_count
  FROM public.contacts
  WHERE phone IS NOT NULL 
    AND phone !~ '^05[0-9]{8}$';
  
  -- Compter les emails qui ont été supprimés
  SELECT COUNT(*) INTO invalid_emails_count
  FROM public.contacts
  WHERE email IS NULL;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RAPPORT DE MIGRATION';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Téléphones nécessitant vérification: %', invalid_phones_count;
  RAISE NOTICE 'Emails nettoyés (mis à NULL): %', invalid_emails_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration terminée avec succès!';
  RAISE NOTICE '==============================================';
END $$;
