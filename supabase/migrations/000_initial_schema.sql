-- Migration initiale complète pour nouvelle base Supabase
-- Crée TOUTES les tables nécessaires pour l'application agenda
-- Date: 2024
-- Description: Schéma complet de l'application (branches, bookings, contacts, etc.)

-- =====================================================
-- Table: branches
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  phone_extension TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(slug);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- =====================================================
-- Table: branch_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS branch_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  max_concurrent_players INTEGER NOT NULL DEFAULT 84,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
  game_duration_minutes INTEGER NOT NULL DEFAULT 60,
  event_total_duration_minutes INTEGER NOT NULL DEFAULT 120,
  event_game_duration_minutes INTEGER NOT NULL DEFAULT 60,
  event_buffer_before_minutes INTEGER NOT NULL DEFAULT 15,
  event_buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  event_min_participants INTEGER NOT NULL DEFAULT 1,
  game_price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0,
  bracelet_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  event_price_15_29 DECIMAL(10,2) NOT NULL DEFAULT 0,
  event_price_30_plus DECIMAL(10,2) NOT NULL DEFAULT 0,
  opening_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_settings_branch ON branch_settings(branch_id);

-- =====================================================
-- Table: event_rooms
-- =====================================================
CREATE TABLE IF NOT EXISTS event_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  capacity INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_event_rooms_branch ON event_rooms(branch_id);
CREATE INDEX IF NOT EXISTS idx_event_rooms_is_active ON event_rooms(is_active);

-- =====================================================
-- Table: profiles (utilisateurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('super_admin', 'branch_admin', 'agent')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- Table: user_branches (liaison utilisateurs ↔ branches)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);

-- =====================================================
-- Table: bookings
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('GAME', 'EVENT')),
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  game_start_datetime TIMESTAMPTZ,
  game_end_datetime TIMESTAMPTZ,
  participants_count INTEGER NOT NULL DEFAULT 1,
  event_room_id UUID REFERENCES event_rooms(id) ON DELETE SET NULL,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_notes_at_booking TEXT, -- Snapshot notes client (ajouté pour CRM)
  reference_code TEXT NOT NULL UNIQUE,
  total_price DECIMAL(10,2),
  notes TEXT, -- Notes booking (spécifiques à l'événement)
  color TEXT,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Ajouté pour CRM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_datetime ON bookings(start_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_code ON bookings(reference_code);
CREATE INDEX IF NOT EXISTS idx_bookings_primary_contact ON bookings(primary_contact_id);

-- =====================================================
-- Table: booking_slots
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  participants_count INTEGER NOT NULL DEFAULT 1,
  slot_type TEXT NOT NULL DEFAULT 'game_zone',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON booking_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_branch ON booking_slots(branch_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_slot_start ON booking_slots(slot_start);

-- =====================================================
-- Table: contacts (CRM)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id_main UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  notes_client TEXT, -- Notes globales (allergies, préférences, comportement)
  alias TEXT, -- Optionnel : peut être utile pour certains cas
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  source TEXT DEFAULT 'admin_agenda' CHECK (source IN ('admin_agenda', 'public_booking')),
  archived_at TIMESTAMPTZ,
  archived_reason TEXT,
  deleted_at TIMESTAMPTZ, -- Pour hard delete futur (pas utilisé en v1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_contacts_branch_main ON contacts(branch_id_main);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);

-- =====================================================
-- Table: booking_contacts (junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT, -- 'payer', 'parent2', 'organizer', etc. (optionnel v1, utilisé v1.1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, contact_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_booking_contacts_booking ON booking_contacts(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_contact ON booking_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_primary ON booking_contacts(booking_id, is_primary) WHERE is_primary = TRUE;

-- Contrainte : un seul primary par booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_contacts_one_primary 
ON booking_contacts(booking_id) 
WHERE is_primary = TRUE;

-- =====================================================
-- Triggers pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branch_settings_updated_at
BEFORE UPDATE ON branch_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Commentaires pour documentation
-- =====================================================

COMMENT ON TABLE contacts IS 'Table des contacts clients (CRM). Un contact appartient à une branche principale.';
COMMENT ON COLUMN contacts.branch_id_main IS 'Branche principale du contact (partage multi-branches hors scope v1)';
COMMENT ON COLUMN contacts.status IS 'Statut: active (visible, modifiable) ou archived (caché par défaut, lecture seule)';
COMMENT ON COLUMN contacts.notes_client IS 'Notes globales du client (allergies, préférences) - différentes des notes booking';
COMMENT ON TABLE booking_contacts IS 'Table de liaison many-to-many entre bookings et contacts';
COMMENT ON COLUMN booking_contacts.is_primary IS 'True pour le contact principal du booking (un seul par booking)';
COMMENT ON COLUMN booking_contacts.role IS 'Rôle optionnel (payer, parent2, organizer) - utilisé en v1.1';
COMMENT ON COLUMN bookings.primary_contact_id IS 'ID du contact principal (pour backward compatibility, déduit aussi de booking_contacts)';
COMMENT ON COLUMN bookings.customer_notes_at_booking IS 'Snapshot des notes client au moment de la réservation (pour historique)';
