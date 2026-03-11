export function initBubble() {
    const bubble = document.getElementById('chat-bubble');
    const window = document.getElementById('chat-window');
    const badge = document.getElementById('bubble-badge');
    const closeBtn = document.getElementById('btn-close-chat');

    let isOpen = false;

    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            window.classList.remove('hidden');
            badge.classList.add('hidden'); // Clear badge on open
            // Trigger animation or logic here
        } else {
            window.classList.add('hidden');
        }
    }

    if (bubble) {
        bubble.addEventListener('click', toggleChat);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', toggleChat);
    }

    // Expose for external calls (e.g. from standalone link)
    return {
        open: () => {
            if (!isOpen) toggleChat();
        }
    };
}
