require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config');
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');
const { errorHandler } = require('./middleware/errorHandler');
require('./config/passport');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// CORS - handles localhost and production
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.frontendUrls.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev, restrict in prod
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', require('./routes'));

// Error handler
app.use(errorHandler);

const createSuperAdmin = require('./scripts/createSuperAdmin');

// Connect DB and start server
const startServer = async () => {
  await connectDB();
  await createSuperAdmin();
  server.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📍 Environment: ${config.env}`);
  });
};

startServer();
