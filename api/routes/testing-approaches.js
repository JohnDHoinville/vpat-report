const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

/**
 * Testing Approaches API
 * Manages testing approach configuration for compliance sessions
 */

/**
 * GET /api/testing-approaches/definitions
 * Get all available testing approach definitions
 */
router.get('/definitions', async (req, res) => {
    try {
        const approaches = {
            automated_only: {
                name: 'Automated Only',
                description: 'Pure automated testing using tools like axe, pa11y, lighthouse',
                time_estimate_hours: 2,
                coverage_percentage: 35,
                tools: ['axe', 'pa11y', 'lighthouse'],
                techniques: [],
                best_for: ['Regression testing', 'Development feedback', 'CI/CD pipelines'],
                wcag_coverage: ['A', 'AA'],
                pros: ['Fast execution', 'Consistent results', 'Easy to integrate'],
                cons: ['Limited coverage', 'Misses complex interactions', 'No cognitive testing']
            },
            manual_only: {
                name: 'Manual Only',
                description: 'Human-driven accessibility testing with comprehensive evaluation',
                time_estimate_hours: 8,
                coverage_percentage: 90,
                tools: [],
                techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast', 'focus_management', 'cognitive_assessment'],
                best_for: ['Comprehensive audits', 'Certification compliance', 'Legal requirements'],
                wcag_coverage: ['A', 'AA', 'AAA'],
                pros: ['Comprehensive coverage', 'Context-aware testing', 'User experience focus'],
                cons: ['Time intensive', 'Requires expertise', 'Potential for inconsistency']
            },
            hybrid: {
                name: 'Hybrid Approach',
                description: 'Balanced automated + manual approach for comprehensive coverage',
                time_estimate_hours: 4,
                coverage_percentage: 70,
                tools: ['axe', 'pa11y'],
                techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast'],
                best_for: ['Regular compliance monitoring', 'Most projects', 'Balanced testing'],
                wcag_coverage: ['A', 'AA'],
                pros: ['Good coverage', 'Reasonable time investment', 'Catches both obvious and subtle issues'],
                cons: ['Still requires manual expertise', 'More complex to coordinate']
            },
            rapid_automated: {
                name: 'Rapid Automated',
                description: 'Quick automated scan focusing on critical blocking issues',
                time_estimate_hours: 1,
                coverage_percentage: 25,
                tools: ['axe'],
                techniques: [],
                best_for: ['Quick checks', 'Pre-deployment validation', 'Development sprints'],
                wcag_coverage: ['A'],
                pros: ['Very fast', 'Catches critical issues', 'Easy to run frequently'],
                cons: ['Very limited coverage', 'Misses many important issues']
            },
            comprehensive_manual: {
                name: 'Comprehensive Manual',
                description: 'Exhaustive manual testing with automated baseline for certification-level compliance',
                time_estimate_hours: 16,
                coverage_percentage: 95,
                tools: ['axe', 'pa11y', 'lighthouse'],
                techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast', 'focus_management', 'cognitive_assessment', 'usability_testing'],
                best_for: ['Accessibility certifications', 'Legal compliance', 'High-stakes applications'],
                wcag_coverage: ['A', 'AA', 'AAA'],
                pros: ['Maximum coverage', 'Certification-ready', 'Includes edge cases'],
                cons: ['Very time intensive', 'Requires significant expertise', 'Expensive']
            }
        };

        res.json({
            success: true,
            data: approaches
        });
    } catch (error) {
        console.error('Error fetching approach definitions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch approach definitions'
        });
    }
});

/**
 * GET /api/testing-approaches/summary
 * Get summary of testing approaches usage across all sessions
 */
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const summaryQuery = `
            SELECT 
                testing_approach,
                COUNT(*) as session_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                AVG((approach_details->>'time_estimate_hours')::numeric) as avg_time_estimate,
                AVG(CASE 
                    WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (completed_at - started_at))/3600 
                END) as avg_actual_hours,
                array_agg(DISTINCT (approach_details->>'coverage_target')) FILTER (WHERE approach_details->>'coverage_target' IS NOT NULL) as coverage_targets
            FROM test_sessions 
            WHERE testing_approach IS NOT NULL
            GROUP BY testing_approach
            ORDER BY session_count DESC
        `;

        const result = await pool.query(summaryQuery);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching approach summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch approach summary'
        });
    }
});

/**
 * POST /api/testing-approaches/recommend
 * Get recommended testing approach based on project characteristics
 */
