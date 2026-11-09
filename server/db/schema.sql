-- ========================================================
-- FlowPilot PostgreSQL Schema (Supabase)
-- Module 1: Dispute Management Core Tables
-- ========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Dispute Status
DO $$ BEGIN
    CREATE TYPE dispute_status_type AS ENUM (
        'OPEN',
        'WAITING_FOR_SELLER_RESPONSE',
        'WAITING_FOR_BUYER_RESPONSE',
        'UNDER_REVIEW',
        'RESOLVED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for Dispute Lifecycle Stage
DO $$ BEGIN
    CREATE TYPE dispute_lifecycle_stage AS ENUM (
        'INQUIRY',
        'CHARGEBACK',
        'PRE_ARBITRATION',
        'ARBITRATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(64) PRIMARY KEY,                         -- Internal FlowPilot ID (e.g. disp_001)
    paypal_dispute_id VARCHAR(64) UNIQUE NOT NULL,      -- PayPal Dispute ID (e.g. PP-D-12345)
    transaction_id VARCHAR(64) NOT NULL,                -- PayPal Transaction ID
    reason VARCHAR(100) NOT NULL,                       -- Dispute Reason (e.g. MERCHANDISE_OR_SERVICE_NOT_RECEIVED)
    amount NUMERIC(12, 2) NOT NULL,                     -- Disputed Amount
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',         -- 3-letter ISO Currency
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',         -- Status
    lifecycle_stage VARCHAR(50) DEFAULT 'INQUIRY',      -- Inquiry, Chargeback, Pre-Arbitration
    response_deadline TIMESTAMPTZ,                      -- Merchant action deadline from PayPal
    transaction_date TIMESTAMPTZ,                       -- Original transaction date
    customer_name VARCHAR(255),                         -- Buyer Name
    customer_email VARCHAR(255),                        -- Buyer Email (sanitized)
    dispute_channel VARCHAR(50) DEFAULT 'INTERNAL',     -- INTERNAL or EXTERNAL
    source VARCHAR(20) NOT NULL DEFAULT 'demo',         -- 'demo' or 'paypal_sandbox' or 'paypal_live'
    raw_payload JSONB,                                  -- Complete raw dispute payload from PayPal REST API
    messages JSONB DEFAULT '[]'::jsonb,                 -- Thread of buyer/seller/PayPal communications
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries, search, and filtering
CREATE INDEX IF NOT EXISTS idx_disputes_paypal_id ON disputes(paypal_dispute_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_deadline ON disputes(response_deadline);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_source ON disputes(source);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_disputes_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_disputes_modtime ON disputes;
CREATE TRIGGER trigger_disputes_modtime
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_disputes_modtime();

-- ========================================================
-- Handshake / Integration Interfaces for Modules 2, 3, 4:
-- These tables define the foreign key relationship
-- to be used by other team members when ready.
-- ========================================================

-- Module 2: Evidence Management (Placeholder Foreign Key schema)
-- CREATE TABLE IF NOT EXISTS evidence_documents (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     dispute_id VARCHAR(64) REFERENCES disputes(id) ON DELETE CASCADE,
--     document_type VARCHAR(50) NOT NULL, -- 'PROOF_OF_DELIVERY', 'CUSTOMER_COMMUNICATION', etc.
--     storage_path TEXT NOT NULL,
--     uploaded_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Module 3: AI Evidence Intelligence (Placeholder)
-- CREATE TABLE IF NOT EXISTS ai_evidence_analyses (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     dispute_id VARCHAR(64) REFERENCES disputes(id) ON DELETE CASCADE,
--     win_probability_score INT,
--     recommendations JSONB,
--     analyzed_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Module 4: Dispute Response (Placeholder)
-- CREATE TABLE IF NOT EXISTS dispute_responses (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     dispute_id VARCHAR(64) REFERENCES disputes(id) ON DELETE CASCADE,
--     submission_status VARCHAR(50),
--     response_payload JSONB,
--     submitted_at TIMESTAMPTZ
-- );
