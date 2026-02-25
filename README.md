# Expense Sharing App

A comprehensive expense-sharing web application built with Next.js, TypeScript, and PostgreSQL. This application allows users to track shared expenses, split bills among friends and groups, manage debts, and settle payments.

## Features

- User authentication and profile management
- Friend and contact management
- Group creation and management
- Expense creation with flexible splitting options
- Balance tracking and debt management
- Payment processing and settlement
- Real-time notifications
- Multi-currency support
- Analytics and reporting
- Offline functionality (PWA)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Prisma ORM
- **Database**: PostgreSQL, Redis
- **Authentication**: NextAuth.js, JWT
- **Testing**: Jest, React Testing Library
- **Development**: ESLint, Prettier, Docker

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd expense-sharing-app
npm install
```

### 2. Environment Setup

Copy the `.env` file and update the values:

```bash
cp .env .env.local
```

Update the following variables in `.env.local`:
- `JWT_SECRET`: A secure random string for JWT signing
- `JWT_REFRESH_SECRET`: A secure random string for refresh tokens
- `NEXTAUTH_SECRET`: A secure random string for NextAuth
- `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)

### 3. Start Database Services

Make sure Docker Desktop is running, then start the PostgreSQL and Redis services:

```bash
npm run docker:up
```

### 4. Database Setup

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

## Project Structure

```
expense-sharing-app/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   │   ├── prisma.ts       # Prisma client
│   │   └── redis.ts        # Redis client
│   └── types/              # TypeScript type definitions
├── prisma/
│   └── schema.prisma       # Database schema
├── docker-compose.yml      # Docker services
├── .env                    # Environment variables
└── README.md
```

## Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User accounts and profiles
- **Groups**: Expense groups for organizing shared expenses
- **Expenses**: Individual expense records
- **ExpenseSplits**: How expenses are split among users
- **Payments**: Payment records and settlements
- **FriendRequests**: Friend relationship management

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write tests for new features
- Use meaningful commit messages

### Testing

- Write unit tests for utilities and services
- Write component tests for React components
- Write integration tests for API endpoints
- Aim for good test coverage

### Database

- Use Prisma migrations for schema changes
- Always backup before major changes
- Use transactions for financial operations
- Maintain data integrity constraints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Run linting and formatting
6. Submit a pull request

## License

This project is licensed under the MIT License.
