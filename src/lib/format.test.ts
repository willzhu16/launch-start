import { describe, expect, it } from 'vitest';
import { initials } from './format';

describe('initials', () => {
  it('takes the first letter of two words', () => {
    expect(initials('General Writing')).toBe('GW');
  });

  it('returns a single letter for a one-word title', () => {
    expect(initials('Launch')).toBe('L');
  });

  it('truncates to the first two words', () => {
    expect(initials('Build In Public Journal')).toBe('BI');
  });

  it('collapses repeated spaces via filter(Boolean)', () => {
    expect(initials('General   Writing')).toBe('GW');
  });

  it('returns an empty string for an empty title', () => {
    expect(initials('')).toBe('');
  });
});
