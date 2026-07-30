const jwt = require('jsonwebtoken');
const { verifyJwt } = require('./jwtSecret');

describe('verifyJwt', () => {
  it('verifies tokens signed with legacy fallback secrets', () => {
    const token = jwt.sign({ id: '123' }, 'local_dev_jwt_secret_change_me', { expiresIn: '1h' });

    const decoded = verifyJwt(token);

    expect(decoded.id).toBe('123');
  });
});
