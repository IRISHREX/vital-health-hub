# Hostinger frontend deployment

This project can be deployed as a frontend-only app on Hostinger while keeping the backend on Render.

## 1. Set the production API URL

Create a `.env.production` file in the project root with:

```env
VITE_PRODUCTION_API_URL=https://your-render-backend.onrender.com/nh/api/v1
```

Replace the URL with the live Render backend URL that already serves your API.

## 2. Build the frontend

```bash
npm ci
npm run build
```

The production-ready frontend will be created in `dist/`.

## 3. Upload to Hostinger

For `hospital.mkinfotrack.com`, upload the contents of `dist/` to the subdomain document root in Hostinger File Manager or via FTP.

Important:

- Upload the contents inside `dist/`, not the `dist` folder itself.
- Keep the generated `.htaccess` file in the upload so React routes work on refresh.
- Do not upload the `backend/` folder for this deployment.

## 4. Backend stays on Render

The frontend will call:

- Hospital API: `VITE_PRODUCTION_API_URL`
- Grandmaster API: same base, automatically rewritten from `/nh/api/v1` to `/gm/api/v1`
- Public API: same base, automatically rewritten from `/nh/api/v1` to `/public/api/v1`

## 5. Recommended DNS / panel setup

- Point `hospital.mkinfotrack.com` to the Hostinger subdomain document root.
- Leave the backend running on Render.
- If the backend allows CORS by origin, add `https://hospital.mkinfotrack.com` to the allowlist.

## 6. Smoke test after upload

Check these routes in the browser:

- `/login`
- `/grandmaster/login`
- `/lab-portal/login`
- refresh any deep link directly to confirm `.htaccess` is working

If the app loads but API requests fail, the usual cause is an incorrect `VITE_PRODUCTION_API_URL` or missing CORS permission on the Render backend.
