# New Test Creator

Local full-stack app (teacher question paper builder).

## Backend

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and `JWT_SECRET`.

   - To use MongoDB Atlas (recommended for deploy):
     1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
     2. Create a database user and note the username/password.
     3. From Atlas: "Connect" -> "Connect your application" -> copy the connection string.
     4. Replace <username>, <password> and <dbname> in the connection string and set it as `MONGO_URI` in `backend/.env`.
     5. Do NOT commit `.env` or your credentials to source control — keep secrets out of the repo.

   - For local development only, you can also run a local MongoDB and leave `MONGO_URI` blank to use the fallback local DB.

   - When deploying (e.g., Heroku, Render, Vercel server-side), set the `MONGO_URI` environment variable in the hosting provider's settings instead of committing it to the repo.

2. (Optional) To enable email sending for the "Send" feature, add SMTP env vars to `backend/.env`:

   Required:
   - SMTP_HOST - SMTP server host (e.g., smtp.gmail.com)
   - SMTP_PORT - SMTP port (e.g., 587)
   - SMTP_USER - SMTP username
   - SMTP_PASS - SMTP password or app-specific password

   Optional:
   - SMTP_FROM - From address to use (defaults to SMTP_USER)
   - SMTP_SECURE - 'true' to use SSL/TLS (port 465), otherwise false

   If SMTP credentials are not provided, email sending will be disabled; configure SMTP to enable sending when sharing papers.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Start server:
   ```bash
   npm run dev
   ```
5. Server runs at http://localhost:3000

## Frontend

Open `http://localhost:3000/login.html` in your browser.

- Sign up / login -> create and save papers.
- Preview opens the generated template and you can download the PDF.
- Use the "Send" action on saved papers to send them by email (if SMTP configured). Received papers appear in "Received Papers".

## Notes
- This is a minimal implementation. Add validation, better UI feedback, file uploads, and tests as needed.
