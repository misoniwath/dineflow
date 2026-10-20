# DineFlow

DineFlow is a restaurant operations dashboard. It gives a restaurant one place to manage:

- customer orders and the kitchen queue;
- tables, table locations, and table status;
- reservations and seating;
- menu items, ingredients, suppliers, and stock levels;
- staff schedules and clock-in/clock-out records;
- staff accounts and roles; and
- bills and payment information.

It is a **Next.js 16** application written in **TypeScript**. It uses **PostgreSQL** for saved data and **Drizzle ORM** to read and write that data.

> This repository is a development project, not a hosted restaurant product. The instructions below are for running it on your own computer.

## What you need

Install these before starting:

1. **Node.js 20.9 or newer**. Next.js 16 requires a current Node.js release.
2. **npm**, which is included with Node.js.
3. **PostgreSQL** running on your computer or on a network you can reach.
4. **Git**, if you are cloning the repository.

You can check Node and npm with:

```bash
node --version
npm --version
```

## Run DineFlow locally

Follow these steps in order.

### 1. Get the code

```bash
git clone <repository-url>
cd dineflow
```

If you already have the repository, just open a terminal in its folder.

### 2. Install the JavaScript packages

```bash
npm install
```

### 3. Create a PostgreSQL database

Create an empty PostgreSQL database named `dineflow`. For example, from `psql`:

```sql
CREATE DATABASE dineflow;
```

You may choose another database name. The name in the connection string in the next step must match it.

### 4. Create the environment file

Copy `.env.example` to a new file named `.env`:

