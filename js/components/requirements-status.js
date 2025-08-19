/*
 * Requirements Status Component
 *
 * Standalone, reusable status logic for accessibility requirements.
 * Exposes window.RequirementsStatus with:
 *  - normalize(status)
 *  - computeOverall(req)
 *  - aggregate(requirements)
 *  - getBadgeMeta(status) -> {label, class}
 *
 * Optional UI helpers:
 *  - <requirement-status-badge status="..."> or with data attributes for raw inputs
 *  - Alpine magic: $reqStatus(req) => overall status
 */
(function () {
  const CANON = {
    PASSED: 'passed',
    FAILED: 'failed',
    IN_PROGRESS: 'in_progress',
    PENDING: 'pending',
    RUNNING: 'running',
    NEEDS_REVIEW: 'needs_review',
    NOT_TESTED: 'not_tested',
  };

  const LABELS = {
    [CANON.PASSED]: 'Passed',
    [CANON.FAILED]: 'Failed',
    [CANON.IN_PROGRESS]: 'In Progress',
    [CANON.PENDING]: 'Pending',
    [CANON.RUNNING]: 'Running',
    [CANON.NEEDS_REVIEW]: 'Needs Review',
    [CANON.NOT_TESTED]: 'Not Tested',
  };

  const BADGE = {
    [CANON.PASSED]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700',
    [CANON.FAILED]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700',
    [CANON.IN_PROGRESS]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700',
    [CANON.PENDING]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700',
    [CANON.RUNNING]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700',
    [CANON.NEEDS_REVIEW]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700',
    [CANON.NOT_TESTED]: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700',
  };

  function normalize(raw) {
    if (!raw) return CANON.NOT_TESTED;
    const s = String(raw).toLowerCase();
    if (['pass', 'passed', 'complete', 'completed', 'success'].includes(s)) return CANON.PASSED;
    if (['fail', 'failed', 'error'].includes(s)) return CANON.FAILED;
    if (['in_progress', 'in-progress', 'progress', 'working'].includes(s)) return CANON.IN_PROGRESS;
    if (['pending', 'queued', 'todo'].includes(s)) return CANON.PENDING;
    if (['running', 'executing'].includes(s)) return CANON.RUNNING;
    if (['needs_review', 'need_review', 'review', 'human_review', 'human-review'].includes(s)) return CANON.NEEDS_REVIEW;
    if (['not_tested', 'untested', 'none', 'null', 'na'].includes(s)) return CANON.NOT_TESTED;
    return CANON.NOT_TESTED;
  }

  function getApplicableTestMethod(req) {
    // Support multiple field names from various APIs
    return (req && (req.test_method || req.testable_method || req.method || '')).toLowerCase() || 'both';
  }

  function computeOverall(req) {
    const method = getApplicableTestMethod(req); // automated | manual | both
    const auto = normalize(req && req.automated_status);
    const manual = normalize(req && req.manual_status);

    const appliesAuto = method === 'automated' || method === 'both' || method === 'hybrid';
    const appliesManual = method === 'manual' || method === 'both' || method === 'hybrid';

    // Gather statuses that apply
    const statuses = [];
    if (appliesAuto) statuses.push(auto);
    if (appliesManual) statuses.push(manual);
    if (statuses.length === 0) statuses.push(CANON.NOT_TESTED);

    // Precedence: failed → running → needs_review → in_progress → pending → passed → not_tested
    const has = (t) => statuses.includes(t);

    if (has(CANON.FAILED)) return CANON.FAILED;
    if (has(CANON.RUNNING)) return CANON.RUNNING;
    if (has(CANON.NEEDS_REVIEW)) return CANON.NEEDS_REVIEW;
    if (has(CANON.IN_PROGRESS)) return CANON.IN_PROGRESS;
    if (has(CANON.PENDING)) return CANON.PENDING;

    // Passed logic depends on applicable modalities
    if (method === 'automated') return auto === CANON.PASSED ? CANON.PASSED : auto;
    if (method === 'manual') return manual === CANON.PASSED ? CANON.PASSED : manual;
    // both / hybrid: require both to be passed for overall passed
    if (appliesAuto && appliesManual) {
      if (auto === CANON.PASSED && manual === CANON.PASSED) return CANON.PASSED;
      // If one is passed and the other not tested/pending/in_progress → reflect that
      // This is already handled by precedence above; default to more informative remaining state
    }

    // If nothing matched, default to NOT_TESTED
    if (statuses.every((s) => s === CANON.NOT_TESTED)) return CANON.NOT_TESTED;
    // Fallback: choose first informative one (manual preference for visibility)
    return appliesManual ? manual : auto;
  }

  function aggregate(requirements) {
    const initCounts = () => ({
      total: 0,
      [CANON.PASSED]: 0,
      [CANON.FAILED]: 0,
      [CANON.IN_PROGRESS]: 0,
      [CANON.PENDING]: 0,
      [CANON.RUNNING]: 0,
      [CANON.NEEDS_REVIEW]: 0,
      [CANON.NOT_TESTED]: 0,
      // convenience extras
      completed: 0, // manual passed
      manual_pending: 0,
    });

    const counts = initCounts();
    if (!Array.isArray(requirements) || requirements.length === 0) return counts;

    for (const req of requirements) {
      counts.total += 1;
      const overall = computeOverall(req);
      counts[overall] = (counts[overall] || 0) + 1;

      // Convenience/legacy panel counts
      const manual = normalize(req && req.manual_status);
      if (manual === CANON.PASSED) counts.completed += 1; // treat as manual done
      if (manual === CANON.PENDING) counts.manual_pending += 1;
    }

    return counts;
  }

  function getBadgeMeta(status) {
    const s = normalize(status);
    return { label: LABELS[s], class: BADGE[s], value: s };
  }

  // Expose API
  window.RequirementsStatus = {
    normalize,
    computeOverall,
    aggregate,
    getBadgeMeta,
    CANON,
  };

  // Web component for a badge
  class RequirementStatusBadge extends HTMLElement {
    static get observedAttributes() { return ['status', 'auto', 'manual', 'method']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      let status = this.getAttribute('status');
      if (!status) {
        // Build a synthetic req from attributes
        const req = {
          automated_status: this.getAttribute('auto'),
          manual_status: this.getAttribute('manual'),
          test_method: this.getAttribute('method'),
        };
        status = computeOverall(req);
      }
      const meta = getBadgeMeta(status);
      this.innerHTML = `<span class="${meta.class}">${meta.label}</span>`;
    }
  }

  try { customElements.define('requirement-status-badge', RequirementStatusBadge); } catch (_) {}

  // Optional Alpine magic
  if (window.Alpine && typeof window.Alpine.magic === 'function') {
    window.Alpine.magic('reqStatus', () => (req) => computeOverall(req));
  } else {
    document.addEventListener('alpine:init', () => {
      try { window.Alpine.magic('reqStatus', () => (req) => computeOverall(req)); } catch (_) {}
    });
  }

  console.log('✅ RequirementsStatus component loaded');
})();


