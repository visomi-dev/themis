import { describe, expect, it } from 'vitest';

import { getSiteContent } from './site-content';

describe('getSiteContent', () => {
  it('returns english copy', () => {
    expect(getSiteContent('en').cta).toContain('docs');
  });

  it('returns spanish copy', () => {
    expect(getSiteContent('es').eyebrow).toContain('developers');
  });
});
