const jwt = require('jsonwebtoken');
const { verifyJwt } = require('./jwtSecret');

const clearModuleCache = () => {
  delete require.cache[require.resolve('./jwtSecret')];
};

describe('verifyJwt', () => {
  it('verifies tokens signed with legacy fallback secrets', () => {
    const token = jwt.sign({ id: '123' }, 'local_dev_jwt_secret_change_me', { expiresIn: '1h' });

    const decoded = verifyJwt(token);

    expect(decoded.id).toBe('123');
  });

  it('verifies tokens signed with a stable production fallback secret', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFallback = process.env.TALA_EXTRA_JWT_FALLBACK;

    clearModuleCache();
    process.env.NODE_ENV = 'production';
    process.env.TALA_EXTRA_JWT_FALLBACK = 'stable-production-secret';

    const { verifyJwt: freshVerifyJwt } = require('./jwtSecret');
    const token = jwt.sign({ id: '456' }, 'stable-production-secret', { expiresIn: '1h' });
    const decoded = freshVerifyJwt(token);

    expect(decoded.id).toBe('456');

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousFallback === undefined) {
      delete process.env.TALA_EXTRA_JWT_FALLBACK;
    } else {
      process.env.TALA_EXTRA_JWT_FALLBACK = previousFallback;
    }

    clearModuleCache();
  });
});
