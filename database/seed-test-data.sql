-- Seed Test Data for VPAT System
-- Creates basic data to get the system working

-- Insert basic WCAG test requirements
INSERT INTO test_requirements (
    id, criterion_number, title, description, requirement_type, level, test_method, is_active
) VALUES 
    (gen_random_uuid(), '1.1.1', 'Non-text Content', 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.', 'wcag', 'a', 'manual', true),
    (gen_random_uuid(), '1.3.1', 'Info and Relationships', 'Information, structure, and relationships conveyed through presentation can be programmatically determined.', 'wcag', 'a', 'manual', true),
    (gen_random_uuid(), '1.4.3', 'Contrast (Minimum)', 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1.', 'wcag', 'aa', 'both', true),
    (gen_random_uuid(), '2.1.1', 'Keyboard', 'All functionality of the content is operable through a keyboard interface.', 'wcag', 'a', 'manual', true),
    (gen_random_uuid(), '2.4.1', 'Bypass Blocks', 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.', 'wcag', 'a', 'manual', true),
    (gen_random_uuid(), '3.1.1', 'Language of Page', 'The default human language of each Web page can be programmatically determined.', 'wcag', 'a', 'automated', true),
    (gen_random_uuid(), '4.1.1', 'Parsing', 'In content implemented using markup languages, elements have complete start and end tags.', 'wcag', 'a', 'automated', true),
    (gen_random_uuid(), '4.1.2', 'Name, Role, Value', 'For all user interface components, the name and role can be programmatically determined.', 'wcag', 'a', 'both', true)
ON CONFLICT (requirement_type, criterion_number) DO NOTHING;

-- Insert a sample project
INSERT INTO projects (
    id, name, client_name, primary_url, description, status, created_by
) VALUES (
    '82ca3e78-808a-4963-8cc3-64e925c94699'::uuid,
    'Sample Website Accessibility Audit',
    'Sample Client',
    'https://example.com',
    'Sample accessibility testing project for demonstration',
    'active',
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- Insert a sample site discovery
INSERT INTO site_discovery (
    id, project_id, primary_url, domain, status, total_pages_found
) VALUES (
    gen_random_uuid(),
    '82ca3e78-808a-4963-8cc3-64e925c94699'::uuid,
    'https://example.com',
    'example.com',
    'completed',
    5
);

-- Insert sample discovered pages
INSERT INTO discovered_pages (
    id, discovery_id, url, title, page_type
) VALUES 
    (gen_random_uuid(), (SELECT id FROM site_discovery LIMIT 1), 'https://example.com/', 'Homepage', 'homepage'),
    (gen_random_uuid(), (SELECT id FROM site_discovery LIMIT 1), 'https://example.com/about', 'About Us', 'content'),
    (gen_random_uuid(), (SELECT id FROM site_discovery LIMIT 1), 'https://example.com/contact', 'Contact Form', 'form'),
    (gen_random_uuid(), (SELECT id FROM site_discovery LIMIT 1), 'https://example.com/products', 'Products', 'content'),
    (gen_random_uuid(), (SELECT id FROM site_discovery LIMIT 1), 'https://example.com/blog', 'Blog', 'content');

-- Insert a sample test session
INSERT INTO test_sessions (
    id, project_id, name, description, conformance_level, status, created_by
) VALUES (
    '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid,
    '82ca3e78-808a-4963-8cc3-64e925c94699'::uuid,
    'WCAG AA Compliance Review',
    'Comprehensive accessibility review targeting WCAG 2.1 AA compliance',
    'AA',
    'planning',
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- Generate test instances for the sample session
INSERT INTO test_instances (
    id, session_id, requirement_id, page_id, status, test_method_used
)
SELECT 
    gen_random_uuid(),
    '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid,
    tr.id,
    dp.id,
    'pending',
    'manual'
FROM test_requirements tr
CROSS JOIN discovered_pages dp
WHERE tr.is_active = true
  AND tr.level IN ('a', 'aa')
ON CONFLICT DO NOTHING;

-- Update test session statistics
UPDATE test_sessions 
SET 
    total_tests_count = (SELECT COUNT(*) FROM test_instances WHERE session_id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid),
    completed_tests_count = (SELECT COUNT(*) FROM test_instances WHERE session_id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid AND status != 'pending'),
    passed_tests_count = (SELECT COUNT(*) FROM test_instances WHERE session_id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid AND status = 'passed'),
    failed_tests_count = (SELECT COUNT(*) FROM test_instances WHERE session_id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid AND status = 'failed')
WHERE id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid;

-- Update completion percentage
UPDATE test_sessions 
SET completion_percentage = CASE 
    WHEN total_tests_count > 0 THEN 
        ROUND((completed_tests_count * 100.0 / total_tests_count), 2)
    ELSE 0 
END
WHERE id = '682604e7-51b6-4175-81a3-b2dfd17f8e26'::uuid; 