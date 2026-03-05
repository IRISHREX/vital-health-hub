require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_management',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // CORS - handles both localhost and production
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(url => url.trim()),
  
  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Hospital Management <noreply@hospital.com>'
  },
  
  // Helper to check if production
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV !== 'production'
};

module.exports = config;