router.post('/recommend', authenticateToken, async (req, res) => {
    try {
        const {
            project_size = 'medium',          // small, medium, large
            timeline_days = 7,               // Available timeline
            compliance_level = 'wcag_aa',    // wcag_a, wcag_aa, wcag_aaa, section_508
            team_expertise = 'intermediate', // beginner, intermediate, expert
            budget_level = 'medium',         // low, medium, high
            priority = 'balanced',           // speed, coverage, budget
            has_complex_interactions = false,
            requires_certification = false,
            is_public_facing = true,
            user_base_size = 'medium'        // small, medium, large
        } = req.body;

        // Scoring algorithm for approach recommendation
        const scores = {
            automated_only: 0,
            manual_only: 0,
            hybrid: 0,
            rapid_automated: 0,
            comprehensive_manual: 0
        };

        // Timeline factor
        if (timeline_days <= 1) {
            scores.rapid_automated += 30;
            scores.automated_only += 20;
        } else if (timeline_days <= 3) {
            scores.automated_only += 25;
            scores.hybrid += 20;
            scores.rapid_automated += 15;
        } else if (timeline_days <= 7) {
            scores.hybrid += 30;
            scores.automated_only += 20;
            scores.manual_only += 15;
        } else {
            scores.comprehensive_manual += 25;
            scores.manual_only += 30;
            scores.hybrid += 20;
        }

        // Compliance level factor
        if (compliance_level === 'wcag_aaa' || requires_certification) {
            scores.comprehensive_manual += 40;
            scores.manual_only += 30;
        } else if (compliance_level === 'wcag_aa') {
            scores.hybrid += 25;
            scores.manual_only += 20;
        }

        // Team expertise factor
        if (team_expertise === 'beginner') {
            scores.automated_only += 20;
            scores.rapid_automated += 15;
        } else if (team_expertise === 'expert') {
            scores.comprehensive_manual += 20;
            scores.manual_only += 25;
        }

        // Budget factor
        if (budget_level === 'low') {
            scores.automated_only += 25;
            scores.rapid_automated += 20;
        } else if (budget_level === 'high') {
            scores.comprehensive_manual += 20;
            scores.manual_only += 15;
        }

        // Priority factor
        if (priority === 'speed') {
            scores.rapid_automated += 30;
            scores.automated_only += 25;
        } else if (priority === 'coverage') {
            scores.comprehensive_manual += 30;
            scores.manual_only += 25;
        }

        // Complex interactions factor
        if (has_complex_interactions) {
            scores.manual_only += 25;
            scores.comprehensive_manual += 20;
            scores.hybrid += 15;
        }

        // Public facing factor
        if (is_public_facing) {
            scores.hybrid += 15;
            scores.manual_only += 10;
        }

        // Find the highest scoring approach
        const recommendedApproach = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)[0][0];

        // Get approach details
        const approachDefinitions = await (await import('./testing-approaches.js')).default;
        
        res.json({
            success: true,
            data: {
                recommended_approach: recommendedApproach,
                confidence_score: Math.max(...Object.values(scores)),
                scores: scores,
                reasoning: generateRecommendationReasoning(req.body, recommendedApproach, scores),
                alternatives: Object.entries(scores)
                    .sort(([,a], [,b]) => b - a)
                    .slice(1, 3)
                    .map(([approach, score]) => ({approach, score}))
            }
        });

    } catch (error) {
        console.error('Error generating approach recommendation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate approach recommendation'
        });
    }
});

/**
 * PUT /api/testing-approaches/sessions/:sessionId
 * Update testing approach for a specific session
 */
router.put('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { testing_approach, approach_details } = req.body;

        // Validate approach
        const validApproaches = ['automated_only', 'manual_only', 'hybrid', 'rapid_automated', 'comprehensive_manual'];
        if (!validApproaches.includes(testing_approach)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid testing approach'
            });
        }

        const updateQuery = `
            UPDATE test_sessions 
            SET testing_approach = $1,
                approach_details = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            testing_approach,
            JSON.stringify(approach_details),
            sessionId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'Testing approach updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating testing approach:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update testing approach'
        });
    }
});

/**
 * Generate reasoning text for approach recommendation
 */
function generateRecommendationReasoning(criteria, recommended, scores) {
    const reasons = [];

    if (criteria.timeline_days <= 1) {
        reasons.push('Short timeline requires rapid execution');
    }
    if (criteria.requires_certification) {
        reasons.push('Certification requires comprehensive manual testing');
    }
    if (criteria.team_expertise === 'beginner') {
        reasons.push('Limited expertise favors automated approaches');
    }
    if (criteria.has_complex_interactions) {
        reasons.push('Complex interactions need manual evaluation');
    }
    if (criteria.priority === 'coverage') {
        reasons.push('Coverage priority requires thorough manual testing');
    }
    if (criteria.budget_level === 'low') {
        reasons.push('Budget constraints favor automated approaches');
    }

    return reasons.join('. ') + '.';
}

module.exports = router; 