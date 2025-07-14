-- WCAG Criteria Test Method Alignment
-- Generated: 2025-07-14T14:17:05.311Z

-- 1.3.2: automated → manual
UPDATE test_requirements SET test_method = 'manual' WHERE criterion_number = '1.3.2';

-- 1.4.1: both → manual
UPDATE test_requirements SET test_method = 'manual' WHERE criterion_number = '1.4.1';

-- 1.4.10: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '1.4.10';

-- 1.4.11: automated → manual
UPDATE test_requirements SET test_method = 'manual' WHERE criterion_number = '1.4.11';

-- 1.4.12: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '1.4.12';

-- 2.1.1: manual → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '2.1.1';

-- 2.1.2: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '2.1.2';

-- 2.4.2: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '2.4.2';

-- 2.4.3: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '2.4.3';

-- 2.4.6: both → manual
UPDATE test_requirements SET test_method = 'manual' WHERE criterion_number = '2.4.6';

-- 2.4.7: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '2.4.7';

-- 3.1.1: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '3.1.1';

-- 3.1.2: manual → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '3.1.2';

-- 3.2.1: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '3.2.1';

-- 3.2.2: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '3.2.2';

-- 4.1.1: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '4.1.1';

-- 4.1.2:  Role → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '4.1.2';

-- 4.1.3: automated → both
UPDATE test_requirements SET test_method = 'both' WHERE criterion_number = '4.1.3';

-- Verification query
SELECT criterion_number, title, test_method FROM test_requirements WHERE requirement_type = 'wcag' ORDER BY criterion_number;
