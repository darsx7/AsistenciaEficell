export const SessionManager = {
    getSessionId() {
        return localStorage.getItem('efficell_session_id');
    },

    createSessionId() {
        const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('efficell_session_id', id);
        return id;
    },

    clearSession() {
        localStorage.removeItem('efficell_session_id');
    },

    // Simula detección de IP (en frontend real esto viene del server)
    getMetadata() {
        return {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }
};
