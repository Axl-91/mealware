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
│   └── types/
├── repositories/   # Database queries and transactions
├── routes/         # API route definitions
├── services/       # Business logic
├── utils/          # Shared utilities
├── app.ts
├── routes.ts
└── server.ts
```

### Layers

- **Routes:** Define HTTP endpoints, validation schemas, and middleware.
- **Controllers:** Handle HTTP requests, validate input, and build responses.
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
- fastify-type-provider-zod
- @fastify/swagger
- @fastify/swagger-ui
- Argon2
- JWT
- Vitest
- tsx

## API Versioning

All application endpoints are exposed under:

```text
/api/v1
```

## API Documentation

The API uses OpenAPI and Swagger UI for interactive API documentation.

When running outside the test environment, the documentation is available at:

```text
http://localhost:3000/documentation
```

Swagger documentation is generated from route schemas using Zod and `fastify-type-provider-zod`.

Documentation coverage is currently partial and will be expanded as the API evolves.

## Endpoints

### Health

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/v1/health` | Check API health |
| GET | `/api/v1/health/ready` | Check API readiness and database connectivity |

### Authentication

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/auth/login` | Authenticate a user |
| GET | `/api/v1/auth/me` | Get the authenticated user |
| POST | `/api/v1/auth/logout` | Log out the current user |

Authentication uses JWT stored in an HTTP-only cookie named `mealware_token`.

The cookie has a one-hour lifetime, uses `SameSite=Lax`, and is marked `Secure` in production.

The `/auth/me` endpoint returns the authenticated user's basic information:

- ID
- Name
- Email
- Role
- Account creation date
- Last update date

### Users

All user management endpoints require the `ADMIN` role.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/users` | Create an employee |
| GET | `/api/v1/users` | List active users |
| GET | `/api/v1/users/:id` | Get a user by ID |
| PUT | `/api/v1/users/:id` | Update a user |
| DELETE | `/api/v1/users/:id` | Deactivate a user |

Users belong to a restaurant. All user management operations are scoped to the authenticated user's restaurant.

User deactivation is a soft delete. Deactivated users are excluded from the active user listing.

Passwords are never exposed through user endpoints.

### Categories

Categories are global resources shared across all restaurants.

All authenticated users can create and view categories. Only the user who created a category can update or deactivate it.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/categories` | Create a category |
| GET | `/api/v1/categories` | List active categories |
| GET | `/api/v1/categories/:id` | Get a category by ID |
| PUT | `/api/v1/categories/:id` | Update a category |
| DELETE | `/api/v1/categories/:id` | Deactivate a category |

Category names are normalized and must be unique regardless of letter casing.

### Menu Items

Menu items belong to a restaurant and reference a global category.

All authenticated users can view menu items. Only users with the `ADMIN` role can create, update, or deactivate them.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/menu-items` | Create a menu item |
| GET | `/api/v1/menu-items` | List active menu items |
| GET | `/api/v1/menu-items/:id` | Get a menu item by ID |
| PUT | `/api/v1/menu-items/:id` | Update a menu item |
| DELETE | `/api/v1/menu-items/:id` | Deactivate a menu item |

Menu item names must be unique within each restaurant, regardless of letter casing.

Menu items have separate activation and availability states.

### Orders

Orders belong to a restaurant and contain one or more menu items.

All authenticated users can create, view, update, and change the status of orders, subject to the business rules below.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/orders` | Create an order |
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/:id` | Get an order by ID |
| PUT | `/api/v1/orders/:id` | Update an order |
| PUT | `/api/v1/orders/:id/status` | Update an order status |

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
READY     → CANCELLED
```

`COMPLETED` and `CANCELLED` are terminal states.

An order can only be cancelled when all its payments have been fully refunded.

Orders in `READY` and `COMPLETED` states include calculated payment information:

- `UNPAID`: No outstanding amount has been paid.
- `PARTIALLY_PAID`: The order has received partial payment.
- `PAID`: The outstanding balance has been fully paid.

The order listing always includes active orders (`PENDING`, `PREPARING`, and `READY`). Completed and cancelled orders remain visible for 12 hours after their last update.

### Payments

Payments belong to an order. An order can have multiple payments, allowing partial payments and different payment methods.

Both `ADMIN` and `EMPLOYEE` users can register and view payments.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/orders/:id/payments` | Register a payment for an order |
| GET | `/api/v1/orders/:id/payments` | List payments for an order |
| GET | `/api/v1/payments` | List paginated payment and refund movements |

Supported payment methods:

- `CASH`
- `DEBIT_CARD`
- `CREDIT_CARD`
- `TRANSFER`

Payments can only be registered for orders with status `READY` or `COMPLETED`.

The API prevents payments from exceeding the outstanding order balance.

The general payments listing supports filtering by:

- `period`
- `method`
- `orderNumber`

It also supports pagination through `page` and `limit`.

Supported periods:

- `today`
- `yesterday`
- `last_7_days`
- `last_30_days`
- `all`

The listing combines payments and refunds into a unified chronological history. Payments are represented as positive movements and refunds as negative movements.

The financial summary is calculated over all matching movements, independently of the current pagination page.

### Refunds

Refunds belong to an individual payment. Multiple partial refunds are supported, as long as their cumulative amount does not exceed the original payment amount.

Only users with the `ADMIN` role can create and view refunds.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/v1/payments/:id/refunds` | Create a refund for a payment |
| GET | `/api/v1/payments/:id/refunds` | List refunds for a payment |

Refunds increase the outstanding balance of the associated order. Additional payments can be registered afterward if the order is still eligible for payment.

Payments and refunds are retained as financial records and are not deleted.

## Authorization

Access to API resources is controlled through authenticated user roles and restaurant ownership.

| Feature | ADMIN | EMPLOYEE |
| ------- | :---: | :---: |
| Dashboard | Yes | Yes |
| Orders | Yes | Yes |
| Categories | Yes | Yes |
| View menu items | Yes | Yes |
| Manage menu items | Yes | No |
| Payments | Yes | Yes |
| Refunds | Yes | No |
| User management | Yes | No |
| Health | Yes | No |
| Account information | Yes | Yes |

All restaurant-specific operations are scoped to the restaurant associated with the authenticated user.

Category updates and deactivation additionally require ownership of the category.

## Authentication

The API uses JWT-based authentication with HTTP-only cookies.

The authentication flow:

1. A user submits their email and password.
2. The API verifies the credentials.
3. A JWT is generated and stored in a cookie.
4. Protected endpoints authenticate requests using that cookie.
5. Logout clears the authentication cookie.

The JWT contains the authenticated user's ID, restaurant ID, and role.

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

# Run demo seed
pnpm --filter @mealware/api db:seed:demo
```

The demo seed creates initial data for an administrator's restaurant only when that restaurant does not already contain data.

## Configuration

The API loads its environment variables through `src/config/env.ts`.

Required environment variables:

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs (minimum 32 characters) |

Additional variables:

| Variable | Description |
| -------- | ----------- |
| `NODE_ENV` | Application environment (`development`, `production`, or `test`) |
| `PORT` | HTTP server port (default: `3000`) |
| `HOST` | HTTP server host (default: `0.0.0.0`) |
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

### Configure environment variables

Create the required environment files and configure the database connection and JWT secret.

The API validates its environment variables during startup.

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

### Run tests with coverage

```bash
pnpm --filter @mealware/api test:coverage
```

Tests use a dedicated PostgreSQL database configured through `TEST_DATABASE_URL`.
