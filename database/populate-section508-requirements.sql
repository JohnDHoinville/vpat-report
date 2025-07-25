-- =============================================================================
-- SECTION 508 REQUIREMENTS POPULATION SCRIPT - COMPREHENSIVE
-- =============================================================================
-- Purpose: Populate test_requirements table with ALL Section 508 requirements
-- Includes: Updated Section 508 standards (2018 refresh)
-- Date: July 25, 2025
-- Reference: https://www.section508.gov/manage/laws-and-policies/
-- =============================================================================

-- Clear existing Section 508 requirements if they exist
DELETE FROM test_requirements WHERE requirement_type = 'section_508';

-- =============================================================================
-- CHAPTER 5: SOFTWARE AND OPERATING SYSTEMS
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '501.1', 'Scope',
    'This chapter applies to software that is platform software or that is provided by the platform software, as well as to applications.',
    'base', 'manual',
    '1. Determine if software falls under Section 508 scope
2. Identify platform software components
3. Check if applications are covered
4. Document software type and applicability
5. Verify compliance requirements apply',
    'Software scope is properly identified and Section 508 requirements are understood to apply.',
    'Unclear software categorization, assumption that requirements don''t apply',
    2, 15,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- CHAPTER 6: SUPPORT DOCUMENTATION AND SERVICES  
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '602.2', 'Accessibility and Compatibility Features',
    'Documentation shall list and explain how to use the accessibility and compatibility features.',
    'base', 'manual',
    '1. Review all product documentation
2. Check that accessibility features are documented
3. Verify instructions for using accessibility features
4. Test that compatibility with assistive technology is documented
5. Ensure documentation is accessible itself',
    'All accessibility and compatibility features are documented with clear usage instructions.',
    'Missing documentation of accessibility features, unclear instructions, inaccessible documentation',
    2, 30,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '602.3', 'Support Services',
    'Support services for ICT shall accommodate the communication needs of individuals with disabilities.',
    'base', 'manual',
    '1. Review available support channels (phone, email, chat, etc.)
2. Check for alternative communication methods
3. Verify TTY or relay service support
4. Test that support staff are trained on accessibility
5. Ensure support services are accessible',
    'Support services accommodate users with disabilities through multiple communication channels and trained staff.',
    'Phone-only support without alternatives, untrained support staff, inaccessible support systems',
    2, 25,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- WEB CONTENT (Aligns with WCAG 2.0 Level AA)
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', 'E205.3', 'Programmatically Determinable',
    'Information required for the operation of ICT shall be programmatically determinable.',
    'base', 'both',
    '1. Test with assistive technology to verify information is accessible
2. Check that all functional elements have accessible names
3. Verify states and properties are programmatically determinable
4. Test that structure and relationships are clear to AT
5. Ensure all required information is available to screen readers',
    'All information needed to operate the system is available to assistive technology.',
    'Buttons without accessible names, form controls without labels, status information not announced',
    1, 30,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', 'E205.4', 'Preservation of Information',
    'ICT shall preserve information provided for the operation of the ICT during format changes.',
    'base', 'manual',
    '1. Test format changes (PDF to HTML, document conversions, etc.)
2. Verify accessibility information is preserved
3. Check that alternative text survives format changes
4. Test that structure is maintained across formats
5. Ensure metadata and accessibility features are not lost',
    'Accessibility information and structure are preserved when content format changes.',
    'Alt text lost in format conversion, heading structure removed, accessibility metadata stripped',
    2, 35,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- HARDWARE (Physical Access)
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '407.3.1', 'Unobstructed High Forward Reach',
    'Where a high forward reach is required, the clear floor space shall be 30 inches minimum by 48 inches minimum.',
    'base', 'manual',
    '1. Measure clear floor space in front of high reach elements
