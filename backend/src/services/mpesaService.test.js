const mpesaService = require('./mpesaService');

describe('MpesaService environment handling', () => {
  test('uses the sandbox Safaricom endpoint for sandbox requests', () => {
    mpesaService.environment = 'sandbox';
    expect(mpesaService.getBaseUrl()).toBe('https://sandbox.safaricom.co.ke');
  });

  test('uses the production Safaricom endpoint for production requests', () => {
    mpesaService.environment = 'production';
    expect(mpesaService.getBaseUrl()).toBe('https://api.safaricom.co.ke');
  });
});
