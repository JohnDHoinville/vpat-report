// Edit Testing Session Functionality
// This file contains the edit functionality for testing sessions

// Add edit form data to dashboard object
window.addEditSessionFormData = function() {
    // This should be added to the dashboard object around line 368 in dashboard_helpers.js
    const editFormData = {
        // Edit Testing Session Form (populated when editing)
        editTestingSession: {
            id: null,
            name: '',
            description: '',
            conformance_level: '',
            status: ''
        }
    };
    
    return editFormData;
};

// Replace the editTestingSession function in dashboard_helpers.js around line 5466
window.editTestingSessionReplacement = function(session) {
    console.log('🔧 Editing testing session:', session);
    
    if (!session) {
        console.error('❌ No session provided for editing');
        this.showNotification('Error: No session selected for editing', 'error');
        return;
    }
    
    // Initialize editTestingSession form if it doesn't exist
    if (!this.editTestingSession) {
        this.editTestingSession = {
            id: null,
            name: '',
            description: '',
            conformance_level: '',
            status: ''
        };
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

// Add this function after editTestingSession in dashboard_helpers.js
window.updateTestingSessionReplacement = async function() {
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