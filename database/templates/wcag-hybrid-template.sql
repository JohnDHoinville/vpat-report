-- BOTH Testing Template
-- Generated: 2025-07-14T14:17:05.306Z

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Quality assessment of alt text relevance. Alt text presence and quality can be detected programmatically Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '1.1.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Relationship accuracy and completeness. Semantic markup can be detected, relationships need verification Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '1.3.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Content loss and horizontal scrolling edge cases. Responsive behavior can be tested across viewports Tools available: playwright.'
WHERE criterion_number = '1.4.10';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Content overlap and readability verification. CSS override effects can be tested programmatically Tools available: playwright.'
WHERE criterion_number = '1.4.12';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Dismissibility, persistence, and hover behavior. Hover/focus triggers can be detected, behavior needs verification Tools available: playwright.'
WHERE criterion_number = '1.4.13';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Edge cases and complex backgrounds. Contrast ratios can be calculated programmatically Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '1.4.3';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Complex interactions and workflow completion. Basic keyboard navigation can be tested programmatically Tools available: axe-core, playwright.'
WHERE criterion_number = '2.1.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Complex modal and widget behaviors. Focus traps can be detected through navigation testing Tools available: axe-core, playwright.'
WHERE criterion_number = '2.1.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Functionality and target verification. Skip links and landmarks can be detected Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '2.4.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Title descriptiveness and accuracy. Page title presence and structure can be verified Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '2.4.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Logical order and visual flow verification. Tab order can be programmatically determined Tools available: axe-core, playwright.'
WHERE criterion_number = '2.4.3';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Purpose clarity and context sufficiency. Link text can be analyzed, context requires interpretation Tools available: axe-core.'
WHERE criterion_number = '2.4.4';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Visibility in various contexts and backgrounds. Focus indicators can be detected and measured Tools available: axe-core, playwright.'
WHERE criterion_number = '2.4.7';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Language accuracy verification. HTML lang attribute can be verified programmatically Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '3.1.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Language change identification and accuracy. Lang attributes can be detected, accuracy needs verification Tools available: axe-core.'
WHERE criterion_number = '3.1.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Unexpected changes and user experience. Focus events and context changes can be monitored Tools available: axe-core.'
WHERE criterion_number = '3.2.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Unexpected changes and user experience. Input events and changes can be monitored Tools available: axe-core.'
WHERE criterion_number = '3.2.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Error clarity and identification completeness. Error markup can be detected, identification needs review Tools available: axe-core.'
WHERE criterion_number = '3.3.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Label clarity and instruction adequacy. Labels can be detected, sufficiency needs assessment Tools available: axe-core.'
WHERE criterion_number = '3.3.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Impact assessment of parsing errors. HTML validation can be performed programmatically Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '4.1.1';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Accuracy and completeness of accessible names. ARIA properties and roles can be verified Tools available: axe-core, pa11y, lighthouse.'
WHERE criterion_number = '4.1.2';

UPDATE test_requirements SET 
    test_method = 'both',
    testing_instructions = 'HYBRID: Start with automated scanning for baseline detection. Manual verification required for Message appropriateness and timing. Live regions can be detected, messaging needs verification Tools available: axe-core.'
WHERE criterion_number = '4.1.3';

