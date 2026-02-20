import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, setDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export const AgentFirebaseService = {
    // Sesiones
    listenToAllSessions(callback) {
        const q = query(collection(db, "sessions"), orderBy("lastMessageAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(sessions);
        });
    },

    listenToSession(sessionId, callback) {
        return onSnapshot(doc(db, "sessions", sessionId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...doc.data() });
        });
    },

    // Mensajes
    listenToMessages(sessionId, callback) {
        const q = query(collection(db, "sessions", sessionId, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(messages);
        });
    },

    async sendMessage(sessionId, messageData) {
        await addDoc(collection(db, "sessions", sessionId, "messages"), {
            ...messageData,
            sender: 'agent',
            timestamp: serverTimestamp(),
            isRead: false
        });

        await updateDoc(doc(db, "sessions", sessionId), {
            lastMessageAt: serverTimestamp()
        });
    },

    // Acciones de Sesión
    async takeSession(sessionId, agentId, agentName) {
        await updateDoc(doc(db, "sessions", sessionId), {
            status: 'active',
            agentId: agentId,
            agentName: agentName
        });
        // Mensaje automático
        await this.sendMessage(sessionId, {
            type: 'system',
            content: `${agentName} tomó tu sesión`
        });
        await this.sendMessage(sessionId, {
            type: 'text',
            content: `Hola, soy ${agentName}, dame un momento ahora te ayudo`
        });
    },

    async endSession(sessionId) {
        await updateDoc(doc(db, "sessions", sessionId), {
            status: 'inactive',
            agentId: null
        });
        await this.sendMessage(sessionId, {
            type: 'system',
            content: 'El agente se ha desconectado'
        });
    },

    async deleteSession(sessionId) {
        // Borrado lógico o físico. Aquí físico por simplicidad de MVP, o update status='deleted'
        await updateDoc(doc(db, "sessions", sessionId), {
            status: 'deleted'
        });
    },

    // Permisos y Transferencias
    async updatePermissions(sessionId, permissions) {
        await updateDoc(doc(db, "sessions", sessionId), {
            permissions: permissions
        });
    },

    async transferChat(sessionId, targetAgentId) {
        await updateDoc(doc(db, "sessions", sessionId), {
            agentId: targetAgentId
        });
        await this.sendMessage(sessionId, {
            type: 'system',
            content: `Has sido transferido a otro agente`
        });
    },

    async transferEmail(sessionId, emailData) {
        await updateDoc(doc(db, "sessions", sessionId), {
            status: 'transfer_email',
            transferData: emailData
        });
        await this.sendMessage(sessionId, {
            type: 'system',
            content: `Tu consulta fue derivada por email a ${emailData.userEmail}`
        });
    },

    // Multimedia
    async uploadFile(file, sessionId) {
        const storageRef = ref(storage, `sessions/${sessionId}/agent_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    },

    // Notificaciones Globales
    listenToNotifications(callback) {
        const q = query(collection(db, "notifications"), where("status", "==", "unread"), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(notifs);
        });
    },

    async markNotificationRead(notifId) {
        await updateDoc(doc(db, "notifications", notifId), {
            status: 'read'
        });
    }
};
