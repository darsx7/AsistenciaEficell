import { SessionManager } from './session.js';
import { FirebaseService } from './websocket.js';
import { BotService } from './bot.js';
import { initBubble } from './bubble.js';

// Init
const bubbleCtrl = initBubble();
let sessionId = SessionManager.getSessionId();
let currentStatus = 'bot'; // bot, waiting, active, inactive

// Elements
const messagesArea = document.getElementById('messages-area');
const input = document.getElementById('message-input');
const sendBtn = document.getElementById('btn-send');
const attachBtn = document.getElementById('btn-attach');
const micBtn = document.getElementById('btn-mic');
const connectBtn = document.getElementById('btn-connect');
const headerStatus = document.getElementById('header-status');
const headerTitle = document.getElementById('header-title');
const avatar = document.getElementById('agent-avatar');
const btnOpenBubble = document.getElementById('btn-open-bubble');

// Logic
async function init() {
    if (!sessionId) {
        // No previous session, start fresh
        sessionId = SessionManager.createSessionId();
        await FirebaseService.initSession(sessionId, SessionManager.getMetadata());
    } else {
        // Check persistence (Pseudo-code for modal "Resume/New")
        const exists = true; // In real implementation check Firestore
        if (exists) {
            // Restore
            console.log("Restoring session", sessionId);
        }
    }

    // Listeners
    FirebaseService.listenToSession(sessionId, (data) => {
        if (data) {
            updateUI(data);
        }
    });

    FirebaseService.listenToMessages(sessionId, (messages) => {
        renderMessages(messages);
    });

    // Bubble link
    if (btnOpenBubble) {
        btnOpenBubble.addEventListener('click', () => {
            // In a real scenario this would maybe redirect or open the bubble if embedded
            alert("En modo standalone esto es solo demostrativo. En una integración real abriría el iframe.");
        });
    }
}

function updateUI(sessionData) {
    currentStatus = sessionData.status;
    headerStatus.textContent = currentStatus === 'active' ? 'Conectado' :
                               currentStatus === 'waiting' ? 'Esperando...' :
                               currentStatus === 'bot' ? 'Bot activo' : 'Desconectado';

    // Header Info
    if (currentStatus === 'active') {
        headerTitle.textContent = "Agente Eficell"; // Should come from sessionData.agentName
        avatar.textContent = "👤";
        avatar.classList.remove('robot');
        connectBtn.classList.add('hidden'); // Hide connect button if active
    } else {
        headerTitle.textContent = "Bot Eficell";
        avatar.textContent = "🤖";
        avatar.classList.add('robot');
    }

    // Permissions
    if (sessionData.permissions.allowFile) attachBtn.classList.remove('hidden');
    else attachBtn.classList.add('hidden');

    if (sessionData.permissions.allowAudio) micBtn.classList.remove('hidden');
    else micBtn.classList.add('hidden');
}

function renderMessages(messages) {
    messagesArea.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.sender}`;
        div.textContent = msg.content; // Should handle types (image, etc)
        messagesArea.appendChild(div);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Input Handlers
sendBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;

    // Optimistic UI
    renderMessages([{ sender: 'user', content: text, type: 'text' }]); // This will be overwritten by listener
    input.value = '';

    if (currentStatus === 'bot') {
        // Bot Logic
        const response = await BotService.handleMessage(text);
        renderMessages([{ sender: 'bot', ...response }]); // Local render for bot
    } else {
        // Firestore
        await FirebaseService.sendMessage(sessionId, { type: 'text', content: text });
    }
});

if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        // Confirmation Flow
        const confirm = confirm("¿Deseas conectar con un agente?");
        if (confirm) {
            await FirebaseService.updateSessionStatus(sessionId, 'waiting');
            // Create notification is handled by Cloud Functions triggers ideally, or we write to 'notifications' collection here
            // For now assume backend trigger or simple write
            alert("Conectando...");
        }
    });
}

// Start
init();
