import { realtimeBus } from './realtime-bus';

describe('web-shared realtime bus', () => {
  it('returns the same singleton instance across imports', async () => {
    const secondImport = await import('./realtime-bus');

    expect(secondImport.realtimeBus).toBe(realtimeBus);
  });
});
