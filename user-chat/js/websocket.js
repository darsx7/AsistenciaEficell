import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, setDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqO2_80YsxHbQLgruX5D9B1gukuSAbIkA",
    authDomain: "eficell-webchat.firebaseapp.com",
    projectId: "eficell-webchat",
    storageBucket: "eficell-webchat.firebasestorage.app",
    messagingSenderId: "436575436281",
    appId: "1:436575436281:web:d2175f11766ddbeebe1128",
    measurementId: "G-9NXGB74WKM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Autenticación anónima para el usuario
signInAnonymously(auth).catch((error) => {
    console.error("Error en auth anónima:", error);
});

export const FirebaseService = {
    // Escuchar cambios en la sesión (estado, permisos)
    listenToSession(sessionId, callback) {
        return onSnapshot(doc(db, "sessions", sessionId), (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                callback(null);
            }
        });
    },

    // Escuchar mensajes
    listenToMessages(sessionId, callback) {
        const q = query(collection(db, "sessions", sessionId, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            callback(messages);
        });
    },

    // Crear/Inicializar sesión
    async initSession(sessionId, metadata) {
        await setDoc(doc(db, "sessions", sessionId), {
            id: sessionId,
            status: 'bot', // Estado inicial
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
            unreadCount: 0,
            permissions: {
                allowAudio: false,
                allowFile: false,
                allowLocation: false
            },
            metadata: metadata
        }, { merge: true });
    },

    async updateSessionStatus(sessionId, status) {
        await updateDoc(doc(db, "sessions", sessionId), {
            status: status
        });
    },

    async sendMessage(sessionId, message) {
        const msgData = {
            sender: 'user',
            ...message,
            timestamp: serverTimestamp(),
            isRead: false
        };

        await addDoc(collection(db, "sessions", sessionId, "messages"), msgData);
        await updateDoc(doc(db, "sessions", sessionId), {
            lastMessageAt: serverTimestamp(),
            unreadCount: 1 // Incrementar (lógica real necesitaría transacción o Cloud Function)
        });
    },

    async uploadFile(file, sessionId) {
        const storageRef = ref(storage, `sessions/${sessionId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    }
};
