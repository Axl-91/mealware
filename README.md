# Mealware

Mealware is a restaurant management system designed to manage menus, orders, and payments.

The project is being developed as a reusable restaurant management solution, with a modular architecture and support for multiple restaurants.

## Project Structure

Mealware is organized as a monorepo using pnpm workspaces.

```text
mealware/
├── apps/
│   ├── api/          # Backend API
│   └── web/          # Frontend application
├── packages/
│   └── shared/       # Shared schemas, types, and constants
├── package.json
└── pnpm-workspace.yaml
```

## Tech Stack

### Backend

- **Node.js** – JavaScript runtime.
- **TypeScript** – Static typing.
- **Fastify** – HTTP server and API framework.
- **PostgreSQL** – Relational database.
- **Kysely** – Type-safe SQL query builder.
- **Zod** – Request validation and shared schemas.
- **Argon2** – Password hashing.
- **JWT** – Authentication using HTTP-only cookies.

### Development Tools

- **pnpm** – Package manager and monorepo management.
- **Docker** – Local database environment.
- **Vitest** – Automated testing.
- **tsx** – TypeScript execution during development.

## Backend API

The backend is built with Fastify and follows a modular layered architecture.

```text
apps/api/src/
├── auth/           # Authentication and authorization
├── config/         # Environment configuration
├── controllers/    # HTTP request handling
├── database/       # Database connection, types and migrations
├── repositories/   # Database queries
├── routes/         # API route definitions
├── services/       # Business logic
├── utils/          # Shared utilities
├── app.ts
├── routes.ts
└── server.ts
```

### API Versioning

All application endpoints are currently exposed under:

```text
/api/v1
```

### Available Endpoints

#### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Check API health |
| GET | `/api/v1/health/ready` | Check API readiness, including database connectivity |

#### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate a user |
| GET | `/api/v1/auth/me` | Get the authenticated user |
| POST | `/api/v1/auth/logout` | Log out the current user |

Authentication uses JWT stored in an HTTP-only cookie.

#### Users

All user management endpoints require the `ADMIN` role.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/users` | Create an employee |
| GET | `/api/v1/users` | List active users |
| GET | `/api/v1/users/:id` | Get a user by ID |
| PUT | `/api/v1/users/:id` | Update a user |
| DELETE | `/api/v1/users/:id` | Deactivate a user |

Users belong to a restaurant. User management operations are restricted to the authenticated user's restaurant.

#### Categories

Categories are global resources shared across all restaurants.

All authenticated users can create and view categories. Only the user who created a category can update or deactivate it.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/categories` | Create a category |
| GET | `/api/v1/categories` | List active categories |
| GET | `/api/v1/categories/:id` | Get a category by ID |
| PUT | `/api/v1/categories/:id` | Update a category |
| DELETE | `/api/v1/categories/:id` | Deactivate a category |

Category names are normalized and must be unique regardless of letter casing.

## Database

Mealware uses PostgreSQL with Kysely for database access and migrations.

Database schema changes are managed through migration files located in:

```text
apps/api/src/database/migrations/
```

Available database commands:

```bash
# Run migrations
pnpm --filter @mealware/api db:migrate

# Roll back the latest migration
pnpm --filter @mealware/api db:rollback

# Run the initial database seed
pnpm --filter @mealware/api db:seed
```

The initial seed creates a restaurant and its first administrator if they do not already exist.

## Development

### Requirements

- Node.js
- pnpm
- Docker
- PostgreSQL (or the provided Docker database environment)

### Install dependencies

```bash
pnpm install
```

### Build shared package

```bash
pnpm --filter @mealware/shared build
```

### Start the development API

```bash
pnpm --filter @mealware/api dev
```

By default, the API listens on port `3000`.

### Type checking

```bash
pnpm --filter @mealware/api typecheck
```

### Run tests

```bash
pnpm --filter @mealware/api test
```

## Development Status

Mealware is under active development.

Current backend functionality:

- [x] Database connection and migrations
- [x] Restaurant and user schema
- [x] User authentication
- [x] JWT cookie-based sessions
- [x] User management
- [x] Global categories
- [x] Initial database seed
- [ ] Menu management
- [ ] Product management
- [ ] Order management
- [ ] Payment management

More features and documentation will be added as development progresses.
