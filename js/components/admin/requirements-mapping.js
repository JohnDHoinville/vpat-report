// Admin Requirements Mapping Alpine component
// Exposes adminRequirementsMapping() globally for x-data usage

window.adminRequirementsMapping = function adminRequirementsMapping() {
  return {
    loading: false,
    items: [],
    filtered: [],
    summaryText: '',
    filters: { standard: '', level: '', test_method: '', search: '' },

    async init() {
      this.loading = true;
      try {
        const token = window.AuthTokenService?.getToken?.();
        const apiBase = (window.DashboardAPI?.config?.baseUrl) || 'http://localhost:3001';
        const res = await fetch(`${apiBase}/api/unified-requirements`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        this.items = data?.success ? (data.data?.requirements || data.data || data) : [];
        this.apply();
      } catch (e) {
        console.error('Failed to load requirements:', e);
        this.items = [];
        this.filtered = [];
      } finally {
        this.loading = false;
      }
    },

    apply() {
      const search = (this.filters.search || '').toLowerCase();
      this.filtered = this.items.filter(r => {
        if (this.filters.standard && r.standard_type !== this.filters.standard) return false;
        if (this.filters.level && (r.level || '') !== this.filters.level) return false;
        if (this.filters.test_method && (r.test_method || '') !== this.filters.test_method) return false;
        if (search) {
          const tools = (r.tool_mappings?.automated_tools || []).join(' ').toLowerCase();
          return (
            (r.requirement_id || '').toLowerCase().includes(search) ||
            (r.title || '').toLowerCase().includes(search) ||
            tools.includes(search)
          );
        }
        return true;
      });
      this.summaryText = `${this.filtered.length} of ${this.items.length} requirements`;
    },

    // Alpine watchers
    $watch: {
      'filters.standard'() { this.apply(); },
      'filters.level'() { this.apply(); },
      'filters.test_method'() { this.apply(); },
      'filters.search'() { this.apply(); }
    }
  };
};


