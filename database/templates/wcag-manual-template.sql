-- MANUAL Testing Template
-- Generated: 2025-07-14T14:17:05.306Z

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Content analysis and alternative evaluation. Requires human assessment of media content and alternatives'
WHERE criterion_number = '1.2.1';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Caption accuracy and synchronization assessment. Caption presence can be detected, quality requires human review'
WHERE criterion_number = '1.2.2';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Sequence meaningfulness verification. Reading order can be determined programmatically'
WHERE criterion_number = '1.3.2';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Instruction clarity and alternative cues. Requires human interpretation of instructions and references'
WHERE criterion_number = '1.3.3';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Alternative indicators for color-conveyed information. Color usage patterns can be detected, meaning requires review'
WHERE criterion_number = '1.4.1';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Component identification and context assessment. UI component contrast can be calculated'
WHERE criterion_number = '1.4.11';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Shortcut discovery and conflict assessment. Requires testing of actual key combinations and conflicts'
WHERE criterion_number = '2.1.4';

UPDATE test_requirements SET 
    test_method = 'manual',
    testing_instructions = 'MANUAL: Heading and label clarity and descriptiveness. Heading structure can be detected, descriptiveness needs review'
WHERE criterion_number = '2.4.6';

