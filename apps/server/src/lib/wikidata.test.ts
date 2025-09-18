import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestJson } from './http.js';
import { searchWikidata } from './wikidata';

vi.mock('./http.js', () => ({
  requestJson: vi.fn()
}));

const mockedRequestJson = vi.mocked(requestJson);

afterEach(() => {
  mockedRequestJson.mockReset();
});

describe('searchWikidata', () => {
  it('returns mapped entities ordered by score', async () => {
    mockedRequestJson.mockResolvedValueOnce({
      search: [
        {
          id: 'Q1',
          label: 'Earth',
          description: 'Third planet from the Sun',
          concepturi: 'https://www.wikidata.org/wiki/Q1'
        },
        {
          id: 'Q2',
          label: 'Earth (band)',
          description: 'American musical collective',
          concepturi: 'https://www.wikidata.org/wiki/Q2'
        }
      ]
    });

    const result = await searchWikidata('  Earth  ');

    expect(mockedRequestJson).toHaveBeenCalledTimes(1);
    const [url] = mockedRequestJson.mock.calls[0];
    expect(String(url)).toContain('search=Earth');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'Q1',
      label: 'Earth',
      description: 'Third planet from the Sun',
      url: 'https://www.wikidata.org/wiki/Q1'
    });
    expect(result[1]).toMatchObject({ id: 'Q2' });
    expect(result[0].rank).toBeGreaterThanOrEqual(result[1].rank ?? 0);
  });

  it('returns empty array when query is blank', async () => {
    const result = await searchWikidata('   ');
    expect(result).toEqual([]);
    expect(mockedRequestJson).not.toHaveBeenCalled();
  });
});
