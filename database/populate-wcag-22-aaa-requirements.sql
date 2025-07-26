-- =====================================================================================
-- WCAG 2.2 AAA Level Requirements Population Script
-- Based on official W3C WCAG 2.2 specification
-- Generated: January 26, 2025
-- Source: https://www.w3.org/WAI/WCAG22/quickref/
-- =====================================================================================

-- =============================================================================
-- LEVEL AAA CRITERIA (28 total) - Complete WCAG 2.2 AAA Requirements
-- =============================================================================

-- 1.2.6 Sign Language (Prerecorded) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.2.6', 'Sign Language (Prerecorded)',
    'Sign language interpretation is provided for all prerecorded audio content in synchronized media.',
    'aaa', 'manual',
    '1. Identify all prerecorded videos with audio content
2. Check if sign language interpretation is provided
3. Verify sign language interpreter is clearly visible
4. Test that sign language interpretation is synchronized
5. Check quality and accuracy of sign language interpretation',
    'All prerecorded audio content has sign language interpretation provided.',
    'Videos without sign language interpretation, poor quality interpretation, unsynchronized signing',
    3, 40,
    'https://www.w3.org/WAI/WCAG22/Understanding/sign-language-prerecorded.html'
);

-- 1.2.7 Extended Audio Description (Prerecorded) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.2.7', 'Extended Audio Description (Prerecorded)',
    'Where pauses in foreground audio are insufficient to allow audio descriptions to convey the sense of the video, extended audio description is provided for all prerecorded video content in synchronized media.',
    'aaa', 'manual',
    '1. Review all prerecorded video content
2. Check if standard audio descriptions are sufficient
3. Verify extended audio descriptions when needed
4. Test that extended descriptions provide complete information
5. Ensure extended descriptions do not interfere with original audio',
    'Extended audio descriptions are provided when standard descriptions are insufficient.',
    'Missing extended descriptions when needed, incomplete information, timing issues',
    3, 45,
    'https://www.w3.org/WAI/WCAG22/Understanding/extended-audio-description-prerecorded.html'
);

-- 1.2.8 Media Alternative (Prerecorded) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.2.8', 'Media Alternative (Prerecorded)',
    'An alternative for time-based media is provided for all prerecorded synchronized media and for all prerecorded video-only media.',
    'aaa', 'manual',
    '1. Identify all prerecorded multimedia content
2. Check for complete text alternatives
3. Verify alternatives convey all information
4. Test that alternatives are easy to find
5. Ensure alternatives are accessible',
    'Complete text alternatives are provided for all prerecorded multimedia.',
    'Missing text alternatives, incomplete alternatives, inaccessible alternative formats',
    3, 35,
    'https://www.w3.org/WAI/WCAG22/Understanding/media-alternative-prerecorded.html'
);

-- 1.2.9 Audio-only (Live) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.2.9', 'Audio-only (Live)',
    'An alternative for time-based media that presents equivalent information for live audio-only content is provided.',
    'aaa', 'manual',
    '1. Identify all live audio-only content
2. Check for real-time text alternatives
3. Test live captioning or transcription
4. Verify information completeness
5. Check accessibility of alternative formats',
    'Live audio-only content has equivalent real-time alternatives.',
    'Missing live alternatives, incomplete real-time transcription, inaccessible alternatives',
    3, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/audio-only-live.html'
);

-- 1.3.6 Identify Purpose (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.3.6', 'Identify Purpose',
    'In content implemented using markup languages, the purpose of user interface components, icons, and regions can be programmatically determined.',
    'aaa', 'both',
    '1. Review all UI components and icons
2. Check for programmatic purpose identification
3. Test with assistive technologies
4. Verify semantic markup usage
5. Check ARIA attributes for purpose identification',
    'Purpose of UI components, icons, and regions can be programmatically determined.',
    'Missing semantic markup, unclear component purposes, inadequate ARIA labeling',
    2, 40,
    'https://www.w3.org/WAI/WCAG22/Understanding/identify-purpose.html'
);

-- 1.4.6 Contrast (Enhanced) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.4.6', 'Contrast (Enhanced)',
    'The visual presentation of text and images of text has a contrast ratio of at least 7:1, except for large text which has a contrast ratio of at least 4.5:1.',
    'aaa', 'automated',
    '1. Test all text against background colors
2. Measure contrast ratios using tools
3. Check normal text meets 7:1 ratio
4. Verify large text meets 4.5:1 ratio
5. Test different states (hover, focus, active)',
    'All text meets enhanced contrast requirements (7:1 for normal, 4.5:1 for large text).',
    'Insufficient contrast ratios, poor color combinations, unreadable text',
    1, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html'
);

