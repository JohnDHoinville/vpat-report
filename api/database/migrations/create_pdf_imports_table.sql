-- PDF Imports Table for Direct Database Storage Approach
-- This table stores parsed PDF data immediately upon upload for review and approval

CREATE TABLE IF NOT EXISTS pdf_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    requirement_id UUID NOT NULL REFERENCES wcag_requirements(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'applied')),
    
    -- Parsed PDF data stored as JSONB for flexibility
    parsed_data JSONB NOT NULL,
    
    -- Review and approval tracking
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Application tracking (when data is actually applied to test_instances)
    applied_by UUID REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_imports_requirement_id ON pdf_imports(requirement_id);
CREATE INDEX IF NOT EXISTS idx_pdf_imports_uploaded_by ON pdf_imports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pdf_imports_status ON pdf_imports(status);
CREATE INDEX IF NOT EXISTS idx_pdf_imports_uploaded_at ON pdf_imports(uploaded_at);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_pdf_imports_parsed_data ON pdf_imports USING GIN(parsed_data);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_pdf_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pdf_imports_updated_at
    BEFORE UPDATE ON pdf_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_imports_updated_at();

-- Comments for documentation
COMMENT ON TABLE pdf_imports IS 'Stores parsed PDF test report data for review and approval before applying to test instances';
COMMENT ON COLUMN pdf_imports.parsed_data IS 'JSONB containing: requirementNumber, overallStatus, testInstances[], urls[], etc.';
COMMENT ON COLUMN pdf_imports.status IS 'Workflow status: pending -> reviewing -> approved/rejected -> applied';
