# Prism CDP + Analytics Platform

A multi-project Customer Data Platform (CDP) and Analytics web application designed for deployment as a containerized service on Kubernetes.

## Features

- Google OAuth authentication
- Role-based access control (owner, admin, editor, viewer)
- Multi-project management
- Team member invitations
- Customer profile tracking
- Event analytics
- Dashboard and report management
- Super admin interface

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth
- **Session Management**: iron-session
- **Email**: Nodemailer
- **Testing**: Jest + fast-check (property-based testing)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

4. Run Prisma migrations:

```bash
npx prisma migrate dev
```

5. Generate Prisma Client:

```bash
npx prisma generate
```

6. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SESSION_SECRET`: Secret for session encryption (min 32 characters)
- `SUPER_ADMIN_PATH`: Secret path for super admin interface
- `SUPER_ADMIN_EMAILS`: Comma-separated list of super admin emails
- `APP_BASE_URL`: Base URL of the application
- SMTP configuration for email delivery

## Docker Deployment

Build the Docker image:

```bash
docker build -t prism-cdp .
```

Run the container:

```bash
docker run -p 3000:3000 --env-file .env prism-cdp
```

## Kubernetes Deployment

The application includes health check endpoints for Kubernetes:

- `/healthz`: Liveness probe (checks if app is running)
- `/readyz`: Readiness probe (checks database connectivity)

## Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Project Structure

```
.
├── app/                  # Next.js App Router pages
├── components/           # React components
├── lib/                  # Utility functions and modules
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets
├── __tests__/           # Test files
└── docker-entrypoint.sh # Docker startup script
```

## License

Private - All rights reserved
