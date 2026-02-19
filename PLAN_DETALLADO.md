# Plan de Implementación Exhaustivo: Sistema de Chat Eficell

Este documento detalla la arquitectura, modelo de datos y plan de desarrollo para cumplir con el 100% de los requisitos descritos en `ChatAgenteAndroid.md` (App Agente) y `ChatUsuarioWeb.md` (Web Usuario).

---

## 1. Arquitectura del Sistema

El proyecto se estructurará como un **Monorepo** para facilitar la integración y despliegue conjunto en Firebase.

*   **Plataforma Base:** Firebase (Google Cloud).
    *   **Firestore:** Base de datos NoSQL en tiempo real (Persistencia de chats, estados, configuraciones).
    *   **Authentication:** Gestión de acceso para Agentes (Email/Pass) y Usuarios (Anónimo).
    *   **Storage:** Almacenamiento de multimedia (Fotos, Videos, Audios, Archivos).
    *   **Hosting:** Alojamiento de la Web Usuario y la Web App del Agente.
*   **Cliente 1: App Agente (Android/Web)**
    *   **Tecnología:** Vue.js 3 + Framework7 (Interfaz Nativa Android).
    *   **Compilación:** Capacitor (para generar APK Android) + SPA (para uso web).
    *   **Características:** Manejo de estado complejo (Pinia), Edición multimedia (Canvas/JS), Navegación nativa.
*   **Cliente 2: Chat Usuario (Web)**
    *   **Tecnología:** HTML5 + CSS3 + Vanilla JavaScript (Sin frameworks pesados).
    *   **Formatos:** Standalone (Página completa) y Burbuja (Widget embebible).
    *   **Características:** Ligero, compatible con cualquier navegador, persistencia local.

---

## 2. Modelo de Datos (Firestore Schema)

Para soportar toda la lógica descrita, se define el siguiente esquema de base de datos.

### Colección `users` (Agentes)
*   `uid`: ID único (Auth).
*   `name`: Nombre visible.
*   `email`: Correo electrónico.
*   `photoUrl`: URL de la foto de perfil (visible al usuario).
*   `status`: "online" | "offline" | "busy".
*   `settings`: Objeto con preferencias (tema, notificaciones, etc.).

### Colección `sessions` (Chats)
Cada documento representa una conexión de un usuario web.
*   `id`: ID único de sesión (generado o persistido).
*   `status`:
    *   `bot`: Interactuando con el bot (simulación).
    *   `waiting`: Esperando agente (tras confirmar "Conectar").
    *   `active`: Atendido por un agente.
    *   `inactive`: Sesión cerrada/abandonada.
    *   `transfer_email`: Derivado a correo.
*   `agentId`: UID del agente asignado (o `null`).
*   `userName`: Nombre del usuario web (o "Visitante").
*   `createdAt`: Timestamp inicio.
*   `lastMessageAt`: Timestamp último mensaje (para ordenamiento).
*   `unreadCount`: Contador de mensajes no leídos por el agente.
*   **Permissions (Toggles del Agente):**
    *   `allowAudio`: Boolean (default `false`).
    *   `allowFile`: Boolean (default `false`).
    *   `allowLocation`: Boolean (default `false`).
*   **Transfer Data (Si status = transfer_email):**
    *   `transferSubject`: Asunto.
    *   `transferEmail`: Correo destino.
    *   `transferMessage`: Mensaje adjunto.
*   **Metadata:** IP, User Agent, Referer.

### Sub-colección `sessions/{sessionId}/messages`
*   `id`: ID mensaje.
*   `sender`: "user" | "agent" | "bot" | "system".
*   `type`: "text" | "image" | "video" | "audio" | "file" | "location".
*   `content`: Texto o URL del archivo.
*   `timestamp`: Hora del servidor.
*   `isRead`: Boolean.
*   **Metadata Multimedia:**
    *   `duration`: (Audio/Video) Segundos.
    *   `fileName`: (Archivos) Nombre original.
    *   `location`: (Mapas) `{ lat, lng, address }`.

### Colección `notifications` (Global App Agente)
Eventos para la barra superior global.
*   `id`: ID notificación.
*   `type`: "contact_request" (🟡) | "agent_connected" (🟢).
*   `sessionId`: Referencia al chat.
*   `message`: Texto resumen.
*   `status`: "unread" | "read".
*   `timestamp`: Hora evento.

---

## 3. Análisis Detallado: App Agente (`ChatAgenteAndroid.md`)

