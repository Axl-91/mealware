# Mealware Web

Frontend application for **Mealware**, a restaurant management system. Built with React, TypeScript, and Vite, with a feature-based architecture and a reusable component system.

## Tech Stack

- **React 19** – UI library.
- **TypeScript** – Static typing.
- **Vite** – Development server and build tool.
- **React Router** – Client-side routing.
- **TanStack Query** – Server state management and data fetching.
- **React Hook Form** – Form state management.
- **Tailwind CSS v4** – Utility-first styling.
- **shadcn/ui** – Reusable UI components built on Radix UI.
- **Lucide React** – Icons.
- **Geist** – Application typography.
- **@mealware/shared** – Shared types, constants, and validation schemas.

## Features

### Authentication
- Login using email and password.
- Session management through HTTP-only cookies.
- Authentication state managed with TanStack Query.
- Protected routes for authenticated users.
- Public routes for unauthenticated users.
- Logout and session cleanup.

### System Health
- API health monitoring.
- Database readiness monitoring.
- Automatic status refresh every 30 seconds.

### Theme Support
- Light and dark themes.
- System preference detection.
- Automatic theme updates when the operating system preference changes.
- Theme preference persisted in local storage.
- Custom theme toggle with sun and moon icons.

### Routing
- Separate layouts for authentication and application pages.
- Protected and public route handling.
- Custom 404 page.

## Project Structure

```text
src/
├── app/
│   ├── layouts/
│   │   ├── app-layout.tsx
│   │   └── auth-layout.tsx
│   ├── pages/
│   │   └── not-found-page.tsx
│   ├── providers.tsx
│   ├── router.tsx
│   └── theme-provider.tsx
├── components/
│   ├── shared/
│   │   └── theme-toggle.tsx
│   └── ui/
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── health/
│       ├── api/
│       ├── hooks/
│       └── pages/
├── lib/
│   ├── api.ts
│   └── utils.ts
├── index.css
└── main.tsx
```

### Architecture

The application follows a feature-based architecture.

- **app/** – Application infrastructure, routing, providers, layouts, and global pages.
- **features/** – Business features, organized into their own API, components, hooks, and pages.
- **components/ui/** – Reusable UI components generated or customized with shadcn/ui.
- **components/shared/** – Components shared across different application features.
- **lib/** – Shared utilities and API configuration.

## Environment Variables

Create an `.env` file inside `apps/web/`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

`VITE_API_URL` defines the base URL used by the centralized API client.

> Variables prefixed with `VITE_` are exposed to the client. Do not store secrets in them.

## Getting Started

### Prerequisites

- Node.js
- pnpm
- Mealware API running locally.

### Installation

From the monorepo root:

```bash
pnpm install
```

### Development

Start the frontend development server:

```bash
pnpm --filter @mealware/web dev
```

By default, Vite serves the application at:

```text
http://localhost:5173
```

### Production Build

Build the application:

```bash
pnpm --filter @mealware/web build
```

### Lint

Run ESLint:

```bash
pnpm --filter @mealware/web lint
```

### Preview

Preview the production build:

```bash
pnpm --filter @mealware/web preview
```

## API Integration

All HTTP requests are centralized through `src/lib/api.ts`.

The API client provides:

- A shared base URL.
- JSON request and response handling.
- Cookie-based authentication through `credentials: include`.
- A centralized `ApiError` class.
- Consistent error handling.

Feature-specific API functions are located inside each feature's `api/` directory.

## Development Guidelines

- Keep business logic organized inside `features/`.
- Reuse shared components whenever possible.
- Use TanStack Query for server state management.
- Use React Hook Form for form state management.
- Use the shared package for domain types, constants, and validation schemas.
- Keep application-wide configuration inside `app/`.
- Prefer reusable components over duplicating UI logic.
