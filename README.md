# DineFlow

DineFlow is a web-based restaurant management system developed for CSCI 441 Software Engineering at Fort Hays State University. The application is designed to help restaurants manage orders, reservations, kitchen operations, inventory, and sales reporting in a unified interface.

## Team

- Huy Ming Tang — Project Manager
- MI Soniwath — Full-Stack Developer
- Bunsong FONG — Database Administrator
- Mouyheang SENG — QA Lead & Visual Design

## Core Modules

- Order Management
- Kitchen Display
- Table & Reservation Management
- Inventory Management
- Sales Reporting

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL

## Project Structure

```text
dineflow/
├─ app/                         # Next.js app router pages and route handlers
│  ├─ api/                     # API routes for backend endpoints
│  ├─ layout.tsx              # Shared application layout / root wrapper
│  └─ page.tsx                # Main landing or home page
├─ components/                 # Reusable UI components (cards, forms, tables, buttons)
├─ hooks/                      # Custom React hooks for shared logic and state handling
├─ lib/                       # Helper utilities, configuration, and app logic
├─ public/                    # Static assets such as images, logos, and icons
├─ server/                    # Server-side application logic and backend integrations
│  ├─ db/                     # Database-related code, schema setup, and connection logic
│  └─ services/               # Business logic services for operations like orders or inventory
├─ styles/                    # Global styling rules and theme-related CSS files
├─ tests/                     # Automated tests for app behavior and validation
├─ types/                     # TypeScript interfaces and shared type declarations
├─ .gitignore                 # Git ignored files and folders
├─ eslint.config.mjs          # ESLint configuration
├─ next-env.d.ts              # Next.js TypeScript environment declarations
├─ next.config.ts             # Next.js configuration
├─ package.json               # Project scripts, dependencies, and metadata
├─ postcss.config.mjs         # PostCSS configuration
├─ README.md                  # Project overview and setup documentation
├─ tsconfig.json              # TypeScript compiler configuration
└─ package-lock.json          # Automatically generated dependency lock file
```

## Folder Explanations

- app/: Contains the Next.js application structure. This is where pages, layouts, and route-based endpoints live.
- app/api/: Hosts server endpoints used by the frontend to send and receive data.
- components/: Stores reusable UI elements so the app remains modular and easier to maintain.
- hooks/: Keeps custom React hooks for shared logic such as fetching data, form handling, or state management.
- lib/: Serves as a utility folder for helper functions, constants, and reusable logic not tied to a specific component.
- public/: Holds static assets such as images, icons, and other files served directly by the app.
- server/: Contains backend-focused logic that is separate from the frontend UI.
- server/db/: Includes database configuration and connectivity logic for PostgreSQL and related operations.
- server/services/: Contains service modules used to encapsulate business logic such as inventory or sales processing.
- styles/: Stores CSS and styling files that define the visual design of the application.
- tests/: Contains test cases used to validate functionality, catch regressions, and confirm system behavior.
- types/: Houses TypeScript definitions for consistent data structures across the project.

## Documentation

Project documentation can be found in `/docs`.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open the project in your browser at:
   ```text
   http://localhost:3000
   ```

## Notes

This project structure follows a typical Next.js application layout and separates frontend, backend logic, shared utilities, and asset management to keep the codebase organized as it grows.
