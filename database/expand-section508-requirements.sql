-- Expand Section 508 Requirements Migration
-- Date: January 14, 2025
-- Purpose: Add comprehensive Section 508 requirements to unified structure
-- This ensures both WCAG and Section 508 have complete coverage

-- First, clear existing minimal Section 508 data
DELETE FROM section_508_requirements;

-- Insert comprehensive Section 508 requirements with WCAG mappings and test methods
INSERT INTO section_508_requirements (
    section_number, title, description, manual_test_procedure, tool_mappings, 
    reference_url, applies_to_page_types
) VALUES

-- Section 1194.22(a) - Text Alternatives
('1194.22(a)', 'Text Alternatives', 
'A text equivalent for every non-text element shall be provided (e.g., via "alt", "longdesc", or in element content).',
'{
  "overview": "Verify all images, graphics, charts, and non-text content have appropriate text alternatives that convey the same information or function.",
  "steps": [
    "Inspect all images for appropriate alt attributes",
    "Check decorative images have empty alt=\"\" or role=\"presentation\"",
    "Verify complex images have detailed descriptions via aria-describedby or longdesc",
    "Test with screen reader to ensure alternatives are meaningful",
    "Check form inputs with image buttons have alt text",
    "Verify charts and graphs have text descriptions of data"
  ],
  "tools_needed": ["screen_reader", "browser_dev_tools", "accessibility_inspector"],
  "expected_results": "All non-text content has appropriate text alternatives",
  "common_failures": [
    "Missing alt attributes on informative images",
    "Decorative images with descriptive alt text",
    "Complex charts without detailed descriptions",
    "Image buttons without alt text"
  ]
}',
'{
  "axe": ["image-alt", "input-image-alt", "area-alt"],
  "pa11y": ["Section508.22.A"],
  "lighthouse": ["image-alt"],
  "wave": ["alt_missing", "alt_spacer_missing"]
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(b) - Multimedia Alternatives  
('1194.22(b)', 'Multimedia Alternatives',
'Equivalent alternatives for any multimedia presentation shall be synchronized with the presentation.',
'{
  "overview": "Ensure multimedia content has synchronized captions, audio descriptions, and transcripts as appropriate.",
  "steps": [
    "Check video content has accurate closed captions",
    "Verify captions are synchronized with audio",
    "Test audio descriptions for visual content",
    "Ensure transcripts are available when required",
    "Check caption quality and completeness",
    "Verify multiple audio tracks work correctly"
  ],
  "tools_needed": ["video_player", "caption_viewer", "screen_reader"],
  "expected_results": "Multimedia has synchronized alternatives appropriate for content type",
  "common_failures": [
    "Videos without captions",
    "Unsynchronized captions",
    "Missing audio descriptions for visual content",
    "Incomplete or inaccurate transcripts"
  ]
}',
'{
  "manual_tools": ["caption_inspector", "media_accessibility_checker"],
  "automated_checks": "limited"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(c) - Color Information
('1194.22(c)', 'Color Information',
'Web pages shall be designed so that all information conveyed with color is also available without color.',
'{
  "overview": "Verify information is not conveyed by color alone and is accessible to users who cannot perceive color differences.",
  "steps": [
    "Review page in grayscale/high contrast mode",
    "Check form validation errors use more than color",
    "Verify links are distinguishable without color",
    "Test charts and graphs have patterns or labels",
    "Check status indicators use icons or text",
    "Verify navigation uses more than color coding"
  ],
  "tools_needed": ["color_contrast_analyzer", "grayscale_viewer", "high_contrast_mode"],
  "expected_results": "All information available without relying on color perception",
  "common_failures": [
    "Error messages shown only in red",
    "Links distinguished only by color",
    "Charts using only color coding",
    "Status indicators relying solely on color"
  ]
}',
'{
  "manual_tools": ["color_oracle", "contrast_checker"],
  "automated_checks": "partial"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(d) - Readable Content
('1194.22(d)', 'Document Organization',
'Documents shall be organized so they are readable without requiring an associated style sheet.',
'{
  "overview": "Ensure content remains readable and logically organized when CSS is disabled or unavailable.",
  "steps": [
    "Disable CSS and verify content order is logical",
    "Check heading structure provides document outline",
    "Verify lists and tables remain meaningful",
    "Test that content flows in reading order",
    "Check skip links and navigation work without CSS",
    "Verify form labels remain associated"
  ],
  "tools_needed": ["browser_dev_tools", "css_disabler", "heading_viewer"],
  "expected_results": "Content remains accessible and logically organized without CSS",
  "common_failures": [
    "Content order depends on CSS positioning",
    "Heading structure breaks without styling",
    "Navigation becomes unusable",
    "Forms lose label associations"
  ]
}',
'{
  "manual_tools": ["web_developer_toolbar", "headings_map"],
  "automated_checks": "structural_analysis"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(e) - Server-side Image Maps
