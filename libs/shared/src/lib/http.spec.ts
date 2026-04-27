import { HttpError } from './http';

describe('HttpError', () => {
  it('stores response metadata', () => {
    const error = new HttpError({
      code: 'bad_request',
      data: { field: 'email' },
      message: 'Invalid request.',
      statusCode: 400,
    });

    expect(error.code).toBe('bad_request');
    expect(error.data).toEqual({ field: 'email' });
    expect(error.message).toBe('Invalid request.');
    expect(error.statusCode).toBe(400);
  });
});
