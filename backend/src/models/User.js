// User Model - In-Memory Storage
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiresIn } = require('../utils/jwtSecret');

// In-memory store
const users = new Map();

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone_number = data.phone_number;
    this.password = data.password;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = new User({
        ...data,
        id: Date.now().toString(),
        password: hashedPassword,
      });
      users.set(user.id, user);
      console.log(`[User] Created user ${user.phone_number}`);
      return user;
    } catch (error) {
      console.error('[User.create] Error:', error.message);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      for (let user of users.values()) {
        if (user.phone_number === phone) {
          return user;
        }
      }
      return null;
    } catch (error) {
      console.error('[User.findByPhone] Error:', error.message);
      return null;
    }
  }

  static async findById(id) {
    try {
      return users.get(id) || null;
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
      { id: this.id, phone: this.phone_number },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() }
    );
  }

  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}

module.exports = User;