('1194.22(e)', 'Server-side Image Maps',
'Redundant text links shall be provided for each active region of a server-side image map.',
'{
  "overview": "Verify server-side image maps have equivalent text links for each clickable region.",
  "steps": [
    "Identify any server-side image maps on the page",
    "Check each clickable region has corresponding text link",
    "Verify text links provide same functionality",
    "Test navigation with keyboard only",
    "Ensure text links are clearly associated with map",
    "Check alternative navigation methods"
  ],
  "tools_needed": ["browser_dev_tools", "keyboard_testing"],
  "expected_results": "Server-side image maps have redundant text navigation",
  "common_failures": [
    "Missing text alternatives for map regions",
    "Text links don't match map functionality",
    "Poor association between map and text links"
  ]
}',
'{
  "manual_inspection": "required",
  "automated_checks": "none"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(f) - Client-side Image Maps
('1194.22(f)', 'Client-side Image Maps',
'Client-side image maps shall be provided instead of server-side image maps except where the regions cannot be defined with an available geometric shape.',
'{
  "overview": "Check that client-side image maps are used with proper alt text for each area element.",
  "steps": [
    "Identify client-side image maps (area elements)",
    "Check each area element has meaningful alt text",
    "Verify map element has appropriate alt text",
    "Test keyboard navigation through map areas",
    "Check screen reader announces areas correctly",
    "Verify geometric shapes are appropriate"
  ],
  "tools_needed": ["browser_dev_tools", "screen_reader", "keyboard_testing"],
  "expected_results": "Client-side image maps are properly labeled and keyboard accessible",
  "common_failures": [
    "Area elements missing alt text",
    "Poor keyboard navigation through map",
    "Unclear area descriptions",
    "Map element missing alt text"
  ]
}',
'{
  "axe": ["area-alt"],
  "pa11y": ["Section508.22.F"],
  "manual_testing": "required"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(g) - Data Tables
('1194.22(g)', 'Data Table Headers',
'Row and column headers shall be identified for data tables.',
'{
  "overview": "Verify data tables have proper header identification using th elements and scope attributes.",
  "steps": [
    "Identify all data tables on the page",
    "Check table headers use th elements",
    "Verify scope attributes for complex tables",
    "Test with screen reader for proper associations",
    "Check headers provide sufficient context",
    "Verify table caption describes purpose"
  ],
  "tools_needed": ["screen_reader", "table_inspector", "browser_dev_tools"],
  "expected_results": "Data tables have clearly identified headers with proper associations",
  "common_failures": [
    "Headers using td instead of th elements",
    "Missing scope attributes in complex tables",
    "Headers don't provide sufficient context",
    "Tables missing captions"
  ]
}',
'{
  "axe": ["table-header", "th-has-data-cells", "td-headers-attr"],
  "pa11y": ["Section508.22.G"],
  "lighthouse": ["table-header"],
  "wave": ["table_header_missing"]
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(h) - Complex Data Tables
('1194.22(h)', 'Complex Data Table Markup',
'Markup shall be used to associate data cells and header cells for data tables that have two or more logical levels of row or column headers.',
'{
  "overview": "Ensure complex tables use id and headers attributes to associate data cells with multiple headers.",
  "steps": [
    "Identify tables with multiple header levels",
    "Check header cells have unique id attributes",
    "Verify data cells use headers attribute correctly",
    "Test complex associations with screen reader",
    "Check table structure is logical",
    "Verify all relationships are programmatically determinable"
  ],
  "tools_needed": ["screen_reader", "table_inspector", "browser_dev_tools"],
  "expected_results": "Complex tables have proper cell-to-header associations",
  "common_failures": [
    "Missing id attributes on header cells",
    "Incorrect headers attribute values",
    "Poor table structure for complex data",
    "Missing associations in multi-level headers"
  ]
}',
'{
  "axe": ["td-headers-attr", "table-header"],
  "manual_testing": "required_for_complex_tables"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(i) - Frame Titles
