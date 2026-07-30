const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    'mongodb://127.0.0.1:27017/loan_app';

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB.');
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  console.log('[MongoDB] Connected to database');
};

module.exports = connectDB;
