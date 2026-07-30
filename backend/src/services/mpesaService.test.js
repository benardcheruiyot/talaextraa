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

  test('uses the shortcode as PartyB for paybill STK requests', () => {
    mpesaService.shortcode = '3700945';
    mpesaService.partyB = '5892851';

    expect(mpesaService.resolvePartyB('CustomerPayBillOnline')).toBe('3700945');
  });

  test('uses the configured PartyB for buygoods STK requests', () => {
    mpesaService.shortcode = '3700945';
    mpesaService.partyB = '5892851';

    expect(mpesaService.resolvePartyB('CustomerBuyGoodsOnline')).toBe('5892851');
  });

  test('normalizes newer Safaricom numbers starting with 01', () => {
    expect(mpesaService.normalizePhone('0112345678')).toBe('254112345678');
  });

  test('normalizes 07-prefixed numbers to 254 format', () => {
    expect(mpesaService.normalizePhone('0712345678')).toBe('254712345678');
  });
});
