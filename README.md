# SIH 2026 Internal College Innovation Challenge Portal

A full-stack, role-aware SIH internal-selection portal for **Aryan Institute of Engineering & Technology**. It can be deployed as one Render web service, or the `client/` directory can be hosted on GitHub Pages while the API remains on Render.

## Included

- Public SIH landing page: official supplied visual assets, responsive Bootstrap layout, countdown, problem-statement filters, timeline, resources, notices, AOS motion, and a safe 30-click SIH-logo celebration.
- Team registration: exactly six students—one female member and five male members—with one team leader login and only the leader's passport-size photo uploaded to Cloudinary.
- Private student dashboard: only the signed-in student’s profile, team, notices, resources, timeline, and status are exposed.
- Leader account: only the first registered member can sign in with their email and password; password-reset requests are sent to the SIH Cell WhatsApp number for identity verification.
- Admin portal: student search and approvals, team/mentor management, resource uploads, notices, activity logs, schedules, analytics and CSV/Excel/PDF reporting.
- Internal evaluation: the booklet's 100-point rubric, guarded score ranges, automatic totals, multi-admin scoring and ranked shortlist.
- Secure report PDFs: institute identifier, generated timestamp, administrator name, confidentiality footer and a diagonal `CONFIDENTIAL` watermark on every page.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace every placeholder. Do **not** paste secrets into the source files.
3. Install dependencies and create the first admin.

   ```bash
   npm install
   npm run seed
   npm run dev
   ```

4. Open [http://localhost:5000](http://localhost:5000). The first admin uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

`CLOUDINARY_URL` is required for student photos and administrator PDF uploads. It has the form `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.

## Deploy on Render (recommended)

1. Create a new private GitHub repository, add this project, and push it. Do not commit `.env`.
2. In Render, choose **New → Blueprint** and select the repository. It reads `render.yaml`; alternatively create a Node Web Service with build command `npm ci`, start command `npm start`, and health-check path `/api/health`.
3. Add these environment variables in the Render service:

   - `MONGODB_URI` - a MongoDB Atlas URI with a database name such as `sih_aryan_2026`
   - `JWT_SECRET` - a freshly generated 32+ character secret (Render can generate it from the Blueprint)
   - `CLOUDINARY_URL`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
   - `CLIENT_URL` - the final public URL, for example `https://sih-2026-aryan-portal.onrender.com`

4. After Render deploys, open its Shell once and run `npm run seed` to create the initial administrator. Then sign in through the same Login form used by students.
5. In MongoDB Atlas, allow Render to connect. For a quick prototype, Atlas network access can allow `0.0.0.0/0`; for a production deployment restrict it to Render's documented outbound IP range where your Render plan supports static egress.

This one-service deployment serves the frontend and API from the same origin, so it needs no browser CORS adjustment.

## Optional GitHub Pages frontend

Keep the API on Render and publish **the contents of `client/`** with GitHub Pages. Before publishing, edit `client/js/config.js`:

```js
window.SIH_API_URL = 'https://YOUR-SERVICE.onrender.com';
```

Then set Render `CLIENT_URL` to the exact GitHub Pages origin, for example `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY`. The API explicitly permits only origins in that environment variable (comma-separated values are supported).

## Security notes

- The MongoDB URI shared in the original project brief contained credentials. Treat it as exposed: rotate that database password in Atlas and update `MONGODB_URI` only in Render/local `.env`.
- This implementation never embeds a MongoDB URI, password, JWT secret or Cloudinary secret in Git-tracked files.
- HTTPS is supplied by Render on the public service URL. The API also uses Helmet, rate limits, validators, JWT checks and server-side role authorization.
- Admin controls are not an easter egg; the logo interaction only runs a visual celebration. All admin routes verify the JWT role on the server.
