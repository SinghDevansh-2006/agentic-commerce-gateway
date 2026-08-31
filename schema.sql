-- ============================================================================
-- Agentic Commerce Gateway (ACG) Database Schema
-- Third Normal Form (3NF) Relational Design for Agent Financial Transactions
-- ============================================================================

-- 1. Authorized_Agents Table
-- Represents autonomous software agents authorized to execute transactions within ACG.
CREATE TABLE IF NOT EXISTS Authorized_Agents (
    agent_id VARCHAR(64) PRIMARY KEY,
    agent_name VARCHAR(128) NOT NULL,
    public_key TEXT NOT NULL,
    max_spending_limit DECIMAL(18, 4) NOT NULL CHECK (max_spending_limit >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Table
-- Represents distinct catalog items available for agent-to-agent commerce.
CREATE TABLE IF NOT EXISTS Inventory (
    item_id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(18, 4) NOT NULL CHECK (unit_price >= 0),
    stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transaction_Logs Table
-- Immutable audit log recording transaction lifecycle, evaluation decisions, and settlement.
CREATE TABLE IF NOT EXISTS Transaction_Logs (
    transaction_id VARCHAR(64) PRIMARY KEY,
    buyer_agent_id VARCHAR(64) NOT NULL,
    seller_agent_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(18, 4) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(18, 4) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(32) NOT NULL, -- e.g. 'APPROVED', 'REJECTED_LIMIT', 'REJECTED_INACTIVE', 'SETTLED'
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_agent_id) REFERENCES Authorized_Agents(agent_id) ON DELETE RESTRICT,
    FOREIGN KEY (seller_agent_id) REFERENCES Authorized_Agents(agent_id) ON DELETE RESTRICT,
    FOREIGN KEY (item_id) REFERENCES Inventory(item_id) ON DELETE RESTRICT
);

-- Optimized indices for fast query lookups and audit trails
CREATE INDEX IF NOT EXISTS idx_txn_buyer ON Transaction_Logs(buyer_agent_id);
CREATE INDEX IF NOT EXISTS idx_txn_seller ON Transaction_Logs(seller_agent_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON Transaction_Logs(status);
CREATE INDEX IF NOT EXISTS idx_txn_created_at ON Transaction_Logs(created_at);
