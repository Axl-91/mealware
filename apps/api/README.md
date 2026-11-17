# Mealware API

The Mealware API is the backend application responsible for handling restaurant operations, authentication, and business logic.

It is built with Fastify, TypeScript, PostgreSQL, and Kysely.

## Architecture

The API follows a layered architecture to separate HTTP handling, business logic, and database access.

```text
src/
├── auth/           # Authentication and authorization
├── config/         # Environment configuration
├── controllers/    # HTTP request handling
├── database/       # Database connection, types and migrations
│   ├── migrations/
│   └── type/
├── repositories/   # Database queries and transactions
├── routes/         # API route definitions
├── services/       # Business logic
├── utils/          # Shared utilities
├── app.ts
├── routes.ts
└── server.ts
```

### Layers

- **Routes:** Define HTTP endpoints and middleware.
- **Controllers:** Validate requests and build HTTP responses.
- **Services:** Handle business rules and coordinate operations.
- **Repositories:** Encapsulate database queries, transactions, and locking.
- **Auth:** Provide authentication and authorization mechanisms.

## Tech Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Kysely
- Zod
- Argon2
- JWT
- Vitest
- tsx

## API Versioning

All application endpoints are exposed under:

```text
/api/v1
```

## Endpoints

### Health

| Method | Endpoint               | Description                                   |
| ------ | ---------------------- | --------------------------------------------- |
| GET    | `/api/v1/health`       | Check API health                              |
| GET    | `/api/v1/health/ready` | Check API readiness and database connectivity |

### Authentication

| Method | Endpoint              | Description                |
| ------ | --------------------- | -------------------------- |
| POST   | `/api/v1/auth/login`  | Authenticate a user        |
| GET    | `/api/v1/auth/me`     | Get the authenticated user |
| POST   | `/api/v1/auth/logout` | Log out the current user   |

Authentication uses JWT stored in an HTTP-only cookie.

### Users

All user management endpoints require the `ADMIN` role.

| Method | Endpoint            | Description        |
| ------ | ------------------- | ------------------ |
| POST   | `/api/v1/users`     | Create an employee |
| GET    | `/api/v1/users`     | List active users  |
| GET    | `/api/v1/users/:id` | Get a user by ID   |
| PUT    | `/api/v1/users/:id` | Update a user      |
| DELETE | `/api/v1/users/:id` | Deactivate a user  |

Users belong to a restaurant. All user management operations are scoped to the authenticated user's restaurant.

### Categories

Categories are global resources shared across all restaurants.

All authenticated users can create and view categories. Only the user who created a category can update or deactivate it.

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| POST   | `/api/v1/categories`     | Create a category      |
| GET    | `/api/v1/categories`     | List active categories |
| GET    | `/api/v1/categories/:id` | Get a category by ID   |
| PUT    | `/api/v1/categories/:id` | Update a category      |
| DELETE | `/api/v1/categories/:id` | Deactivate a category  |

Category names are normalized and must be unique regardless of letter casing.

### Menu Items

Menu items belong to a restaurant and reference a global category.

All authenticated users can view menu items. Only users with the `ADMIN` role can create, update, or deactivate them.

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| POST   | `/api/v1/menu-items`     | Create a menu item     |
| GET    | `/api/v1/menu-items`     | List active menu items |
| GET    | `/api/v1/menu-items/:id` | Get a menu item by ID  |
| PUT    | `/api/v1/menu-items/:id` | Update a menu item     |
| DELETE | `/api/v1/menu-items/:id` | Deactivate a menu item |

Menu item names must be unique within each restaurant, regardless of letter casing.

Menu items support availability management independently of activation status.

### Orders

Orders belong to a restaurant and contain one or more menu items.

All authenticated users can create, view, update, and change the status of orders.

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/api/v1/orders`            | Create an order        |
| GET    | `/api/v1/orders`            | List orders            |
| GET    | `/api/v1/orders/:id`        | Get an order by ID     |
| PUT    | `/api/v1/orders/:id`        | Update an order        |
| PUT    | `/api/v1/orders/:id/status` | Update an order status |

Orders support two types:

- `DINE_IN`
- `TAKEAWAY`

Order numbers are sequential per restaurant and reset daily, using the `America/Argentina/Buenos_Aires` timezone.

Each order item stores a snapshot of the menu item's name and price at the time the order is created or updated.

Orders can only be modified while their status is `PENDING`.

Supported status transitions:

```text
PENDING   → PREPARING
PENDING   → CANCELLED

PREPARING → READY
PREPARING → CANCELLED

READY     → COMPLETED
```

`COMPLETED` and `CANCELLED` are terminal states.

## Authentication

The API uses JWT-based authentication with HTTP-only cookies.

The authentication flow:

1. A user submits their email and password.
2. The API verifies the credentials.
3. A JWT is generated and stored in a cookie.
4. Protected endpoints authenticate requests using that cookie.
5. Logout clears the authentication cookie.

Passwords are hashed using Argon2id.

## Database

The API uses PostgreSQL and Kysely.

Database types are defined in:

```text
src/database/types/
```

Migration files are located in:

```text
src/database/migrations/
```

### Database Commands

```bash
# Run migrations
pnpm --filter @mealware/api db:migrate

# Roll back the latest migration
pnpm --filter @mealware/api db:rollback

# Run initial seed
pnpm --filter @mealware/api db:seed
```

The initial seed creates a restaurant and its first administrator if they do not already exist.

## Configuration

The API loads its environment variables through `src/config/env.ts`.

Required environment variables:

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`   | Secret used to sign JWTs     |

Additional variables:

| Variable            | Description                            |
| ------------------- | -------------------------------------- |
| `NODE_ENV`          | Application environment                |
| `PORT`              | HTTP server port                       |
| `HOST`              | HTTP server host                       |
| `TEST_DATABASE_URL` | PostgreSQL connection string for tests |

## Development

### Requirements

- Node.js
- pnpm
- Docker
- PostgreSQL

### Install dependencies

From the repository root:

```bash
pnpm install
```

### Build shared package

```bash
pnpm --filter @mealware/shared build
```

### Start the development server

```bash
pnpm --filter @mealware/api dev
```

The API listens on port `3000` by default.

### Type checking

```bash
pnpm --filter @mealware/api typecheck
```

### Build

```bash
pnpm --filter @mealware/api build
```

### Run tests

```bash
pnpm --filter @mealware/api test
```

### Run tests in watch mode

```bash
pnpm --filter @mealware/api test:watch
```

## Development Status

Current backend functionality:

- [x] Database connection and migrations
- [x] Restaurant and user schema
- [x] Authentication and authorization
- [x] JWT cookie-based sessions
- [x] User management
- [x] Global categories
- [x] Initial database seed
- [x] Menu items API implementation
- [x] Orders API implementation
- [x] Menu items tests
- [ ] Orders tests
- [ ] Payment management

