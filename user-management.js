// User Management System
window.userManagement = {
    users: [],
    stats: {},
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 25,
    sortField: 'created_at',
    sortOrder: 'DESC',
    filters: {
        search: '',
        role: '',
        status: ''
    },
    isLoading: false,
    editingUser: null,
    deletingUserId: null,

    // API helper
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('auth_token');
        const baseURL = 'http://localhost:3001/api';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${baseURL}${endpoint}`, finalOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Call Failed [${endpoint}]:`, error);
            throw error;
        }
    },

    // Main Functions
    async showUserManagement() {
        try {
            document.getElementById('userManagementModal').classList.remove('hidden');
            await this.loadUserStats();
            await this.loadUsers();
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Error opening user management:', error);
            this.showNotification('Failed to load user management', 'error');
        }
    },

    closeUserManagement() {
        document.getElementById('userManagementModal').classList.add('hidden');
        this.editingUser = null;
    },

    async loadUserStats() {
        try {
            const response = await this.apiCall('/users/stats', { method: 'GET' });
            this.stats = response.data;
            
            // Update stats display
            document.getElementById('totalUsersCount').textContent = response.data.total_users || 0;
            document.getElementById('activeUsersCount').textContent = response.data.active_users || 0;
            document.getElementById('adminUsersCount').textContent = response.data.admin_users || 0;
            document.getElementById('recentLoginsCount').textContent = response.data.recent_logins || 0;
            
        } catch (error) {
            console.error('❌ Error loading user stats:', error);
        }
    },

    async loadUsers(page = 1) {
        try {
            this.isLoading = true;
            this.currentPage = page;
            
            this.showUsersLoadingState();
            
            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.limit.toString(),
                sort: this.sortField,
                order: this.sortOrder
            });

            // Add filters
            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            if (this.filters.role) {
                params.append('role', this.filters.role);
            }
            if (this.filters.status) {
                params.append('status', this.filters.status);
            }

            const response = await this.apiCall(`/users?${params.toString()}`, { method: 'GET' });
            
            this.users = response.data.users;
            this.totalPages = response.data.pagination.total_pages;
            this.totalCount = response.data.pagination.total_count;
            
            this.renderUsersTable();
            this.updateUsersPagination();
            
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showUsersErrorState();
            this.showNotification('Failed to load users', 'error');
        } finally {
            this.isLoading = false;
        }
    },

    showUsersLoadingState() {
        document.getElementById('usersLoadingState').classList.remove('hidden');
        document.getElementById('usersEmptyState').classList.add('hidden');
        document.getElementById('usersTableBody').innerHTML = '';
    },

    showUsersErrorState() {
        document.getElementById('usersLoadingState').classList.add('hidden');
        document.getElementById('usersEmptyState').classList.remove('hidden');
        document.getElementById('usersTableBody').innerHTML = '';
    },

    renderUsersTable() {
        const tableBody = document.getElementById('usersTableBody');
        const loadingState = document.getElementById('usersLoadingState');
        const emptyState = document.getElementById('usersEmptyState');
        
        loadingState.classList.add('hidden');
        
        if (this.users.length === 0) {
            emptyState.classList.remove('hidden');
            tableBody.innerHTML = '';
            return;
        }
        
        emptyState.classList.add('hidden');
        
        tableBody.innerHTML = this.users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8">
                            <div class="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                ${user.username.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">${this.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${this.escapeHtml(user.full_name || '-')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${this.escapeHtml(user.email)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getRoleBadgeClass(user.role)}">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.last_login ? this.formatDateTime(user.last_login) : 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="window.userManagement.editUser('${user.id}')" 
                                class="text-blue-600 hover:text-blue-900 transition-colors" title="Edit User">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="window.userManagement.showPasswordResetModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                class="text-yellow-600 hover:text-yellow-900 transition-colors" title="Reset Password">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2L4.257 10.257a6 6 0 017.743-7.743L15 7z"></path>
                            </svg>
                        </button>
                        ${this.getCurrentUserId() !== user.id ? `
                            <button onclick="window.userManagement.showDeleteUserModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                    class="text-red-600 hover:text-red-900 transition-colors" title="Delete User">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        ` : '<span class="text-gray-400">-</span>'}
                        ${!user.is_active ? `
                            <button onclick="window.userManagement.reactivateUser('${user.id}')" 
                                    class="text-green-600 hover:text-green-900 transition-colors" title="Reactivate User">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getCurrentUserId() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch {
            return null;
        }
    },

    getRoleBadgeClass(role) {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'user':
                return 'bg-blue-100 text-blue-800';
            case 'viewer':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    },

    updateUsersPagination() {
        const start = (this.currentPage - 1) * this.limit + 1;
        const end = Math.min(start + this.limit - 1, this.totalCount);
        
        document.getElementById('usersShowingStart').textContent = start;
        document.getElementById('usersShowingEnd').textContent = end;
        document.getElementById('usersTotalCount').textContent = this.totalCount;
        
        const prevBtn = document.getElementById('usersPrevPage');
        const nextBtn = document.getElementById('usersNextPage');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
    },

    // User Form Functions
    showAddUserForm() {
        this.editingUser = null;
        document.getElementById('userFormTitle').textContent = 'Add New User';
        document.getElementById('userFormSubmitText').textContent = 'Create User';
        document.getElementById('passwordField').style.display = 'block';
        document.getElementById('userPassword').required = true;
        
        // Reset form
        document.getElementById('userForm').reset();
        document.getElementById('userIsActive').checked = true;
        
        document.getElementById('userFormModal').classList.remove('hidden');
    },

    async editUser(userId) {
        try {
            const response = await this.apiCall(`/users/${userId}`, { method: 'GET' });
            const user = response.data.user;
            
            this.editingUser = user;
            
            document.getElementById('userFormTitle').textContent = 'Edit User';
            document.getElementById('userFormSubmitText').textContent = 'Update User';
            document.getElementById('passwordField').style.display = 'none';
            document.getElementById('userPassword').required = false;
            
            // Populate form
            document.getElementById('userId').value = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userFullName').value = user.full_name || '';
            document.getElementById('userRole').value = user.role;
            document.getElementById('userIsActive').checked = user.is_active;
            
            document.getElementById('userFormModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('❌ Error loading user for edit:', error);
            this.showNotification('Failed to load user details', 'error');
        }
    },

    closeUserForm() {
        document.getElementById('userFormModal').classList.add('hidden');
        document.getElementById('userForm').reset();
        this.editingUser = null;
    },

    async handleUserFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            full_name: formData.get('full_name'),
            role: formData.get('role'),
            is_active: formData.has('is_active')
        };
        
        if (!this.editingUser) {
            userData.password = formData.get('password');
        }
        
        try {
            const submitBtn = document.getElementById('userFormSubmitBtn');
            const submitSpinner = document.getElementById('userFormSubmitSpinner');
            
            submitBtn.disabled = true;
            submitSpinner.classList.remove('hidden');
            
            let response;
            if (this.editingUser) {
                // Update existing user
                response = await this.apiCall(`/users/${this.editingUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            } else {
                // Create new user
                response = await this.apiCall('/users', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            }
            
            this.showNotification(response.message || 'User saved successfully', 'success');
            this.closeUserForm();
            await this.loadUsers(this.currentPage);
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ Error saving user:', error);
            this.showNotification(error.message || 'Failed to save user', 'error');
        } finally {
            const submitBtn = document.getElementById('userFormSubmitBtn');
            const submitSpinner = document.getElementById('userFormSubmitSpinner');
            
            submitBtn.disabled = false;
            submitSpinner.classList.add('hidden');
        }
    },

    // Password Reset Functions
    showPasswordResetModal(userId, username) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('resetUserName').textContent = username;
        document.getElementById('passwordResetForm').reset();
        document.getElementById('passwordResetModal').classList.remove('hidden');
    },

    closePasswordResetModal() {
        document.getElementById('passwordResetModal').classList.add('hidden');
        document.getElementById('passwordResetForm').reset();
    },

    async handlePasswordResetSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');
        const userId = formData.get('userId');
        
        if (newPassword !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('passwordResetSubmitBtn');
            submitBtn.disabled = true;
            
            const response = await this.apiCall(`/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ new_password: newPassword })
            });
            
            this.showNotification(response.message || 'Password reset successfully', 'success');
            this.closePasswordResetModal();
            
        } catch (error) {
            console.error('❌ Error resetting password:', error);
            this.showNotification(error.message || 'Failed to reset password', 'error');
        } finally {
            document.getElementById('passwordResetSubmitBtn').disabled = false;
        }
    },

    // Delete User Functions
    showDeleteUserModal(userId, username) {
        this.deletingUserId = userId;
        document.getElementById('deleteUserName').textContent = username;
        document.getElementById('deleteUserModal').classList.remove('hidden');
    },

    closeDeleteUserModal() {
        document.getElementById('deleteUserModal').classList.add('hidden');
        this.deletingUserId = null;
    },

    async confirmDeleteUser() {
        if (!this.deletingUserId) return;
        
        try {
            const confirmBtn = document.getElementById('deleteUserConfirmBtn');
            confirmBtn.disabled = true;
            
            const response = await this.apiCall(`/users/${this.deletingUserId}`, {
                method: 'DELETE'
            });
            
            this.showNotification(response.message || 'User deactivated successfully', 'success');
            this.closeDeleteUserModal();
            await this.loadUsers(this.currentPage);
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showNotification(error.message || 'Failed to delete user', 'error');
        } finally {
            document.getElementById('deleteUserConfirmBtn').disabled = false;
        }
    },

    async reactivateUser(userId) {
        try {
            const response = await this.apiCall(`/users/${userId}/activate`, {
                method: 'POST'
            });
            
            this.showNotification(response.message || 'User reactivated successfully', 'success');
            await this.loadUsers(this.currentPage);
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ Error reactivating user:', error);
            this.showNotification(error.message || 'Failed to reactivate user', 'error');
        }
    },

    // Event Listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput && !searchInput.hasUserManagementListener) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.loadUsers(1);
                }, 500);
            });
            searchInput.hasUserManagementListener = true;
        }
        
        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter && !roleFilter.hasUserManagementListener) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.loadUsers(1);
            });
            roleFilter.hasUserManagementListener = true;
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter && !statusFilter.hasUserManagementListener) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.loadUsers(1);
            });
            statusFilter.hasUserManagementListener = true;
        }
        
        // User form
        const userForm = document.getElementById('userForm');
        if (userForm && !userForm.hasUserManagementListener) {
            userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
            userForm.hasUserManagementListener = true;
        }
        
        // Password reset form
        const passwordResetForm = document.getElementById('passwordResetForm');
        if (passwordResetForm && !passwordResetForm.hasUserManagementListener) {
            passwordResetForm.addEventListener('submit', (e) => this.handlePasswordResetSubmit(e));
            passwordResetForm.hasUserManagementListener = true;
        }
    },

    // Pagination Functions
    async previousUsersPage() {
        if (this.currentPage > 1) {
            await this.loadUsers(this.currentPage - 1);
        }
    },

    async nextUsersPage() {
        if (this.currentPage < this.totalPages) {
            await this.loadUsers(this.currentPage + 1);
        }
    },

    async sortUsers(field) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            this.sortField = field;
            this.sortOrder = 'ASC';
        }
        
        await this.loadUsers(1);
    },

    // Utility Functions
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    },

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    },

    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.dashboardHelpers && window.dashboardHelpers.showNotification) {
            window.dashboardHelpers.showNotification(message, type);
        } else {
            // Fallback to console
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
};

// Global functions for HTML onclick handlers
window.showAddUserForm = () => window.userManagement.showAddUserForm();
window.closeUserForm = () => window.userManagement.closeUserForm();
window.closePasswordResetModal = () => window.userManagement.closePasswordResetModal();
window.closeDeleteUserModal = () => window.userManagement.closeDeleteUserModal();
window.showDeleteUserModal = (userId, username) => window.userManagement.showDeleteUserModal(userId, username);
window.confirmDeleteUser = () => window.userManagement.confirmDeleteUser();
window.previousUsersPage = () => window.userManagement.previousUsersPage();
window.nextUsersPage = () => window.userManagement.nextUsersPage();
window.sortUsers = (field) => window.userManagement.sortUsers(field);
window.closeUserManagement = () => window.userManagement.closeUserManagement(); 