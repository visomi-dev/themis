import axios from 'axios';

describe('composition server', () => {
  it('exposes a runtime health endpoint', async () => {
    const response = await axios.get('/healthz');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok' });
  });

  it('serves the public site root', async () => {
    const response = await axios.get('/', {
      headers: {
        Accept: 'text/html',
      },
      responseType: 'text',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.data).toContain('Themis');
  });

  it('mounts the api under /api', async () => {
    const response = await axios.get('/api/');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Hello Themis API' });
  });

  it('serves the Angular auth surface under /app', async () => {
    const response = await axios.get('/app/sign-in', {
      headers: {
        Accept: 'text/html',
      },
      responseType: 'text',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.data).toContain('<base href="/app/">');
    expect(response.data).toContain('<app-root>');
  });
});
