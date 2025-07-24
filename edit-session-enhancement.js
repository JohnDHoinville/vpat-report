// Edit Testing Session Enhancement
// This script enhances the dashboard with edit functionality for testing sessions

console.log('🔧 Loading edit session enhancement...');

document.addEventListener('DOMContentLoaded', function() {
    // Wait for dashboard to be available
    setTimeout(() => {
        if (window.dashboard && window.Alpine) {
            console.log('🔧 Enhancing dashboard with edit session functionality');
            
            // Get dashboard instance
            const dashboardComponent = Alpine.$data(document.querySelector('[x-data*="dashboard"]'));
            
            if (dashboardComponent) {
                // Add edit form data if it doesn't exist
                if (!dashboardComponent.editTestingSession) {
                    dashboardComponent.editTestingSession = {
                        id: null,
                        name: '',
                        description: '',
                        conformance_level: '',
                        status: ''
                    };
                }
                
                // Add showEditTestingSession modal state if it doesn't exist
                if (dashboardComponent.showEditTestingSession === undefined) {
                    dashboardComponent.showEditTestingSession = false;
                }
                
                // Enhanced editTestingSession function
                const originalEditFunction = dashboardComponent.editTestingSession;
                dashboardComponent.editTestingSession = function(session) {
                    console.log('🔧 Editing testing session:', session);
                    
                    if (!session) {
                        console.error('❌ No session provided for editing');
                        this.showNotification('Error: No session selected for editing', 'error');
                        return;
                    }
                    
                    // Populate the edit form with session data
                    this.editTestingSession = {
                        id: session.id,
                        name: session.name || '',
                        description: session.description || '',
                        conformance_level: session.conformance_level || '',
                        status: session.status || ''
                    };
                    
                    console.log('📝 Edit form populated:', this.editTestingSession);
                    
                    // Show the edit modal
                    this.showEditTestingSession = true;
                    
                    console.log('✅ Edit session modal opened');
                };
                
                // Add updateTestingSession function
                dashboardComponent.updateTestingSession = async function() {
                    if (!this.editTestingSession.id || !this.editTestingSession.name.trim()) {
                        this.showNotification('Please fill in all required fields', 'error');
                        return;
                    }

                    try {
                        this.loading = true;
                        
                        const updateData = {
                            name: this.editTestingSession.name.trim(),
                            description: this.editTestingSession.description.trim(),
                            status: this.editTestingSession.status
                        };

                        const response = await this.apiCall(`/sessions/${this.editTestingSession.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(updateData)
                        });

                        if (response.success) {
                            this.showNotification(`Session "${updateData.name}" updated successfully`, 'success');
                            
                            // Close the modal
                            this.showEditTestingSession = false;
                            
                            // Reset the form
                            this.editTestingSession = {
                                id: null,
                                name: '',
                                description: '',
                                conformance_level: '',
                                status: ''
                            };
                            
                            // Refresh the sessions list
                            await this.loadTestingSessions();
                        } else {
                            console.error('❌ Failed to update session:', response.error);
                            this.showNotification(response.error || 'Failed to update session', 'error');
                        }
                    } catch (error) {
                        console.error('❌ Error updating session:', error);
                        this.showNotification('Error updating session: ' + (error.message || 'Unknown error'), 'error');
                    } finally {
                        this.loading = false;
                    }
                };
                
                console.log('✅ Edit testing session functionality added to dashboard');
            } else {
                console.error('❌ Could not find dashboard component');
            }
        } else {
            console.error('❌ Dashboard or Alpine.js not available');
        }
    }, 2000);
});

// Also expose functions globally for the modal buttons
window.editTestingSessionGlobal = function(session) {
    console.log('🔧 Global edit function called for session:', session);
    
    // Try to find the dashboard component
    const dashboardEl = document.querySelector('[x-data*="dashboard"]');
    if (dashboardEl && dashboardEl._x_dataStack) {
        const dashboard = dashboardEl._x_dataStack[0];
        if (dashboard && dashboard.editTestingSession) {
            dashboard.editTestingSession(session);
        }
    }
};

window.updateTestingSessionGlobal = async function() {
    console.log('🔧 Global update function called');
    
    // Try to find the dashboard component
    const dashboardEl = document.querySelector('[x-data*="dashboard"]');
    if (dashboardEl && dashboardEl._x_dataStack) {
        const dashboard = dashboardEl._x_dataStack[0];
        if (dashboard && dashboard.updateTestingSession) {
            await dashboard.updateTestingSession();
        }
    }
};

console.log('🔧 Edit session enhancement loaded'); 