// User Model - MongoDB
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { getJwtSecret, getJwtExpiresIn } = require('../utils/jwtSecret');

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Register model once
let UserModel = null;

const getModel = () => {
  // Check if connection is ready
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected. Connection state: ' + mongoose.connection.readyState);
  }
  
  if (!UserModel) {
    if (mongoose.models.User) {
      UserModel = mongoose.models.User;
    } else {
      UserModel = mongoose.model('User', userSchema);
    }
  }
  return UserModel;
};

class User {
  static async create(data) {
    try {
      const model = getModel();
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = new model({
        ...data,
        password: hashedPassword,
      });
      return await user.save();
    } catch (error) {
      console.error('[User.create] Error:', error.message);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      const model = getModel();
      return await model.findOne({ phone_number: phone });
    } catch (error) {
      console.error('[User.findByPhone] Error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const model = getModel();
      return await model.findById(id);
    } catch (error) {
      console.error('[User.findById] Error:', error.message);
      throw error;
    }
  }

  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  generateToken() {
    return jwt.sign(
      { id: this._id, phone: this.phone_number },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() }
    );
  }

  toJSON() {
    const { password, ...user } = this.toObject();
    return user;
  }
}

module.exports = User;
