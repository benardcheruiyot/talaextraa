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

class User {
  static async create(data) {
    try {
      const model = mongoose.model('User', userSchema);
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
      const model = mongoose.model('User', userSchema);
      return await model.findOne({ phone_number: phone });
    } catch (error) {
      console.error('[User.findByPhone] Error:', error.message);
      return null;
    }
  }

  static async findById(id) {
    try {
      const model = mongoose.model('User', userSchema);
      return await model.findById(id);
    } catch (error) {
      console.error('[User.findById] Error:', error.message);
      return null;
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