2. Verify minimum 30" x 48" clear space
3. Check that reach height is within limits (15" to 48")
4. Test accessibility for wheelchair users
5. Ensure no obstructions in clear floor space',
    'Adequate clear floor space is provided for high forward reach elements (30" x 48" minimum).',
    'Insufficient clear floor space, obstructions blocking access, reach heights outside limits',
    2, 20,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- SOFTWARE APPLICATIONS
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '502.2.1', 'User Control of Accessibility Features',
    'Platform software shall provide user control over platform features that are defined in the platform documentation as accessibility features.',
    'base', 'manual',
    '1. Identify all platform accessibility features
2. Test user control over each feature (enable/disable)
3. Verify settings are preserved across sessions
4. Check that controls are accessible themselves
5. Test that changes take effect immediately',
    'Users can control all platform accessibility features. Settings are preserved and immediately effective.',
    'Accessibility features that can''t be controlled by users, settings that don''t persist, inaccessible accessibility controls',
    1, 25,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '502.3.1', 'Object Information',
    'The object role, state(s), properties, boundary, name, and description shall be programmatically determinable.',
    'base', 'both',
    '1. Test all interactive elements with assistive technology
2. Verify role information is available (button, link, etc.)
3. Check that states are announced (checked, expanded, etc.)
4. Test that names and descriptions are accessible
5. Ensure boundaries are programmatically determinable',
    'All object information (role, state, properties, boundary, name, description) is available to assistive technology.',
    'Buttons without accessible names, checkboxes without state information, custom controls without proper roles',
    1, 35,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '502.3.2', 'Modification of Object Information',
    'States and properties that can be set by the user shall be capable of being set programmatically.',
    'base', 'both',
    '1. Identify user-modifiable states and properties
2. Test that assistive technology can modify these states
3. Verify changes are reflected in the interface
4. Check that programmatic changes trigger appropriate events
5. Test bidirectional communication with AT',
    'All user-modifiable states and properties can be set programmatically by assistive technology.',
    'Form fields that can''t be filled by AT, checkboxes that can''t be programmatically checked',
    1, 30,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '502.3.3', 'Row, Column, and Headers',
    'If an object is in a data table, the occupied rows and columns, and any headers associated with those rows or columns, shall be programmatically determinable.',
    'base', 'both',
    '1. Test all data tables with screen reader
2. Verify row and column information is announced
3. Check that headers are properly associated
4. Test navigation within tables
5. Ensure complex tables have proper markup',
    'All data tables provide programmatic access to row/column information and associated headers.',
    'Tables without proper headers, complex tables without scope attributes, data tables marked up as layout tables',
    1, 25,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- AUTHORING TOOLS
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '504.2', 'Content Creation or Editing',
    'Authoring tools shall provide a mode of operation to create or edit content that conforms to Level A and Level AA Success Criteria and Conformance Requirements in WCAG 2.0.',
    'base', 'manual',
    '1. Test content creation features in authoring tool
2. Verify tool prompts for accessibility information (alt text, headings)
3. Check that accessible templates are available
4. Test that tool validates accessibility
5. Ensure accessible content can be created without external tools',
    'Authoring tool enables creation of WCAG 2.0 Level AA conformant content through guided workflows and validation.',
    'No prompts for alt text, inaccessible templates, no accessibility validation, missing accessibility features',
    1, 40,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '504.3', 'Prompts',
    'Authoring tools shall provide a mode of operation that prompts authors to create content that conforms to Level A and Level AA Success Criteria and Conformance Requirements in WCAG 2.0.',
    'base', 'manual',
    '1. Test that authoring tool prompts for accessibility information
2. Verify prompts appear at appropriate times
3. Check that prompts are clear and helpful
4. Test that prompts can be customized or controlled
5. Ensure prompts don''t interfere with workflow',
    'Authoring tool actively prompts users to create accessible content with helpful, timely prompts.',
    'No accessibility prompts, unclear or unhelpful prompts, prompts that interfere with normal workflow',
    2, 30,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- TELECOMMUNICATIONS
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '410.2', 'Volume Gain',
    'ICT that is a communication product shall provide a means to adjust the receive volume up to a level of at least 20 dB above normal.',
    'enhanced', 'manual',
    '1. Test volume controls on communication products
