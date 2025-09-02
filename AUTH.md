Authentication Overview

- JWT-based auth is enabled for protected endpoints.
- Signup: Buyers call POST `/api/users/signup`; admins approve via POST `/api/users/confirm-signup`.
- Login: POST `/api/users/login` with JSON `{ "email": "...", "password": "..." }`.
- Response: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`.
- Use header `Authorization: Bearer <token>` for protected routes.
- Ingestion: POST `/api/ingest` requires a token and records `listings.buyer` as the authenticated user's id.

Environment

- `JWT_SECRET` (required in prod): strong random secret.
- `JWT_ALGORITHM`: defaults to `HS256`.
- `JWT_EXPIRES_MINUTES`: defaults to 60.
