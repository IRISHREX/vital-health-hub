# Hospital Management Backend

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB Atlas URI
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

## MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Get connection string and add to `.env`

## Deploy to Railway/Render
1. Push to GitHub
2. Connect repo to Railway/Render
3. Set environment variables
4. Deploy!

## Frontend Connection
Update `VITE_PRODUCTION_API_URL` in frontend `.env` with your deployed backend URL.
