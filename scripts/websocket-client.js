const { io } = require('socket.io-client');

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    async connect() {
        try {
            console.log('🔌 Connecting to WebSocket server...');
            
            this.socket = io('http://localhost:3001', {
                auth: {
                    token: 'worker-token' // Special token for worker
                },
                transports: ['websocket', 'polling'],
                timeout: 10000
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket client connected');
                this.connected = true;
                this.reconnectAttempts = 0;
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket client disconnected:', reason);
                this.connected = false;
                
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        this.connect();
                    }, this.reconnectDelay);
                }
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error.message);
                this.connected = false;
            });

        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error.message);
        }
    }

    emitSessionProgress(sessionId, progressData) {
        if (!this.connected || !this.socket) {
            console.log('⚠️ WebSocket not connected, skipping progress update');
            return;
        }

        try {
            this.socket.emit('session_progress', {
                sessionId,
                progress: progressData,
                timestamp: new Date().toISOString()
            });
            console.log(`📡 Emitted session progress: ${sessionId} - ${progressData.percentage}%`);
        } catch (error) {
            console.error('❌ Error emitting session progress:', error.message);
        }
    }

    emitSessionComplete(sessionId, results) {
        if (!this.connected || !this.socket) {
            console.log('⚠️ WebSocket not connected, skipping completion update');
            return;
        }

        try {
            this.socket.emit('session_complete', {
                sessionId,
                results,
                timestamp: new Date().toISOString()
            });
            console.log(`📡 Emitted session complete: ${sessionId}`);
        } catch (error) {
            console.error('❌ Error emitting session complete:', error.message);
        }
    }

    emitTestResults(sessionId, pageId, testData) {
        if (!this.connected || !this.socket) {
            console.log('⚠️ WebSocket not connected, skipping test results update');
            return;
        }

        try {
            this.socket.emit('test_results', {
                sessionId,
                pageId,
                testData,
                timestamp: new Date().toISOString()
            });
            console.log(`📡 Emitted test results: ${sessionId} - ${pageId}`);
        } catch (error) {
            console.error('❌ Error emitting test results:', error.message);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
            console.log('🔌 WebSocket client disconnected');
        }
    }
}

module.exports = WebSocketClient; 