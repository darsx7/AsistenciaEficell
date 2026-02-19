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
    *   `deleted`: Boolean (para borrado lógico).

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
*   **Tipos de Notificación:**
    *   **🟡 Intentando contactar:** Usuario esperando ser atendido. (Fondo destacado, badge activo).
    *   **🟢 Ya contactado:** Otro agente se conectó. (Notificación actualizada).
*   **Lógica de Acceso (Critical Path):**
    *   Al hacer click en notificación, ejecutar `checkSessionStatus(sessionId)`:
    *   *Caso 1: Otro agente conectado (`agentId != me`)* -> `Dialog: "Está [X] conectado. ¿Desea visualizar?"` -> **Sí**: Visualiza el chat (modo lectura). **No**: Vuelve.
    *   *Caso 2: Yo estoy conectado (`agentId == me`)* -> Abre el chat directamente.
    *   *Caso 3: Sesión inactiva (`status == 'inactive'`)* -> `Dialog: "La sesión está inactiva. ¿Desea entrar al chat?"` -> **Sí**: Abre chat inactivo. **No**: Vuelve.
    *   *Caso 4: Sin agente conectado (`status == 'waiting'`)* -> `Dialog: "¿Desea atender esta consulta?"` -> **Sí**: Toma la sesión.
        *   -> Mensaje al usuario: "[Agente] tomó tu sesión".
        *   -> Mensaje auto: "Hola, soy [Agente], dame un momento ahora te ayudo".
    *   *Caso 5: Sesión con bot (`status == 'bot'`)* -> `Dialog: "Sesión activa con bot. ¿Desea visualizar?"` -> **Sí**: Abre chat en solo lectura (sin input, sin herramientas). **No notifica al usuario**.
*   **Limpieza:** Al cerrar el panel, todas las notificaciones pasan a "leídas" automáticamente.

### 3.3. Funcionalidades del Chat (Sección 2)
*   **Barra Superior Chat:** Mostrar nombre usuario, botón "Sesiones" (volver), botón "Transferir".
*   **Menú Adjuntos (Agente):** Botón Clip abre `ActionSheet`:
    *   **Cámara:** 📷 (Foto / Video). Si foto -> `ImageEditor`. Si video -> `VideoEditor`.
    *   **Archivos:** 📁 Cualquier tipo. **Auto-detect:** Si el archivo seleccionado es imagen (`image/*`), abrir `ImageEditor` automáticamente.
    *   **Media:** 🖼️ (Imágenes / Videos). Galería. Si imagen -> `ImageEditor`. Si video -> `VideoEditor`.
    *   **Ubicación:** 📍 Mapa interactivo.
*   **Editores Multimedia:**
    *   **Imágenes:** Componente con `Canvas`. Herramientas: ✏️ Texto, 🖊️ Lápiz + color, ✂️ Recortar (librería `cropperjs` o similar).
    *   **Video:** Componente con `<video>`. Herramientas: ✂️ Acortar / fragmento, ✏️ Editar, 🔇 Silenciar. **Lista Inferior:** Muestra todos los videos a enviar. Seleccionar cada uno para editar. **Persistencia:** Al re-editar, muestra el fragmento previamente seleccionado. **Auto-apertura:** Al adjuntar video, el editor se abre automáticamente.
*   **Audio:** Componente `AudioRecorder`. Eventos: `touchstart` (🎙️ Hold para grabar), `touchend` (pausar). Botones: **Resume** (▶️ reanudar grabación), Pause (⏸️), Play (▶️ Reproducir), Trash (🗑️ Borrar), Send (📤 Enviar).
*   **Ubicación:** Mapa (Leaflet/Google Maps).
    *   **Controles:** 🔍 Buscar (Superior derecha), ⛶ Mover (Superior izquierda), 📍 GPS (Al lado de ⛶).
    *   **Enviar:** Botón inferior. Abre **Módulo de Confirmación:**
        *   Campo dirección: Texto editable con la dirección detectada.
        *   Cancelar: Cierra solo el módulo, vuelve al mapa tal como estaba.
        *   Enviar: Confirma y envía la ubicación al chat.
*   **Previsualización Adjuntos:**
    *   **Imágenes/Videos:** Mostrar hasta 5 miniaturas.
    *   **Archivos:** Mostrar hasta 2 nombres truncados (7 chars + `...`).
    *   **Indicador `(...)`:**
        *   Si solo hay media: `(...)` al lado de imágenes.
        *   Si solo hay archivos: `(...)` al lado de archivos.
        *   Si hay ambos: `(...)` al lado de archivos.
    *   **Click en adjunto pendiente `(...)`:**
        *   **Imagen:** Módulo con previsualización + ✏️ lápiz (abre editor imagen) + ✕ cerrar.
        *   **Video:** Módulo con previsualización + ✏️ lápiz (abre editor video con fragmento actual) + ✕ cerrar.
        *   **Otro archivo:** Módulo con nombre completo + extensión + 🗑️ eliminar + ✕ cerrar.