### 3.1. Navegación y Estructura Global
*   **Barra Superior Global:** Implementar componente persistente en `App.vue` con botón de Notificaciones (Badge reactivo a colección `notifications` filtrada por `unread`).
*   **Barra Inferior:** Navegación por Tabs de Framework7:
    *   `Chat`: Vista principal (Lista de sesiones).
    *   `Profile`: Vista perfil agente.
    *   `Emails`: Vista placeholder ("Próximamente").
    *   `Config`: Vista ajustes.

### 3.2. Panel de Notificaciones (Sección 1)
*   **UI:** Panel lateral o popup con dos listas: "Sin leer" (fondo resaltado) y "Leídas".
*   **Lógica de Acceso (Critical Path):**
    *   Al hacer click en notificación, ejecutar `checkSessionStatus(sessionId)`:
    *   *Caso 1: Otro agente (`agentId != me`)* -> `Dialog: "¿Visualizar?"` -> Navegar modo `readonly`.
    *   *Caso 2: Yo (`agentId == me`)* -> Navegar directo a `ChatView`.
    *   *Caso 3: Inactiva (`status == 'inactive'`)* -> `Dialog: "¿Entrar?"` -> Navegar modo histórico.
    *   *Caso 4: Sin agente (`status == 'waiting'`)* -> `Dialog: "¿Atender?"` -> Asignar `agentId = me`, cambiar `status = active`, enviar Auto-Mensaje -> Navegar.
    *   *Caso 5: Bot (`status == 'bot'`)* -> `Dialog: "¿Visualizar?"` -> Navegar modo `readonly` (sin input).
*   **Limpieza:** Al cerrar el panel, iterar IDs visibles y actualizar `status = 'read'` en Firestore.

### 3.3. Funcionalidades del Chat (Sección 2)
*   **Barra Superior Chat:** Mostrar nombre usuario, botón "Sesiones" (volver), botón "Transferir".
*   **Menú Adjuntos (Agente):** Botón Clip abre `ActionSheet`:
    *   **Cámara:** Input nativo `capture="environment"`. Si es foto -> `ImageEditor`. Si es video -> `VideoEditor`.
    *   **Archivos:** Input `type="file"`.
    *   **Media:** Input `type="file" accept="image/*,video/*"`.
    *   **Ubicación:** Abrir modal con Mapa.
*   **Editores Multimedia:**
    *   **Imágenes:** Componente con `Canvas`. Herramientas: Dibujo libre (color), Texto sobre imagen, Recorte (librería `cropperjs` o similar).
    *   **Video:** Componente con `<video>`. UI con slider de rango (inicio-fin). Lógica para guardar metadata de recorte (procesamiento en cliente si es posible via ffmpeg.wasm o solo metadata). Toggle "Silenciar".
*   **Audio:** Componente `AudioRecorder`. Eventos: `touchstart` (grabar), `touchend` (pausar). Botones: Play (escuchar), Trash (borrar), Send (subir y enviar).
*   **Ubicación:** Mapa (Leaflet/Google Maps). Pin arrastrable. Botón "GPS" (centrar). Input dirección editable (Reverse Geocoding). Botón "Enviar" -> Mensaje tipo `location`.
*   **Mensajes:**
    *   Selección múltiple (long press) -> Toolbar inferior "Eliminar".
    *   Eliminación lógica (`deleted: true`) visible solo para admins/agentes, oculto para usuario.

### 3.4. Gestión de Sesiones (Sección 3)
*   **Lista de Sesiones:** Tabs: "Activas" (🟢), "Inactivas/Bot" (⚫/🤖), "Transferidas" (📧). Indicadores en tiempo real.
*   **Info de Sesión (Botón ℹ️):**
    *   Mostrar metadatos (ID, Hora, IP).
    *   **Toggles de Control Usuario:**
        *   `Switch Audio`: Actualiza `session.permissions.allowAudio`.
        *   `Switch Archivos`: Actualiza `session.permissions.allowFile`.
        *   `Switch Ubicación`: Actualiza `session.permissions.allowLocation`.
    *   **Acciones:**
        *   "Desconectarme": `agentId = null`, `status = 'waiting'` (o inactive).
        *   "Eliminar chat": Borrado lógico o físico (según política).

### 3.5. Transferencia (Sección 4)
*   **A Chat:** Seleccionar agente de lista `users` (online) -> Actualizar `agentId` -> Mensaje sistema "Transferido a X".
*   **A Email:** Formulario (Asunto, Email, Mensaje) -> Actualizar `status = 'transfer_email'`, guardar datos en documento -> Enviar correo (Trigger Cloud Function o cliente).

