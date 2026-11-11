# Mealware

Mealware is a restaurant management system designed to manage menus, orders, and payments.

The project aims to provide a reusable and scalable solution for restaurant operations, with support for multiple restaurants.

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

| Technology | Purpose |
|---|---|
| TypeScript | Main development language |
| Node.js | Runtime environment |
| Fastify | Backend API framework |
| PostgreSQL | Relational database |
| Kysely | Type-safe SQL query builder |
| Zod | Data validation and schemas |
| React | Frontend library |
| pnpm | Package management and workspaces |
| Docker | Development environment |
| Vitest | Automated testing |

## Applications

### API

The backend provides the REST API responsible for authentication, restaurant management, menus, orders, and payments.

See [API Documentation](apps/api/README.md).

### Web

The frontend application provides the user interface for interacting with Mealware.

See [Web Documentation](apps/web/README.md).

## Shared Package

The `@mealware/shared` package contains reusable schemas, types, and constants shared between applications.

## Development Status

Mealware is currently under active development. New features and modules are being implemented incrementally.
