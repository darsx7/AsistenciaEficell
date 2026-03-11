export const BotService = {
    async handleMessage(text) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    sender: 'bot',
                    type: 'text',
                    content: 'Soy el Bot de Eficell. ¿En qué puedo ayudarte? (Escribe "conectar" para hablar con un humano)',
                    timestamp: new Date() // Local time for preview
                });
            }, 1000);
        });
    },

    getConnectConfirmation() {
        return {
            sender: 'bot',
            type: 'system',
            content: '¿Deseas conectar con un agente?',
            actions: ['Sí', 'No']
        };
    },

    getConnectingMessage() {
        return {
            sender: 'system',
            type: 'text',
            content: 'Conectando con algún agente disponible...'
        };
    },

    getNewQueryPrompt() {
        return {
            sender: 'bot',
            type: 'text',
            content: '¿Nueva consulta o deseas seguir?',
            actions: ['Nueva consulta', 'Seguir']
        };
    }
};