('1194.22(i)', 'Frame and Iframe Titles',
'Frames shall be titled with text that facilitates frame identification and navigation.',
'{
  "overview": "Verify all frame and iframe elements have descriptive title attributes.",
  "steps": [
    "Identify all frame and iframe elements",
    "Check each has a descriptive title attribute",
    "Verify titles clearly describe frame purpose",
    "Test with screen reader for clear identification",
    "Check titles are unique when multiple frames exist",
    "Verify nested frames have appropriate titles"
  ],
  "tools_needed": ["browser_dev_tools", "screen_reader", "frame_inspector"],
  "expected_results": "All frames have descriptive, unique titles",
  "common_failures": [
    "Frames missing title attributes",
    "Generic titles like \"frame\" or \"content\"",
    "Duplicate titles on multiple frames",
    "Titles don\'t describe frame purpose"
  ]
}',
'{
  "axe": ["frame-title"],
  "pa11y": ["Section508.22.I"],
  "lighthouse": ["frame-title"],
  "wave": ["frame_missing_title"]
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(j) - Flickering Content
('1194.22(j)', 'Flicker Rate',
'Pages shall be designed to avoid causing the screen to flicker with a frequency greater than 2 Hz and lower than 55 Hz.',
'{
  "overview": "Check for content that flickers or flashes at frequencies that could trigger photosensitive seizures.",
  "steps": [
    "Identify any flashing or flickering content",
    "Measure flash frequency if present",
    "Check animations and transitions",
    "Verify auto-playing content can be paused",
    "Test video content for flash sequences",
    "Check advertising content for compliance"
  ],
  "tools_needed": ["flash_analyzer", "video_analysis_tools", "frequency_counter"],
  "expected_results": "No content flickers in dangerous frequency range (2-55 Hz)",
  "common_failures": [
    "Animations flashing in dangerous frequency range",
    "Video content with flash sequences",
    "Advertising with excessive flashing",
    "Auto-playing content that can\'t be stopped"
  ]
}',
'{
  "manual_inspection": "required",
  "video_analysis": "specialized_tools",
  "automated_checks": "limited"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(k) - Text-only Alternative
('1194.22(k)', 'Text-only Alternative Page',
'A text-only page, with equivalent information or functionality, shall be provided to make a web site comply with the provisions of this part, when compliance cannot be accomplished in any other way.',
'{
  "overview": "When a text-only alternative is provided, verify it has equivalent functionality and is kept current.",
  "steps": [
    "Identify if text-only alternatives are provided",
    "Compare functionality with main site",
    "Check content is equivalent and current",
    "Verify text-only version is easily accessible",
    "Test that all functions are available",
    "Check update frequency matches main site"
  ],
  "tools_needed": ["content_comparison_tools", "functionality_checker"],
  "expected_results": "Text-only alternatives provide equivalent functionality and current content",
  "common_failures": [
    "Text-only version lacks equivalent functionality",
    "Content not kept current with main site",
    "Text-only alternative hard to find",
    "Missing features in alternative version"
  ]
}',
'{
  "manual_comparison": "required",
  "content_analysis": "detailed_review"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(l) - Scripted Content
('1194.22(l)', 'Scripted Content Accessibility',
'When pages utilize scripting languages to display content, or to create interface elements, the information provided by the script shall be identified with functional text that can be read by assistive technology.',
'{
  "overview": "Ensure dynamic content and scripted interface elements are accessible to assistive technologies.",
  "steps": [
    "Identify dynamic content created by scripts",
    "Check ARIA labels and descriptions on scripted elements",
    "Verify screen reader can access dynamic content",
    "Test keyboard navigation with scripted interfaces",
    "Check status updates are announced",
    "Verify error messages are accessible"
  ],
  "tools_needed": ["screen_reader", "keyboard_testing", "javascript_analyzer"],
  "expected_results": "Scripted content is accessible with functional text for assistive technology",
  "common_failures": [
    "Dynamic content not announced to screen readers",
    "Scripted interfaces not keyboard accessible",
    "Missing ARIA labels on custom controls",
    "Status changes not programmatically determinable"
  ]
}',
'{
  "axe": ["aria-labels", "keyboard-navigation"],
  "manual_testing": "required_for_dynamic_content",
  "screen_reader_testing": "essential"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(m) - Applet and Plugin Accessibility
('1194.22(m)', 'Applet and Plugin Accessibility',
'When a web page requires that an applet, plug-in or other application be present on the client system to interpret page content, the page must provide a link to a plug-in or applet that complies with 1194.21(a) through (l).',
'{
  "overview": "Verify that required plugins are accessible or alternatives are provided.",
  "steps": [
    "Identify any required applets or plugins",
    "Check if accessible versions are linked",
    "Verify alternatives to plugin content",
    "Test functionality without plugins",
    "Check plugin compliance with accessibility standards",
    "Verify clear instructions for plugin installation"
  ],
  "tools_needed": ["plugin_analyzer", "alternative_content_checker"],
  "expected_results": "Required plugins are accessible or accessible alternatives are provided",
  "common_failures": [
    "Required plugins are not accessible",
    "No alternatives to plugin content",
    "Poor instructions for plugin installation",
    "Plugin content not keyboard accessible"
  ]
}',
'{
  "manual_inspection": "required",
  "plugin_testing": "specialized"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(n) - Form Completion