-- 1.4.7 Low or No Background Audio (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.4.7', 'Low or No Background Audio',
    'For prerecorded audio-only content that contains primarily speech, background sounds are either absent, can be turned off, or are at least 20 decibels lower than the foreground speech content.',
    'aaa', 'manual',
    '1. Test all prerecorded audio content
2. Measure background audio levels
3. Check for background audio controls
4. Verify 20dB difference where applicable
5. Test audio clarity and speech intelligibility',
    'Background audio is absent, removable, or 20dB lower than speech.',
    'Interfering background audio, no audio controls, insufficient volume difference',
    3, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/low-or-no-background-audio.html'
);

-- 1.4.8 Visual Presentation (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.4.8', 'Visual Presentation',
    'For the visual presentation of blocks of text, a mechanism is available to achieve specific formatting requirements including color selection, width control, justification, line spacing, and resizing.',
    'aaa', 'manual',
    '1. Test color selection mechanisms
2. Check text width controls (80 characters max)
3. Verify no full justification
4. Test line spacing controls (1.5x minimum)
5. Check 200% resize capability without horizontal scrolling',
    'Users can control text presentation including colors, width, spacing, and size.',
    'Fixed text presentation, no user controls, poor text formatting options',
    2, 35,
    'https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html'
);

-- 1.4.9 Images of Text (No Exception) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.4.9', 'Images of Text (No Exception)',
    'Images of text are only used for pure decoration or where a particular presentation of text is essential to the information being conveyed.',
    'aaa', 'manual',
    '1. Identify all images containing text
2. Determine if text images are essential
3. Check for CSS/HTML text alternatives
4. Verify decorative vs. informational use
5. Test if text presentation can be achieved with markup',
    'Images of text are only used when essential or purely decorative.',
    'Unnecessary text images, poor text image quality, missing text alternatives',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/images-of-text-no-exception.html'
);

-- 2.1.3 Keyboard (No Exception) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.1.3', 'Keyboard (No Exception)',
    'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes.',
    'aaa', 'manual',
    '1. Test all functionality with keyboard only
2. Verify no timing requirements for keystrokes
3. Check complex interactions work via keyboard
4. Test custom controls and widgets
5. Ensure no mouse-only functionality exists',
    'All functionality is accessible via keyboard without timing requirements.',
    'Mouse-only functionality, timing-dependent interactions, inaccessible custom controls',
    1, 45,
    'https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception.html'
);

-- 2.2.3 No Timing (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.3', 'No Timing',
    'Timing is not an essential part of the event or activity presented by the content, except for non-interactive synchronized media and real-time events.',
    'aaa', 'manual',
    '1. Identify all timed content and interactions
2. Determine if timing is essential
3. Check for timing removal options
4. Test real-time vs. non-real-time content
5. Verify user control over timing',
    'Timing is not essential except for synchronized media and real-time events.',
    'Unnecessary time limits, essential timing without justification, no timing controls',
    2, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/no-timing.html'
);

-- 2.2.4 Interruptions (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.4', 'Interruptions',
    'Interruptions can be postponed or suppressed by the user, except interruptions involving an emergency.',
    'aaa', 'manual',
    '1. Test all forms of interruptions
2. Check for postpone/suppress controls
3. Verify emergency vs. non-emergency interruptions
4. Test user control settings
5. Check interruption frequency and timing',
    'Users can control interruptions except for emergencies.',
    'Uncontrollable interruptions, no postpone options, excessive interruption frequency',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/interruptions.html'
);

-- 2.2.5 Re-authenticating (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.5', 'Re-authenticating',
    'When an authenticated session expires, the user can continue the activity without loss of data after re-authenticating.',
    'aaa', 'manual',
    '1. Test session expiration scenarios
2. Check data preservation during re-authentication
3. Verify form data is not lost
4. Test various authentication methods
5. Check user warnings before session expiry',
    'Users can continue without data loss after re-authenticating.',
    'Data loss on re-authentication, no session warnings, incomplete data preservation',
    2, 35,
    'https://www.w3.org/WAI/WCAG22/Understanding/re-authenticating.html'
);

-- 2.2.6 Timeouts (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.6', 'Timeouts',
    'Users are warned of the duration of any user inactivity that could cause data loss, unless the data is preserved for more than 20 hours when the user does not take any actions.',
    'aaa', 'manual',
    '1. Test all timeout scenarios
2. Check for timeout warnings
3. Verify data preservation duration
4. Test 20-hour preservation requirement
5. Check user control over timeout settings',
    'Users are warned of timeouts or data is preserved for 20+ hours.',
    'No timeout warnings, inadequate data preservation, unclear timeout durations',
    2, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html'
);

