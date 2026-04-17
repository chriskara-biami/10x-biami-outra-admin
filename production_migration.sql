-- ============================================================================
-- PRODUCTION MIGRATION SCRIPT
-- ============================================================================
-- Biami Admin + Dev Portal — Full Database Migration
-- Generated: 2026-04-17
--
-- This script is IDEMPOTENT — safe to run multiple times on production.
-- It uses IF NOT EXISTS / IF NOT EXISTS checks throughout.
--
-- Run this in the Supabase SQL Editor against your PRODUCTION project.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. Reusable trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ############################################################################
-- SECTION 1: FIVETRAN TABLES
-- ############################################################################

-- ============================================================================
-- 1a. fivetran_config
-- ============================================================================
CREATE TABLE IF NOT EXISTS fivetran_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id text NOT NULL,
  group_name text,
  destination_id text,
  destination_service text NOT NULL DEFAULT 'snowflake',
  destination_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_fivetran_config_user_id ON fivetran_config(user_id);
CREATE INDEX IF NOT EXISTS idx_fivetran_config_group_id ON fivetran_config(group_id);

ALTER TABLE fivetran_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own fivetran_config"
    ON fivetran_config FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own fivetran_config"
    ON fivetran_config FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own fivetran_config"
    ON fivetran_config FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own fivetran_config"
    ON fivetran_config FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS fivetran_config_updated_at ON fivetran_config;
CREATE TRIGGER fivetran_config_updated_at
  BEFORE UPDATE ON fivetran_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 1b. fivetran_connectors
-- ============================================================================
CREATE TABLE IF NOT EXISTS fivetran_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fivetran_connector_id text NOT NULL UNIQUE,
  group_id text NOT NULL,
  service text NOT NULL,
  service_version integer NOT NULL DEFAULT 0,
  schema_name text NOT NULL,
  paused boolean NOT NULL DEFAULT false,
  sync_frequency integer NOT NULL DEFAULT 360,
  setup_state text NOT NULL DEFAULT 'incomplete',
  sync_state text NOT NULL DEFAULT 'scheduled',
  last_sync_at timestamptz,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  failed_at timestamptz,
  schema_patched boolean NOT NULL DEFAULT false,
  webhook_id text,
  last_authenticated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fivetran_connectors_user_id ON fivetran_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_fivetran_connectors_group_id ON fivetran_connectors(group_id);
CREATE INDEX IF NOT EXISTS idx_fivetran_connectors_service ON fivetran_connectors(service);
CREATE INDEX IF NOT EXISTS idx_fivetran_connectors_fivetran_id ON fivetran_connectors(fivetran_connector_id);

ALTER TABLE fivetran_connectors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own fivetran_connectors"
    ON fivetran_connectors FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own fivetran_connectors"
    ON fivetran_connectors FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own fivetran_connectors"
    ON fivetran_connectors FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own fivetran_connectors"
    ON fivetran_connectors FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS fivetran_connectors_updated_at ON fivetran_connectors;
CREATE TRIGGER fivetran_connectors_updated_at
  BEFORE UPDATE ON fivetran_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- SECTION 2: CENSUS TABLES
-- ############################################################################

-- ============================================================================
-- 2a. census_config
-- ============================================================================
CREATE TABLE IF NOT EXISTS census_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  census_source_id integer NOT NULL,
  source_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_census_config_user_id ON census_config(user_id);

ALTER TABLE census_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own census_config"
    ON census_config FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own census_config"
    ON census_config FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own census_config"
    ON census_config FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own census_config"
    ON census_config FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS census_config_updated_at ON census_config;
CREATE TRIGGER census_config_updated_at
  BEFORE UPDATE ON census_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2b. census_destinations
-- ============================================================================
CREATE TABLE IF NOT EXISTS census_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  census_destination_id integer NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, census_destination_id)
);

CREATE INDEX IF NOT EXISTS idx_census_destinations_user_id ON census_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_census_destinations_type ON census_destinations(type);

ALTER TABLE census_destinations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own census_destinations"
    ON census_destinations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own census_destinations"
    ON census_destinations FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own census_destinations"
    ON census_destinations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own census_destinations"
    ON census_destinations FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS census_destinations_updated_at ON census_destinations;
CREATE TRIGGER census_destinations_updated_at
  BEFORE UPDATE ON census_destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2c. census_syncs
-- ============================================================================
CREATE TABLE IF NOT EXISTS census_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  census_sync_id integer NOT NULL,
  census_destination_id integer NOT NULL,
  dataset_id integer NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'active',
  operation text NOT NULL DEFAULT 'upsert',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, census_sync_id)
);