*   **Selección y Eliminación de Mensajes:**
    *   Selección múltiple (Mantener presionado -> seleccionar más).
    *   Acción "Eliminar": Borrado lógico (`deleted: true`) para todos (incluye adjuntos).
    *   Confirmación: "¿Eliminar X mensajes?".
    *   **Visual:** El mensaje se elimina silenciosamente del chat (no muestra "eliminado").
*   **Panel de Adjuntos (al tocar nombre de usuario):**
    *   Acceso: Al tocar el nombre del usuario en la barra superior.
    *   Tabs:
        *   **📁 Archivos:** Sin imágenes, videos ni audios.
        *   **🖼️ Media / Audios:** Imágenes, videos y audios.
        *   **📍 Ubicaciones:** Ubicaciones compartidas.
    *   Acciones: ⬇️ Descargar (Siempre), 👁️ Previsualizar (Solo doc/img/vid/audio), 💬 Abrir en chat (Siempre, navega al mensaje).

### 3.4. Gestión de Sesiones (Sección 3)
*   **Lista de Sesiones:** "Panel de Sesiones" con indicadores de estado:
    *   🟢 Activa (ID, Nombre).
    *   ⚫ Inactiva (ID, Nombre).
    *   📧 Transferida (ID, Nombre).
    *   🤖 Bot (ID, Nombre).
*   **Info de Sesión (Botón ℹ️):**
    *   Acceso: Desde la Lista de Sesiones (icono ℹ️).
    *   Mostrar metadatos (ID, Hora conexión, Hora último mensaje, IP, Estado, Agente conectado, Transfer email info).
    *   **Toggles de Control Usuario (Default: Off ❌):**
        *   `Switch Adjuntar archivos`: Actualiza `session.permissions.allowFile`.
        *   `Switch Audio`: Actualiza `session.permissions.allowAudio`.
        *   `Switch Ubicación`: Actualiza `session.permissions.allowLocation`.
    *   **Adjuntos del Chat:** Referencia visual (misma data que Panel de Adjuntos).
    *   **Acciones:**
        *   "Desconectarme": Módulo flotante confirmación. Si no hay agentes -> inactiva.
        *   "Eliminar chat": Módulo flotante confirmación. Chat eliminado.

### 3.5. Transferencia (Sección 4)
*   **Escenario: Otro agente:** Acción: Confirma y notifica al usuario.
*   **Escenario: Yo mismo:** Acción: Vuelve al chat sin mensaje.
*   **A Email:** Formulario (Asunto, Email Usuario, Mensaje, ID chat auto) -> Actualizar `status = 'transfer_email'`, guardar datos en documento -> Enviar correo.

### 3.6. Perfil y Configuración (Sección 5)
*   **Perfil:** Formulario edición (Nombre visible, Contraseña, Correo). Ver/Cambiar foto (visible al usuario).
*   **Config:** `localStorage` para preferencias.
    *   Toggles: Modo oscuro/claro, GPS, Micrófono, Notificaciones externas, Burbuja flotante.
    *   Slider: Tamaño texto.

---

## 4. Análisis Detallado: Chat Usuario Web (`ChatUsuarioWeb.md`)

### 4.1. Modos de Visualización
*   **Standalone (`index.html`):** Layout completo.
    *   **Header:** Botón "Conectar con agente", Botón "Abrir vista burbuja" (🔘), Estado conexión.
*   **Burbuja (`bubble.html`):** Layout transparente (fondo plano). Burbuja flotante inferior derecha.
    *   **Animación:** Pulso suave cuando hay mensajes nuevos. Badge contador.
    *   Al click -> Abre chat flotante (sin botón conectar, sin botón de bot).
*   **Persistencia:** Al cargar, verificar `localStorage.getItem('sessionId')`. Si existe -> `getDoc(firestore)`.
    *   Si hay sesión previa: Mostrar Modal "Reanudar / Nueva sesión".
    *   "Reanudar": Cargar historial `messages`.
    *   "Nueva": Borrar ID, iniciar limpio (fase Bot).
    *   Compartida entre standalone y burbuja.