-- 2.3.2 Three Flashes (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.3.2', 'Three Flashes',
    'Web pages do not contain anything that flashes more than three times in any one second period.',
    'aaa', 'automated',
    '1. Test all content for flashing elements
2. Measure flash frequency
3. Check animations and transitions
4. Test video content for flashing
5. Verify no content exceeds 3 flashes per second',
    'No content flashes more than three times per second.',
    'Rapid flashing content, strobe effects, seizure-inducing animations',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/three-flashes.html'
);

-- 2.3.3 Animation from Interactions (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.3.3', 'Animation from Interactions',
    'Motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed.',
    'aaa', 'manual',
    '1. Test all interactive animations
2. Check for animation disable options
3. Verify essential vs. non-essential animations
4. Test reduced motion preferences
5. Check CSS prefers-reduced-motion support',
    'Users can disable non-essential animations triggered by interaction.',
    'No animation controls, excessive motion effects, missing reduced motion support',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html'
);

-- 2.4.8 Location (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.8', 'Location',
    'Information about the user''s location within a set of web pages is available.',
    'aaa', 'manual',
    '1. Check for breadcrumb navigation
2. Verify site maps and location indicators
3. Test page hierarchy information
4. Check navigation context
5. Verify location information is accessible',
    'Users can determine their location within the website structure.',
    'Missing breadcrumbs, unclear navigation, no location indicators, poor site structure',
    2, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/location.html'
);

-- 2.4.9 Link Purpose (Link Only) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.9', 'Link Purpose (Link Only)',
    'A mechanism is available to allow the purpose of each link to be identified from link text alone, except where the purpose of the link would be ambiguous to users in general.',
    'aaa', 'manual',
    '1. Review all link text for clarity
2. Check if purpose is clear from text alone
3. Test links out of context
4. Verify descriptive link text
5. Check for generic link text (click here, read more)',
    'Link purpose is clear from link text alone.',
    'Generic link text, unclear link purposes, context-dependent links',
    2, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html'
);

-- 2.4.10 Section Headings (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.10', 'Section Headings',
    'Section headings are used to organize the content.',
    'aaa', 'manual',
    '1. Review document structure and headings
2. Check heading hierarchy and organization
3. Verify sections have descriptive headings
4. Test heading navigation
5. Check heading semantic markup',
    'Content is organized with clear, descriptive section headings.',
    'Missing headings, poor heading hierarchy, unclear section organization',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/section-headings.html'
);

-- 2.4.12 Focus Not Obscured (Enhanced) (Level AAA) - NEW in 2.2
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.12', 'Focus Not Obscured (Enhanced)',
    'When a user interface component receives keyboard focus, no part of the component is hidden by author-created content.',
    'aaa', 'both',
    '1. Navigate through all focusable elements
2. Verify focused elements are completely visible
3. Test with all sticky content and overlays
4. Check in different viewport sizes
5. Ensure no part of focus indicator is hidden',
    'Focused elements are completely visible, with no part hidden by other content.',
    'Any portion of focused element hidden by sticky content, partial obscuring of focus indicators',
    1, 35,
    'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html'
);

-- 2.4.13 Focus Appearance (Level AAA) - NEW in 2.2
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.13', 'Focus Appearance',
    'When the keyboard focus indicator is visible, it meets enhanced appearance requirements for size and contrast.',
    'aaa', 'both',
    '1. Navigate through all focusable elements
2. Measure focus indicator size (minimum 2 CSS pixels)
3. Test focus indicator contrast (minimum 3:1)
4. Verify focus appearance changes between focused/unfocused states
5. Check focus indicators are not modified inappropriately',
    'Focus indicators are large enough and have sufficient contrast to be clearly visible.',
    'Thin focus indicators, low contrast focus indicators, invisible focus changes',
    1, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html'
);

-- 2.5.5 Target Size (Enhanced) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.5.5', 'Target Size (Enhanced)',
    'The size of the target for pointer inputs is at least 44 by 44 CSS pixels, with specific exceptions.',
    'aaa', 'both',
    '1. Measure all interactive targets
2. Verify 44x44 CSS pixel minimum
3. Check exceptions for inline links
4. Test spacing between targets
5. Verify touch target accessibility',
    'All pointer targets are at least 44x44 CSS pixels or meet exception criteria.',
    'Small touch targets, insufficient spacing, hard to activate controls',
    2, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html'
);

-- 2.5.6 Concurrent Input Mechanisms (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.5.6', 'Concurrent Input Mechanisms',
    'Web content does not restrict use of input modalities available on a platform except where the restriction is essential or required to ensure the security of the content.',
    'aaa', 'manual',
    '1. Test multiple input methods simultaneously
2. Check for input method restrictions
3. Verify keyboard and touch work together
4. Test voice and pointer inputs
5. Check platform input method support',
    'Content supports concurrent use of multiple input methods.',
    'Input method restrictions, conflicts between input modes, platform incompatibility',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/concurrent-input-mechanisms.html'
);

