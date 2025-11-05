import request from 'supertest';
import app from '../src/app';

describe('App basic routes', () => {
  test('GET / should return HTML (200)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /api/hyperliquid/:wallet/pnl without required query returns 400', async () => {
    const res = await request(app).get('/api/hyperliquid/0x123/pnl');
    expect(res.status).toBe(400);
  });

  test('POST /api/token/:id/insight without body returns 400 or 500 depending on external calls', async () => {
    const res = await request(app).post('/api/token/bitcoin/insight').send({});
    expect(res.status).not.toBe(500);
  });
});