### 4.2. Lógica del Bot (Pre-conexión)
*   Estado inicial `status = 'bot'`.
*   Usuario escribe -> `bot.js` detecta input -> `setTimeout` -> Respuesta predefinida ("mensaje de bot").
*   **Botón Conectar (Standalone):**
    *   Click -> Mensaje Bot "¿Deseas conectar con un agente? Sí / No".
    *   Usuario "Sí" -> Mensaje auto "Conectando con algún agente disponible..." -> Notifica agentes -> Estado `waiting`.
    *   Usuario "No" -> Bot "¿Nueva consulta o deseas seguir?".
        *   "Nueva consulta" -> Separador visual "--- Nueva consulta ---".
        *   "Seguir" -> Vuelve al chat con bot.

### 4.3. Interfaz de Chat y Input
*   **Restricción Default:** Solo input texto visible.
*   **Reactividad de Permisos:**
    *   Escuchar cambios en `sessions/{id}`.
    *   Si `allowAudio == true` -> Mostrar botón Micrófono.
    *   Si `allowFile == true` -> Mostrar botón Clip.
    *   Si `allowLocation == true` -> Mostrar botón Mapa.
*   **Adjuntos Usuario (Simplificado):**
    *   Click Clip -> Selector único -> Input File (Video/Img/Archivo).
    *   Previsualización simple con "X" para eliminar (confirmación "¿Eliminar este adjunto?"). **Sin editor.**
    *   Compresión automática.
*   **Audio Usuario (Simplificado):**
    *   UI Simple: `Hold` (mantener presionado) para grabar. Soltar (`Pause`) para escuchar (solo pausar, sin reanudar). Botones extra: `Trash` (borrar), `Send` (enviar). **Sin botón resume.**
*   **Mensajes Recibidos:**
    *   Texto (burbuja).
    *   Imagen (miniatura expandible).
    *   Video (reproductor inline).
    *   Audio (barra reproducción).
    *   Archivo (nombre + botón descargar).
    *   Ubicación (mapa preview + dirección).
    *   Sistema (centrados).

### 4.4. Estados Visuales (Header)
*   `status = 'bot'`: Icono Robot, Título "Bot Eficell".
*   `status = 'waiting'`: Título "Conectando con algún agente disponible...", Animación loading.
*   `status = 'active'`: Foto Agente (circular), Nombre Agente, Punto Verde 🟢. Mensaje automático de bienvenida ("Hola, soy [Agente], dame un momento ahora te ayudo").
*   `status = 'transfer_email'`: Mensaje sistema "Tu consulta fue derivada por email. Recibirás respuesta en [correo]".
*   `status = 'inactive'`: Título "El agente se ha desconectado", Punto Negro ⚫.

### 4.5. Estructura de Archivos (User Chat)
Debe seguir estrictamente el esquema proporcionado:
```
user-chat/
├── index.html          ← Chat standalone (bot + conectar)
├── bubble.html         ← Fondo plano + burbuja
├── css/
│   ├── chat.css
│   ├── bubble.css
│   └── themes.css
├── js/
│   ├── chat.js         ← Lógica del chat
│   ├── bot.js          ← Simulación del bot
│   ├── bubble.js       ← Lógica de la burbuja
│   ├── session.js      ← Persistencia de sesión
│   └── websocket.js    ← Conexión en tiempo real (Firebase Listener)
└── assets/
    └── icons/
```

---

## 5. Trazabilidad y Flujos Cruzados

| Acción Agente (App) | Efecto en Firestore | Reacción Usuario (Web) |
| :--- | :--- | :--- |
| Click "Atender Consulta" | `status='active'`, `agentId='me'` | Header cambia a Foto Agente. Mensaje "[Agente] tomó tu sesión". Auto-msg: "Hola, soy [Agente], dame un momento ahora te ayudo". |
| Toggle "Habilitar Audio" | `permissions.allowAudio = true` | Botón Micrófono aparece en barra input. |
| Envía Ubicación | Crea msg `type='location'` | Aparece burbuja con mapa interactivo y dirección. |
| Transfiere a otro Agente | `agentId='otro_uid'` | Mensaje "Has sido transferido a [Nuevo Agente]". Cambia foto header. |
| Finaliza Chat | `status='inactive'` | Input se deshabilita (opcional) o Header muestra "Desconectado". |
| Elimina Mensaje | `msg.deleted = true` | Mensaje desaparece del DOM del usuario inmediatamente (silencioso). |

---

## 6. Consideraciones Técnicas Adicionales

*   **Compresión:** Uso de `browser-image-compression` en ambos clientes antes de subir a Storage.
*   **Seguridad:** `firestore.rules` bloqueará lectura de `sessions` a usuarios anónimos salvo la suya propia (`request.auth.uid == resource.data.id` o similar por token). Agentes tienen lectura global.
*   **Offline:** Framework7 maneja detección de red. Firestore tiene caché offline, pero para chat en vivo se prioriza conexión.

Este plan cubre la **totalidad** de los flujos y requisitos visuales/lógicos especificados en los documentos MD proporcionados.