('1194.22(n)', 'Online Form Completion',
'When electronic forms are designed to be completed on-line, the form shall allow people using assistive technology to access the information, field elements, and functionality required for completion and submission of the form, including all directions and cues.',
'{
  "overview": "Ensure forms are fully accessible including labels, instructions, validation, and error handling.",
  "steps": [
    "Check all form fields have associated labels",
    "Verify instructions are programmatically associated",
    "Test form completion with screen reader",
    "Check keyboard navigation through form",
    "Verify error messages are clear and accessible",
    "Test form submission process"
  ],
  "tools_needed": ["screen_reader", "keyboard_testing", "form_analyzer"],
  "expected_results": "Forms are completely accessible to assistive technology users",
  "common_failures": [
    "Form fields missing labels",
    "Instructions not associated with fields",
    "Error messages not accessible",
    "Poor keyboard navigation",
    "Required fields not clearly indicated"
  ]
}',
'{
  "axe": ["label", "form-field-multiple-labels", "required-attr"],
  "pa11y": ["Section508.22.N"],
  "lighthouse": ["label", "form-validation"],
  "wave": ["label_missing", "fieldset_missing"]
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(o) - Skip Navigation
('1194.22(o)', 'Skip Navigation Method',
'A method shall be provided that permits users to skip repetitive navigation links.',
'{
  "overview": "Verify skip navigation links or other methods to bypass repetitive content are provided.",
  "steps": [
    "Check for skip navigation links",
    "Test skip links with keyboard navigation",
    "Verify skip links work correctly",
    "Check skip links are visible when focused",
    "Test with screen reader for proper announcement",
    "Verify skip targets are appropriate"
  ],
  "tools_needed": ["keyboard_testing", "screen_reader", "skip_link_tester"],
  "expected_results": "Working skip navigation method is provided and accessible",
  "common_failures": [
    "Missing skip navigation links",
    "Skip links don\'t work properly",
    "Skip links not visible when focused",
    "Skip targets are inappropriate",
    "Skip links not announced correctly"
  ]
}',
'{
  "axe": ["skip-link", "bypass"],
  "pa11y": ["Section508.22.O"],
  "lighthouse": ["bypass"],
  "manual_testing": "required"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}'),

-- Section 1194.22(p) - Timed Responses
('1194.22(p)', 'Timed Response Control',
'When a timed response is required, the user shall be alerted and given sufficient time to indicate more time is required.',
'{
  "overview": "Check that users can control time limits and receive appropriate warnings about timeouts.",
  "steps": [
    "Identify any time limits on the page",
    "Check for timeout warnings",
    "Verify users can extend time limits",
    "Test timeout behavior with assistive technology",
    "Check if time limits can be disabled",
    "Verify sufficient warning time is provided"
  ],
  "tools_needed": ["timeout_monitor", "screen_reader", "timer_tools"],
  "expected_results": "Users have control over time limits with accessible warnings",
  "common_failures": [
    "No warning before timeouts",
    "Insufficient time to respond to warnings",
    "Time limits cannot be extended",
    "Timeout warnings not accessible",
    "Automatic redirects without warning"
  ]
}',
'{
  "manual_testing": "required",
  "timeout_analysis": "behavioral_testing"
}',
'https://www.section508.gov/manage/laws-and-policies/',
'{"all"}');

-- Now expand the wcag_requirements table to include Section 508 mappings
-- Add a column to track Section 508 relationships
ALTER TABLE wcag_requirements 
ADD COLUMN IF NOT EXISTS section_508_mapping JSONB DEFAULT '[]'::jsonb;

