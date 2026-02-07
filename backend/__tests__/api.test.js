const request = require('supertest');

jest.mock('axios', () => ({
  post: jest.fn()
}));

const axios = require('axios');
process.env.NODE_ENV = 'test';
delete process.env.MONGO_URI;
process.env.DISABLE_DB = '1';
process.env.HISTORY_FILE = require('path').join(require('os').tmpdir(), `fixifyai-history-${Date.now()}.json`);
const { app } = require('../server');

describe('API', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-pro';
    axios.post.mockReset();
  });

  test('POST /api/analyze validates payload', async () => {
    const res = await request(app).post('/api/analyze').send({ language: 'javascript' });
    expect(res.status).toBe(400);
  });

  test('POST /api/analyze rejects unsupported language', async () => {
    const res = await request(app).post('/api/analyze').send({ code: 'x', language: 'ruby' });
    expect(res.status).toBe(400);
  });

  test('POST /api/analyze returns structured report', async () => {
    axios.post.mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    analysis: 'Finds and fixes a simple bug.',
                    detectedProblems: [
                      { type: 'logic', severity: 'high', message: 'Off-by-one', approxLine: 3, snippet: 'i <= n' }
                    ],
                    fixes: [{ message: 'Use < instead of <=', reason: 'Prevents out-of-bounds access.' }],
                    correctedCode: 'console.log("fixed");',
                    optimizedCode: null
                  })
                }
              ]
            }
          }
        ]
      }
    });

    const res = await request(app)
      .post('/api/analyze')
      .send({ code: 'console.log("bug");', language: 'javascript' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('report');
    expect(res.body.report).toHaveProperty('analysis');
    expect(res.body.report).toHaveProperty('detectedProblems');
    expect(res.body.report).toHaveProperty('fixes');
    expect(res.body.report).toHaveProperty('correctedCode');
  });

  test('POST /api/analyze falls back when model is not found', async () => {
    process.env.GEMINI_MODEL = 'gemini-pro';

    axios.post
      .mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: { message: 'models/gemini-pro is not found for API version v1beta' } }
        }
      })
      .mockResolvedValueOnce({
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      analysis: 'ok',
                      detectedProblems: [],
                      fixes: [],
                      correctedCode: 'console.log("fixed");',
                      optimizedCode: null
                    })
                  }
                ]
              }
            }
          ]
        }
      });

    const res = await request(app)
      .post('/api/analyze')
      .send({ code: 'console.log("bug");', language: 'javascript' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('model');
    expect(res.body.model).not.toBe('gemini-pro');
  });

  test('GET /api/history returns file-backed history', async () => {
    axios.post.mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    analysis: 'ok',
                    detectedProblems: [],
                    fixes: [],
                    correctedCode: 'console.log("fixed");',
                    optimizedCode: null
                  })
                }
              ]
            }
          }
        ]
      }
    });

    const analyze = await request(app)
      .post('/api/analyze')
      .send({ code: 'console.log("bug");', language: 'javascript' });
    expect(analyze.status).toBe(200);

    const history = await request(app).get('/api/history');
    expect(history.status).toBe(200);
    expect(Array.isArray(history.body)).toBe(true);
    expect(history.body.length).toBeGreaterThan(0);
    expect(history.body[0]).toHaveProperty('language', 'javascript');
  });
});
