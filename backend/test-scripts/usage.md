# Backend Test Scripts

This directory contains helper scripts to test notification scheduling and passeio creation.

## Available scripts

- `createPasseio.js`
  - Creates a new future passeio scheduled one week from now at 12:00.

- `createPasseioNear.js`
  - Creates a new passeio a few hours in the future.
  - Usage: `node backend/test-scripts/createPasseioNear.js 3`

- `createDateOnlyPasseio.js`
  - Creates a new passeio where `data` is stored as UTC midnight and `horario` is `09:00`.

- `listNotifications.js`
  - Lists all `PushSubscription` rows and `NotificacaoAgendamento` rows.

- `computeNotificationTimes.js`
  - Computes notification schedule times for a passeio.
  - Usage: `node backend/test-scripts/computeNotificationTimes.js <passeioId>`

## How to run

From the repository root:

```bash
cd backend
node test-scripts/<script-name>.js
```

Example:

```bash
cd backend
node test-scripts/listNotifications.js
```

## Notes

- These scripts are intended for manual debugging and testing only.
- They do not modify production logic.
- The scripts rely on the backend Prisma client and the same database configured by `backend/.env`.
