import { describe, expect, it } from 'vitest';
import { absoluteUrl, serializeJsonLd } from './seo';

describe('absoluteUrl', () => {
  it('joins a path onto the configured origin', () => {
    expect(absoluteUrl('/about/')).toMatch(/^https:\/\/.+\/about\/$/);
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so a value can never close the surrounding script tag', () => {
    const out = serializeJsonLd({ headline: 'x</script><script>alert(1)' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });

  it('round-trips through JSON.parse unchanged', () => {
    const ld = { '@type': 'BlogPosting', headline: 'a <b> c', nested: { url: '/x/' } };
    expect(JSON.parse(serializeJsonLd(ld))).toEqual(ld);
  });
});
