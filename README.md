# Service: Get static website

# Hono API with API Key Authentication

This is a Hono API service that uses API key authentication for all endpoints.

## Development Setup

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```

2. Edit `.env` and set your development API key:
   ```
   API_KEY="your_development_api_key"
   ```

3. Run the application:
   ```
   deno run --allow-net --allow-env --env-file --watch main.ts
   ```

## API Authentication

All API endpoints are protected with API key authentication. To access the API:

1. Include the `X-API-Key` header in your requests:
   ```
   X-API-Key: your_api_key
   ```

2. If the API key is missing or invalid, the API will return a 401 Unauthorized response.

## Environment Variables

- `API_KEY`: The API key used for authentication
  - In development: Set in `.env`
  - In production: Set in the infrastructure environment

## Endpoints

- `GET /`: Hello world endpoint
- `GET /health`: Health check endpoint

```
deno task start
```