-- 3.1.3 Unusual Words (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.3', 'Unusual Words',
    'A mechanism is available for identifying specific definitions of words or phrases used in an unusual or restricted way, including idioms and jargon.',
    'aaa', 'manual',
    '1. Identify unusual words and jargon
2. Check for definition mechanisms
3. Test glossaries and tooltips
4. Verify inline definitions
5. Check accessibility of definition tools',
    'Definitions are available for unusual words, idioms, and jargon.',
    'Missing definitions, inaccessible definition tools, unclear terminology',
    3, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/unusual-words.html'
);

-- 3.1.4 Abbreviations (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.4', 'Abbreviations',
    'A mechanism is available for identifying the expanded form or meaning of abbreviations.',
    'aaa', 'manual',
    '1. Identify all abbreviations and acronyms
2. Check for expansion mechanisms
3. Test title attributes and glossaries
4. Verify abbreviation markup
5. Check accessibility of expansion tools',
    'Expanded forms or meanings are available for all abbreviations.',
    'Unexpanded abbreviations, missing definitions, inaccessible expansion tools',
    3, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/abbreviations.html'
);

-- 3.1.5 Reading Level (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.5', 'Reading Level',
    'When text requires reading ability more advanced than the lower secondary education level after removal of proper names and titles, supplemental content or a version that does not require more than lower secondary education level is available.',
    'aaa', 'manual',
    '1. Analyze text complexity and reading level
2. Check for supplemental explanations
3. Test alternative simplified versions
4. Verify content accessibility for different education levels
5. Check readability tools and scores',
    'Complex text has supplemental content or simplified versions available.',
    'Overly complex text, no simplified alternatives, poor readability scores',
    3, 40,
    'https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html'
);

-- 3.1.6 Pronunciation (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.6', 'Pronunciation',
    'A mechanism is available for identifying specific pronunciation of words where meaning of the words, in context, is ambiguous without knowing the pronunciation.',
    'aaa', 'manual',
    '1. Identify words with ambiguous pronunciation
2. Check for pronunciation guides
3. Test audio pronunciation tools
4. Verify phonetic notations
5. Check accessibility of pronunciation mechanisms',
    'Pronunciation guidance is available for ambiguous words.',
    'Missing pronunciation guides, unclear phonetic notation, inaccessible audio',
    3, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/pronunciation.html'
);

-- 3.2.5 Change on Request (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.2.5', 'Change on Request',
    'Changes of context are initiated only by user request or a mechanism is available to turn off such changes.',
    'aaa', 'manual',
    '1. Test all context changes
2. Verify user initiation or control
3. Check for automatic changes
4. Test change notification mechanisms
5. Verify user control over context changes',
    'Context changes only occur on user request or with user control.',
    'Unexpected context changes, no user control, automatic redirects or updates',
    2, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/change-on-request.html'
);

-- 3.3.5 Help (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.3.5', 'Help',
    'Context-sensitive help is available.',
    'aaa', 'manual',
    '1. Test help availability throughout site
2. Check context-sensitive help features
3. Verify help accessibility
4. Test help content quality
5. Check help system navigation',
    'Context-sensitive help is available and accessible.',
    'Missing help systems, poor help content, inaccessible help features',
    3, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/help.html'
);

-- 3.3.6 Error Prevention (All) (Level AAA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.3.6', 'Error Prevention (All)',
    'For web pages that require the user to submit information, at least one of the following is true: submissions are reversible, data is checked for input errors, or the user can confirm/correct information before submission.',
    'aaa', 'manual',
    '1. Test all form submission processes
2. Check for error prevention mechanisms
3. Verify data validation and checking
4. Test confirmation and correction options
5. Check reversible submission capabilities',
    'All submissions have error prevention through reversibility, checking, or confirmation.',
    'No error prevention, irreversible submissions, missing validation, no confirmation steps',
    2, 35,
    'https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-all.html'
);

-- 3.3.9 Accessible Authentication (Enhanced) (Level AAA) - NEW in 2.2
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.3.9', 'Accessible Authentication (Enhanced)',
    'A cognitive function test is not required for any step in an authentication process unless an alternative method is provided or a mechanism assists the user.',
    'aaa', 'both',
    '1. Test all authentication methods thoroughly
2. Verify no cognitive function tests are required
3. Check for biometric authentication options
4. Test single sign-on (SSO) capabilities
5. Verify authentication does not rely on memorization or puzzles',
    'Authentication processes do not require cognitive function tests.',
    'Any authentication requiring memory, puzzle-solving, or cognitive tests without alternatives',
    1, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html'
);

-- Count verification
SELECT 
    'WCAG 2.2 AAA Requirements Population Complete' as status,
    COUNT(*) as total_aaa_requirements
FROM test_requirements 
WHERE requirement_type = 'wcag' AND level = 'aaa'; 