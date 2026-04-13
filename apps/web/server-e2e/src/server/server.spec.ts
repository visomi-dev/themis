import axios from 'axios';

describe('composition server', () => {
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
});