-- Update WCAG requirements with Section 508 mappings where applicable
UPDATE wcag_requirements SET section_508_mapping = '["1194.22(a)"]'::jsonb 
WHERE criterion_number = '1.1.1';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(b)"]'::jsonb 
WHERE criterion_number IN ('1.2.1', '1.2.2', '1.2.3');

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(c)"]'::jsonb 
WHERE criterion_number = '1.4.1';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(d)"]'::jsonb 
WHERE criterion_number IN ('1.3.1', '1.3.2');

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(g)", "1194.22(h)"]'::jsonb 
WHERE criterion_number = '1.3.1' AND title LIKE '%Tables%';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(i)"]'::jsonb 
WHERE criterion_number = '4.1.2' AND title LIKE '%Name, Role, Value%';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(j)"]'::jsonb 
WHERE criterion_number = '2.3.1';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(l)"]'::jsonb 
WHERE criterion_number IN ('4.1.2', '4.1.3');

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(n)"]'::jsonb 
WHERE criterion_number IN ('1.3.1', '3.3.1', '3.3.2') AND (title LIKE '%label%' OR title LIKE '%form%');

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(o)"]'::jsonb 
WHERE criterion_number = '2.4.1';

UPDATE wcag_requirements SET section_508_mapping = '["1194.22(p)"]'::jsonb 
WHERE criterion_number IN ('2.2.1', '2.2.2');

-- Update the unified requirements view to include Section 508 with proper test methods
DROP VIEW IF EXISTS unified_requirements;

CREATE OR REPLACE VIEW unified_requirements AS
WITH wcag_enhanced AS (
    SELECT 
        wr.id,
        'wcag' as requirement_type,
        wr.criterion_number,
        wr.title,
        wr.description,
        wr.level,
        wr.test_method,
        wr.understanding_url as wcag_url,
        NULL as section_508_url,
        true as is_active,
        1 as priority,
        30 as estimated_time_minutes,
        COALESCE(wr.manual_test_procedure->>'overview', wr.description) as testing_instructions,
        'Requirement passes all validation checks' as acceptance_criteria,
        'Common failures include missing or incorrect implementation' as failure_examples,
        wr.wcag_version,
        wr.guideline_title,
        wr.applies_to_page_types,
        wr.manual_test_procedure,
        wr.tool_mappings,
        wr.section_508_mapping,
        wr.created_at,
        wr.created_at as updated_at
    FROM wcag_requirements wr
),
section_508_enhanced AS (
    SELECT 
        gen_random_uuid() as id,
        'section_508' as requirement_type,
        sr.section_number as criterion_number,
        sr.title,
        sr.description,
        'base' as level,
        -- Determine test method based on content and tool mappings
        CASE 
            WHEN sr.tool_mappings::text LIKE '%axe%' OR sr.tool_mappings::text LIKE '%lighthouse%' THEN 'both'
            WHEN sr.section_number IN ('1194.22(a)', '1194.22(g)', '1194.22(i)', '1194.22(n)', '1194.22(o)') THEN 'both'
            ELSE 'manual'
        END as test_method,
        NULL as wcag_url,
        sr.reference_url as section_508_url,
        true as is_active,
        1 as priority,
        45 as estimated_time_minutes, -- Section 508 testing often takes longer
        sr.manual_test_procedure->>'overview' as testing_instructions,
        'Meets Section 508 compliance requirements' as acceptance_criteria,
        'Non-compliance with federal accessibility standards' as failure_examples,
        NULL as wcag_version,
        NULL as guideline_title,
        sr.applies_to_page_types,
        sr.manual_test_procedure,
        sr.tool_mappings,
        '[]'::jsonb as section_508_mapping,
        sr.created_at,
        sr.created_at as updated_at
    FROM section_508_requirements sr
)

-- Combine WCAG and Section 508 requirements
SELECT * FROM wcag_enhanced
UNION ALL
SELECT * FROM section_508_enhanced

ORDER BY requirement_type, criterion_number;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_section_508_requirements_section_number 
ON section_508_requirements(section_number);

CREATE INDEX IF NOT EXISTS idx_wcag_requirements_section_508_mapping 
ON wcag_requirements USING GIN(section_508_mapping);

-- Update existing test instances to support Section 508
ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS section_508_criterion VARCHAR(50),
ADD COLUMN IF NOT EXISTS compliance_framework VARCHAR(20) DEFAULT 'wcag' 
CHECK (compliance_framework IN ('wcag', 'section_508', 'both'));

-- Final verification
SELECT 
    'Section 508 Integration Complete' as status,
    (SELECT COUNT(*) FROM section_508_requirements) as section_508_count,
    (SELECT COUNT(*) FROM wcag_requirements) as wcag_count,
    (SELECT COUNT(*) FROM unified_requirements WHERE requirement_type = 'section_508') as unified_section_508,
    (SELECT COUNT(*) FROM unified_requirements WHERE requirement_type = 'wcag') as unified_wcag,
    (SELECT COUNT(*) FROM unified_requirements WHERE test_method = 'both') as both_method_count; 