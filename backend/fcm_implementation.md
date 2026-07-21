# Firebase Cloud Messaging (FCM) Implementation Guide

This document explains the architecture, flow, and files involved in the push notification system (using Firebase Cloud Messaging) implemented in the **Associação Vagoneteiros** project.

---

## 1. Architectural Overview

The push notification system is designed to send automated, scheduled reminders to clients about their upcoming tours (passeios).

Here's the high-level flow:
1. **Frontend Registration:** When a user requests to be notified on the scheduling form, the frontend requests permission, gets a unique **FCM Token** from Firebase, and registers/updates it in the backend via the scheduling endpoint.
2. **Database Storage:** The backend registers/updates the FCM Token under the `PushSubscription` model (linked to the `Clientes` model).
3. **Notification Generation:** When a scheduling is created, the system calculates multiple warning times (e.g. 1 week, 3 days, 1 day, 1 hour before) and inserts placeholder records in the `NotificacaoAgendamento` model.
4. **Custom Cron/Scheduler:** A custom background timer runs once every minute on the server, looking for pending/due records in `NotificacaoAgendamento`, dispatching them via FCM, and cleaning up sent or stale records.

---

## 2. Key Codebase Files

### A. Backend - Initialization & Config
* **`backend/prisma/schema.prisma`**:
  Defines the three relevant models:
  * `Clientes`: Holds client records.
  * `PushSubscription`: Stores FCM tokens associated with a client (`clienteId`, `token`, `userAgent`).
  * `NotificacaoAgendamento`: Stores individual reminder configurations (type of interval like `ONE_DAY`, target send-time `enviarEm`, relation to `PushSubscription` and `Agendamento`).
* **`backend/src/utils/firebaseAdmin.ts`**:
  Initializes the `firebase-admin` SDK using credentials (either from `serviceAccountKey.json` or `process.env.FIREBASE_SERVICE_ACCOUNT_JSON`). It exports the `messaging` object of type `Messaging` which is used to send push notifications from the backend.

### B. Backend - Controllers & Routes
* **`backend/src/controllers/agendamentoController.ts`**:
  Handles the creation of schedulings (`criar` and `agendarPublico`).
  * When a user checks "Desejo receber notificações" and provides their `fcmToken`, the controller invokes `upsertPushSubscription`.
  * **`upsertPushSubscription`**: Directly connects the client's ID with the token. If the client already has a subscription but the token is different, it updates the subscription. If the client has no subscription, it creates a new row.
  * After subscription setup, it calculates pre-configured times (e.g., 3 days or 12 hours before) and populates the `NotificacaoAgendamento` table.

### C. Backend - Background Service / Custom Cron
* **`backend/src/services/notificationScheduler.ts`**:
  This is where the background scheduler and sending logic live.
  * **No `node-cron` is used!** Instead, it implements a highly precise, millisecond-aligned timer using `setTimeout`.
  * **`iniciarAgendamentoScheduler()`**: Started inside `backend/src/server.ts` upon server startup. It calculates the remaining milliseconds until the next clock minute boundary (e.g. if the server starts at `12:34:45.123`, it waits exactly `14.877` seconds to run exactly at `12:35:00.000`), then repeats exactly every `60,000` ms.
  * **`processarNotificacoesAgendamento()`**: Queries the database once a minute for any unsent `NotificacaoAgendamento` records whose `enviarEm` timestamp is `<= now` (within a 15-minute grace window).
  * **Message dispatch:** Calls `messaging.send({ token, notification: { title, body } })`.
    * **Successful Sends:** The corresponding record in `NotificacaoAgendamento` is **deleted** from the database to keep the database small and light.
    * **Failed/Stale Sends (e.g., `NotRegistered`):** If Firebase reports that the FCM token is stale or expired, it automatically deletes the stale `PushSubscription` and all its pending notifications to prevent further resource waste. Any other errors are printed with full stack traces under `[FCM] Error sending notification`.

### D. Frontend - Registration & Service Worker
* **`frontend/src/services/firebase.ts`**:
  Responsible for initializing the client-side Firebase App.
  * **`getFcmToken()`**: Prompts the browser for notification permissions, registers the background Service Worker, retrieves the unique device token using the VAPID key, and returns it to be submitted during scheduling.
  * **`onFirebaseMessage()`**: Handles foreground messaging. If the app is active and open in the browser, it displays an in-app notification when the message is received.
* **`frontend/public/firebase-messaging-sw.js`**:
  The Firebase Service Worker that runs in the background. It intercepts and displays incoming notifications when the browser is closed or the page is in the background (`onBackgroundMessage`).

---