```bash
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

Open `.env` and replace the values with real local values:

```env
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@localhost:5432/dineflow"
JWT_SECRET="replace-this-with-a-long-random-secret"
```

What these settings mean:

- `DATABASE_URL` tells DineFlow where PostgreSQL is located.
- `JWT_SECRET` is used to sign login cookies. Use a long, private value. Never commit `.env` to Git.

The checked-in `.env.example` is only a template. Replace its `DATABASE_URL` value completely; do not leave the placeholder text in it.

### 5. Create the database tables

The repository contains a Drizzle migration in `drizzle/`. Apply it with:

```bash
npx drizzle-kit migrate
```

Run this whenever the project contains a new migration that your database does not have yet.

### 6. Add sample restaurant data

Run the seed script:

```bash
npm run db:seed
```

This creates sample users, menu items, ingredients, suppliers, tables, and reservations. The seed script is intended for development data. Do not use it as a production data migration.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Next.js reloads the page when you edit source files.

To stop the server, press `Ctrl+C` in the terminal where it is running.

## Try the app

### Sign in with a sample account

After seeding, these development accounts are available:

| Role | Email | Password | Starting page |
| --- | --- | --- | --- |
| Staff | `staff@dineflow.test` | `staff123` | Order entry |
| Manager | `manager@dineflow.test` | `manager123` | Dashboard |
| Owner | `owner@dineflow.test` | `owner123` | Dashboard |

These passwords are public on purpose because they are seed data. Change the account passwords before using the application with real information.

You can also choose **Continue as guest** on the login page. Guests can use order entry without an account, but they cannot use staff management pages.

### Main pages

| URL | Page | What it does |
| --- | --- | --- |
| `/` | Dashboard | Shows a restaurant overview for managers and owners. |
| `/order` | Order entry | Select a table, add menu items, and send an order to the kitchen. Guests can access this page. |
| `/kitchen` | Kitchen display | Shows open tickets and lets staff move orders through preparation. |
| `/floor-plan` | Floor plan | Add and move tables and update table status and guest counts. |
| `/reservations` | Reservations | View reservations by date, create bookings, seat guests, complete bookings, or mark them as cancelled/no-show. |
| `/billing` | Billing | Review open orders and bill information. |
| `/inventory` | Inventory | Manage stock, suppliers, menu items, and ingredient relationships. |
| `/scheduling` | Scheduling | Create shifts and record staff attendance. |
| `/user-management` | Users | Create, edit, disable, and remove staff accounts. Owner access is required. |

The navigation menu hides pages that are not intended for the current role. The route guard also protects login-required pages. The navigation includes an Analytics entry, but this checkout does not contain an `/analytics` page yet.

## Useful commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build and catch build-time errors. |
| `npm run start` | Start the already-built production app. Run `npm run build` first. |
| `npm run lint` | Check the project with ESLint. |
| `npm test` | Run the Jest and Testing Library test suite. |
| `npm run db:seed` | Insert the development sample data. |
| `npx drizzle-kit migrate` | Apply committed Drizzle migrations to PostgreSQL. |
| `npx drizzle-kit generate` | Generate a new migration after changing the Drizzle schema. |

For a normal development check, run:

```bash
npm run lint
npm test
npm run build
```

## How the project is organized

```text
dineflow/
├─ app/
│  ├─ (auth)/login/       Login page
│  ├─ (main)/             Dashboard pages
│  ├─ api/                Next.js API route handlers
│  └─ layout.tsx          Root layout and shared providers
├─ components/            Reusable UI, forms, tables, and dialogs
├─ hooks/                 Small reusable React hooks
├─ lib/
│  ├─ api/                Browser helpers for calling the API routes
│  ├─ auth/               JWT and cookie authentication helpers
│  └─ db/                 PostgreSQL connection, schema, and seeders
├─ stores/                React context stores for app state
├─ views/                 Page-level UI for each restaurant module
├─ types/                 Shared TypeScript types
├─ tests/                 Jest and React Testing Library tests
├─ drizzle/               Committed PostgreSQL migration files
├─ styles/                Global Tailwind and theme styles
├─ public/                Static files served by Next.js
├─ package.json            Scripts and dependencies
└─ proxy.ts                Login and role-based route checks
```

### Data model

The database schema in `lib/db/schema.ts` includes tables for:

- users and roles (`staff`, `manager`, `owner`);
- menu items and menu-to-ingredient relationships;
- suppliers and inventory items;
- orders and order items;
- floor-plan tables; and
- reservations.

Passwords are stored as bcrypt hashes. Successful logins receive an HTTP-only `auth_token` cookie that lasts seven days. The browser restores the session through `/api/auth/me`.

### API routes

The user interface calls these route groups:

- `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`
- `/api/orders`
- `/api/menu-items`
- `/api/floor-plans` and `/api/floor-plans/bulk-update`
- `/api/reservations`
- `/api/inventory-items`
- `/api/suppliers`
- `/api/users` and `/api/users/[id]`

Most routes return JSON and use PostgreSQL through Drizzle. You normally do not need to call them directly; the page stores and API helpers do that for you.

## Common problems

### “The app cannot connect to the database”

Check that PostgreSQL is running and that `DATABASE_URL` contains the correct username, password, host, port, and database name. Then try:

```bash
npx drizzle-kit migrate
npm run db:seed
```

### “The login does not work”

Make sure the seed command completed successfully, then use one of the sample accounts above. Also check that `JWT_SECRET` exists in `.env` and restart the development server after changing environment variables.

### “A page sends me back to login”

That page requires a signed-in user or a particular role. Sign in with the manager or owner account for management pages. Guest access is intentionally limited to order entry.

### “Port 3000 is already in use”

Start Next.js on another port:

```bash
npm run dev -- --port 3001
```

Then open [http://localhost:3001](http://localhost:3001).

## Security notes

- Never commit `.env`, database passwords, JWT secrets, or real customer data.
- The sample credentials are for local development only.
- Use a new `JWT_SECRET` for every real deployment.
- Use HTTPS and secure PostgreSQL credentials outside local development.
- Review and strengthen authorization before exposing the API to the public internet.

## Contributing

1. Create a branch for your change.
2. Make the smallest change that solves the problem.
3. Run `npm run lint`, `npm test`, and `npm run build`.
4. Describe what changed and how you tested it in your pull request.
