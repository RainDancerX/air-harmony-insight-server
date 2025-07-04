# Air Harmony Insight API

Backend API server for the Air Harmony Insight application built with Express.js and TypeScript.

## Features

- **Express.js** - Fast, unopinionated web framework for Node.js
- **TypeScript** - Type-safe JavaScript development
- **Security** - Helmet.js for security headers
- **CORS** - Cross-Origin Resource Sharing enabled
- **Logging** - Morgan HTTP request logger
- **Modular Routes** - Organized route structure
- **Error Handling** - Comprehensive error handling middleware
- **Health Checks** - Built-in health monitoring endpoint

## Project Structure

```
src/
├── server.ts           # Main server file
├── routes/
│   ├── index.ts        # Route aggregator
│   ├── health.ts       # Health check routes
│   └── api.ts          # Main API routes
└── ...
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

## Development

### Start the development server:

```bash
npm run dev
```

### Build the project:

```bash
npm run build
```

### Start the production server:

```bash
npm start
```

## API Endpoints

### Health Check

- **GET** `/health` - Server health status

### API Information

- **GET** `/api` - API information and available endpoints
- **GET** `/api/status` - API status

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Add other configuration as needed
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (to be implemented)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

## Author

Chenxin Liu
# air-harmony-insight-server
