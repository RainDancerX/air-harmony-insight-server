# Air Harmony Insight Server

A backend API server for the Air Harmony Insight application, providing real-time indoor air quality monitoring and building management capabilities. This system collects and analyzes sensor data from multiple buildings and zones, offering comprehensive analytics, intelligent alerts, and an AI-powered chat assistant for facility management. Built with modern web technologies, it handles time-series data efficiently and provides secure, role-based access to building operators, managers, and administrators.

## Available Commands

Start the development server with hot reload:

```bash
npm run dev
```

Build the TypeScript project for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Run tests:

```bash
npm test
```

## Tech Stack

**Runtime & Language**

- Node.js (v18+) - JavaScript runtime environment
- TypeScript - Type-safe development with static typing

**Web Framework & Server**

- Express.js - Fast, minimal web framework for Node.js
- Socket.IO - Real-time bidirectional communication for live sensor updates

**Database & Caching**

- TimescaleDB (PostgreSQL) - Time-series database optimized for sensor readings and historical data
- Redis - In-memory data store for session management and caching

**Authentication & Security**

- JWT (jsonwebtoken) - Token-based authentication with role-based access control
- bcrypt - Password hashing for secure user credentials
- Helmet.js - Security headers middleware
- express-rate-limit - API rate limiting to prevent abuse
- CORS - Cross-origin resource sharing configuration
- Zod - Runtime type validation for API requests

**AI Integration**

- OpenAI API - GPT-powered conversational AI for building management insights and natural language queries

**Logging & Monitoring**

- Morgan - HTTP request logger
- Winston - Structured logging with multiple transports
- Custom health check endpoints for service monitoring

**Development Tools**

- ts-node - TypeScript execution for development
- nodemon - Automatic server restart on file changes
- ESLint - Code linting and quality enforcement
- Prettier - Code formatting

## Project Structure

```
src/
├── config/
│   └── env.ts                 # Environment configuration and validation
├── middleware/
│   ├── auth.ts                # JWT authentication and authorization
│   ├── errorHandler.ts        # Centralized error handling
│   └── validation.ts          # Request validation middleware
├── routes/
│   ├── index.ts               # Route aggregator
│   ├── health.ts              # Health check endpoints
│   ├── auth.ts                # Authentication endpoints
│   ├── buildings.ts           # Building management API
│   ├── zones.ts               # Zone management API
│   ├── chat.ts                # AI chat assistant API
│   └── api.ts                 # General API routes
├── services/
│   ├── database.ts            # TimescaleDB connection and queries
│   ├── websocket.ts           # Socket.IO real-time communication
│   ├── chat.ts                # AI chat service and conversation management
│   └── openai.ts              # OpenAI API integration
├── types/
│   └── index.ts               # TypeScript type definitions
├── utils/
│   └── logger.ts              # Logging utility configuration
└── server.ts                  # Application entry point
```

## Getting Started

Install dependencies:

```bash
npm install
```

Set up environment variables by creating a `.env` file:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_building_iaq
DB_USER=iaq_admin
DB_PASSWORD=your_secure_password

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

REDIS_HOST=localhost
REDIS_PORT=6379

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
```

Start TimescaleDB with Docker:

```bash
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_USER=iaq_admin \
  -e POSTGRES_DB=smart_building_iaq \
  timescale/timescaledb:latest-pg14
```

Run the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Lucas Liu
