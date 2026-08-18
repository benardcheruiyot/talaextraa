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

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsConfig = require('./utils/corsConfig');
app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log(`[CORS DEBUG] Incoming request Origin: ${req.headers.origin}`);
  }
  next();
});
app.use(cors(corsConfig));
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
    services: {
      push: pushService.isEnabled(),
    },
  });
});

// Routes (mounted AFTER health check)
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// ============ INITIALIZATION ============

// Connect to MongoDB with retry
const connectMongoDB = async (attempt = 1, maxAttempts = 5) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    console.log(`[MongoDB] Attempt ${attempt}/${maxAttempts}: Connecting...`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    
    console.log('[MongoDB] ✅ Connected successfully');
    return true;
    
  } catch (error) {
    console.error(`[MongoDB] ❌ Attempt ${attempt} failed:`, error.message);
    
    if (attempt < maxAttempts) {
      console.log(`[MongoDB] Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectMongoDB(attempt + 1, maxAttempts);
    } else {
      console.error('[MongoDB] ❌ CRITICAL: Max retry attempts reached');
      return false;
    }
  }
};

// Start server only after MongoDB connects
const initializeApp = async () => {
  try {
    // Connect to MongoDB (with retries)
    const mongoConnected = await connectMongoDB();
    if (!mongoConnected) {
      throw new Error('Failed to connect to MongoDB after multiple attempts');
    }
    
    // Start listening for requests
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}\n`);

      // Configure Web Push
      const pushConfigured = pushService.configure();
      if (pushConfigured) {
        console.log('🔔 Web Push notifications enabled');
        
        setTimeout(() => {
          pushService.broadcastHourlyReminder().catch(err => {
            console.warn('[Push] Initial reminder failed:', err.message);
          });
        }, 2 * 60 * 1000);

        setInterval(() => {
          pushService.broadcastHourlyReminder().catch(err => {
            console.warn('[Push] Hourly reminder failed:', err.message);
          });
        }, 60 * 60 * 1000);
      } else {
        console.warn('🔕 Web Push disabled');
      }
    });
    
    return server;
    
  } catch (error) {
    console.error('[STARTUP] Fatal error:', error.message);
    process.exit(1);
  }
};

// Run initialization
initializeApp();

// Export app for testing
module.exports = app;
