-- =====================================================
-- SCRIPT 2/5: CRÉATION DES TABLES UNIQUEMENT
-- Crée les 11 tables sans triggers, sans RLS, sans données
-- =====================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE 1: investors
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  username TEXT UNIQUE NOT NULL,
  action_class TEXT NOT NULL CHECK (action_class IN ('A', 'B')),
  total_shares DECIMAL(15, 2) DEFAULT 0,
  share_value DECIMAL(15, 2) DEFAULT 1.00,
  total_invested DECIMAL(15, 2) DEFAULT 0,
  current_value DECIMAL(15, 2) DEFAULT 0,
  percentage_ownership DECIMAL(5, 2) DEFAULT 0,
  investment_type TEXT CHECK (investment_type IN ('immobilier', 'actions', 'mixte')),
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'inactif')),
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_level TEXT DEFAULT 'investisseur' CHECK (access_level IN ('admin', 'investisseur')),
  permissions JSONB DEFAULT '{"dashboard": true, "projet": false, "administration": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 2: properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reservation', 'en_construction', 'complete', 'en_location')),
  total_cost DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (total_cost - paid_amount) STORED,
  reservation_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  expected_roi DECIMAL(5, 2),
  description TEXT,
  address TEXT,
  units INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 3: transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  tps DECIMAL(15, 2) DEFAULT 0,
  tvq DECIMAL(15, 2) DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('investissement', 'depense', 'dividende', 'capex', 'courant', 'rnd')),
  description TEXT NOT NULL,
  transaction_number TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  verified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 4: documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('facture', 'recu', 'contrat', 'rapport', 'autre')),
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID,
  description TEXT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 5: dividends
CREATE TABLE dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  total_amount DECIMAL(15, 2) NOT NULL,
  amount_per_share DECIMAL(15, 2) NOT NULL,
  distribution_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 6: dividend_allocations
CREATE TABLE dividend_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dividend_id UUID REFERENCES dividends(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  investor_name TEXT NOT NULL,
  shares DECIMAL(15, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 7: capex_accounts
CREATE TABLE capex_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  investment_capex DECIMAL(15, 2) DEFAULT 0,
  operation_capex DECIMAL(15, 2) DEFAULT 0,
  total_reserve DECIMAL(15, 2) GENERATED ALWAYS AS (investment_capex + operation_capex) STORED,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 8: current_accounts
CREATE TABLE current_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  balance DECIMAL(15, 2) DEFAULT 0,
  total_deposits DECIMAL(15, 2) DEFAULT 0,
  total_withdrawals DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 9: rnd_accounts
CREATE TABLE rnd_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  investment_capex DECIMAL(15, 2) DEFAULT 0,
  operation_capex DECIMAL(15, 2) DEFAULT 0,
  dividend_total DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 10: operational_expenses
CREATE TABLE operational_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal', 'fiscal', 'admin', 'autre')),
  description TEXT NOT NULL,
  tps DECIMAL(15, 2) DEFAULT 0,
  tvq DECIMAL(15, 2) DEFAULT 0,
  transaction_number TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 11: reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('trimestriel', 'annuel', 'mensuel')),
  period TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  generated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message de confirmation
SELECT '✅ 11 TABLES CRÉÉES - Exécute maintenant 3-create-indexes.sql' AS message;
