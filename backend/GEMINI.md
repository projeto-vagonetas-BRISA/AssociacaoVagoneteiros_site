# Vagoneteiros API - Project Instructions

This document provides essential information for developing and maintaining the Vagoneteiros API.

## Project Overview

The Vagoneteiros API is the backend for the Associação dos Vagoneteiros website. It manages users (vagoneteiros), clients, tours (passeios), appointments (agendamentos), and reviews (avaliações).

- **Main Technologies:** Node.js, TypeScript, Express, Prisma.
- **Database:** PostgreSQL.
- **Architecture:** Controller-Route pattern.
- **Authentication:** JWT (JSON Web Token) with bcrypt for password hashing.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- PostgreSQL
- npm or yarn

### Configuration

1.  **Environment Variables:** Create a `.env` file in the root directory based on `.env.example`.
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/vagoneteiros?schema=public"
    JWT_SECRET="your_jwt_secret"
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Database Setup:**
    ```bash
    npx prisma migrate dev
    ```

## Building and Running

- **Development Mode:** Runs with `nodemon` and `ts-node`.
  ```bash
  npm run dev
  ```
- **Build:** Compiles TypeScript to JavaScript in the `dist/` directory.
  ```bash
  npm run build
  ```
- **Production Mode:** Runs the compiled code.
  ```bash
  node dist/server.js
  ```

## Development Conventions

### Code Structure

- `src/server.ts`: Entry point of the application.
- `src/app.ts`: Express application setup and middlewares.
- `src/routes/`: API route definitions.
- `src/controllers/`: Logic for handling requests and responses.
- `src/middlewares/`: Express middlewares (e.g., authentication, role-based access).
- `src/lib/`: Library initializations (e.g., Prisma client).
- `src/utils/`: Helper functions and utilities (e.g., JWT signing/verification).
- `prisma/`: Prisma schema and migrations.

### Authentication & Authorization

- Use `authMiddleware` to protect routes that require authentication.
- Use `roleMiddleware(['ADMIN', 'REDATOR'])` to restrict access based on user profiles.
- Authenticated requests have the `user` object attached to `req.user` (excluding the password).

### Database Management

- Always use Prisma for database interactions.
- Update `prisma/schema.prisma` for schema changes and run `npx prisma migrate dev` to apply them.

### API Response Format

- Consistent JSON responses should be returned.
- Errors should include a clear `message`.

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Build the project for production |
| `npx prisma migrate dev` | Create and apply a new migration |
| `npx prisma studio` | Open Prisma Studio to explore data |
| `npx prisma generate` | Generate Prisma Client |