### 3.6. Perfil y Configuración (Sección 5)
*   **Perfil:** Formulario edición (Nombre, Pass). Subida de foto perfil.
*   **Config:** `localStorage` para preferencias locales (Tema oscuro, tamaño fuente).

---

## 4. Análisis Detallado: Chat Usuario Web (`ChatUsuarioWeb.md`)

### 4.1. Modos de Visualización
*   **Standalone (`index.html`):** Layout completo. Header con Botón "Conectar".
*   **Burbuja (`bubble.html`):** Layout transparente. Botón flotante abre iframe/div de chat. Sin botón "Conectar" (asume flujo directo o espera).
*   **Persistencia:** Al cargar, verificar `localStorage.getItem('sessionId')`. Si existe -> `getDoc(firestore)`.
    *   Si hay sesión previa: Mostrar Modal "Reanudar / Nueva".
    *   "Reanudar": Cargar historial `messages`.
    *   "Nueva": Borrar ID, iniciar limpio.

### 4.2. Lógica del Bot (Pre-conexión)
*   Estado inicial `status = 'bot'`.
*   Usuario escribe -> `bot.js` detecta input -> `setTimeout` -> Respuesta predefinida ("Mensaje de bot").
*   **Botón Conectar (Standalone):**
    *   Click -> Mensaje Bot "¿Conectar con agente?".
    *   Usuario "Sí" -> Crear documento `sessions` (`status='waiting'`), crear notificación en App Agente. Mensaje sistema "Conectando...".
    *   Usuario "No" -> Bot "¿Nueva consulta?".
        *   "Nueva" -> Insertar separador visual "--- Nueva Consulta ---".

### 4.3. Interfaz de Chat y Input
*   **Restricción Default:** Solo input texto visible.
*   **Reactividad de Permisos:**
    *   Escuchar cambios en `sessions/{id}`.
    *   Si `allowAudio == true` -> Mostrar botón Micrófono.
    *   Si `allowFile == true` -> Mostrar botón Clip.
    *   Si `allowLocation == true` -> Mostrar botón Mapa.
*   **Adjuntos Usuario (Simplificado):**
    *   Click Clip -> Input File (Video/Img).
    *   Previsualización simple con "X" para eliminar.
    *   Click Enviar -> Subir a Storage -> Crear mensaje.
*   **Audio Usuario:**
    *   UI Simple: Botón presionado (Grabar), Soltar (Pausar). Botones extra: Borrar / Enviar. (Sin seek, sin reanudar).

### 4.4. Estados Visuales (Header)
*   `status = 'bot'`: Icono Robot, Título "Bot Eficell".
*   `status = 'waiting'`: Título "Esperando agente...", Animación loading.
*   `status = 'active'`: Foto Agente (circular), Nombre Agente, Punto Verde 🟢.
*   `status = 'transfer_email'`: Mensaje sistema "Derivado por email...".
*   `status = 'inactive'`: Título "Chat finalizado", Punto Negro ⚫.

---

## 5. Trazabilidad y Flujos Cruzados

| Acción Agente (App) | Efecto en Firestore | Reacción Usuario (Web) |
| :--- | :--- | :--- |
| Click "Atender Consulta" | `status='active'`, `agentId='me'` | Header cambia a Foto Agente. Mensaje "X ha tomado tu sesión". |
| Toggle "Habilitar Audio" | `permissions.allowAudio = true` | Botón Micrófono aparece en barra input. |
| Envía Ubicación | Crea msg `type='location'` | Aparece burbuja con mapa interactivo y dirección. |
| Transfiere a otro Agente | `agentId='otro_uid'` | Mensaje "Transferido a [Nuevo Agente]". Cambia foto header. |
| Finaliza Chat | `status='inactive'` | Input se deshabilita (opcional) o Header muestra "Desconectado". |
| Elimina Mensaje | `msg.deleted = true` | Mensaje desaparece del DOM del usuario. |

---

## 6. Consideraciones Técnicas Adicionales

*   **Compresión:** Uso de `browser-image-compression` en ambos clientes antes de subir a Storage.
*   **Seguridad:** `firestore.rules` bloqueará lectura de `sessions` a usuarios anónimos salvo la suya propia (`request.auth.uid == resource.data.id` o similar por token). Agentes tienen lectura global.
*   **Offline:** Framework7 maneja detección de red. Firestore tiene caché offline, pero para chat en vivo se prioriza conexión.

Este plan cubre la **totalidad** de los flujos y requisitos visuales/lógicos especificados en los documentos MD proporcionados.