CREATE INDEX IF NOT EXISTS idx_census_syncs_user_id ON census_syncs(user_id);
CREATE INDEX IF NOT EXISTS idx_census_syncs_destination ON census_syncs(census_destination_id);

ALTER TABLE census_syncs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own census_syncs"
    ON census_syncs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own census_syncs"
    ON census_syncs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own census_syncs"
    ON census_syncs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own census_syncs"
    ON census_syncs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS census_syncs_updated_at ON census_syncs;
CREATE TRIGGER census_syncs_updated_at
  BEFORE UPDATE ON census_syncs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2d. census_connect_links
-- ============================================================================
CREATE TABLE IF NOT EXISTS census_connect_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connect_link_id integer NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  redirect_uri text,
  destination_id integer,
  status text NOT NULL DEFAULT 'pending',
  expired boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, connect_link_id)
);

CREATE INDEX IF NOT EXISTS idx_census_connect_links_user_id ON census_connect_links(user_id);
CREATE INDEX IF NOT EXISTS idx_census_connect_links_link_id ON census_connect_links(connect_link_id);

ALTER TABLE census_connect_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own census_connect_links"
    ON census_connect_links FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own census_connect_links"
    ON census_connect_links FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own census_connect_links"
    ON census_connect_links FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own census_connect_links"
    ON census_connect_links FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS census_connect_links_updated_at ON census_connect_links;
CREATE TRIGGER census_connect_links_updated_at
  BEFORE UPDATE ON census_connect_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- SECTION 3: ETL STATUS TABLE
-- ############################################################################

CREATE TABLE IF NOT EXISTS etl_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  overall_status text NOT NULL DEFAULT 'NOT_STARTED',
  stages jsonb,
  poll_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_etl_status_user_id ON etl_status(user_id);
CREATE INDEX IF NOT EXISTS idx_etl_status_connection_id ON etl_status(connection_id);

ALTER TABLE etl_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own ETL status"
    ON etl_status FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own ETL status"
    ON etl_status FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own ETL status"
    ON etl_status FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own ETL status"
    ON etl_status FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_etl_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS etl_status_updated_at ON etl_status;
CREATE TRIGGER etl_status_updated_at
  BEFORE UPDATE ON etl_status
  FOR EACH ROW EXECUTE FUNCTION update_etl_status_updated_at();

-- ALTER: add last_api_sync column
ALTER TABLE etl_status ADD COLUMN IF NOT EXISTS last_api_sync TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_etl_status_last_api_sync ON etl_status(last_api_sync);
COMMENT ON COLUMN etl_status.last_api_sync IS 'Timestamp of the last successful sync with the Outra API';

-- ALTER: add error_message column
ALTER TABLE etl_status ADD COLUMN IF NOT EXISTS error_message TEXT;
COMMENT ON COLUMN etl_status.error_message IS 'Last ETL error message, e.g. 404 not found from Outra API. NULL when no error.';

-- ALTER: add last_fivetran_check column
ALTER TABLE etl_status ADD COLUMN IF NOT EXISTS last_fivetran_check TIMESTAMPTZ;
COMMENT ON COLUMN etl_status.last_fivetran_check IS 'Timestamp of the last Fivetran connector status check (separate from Outra API cache)';


-- ############################################################################
-- SECTION 4: AUDIENCE INSIGHTS TABLE
-- ############################################################################

CREATE TABLE IF NOT EXISTS audience_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  subtext text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_audience_insights_user_id ON audience_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_audience_insights_connection_id ON audience_insights(connection_id);

ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own audience insights"
    ON audience_insights FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own audience insights"
    ON audience_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own audience insights"
    ON audience_insights FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own audience insights"
    ON audience_insights FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_audience_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audience_insights_updated_at ON audience_insights;
CREATE TRIGGER audience_insights_updated_at
  BEFORE UPDATE ON audience_insights
  FOR EACH ROW EXECUTE FUNCTION update_audience_insights_updated_at();


-- ############################################################################
-- SECTION 5: OUTRA API INTEGRATION TABLES
-- ############################################################################

-- ============================================================================
-- 5a. etl_counts
-- ============================================================================
CREATE TABLE IF NOT EXISTS etl_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  total_records integer NOT NULL DEFAULT 0,
  address_matched_records integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_etl_counts_user_id ON etl_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_etl_counts_connection_id ON etl_counts(connection_id);