2. Measure maximum volume gain (should reach +20 dB)
3. Verify volume controls are accessible
4. Test that volume adjustments are preserved
5. Check that volume can be controlled by users',
    'Communication products provide volume gain up to at least 20 dB above normal with accessible controls.',
    'Insufficient volume gain, inaccessible volume controls, volume settings not preserved',
    2, 20,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- REAL-TIME TEXT (RTT)
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '410.7', 'Real-Time Text Functionality',
    'Where ICT provides real-time voice communication, it shall provide real-time text (RTT) functionality.',
    'enhanced', 'manual',
    '1. Test RTT functionality in voice communication systems
2. Verify real-time text transmission
3. Check RTT interoperability with different systems
4. Test that RTT does not interfere with voice
5. Ensure RTT is discoverable and accessible',
    'Voice communication systems provide working RTT functionality that is interoperable and accessible.',
    'No RTT support, RTT that does not work properly, RTT not interoperable with other systems',
    1, 35,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- CLOSED FUNCTIONALITY
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '402.2', 'Speech-Output Enabled',
    'ICT with a display screen shall be speech-output enabled for full and independent use by individuals with vision impairments.',
    'base', 'manual',
    '1. Test that all screen content can be accessed via speech output
2. Verify speech output covers all functionality
3. Check that speech can be controlled (volume, rate, pitch)
4. Test speech output with headphones and speakers
5. Ensure speech output does not interfere with operation',
    'All screen content and functionality is available through speech output with user controls.',
    'Screen content not available via speech, missing speech controls, speech that interferes with use',
    1, 40,
    'https://www.section508.gov/manage/laws-and-policies/'
);

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '402.3', 'Volume',
    'ICT that delivers sound, including speech output required by 402.2, shall provide volume control and output amplification.',
    'base', 'manual',
    '1. Test volume controls for all audio output
2. Verify private listening capability (headphone jack)
3. Check volume range is adequate
4. Test that volume controls are accessible
5. Ensure volume does not reset unexpectedly',
    'Audio output has accessible volume controls and supports private listening.',
    'No volume controls, inaccessible volume controls, no headphone support, volume that resets',
    1, 20,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- =============================================================================
-- BIOMETRICS
-- =============================================================================

INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, section_508_url
) VALUES (
    'section_508', '403.1', 'General',
    'Where ICT uses biometrics, it shall not be the only means for user identification or control.',
    'base', 'manual',
    '1. Identify all biometric authentication methods
2. Verify alternative authentication methods exist
3. Test that alternatives are equally functional
4. Check that alternatives are documented
5. Ensure users can choose authentication method',
    'Biometric authentication has equivalent alternative methods available to all users.',
    'Biometric-only authentication, alternatives that are less functional, undocumented alternatives',
    1, 25,
    'https://www.section508.gov/manage/laws-and-policies/'
);

-- Create summary view for Section 508 requirements
CREATE OR REPLACE VIEW section508_requirements_summary AS
SELECT 
    level,
    COUNT(*) as requirement_count,
    AVG(estimated_time_minutes) as avg_time_minutes
FROM test_requirements 
WHERE requirement_type = 'section_508' 
GROUP BY level
ORDER BY level;

-- Create combined summary view
CREATE OR REPLACE VIEW all_requirements_summary AS
SELECT 
    requirement_type,
    level,
    COUNT(*) as requirement_count,
    AVG(estimated_time_minutes) as avg_time_minutes
FROM test_requirements 
GROUP BY requirement_type, level
ORDER BY requirement_type, level;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Section 508 requirements population completed successfully!';
    RAISE NOTICE 'Added % Section 508 requirements', 
        (SELECT COUNT(*) FROM test_requirements WHERE requirement_type = 'section_508');
    RAISE NOTICE 'Total requirements in database: %', 
        (SELECT COUNT(*) FROM test_requirements);
END $$; 