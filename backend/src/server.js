require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const pushService = require('./services/pushService');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Force MongoDB connection before starting server
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not configured');
    }
    
    console.log('[MongoDB] Connecting...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    });
    console.log('[MongoDB] ✅ Connected successfully');
    
    // Clear any buffered operations
    mongoose.connection.once('open', () => {
      console.log('[MongoDB] Connection ready for operations');
    });
    
  } catch (error) {
    console.error('[MongoDB] ❌ CRITICAL - Failed to connect:', error.message);
    console.error('[MongoDB] Check MONGODB_URI in environment variables');
    process.exit(1);
  }
};

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration (Best Practice + Enhanced Logging)
const corsConfig = require('./utils/corsConfig');

// Log every incoming request's Origin header
app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log(`[CORS DEBUG] Incoming request Origin: ${req.headers.origin}`);
  }
  next();
});

app.use(cors(corsConfig));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      push: pushService.isEnabled(),
    },
  });
});

// Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server AFTER database is connected
const startApp = async () => {
  await startServer();
  
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

    // Configure Web Push VAPID
    const pushConfigured = pushService.configure();
    if (pushConfigured) {
      console.log('🔔 Web Push configured');

      // Send an early reminder after startup, then continue hourly.
      setTimeout(() => {
        pushService.broadcastHourlyReminder().catch((error) => {
          console.warn('[Push Scheduler] Immediate reminder failed:', error.message);
        });
      }, 2 * 60 * 1000);

      // Hourly push notification scheduler
      setInterval(() => {
        pushService.broadcastHourlyReminder().catch((error) => {
          console.warn('[Push Scheduler] Hourly reminder failed:', error.message);
        });
      }, 60 * 60 * 1000); // every 60 minutes
    } else {
      console.warn('🔕 Web Push disabled');
    }
  });
  
  return server;
};

// Start application
startApp().catch(error => {
  console.error('[STARTUP] Fatal error:', error.message);
  process.exit(1);
});

module.exports = app;