ALTER TABLE etl_counts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own etl_counts"
    ON etl_counts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own etl_counts"
    ON etl_counts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own etl_counts"
    ON etl_counts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own etl_counts"
    ON etl_counts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS etl_counts_updated_at ON etl_counts;
CREATE TRIGGER etl_counts_updated_at
  BEFORE UPDATE ON etl_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5b. user_enrichment_summary
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_enrichment_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  enriched_profiles integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_user_enrichment_summary_user_id ON user_enrichment_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrichment_summary_connection_id ON user_enrichment_summary(connection_id);

ALTER TABLE user_enrichment_summary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own enrichment_summary"
    ON user_enrichment_summary FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own enrichment_summary"
    ON user_enrichment_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own enrichment_summary"
    ON user_enrichment_summary FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own enrichment_summary"
    ON user_enrichment_summary FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS user_enrichment_summary_updated_at ON user_enrichment_summary;
CREATE TRIGGER user_enrichment_summary_updated_at
  BEFORE UPDATE ON user_enrichment_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5c. user_enrichment_attributes
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_enrichment_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  category text NOT NULL,
  category_name text NOT NULL,
  attribute_key text NOT NULL,
  attribute_name text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id, category, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_user_enrichment_attributes_user_id ON user_enrichment_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrichment_attributes_connection_id ON user_enrichment_attributes(connection_id);
CREATE INDEX IF NOT EXISTS idx_user_enrichment_attributes_category ON user_enrichment_attributes(category);

ALTER TABLE user_enrichment_attributes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own enrichment_attributes"
    ON user_enrichment_attributes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own enrichment_attributes"
    ON user_enrichment_attributes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own enrichment_attributes"
    ON user_enrichment_attributes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own enrichment_attributes"
    ON user_enrichment_attributes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS user_enrichment_attributes_updated_at ON user_enrichment_attributes;
CREATE TRIGGER user_enrichment_attributes_updated_at
  BEFORE UPDATE ON user_enrichment_attributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5d. outra_audience_catalog (shared/global data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS outra_audience_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  total_count integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outra_audience_catalog_segment ON outra_audience_catalog(segment);
CREATE INDEX IF NOT EXISTS idx_outra_audience_catalog_tags ON outra_audience_catalog USING GIN(tags);

ALTER TABLE outra_audience_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view audience catalog"
    ON outra_audience_catalog FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS outra_audience_catalog_updated_at ON outra_audience_catalog;
CREATE TRIGGER outra_audience_catalog_updated_at
  BEFORE UPDATE ON outra_audience_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5e. user_audience_summary
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_audience_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL REFERENCES fivetran_connectors(fivetran_connector_id) ON DELETE CASCADE,
  segment text NOT NULL REFERENCES outra_audience_catalog(segment) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  match_score numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id, segment)
);

CREATE INDEX IF NOT EXISTS idx_user_audience_summary_user_id ON user_audience_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audience_summary_connection_id ON user_audience_summary(connection_id);
CREATE INDEX IF NOT EXISTS idx_user_audience_summary_segment ON user_audience_summary(segment);

ALTER TABLE user_audience_summary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own audience_summary"
    ON user_audience_summary FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own audience_summary"
    ON user_audience_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own audience_summary"
    ON user_audience_summary FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own audience_summary"
    ON user_audience_summary FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS user_audience_summary_updated_at ON user_audience_summary;
CREATE TRIGGER user_audience_summary_updated_at
  BEFORE UPDATE ON user_audience_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- SECTION 6: VAULT API KEY STORAGE
-- ############################################################################

-- Add vault_secret_id column to census_destinations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'census_destinations' AND column_name = 'vault_secret_id'
  ) THEN
    ALTER TABLE census_destinations ADD COLUMN vault_secret_id uuid;
  END IF;
END $$;

