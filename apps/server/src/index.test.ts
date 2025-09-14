import request from 'supertest';
import app from './index';

it('responds to /healthz', async () => {
  const res = await request(app).get('/healthz');
  expect(res.status).toBe(200);
});