-- Vault functions (require Supabase Vault extension to be enabled)
CREATE OR REPLACE FUNCTION store_api_key_secret(
  p_secret text,
  p_name text,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT vault.create_secret(p_secret, p_name, p_description) INTO v_secret_id;
  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_api_key_secret(p_secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decrypted text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM census_destinations
    WHERE vault_secret_id = p_secret_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Secret not found or not owned by user';
  END IF;
  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets WHERE id = p_secret_id;
  RETURN v_decrypted;
END;
$$;

CREATE OR REPLACE FUNCTION update_api_key_secret(
  p_secret_id uuid,
  p_new_secret text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM census_destinations
    WHERE vault_secret_id = p_secret_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Secret not found or not owned by user';
  END IF;
  PERFORM vault.update_secret(p_secret_id, p_new_secret);
END;
$$;

CREATE OR REPLACE FUNCTION delete_api_key_secret(p_secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM census_destinations
    WHERE vault_secret_id = p_secret_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Secret not found or not owned by user';
  END IF;
  DELETE FROM vault.secrets WHERE id = p_secret_id;
END;
$$;


-- ############################################################################
-- SECTION 7: ADMIN CONSOLE FOUNDATION
-- ############################################################################

-- ============================================================================
-- 7a. organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  billing_id text,
  plan text NOT NULL DEFAULT 'free',
  plan_status text NOT NULL DEFAULT 'active'
    CHECK (plan_status IN ('active', 'paused', 'cancelled', 'trialing')),
  plan_started_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7b. organization_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "members_read_own" ON organization_members
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "org_members_read" ON organizations
    FOR SELECT USING (
      id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7c. admin_roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('read_only', 'support', 'billing', 'platform_admin')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, role)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7d. admin_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7e. admin_audit_log (immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  org_id uuid REFERENCES organizations(id),
  target_user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  action_category text NOT NULL
    CHECK (action_category IN ('entitlement', 'billing', 'account', 'auth', 'data')),
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Immutability trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable ON admin_audit_log;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON admin_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

-- ============================================================================
-- 7f. Backfill: auto-create organizations for existing users without one
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
BEGIN
  FOR r IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM organization_members)
  LOOP
    new_org_id := gen_random_uuid();
    INSERT INTO organizations (id, name, plan, plan_status)
    VALUES (new_org_id, COALESCE(r.email, 'Unknown'), 'free', 'active');

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, r.id, 'owner');
  END LOOP;
END $$;


-- ############################################################################
-- SECTION 8: ENTITLEMENTS SYSTEM
-- ############################################################################

-- ============================================================================
-- 8a. entitlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL,
  source text NOT NULL
    CHECK (source IN ('plan', 'contract', 'override')),
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "entitlements_read_own_org" ON entitlements
    FOR SELECT USING (
      org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_entitlements_org ON entitlements(org_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_type ON entitlements(entitlement_type);
CREATE INDEX IF NOT EXISTS idx_entitlements_source ON entitlements(source);

-- ============================================================================
-- 8b. entitlement_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS entitlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id uuid REFERENCES entitlements(id),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('GRANTED', 'REVOKED', 'OVERRIDE_CREATED', 'OVERRIDE_EXPIRED', 'PURGE_INITIATED', 'PLAN_CANCELLED')),
  triggered_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE entitlement_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_entitlement_events_org ON entitlement_events(org_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_events_type ON entitlement_events(event_type);

-- ============================================================================
-- 8c. check_user_entitlement(p_type) — used by customer app to gate features
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_entitlement(p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_has_active boolean := false;
  v_expired_override RECORD;
BEGIN
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Fail-open if user has no org (not yet onboarded)
  IF v_org_id IS NULL THEN
    RETURN true;
  END IF;

  -- Auto-revoke expired overrides
  FOR v_expired_override IN
    SELECT id FROM entitlements
    WHERE org_id = v_org_id
      AND entitlement_type = p_type
      AND source = 'override'
      AND granted = true
      AND expires_at IS NOT NULL
      AND expires_at < now()
  LOOP
    UPDATE entitlements SET granted = false, updated_at = now()
    WHERE id = v_expired_override.id;

    INSERT INTO entitlement_events (entitlement_id, org_id, event_type, metadata)
    VALUES (v_expired_override.id, v_org_id, 'OVERRIDE_EXPIRED', jsonb_build_object('expired_at', now()));
  END LOOP;

  -- Fail-open if no entitlement records exist for this type
  IF NOT EXISTS (
    SELECT 1 FROM entitlements
    WHERE org_id = v_org_id AND entitlement_type = p_type
  ) THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM entitlements
    WHERE org_id = v_org_id
      AND entitlement_type = p_type
      AND granted = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_active;

  RETURN v_has_active;
END;
$$;

-- ============================================================================
-- 8d. get_user_entitlement_details(p_type) — returns override banner details
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_entitlement_details(p_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_result jsonb;
BEGIN
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'source', null, 'expires_at', null);
  END IF;

  SELECT jsonb_build_object(
    'granted', true,
    'source', source,
    'expires_at', expires_at
  ) INTO v_result
  FROM entitlements
  WHERE org_id = v_org_id
    AND entitlement_type = p_type
    AND granted = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY
    CASE source
      WHEN 'override' THEN 1
      WHEN 'contract' THEN 2
      WHEN 'plan' THEN 3
    END
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'source', null, 'expires_at', null);
  END IF;

  RETURN v_result;
END;
$$;


-- ############################################################################
-- SECTION 9: BILLING TABLES
-- ############################################################################

-- ============================================================================
-- 9a. billing_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('plan_change', 'subscription_cancel', 'pause', 'resume', 'credit', 'payment')),
  from_plan text,
  to_plan text,
  amount_cents integer,
  currency text DEFAULT 'gbp',
  performed_by uuid REFERENCES auth.users(id),
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_billing_history_org ON billing_history(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at DESC);

-- ============================================================================
-- 9b. usage_metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, metric_type, period_start)
);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_usage_metrics_org ON usage_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);


-- ############################################################################
-- SECTION 10: STRIPE SUBSCRIPTIONS
-- ############################################################################

-- ============================================================================
-- 10a. subscriptions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_read_own" ON subscriptions
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10b. check_active_subscription() — used by customer app
-- ============================================================================
CREATE OR REPLACE FUNCTION check_active_subscription()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'plan_name', plan_name,
    'status', status,
    'stripe_subscription_id', stripe_subscription_id,
    'current_period_start', current_period_start,
    'current_period_end', current_period_end,
    'canceled_at', canceled_at
  ) INTO v_result
  FROM subscriptions
  WHERE user_id = auth.uid()
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 10c. grant_subscription_entitlement() — called by Stripe webhook
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_subscription_entitlement(
  p_user_id uuid,
  p_plan_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Update org plan
  UPDATE organizations
  SET plan = p_plan_name,
      plan_status = 'active',
      plan_started_at = now(),
      updated_at = now()
  WHERE id = v_org_id;

  -- Upsert entitlement
  INSERT INTO entitlements (org_id, entitlement_type, source, granted, reason)
  VALUES (v_org_id, 'activation', 'plan', true, 'Stripe subscription: ' || p_plan_name)
  ON CONFLICT (id) DO NOTHING;

  -- Re-grant if previously revoked
  UPDATE entitlements
  SET granted = true,
      reason = 'Stripe subscription: ' || p_plan_name,
      updated_at = now()
  WHERE org_id = v_org_id
    AND entitlement_type = 'activation'
    AND source = 'plan'
    AND granted = false;

  -- Log event
  INSERT INTO entitlement_events (org_id, event_type, triggered_by, metadata)
  VALUES (v_org_id, 'GRANTED', p_user_id, jsonb_build_object('source', 'stripe', 'plan', p_plan_name));

  -- Log billing history
  INSERT INTO billing_history (org_id, action, to_plan, performed_by, reason)
  VALUES (v_org_id, 'plan_change', p_plan_name, p_user_id, 'Stripe checkout completed');
END;
$$;

-- ============================================================================
-- 10d. revoke_subscription_entitlement() — called by Stripe webhook
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_subscription_entitlement(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Update org plan status
  UPDATE organizations
  SET plan_status = 'cancelled', updated_at = now()
  WHERE id = v_org_id;

  -- Revoke plan-based entitlement (leave override/contract intact)
  UPDATE entitlements
  SET granted = false, updated_at = now()
  WHERE org_id = v_org_id
    AND entitlement_type = 'activation'
    AND source = 'plan';

  -- Log event
  INSERT INTO entitlement_events (org_id, event_type, triggered_by, metadata)
  VALUES (v_org_id, 'PLAN_CANCELLED', p_user_id, jsonb_build_object('source', 'stripe'));

  -- Log billing history
  INSERT INTO billing_history (org_id, action, performed_by, reason)
  VALUES (v_org_id, 'subscription_cancel', p_user_id, 'Stripe subscription cancelled');
END;
$$;


-- ############################################################################
-- SECTION 11: PLAN PRICING TABLE (for admin + Stripe checkout)
-- ############################################################################

CREATE TABLE IF NOT EXISTS plan_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  monthly_price_pence integer NOT NULL DEFAULT 0,
  annual_price_pence integer NOT NULL DEFAULT 0,
  original_price_pence integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pricing (needed for checkout page)
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view plan_pricing"
    ON plan_pricing FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS plan_pricing_updated_at ON plan_pricing;
CREATE TRIGGER plan_pricing_updated_at
  BEFORE UPDATE ON plan_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- SECTION 12: PROFILES — ADD BUSINESS ADDRESS FIELDS
-- ############################################################################

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_postcode text,
  ADD COLUMN IF NOT EXISTS address_country text NOT NULL DEFAULT 'GB';


-- ############################################################################
-- DONE
-- ############################################################################

COMMIT;
