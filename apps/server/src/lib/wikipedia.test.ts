import { afterEach, describe, expect, it, vi } from 'vitest';

import { request, requestJson } from './http.js';
import { fetchSummary } from './wikipedia';

vi.mock('./http.js', () => ({
  requestJson: vi.fn(),
  request: vi.fn()
}));

const mockedRequestJson = vi.mocked(requestJson);
const mockedRequest = vi.mocked(request);

afterEach(() => {
  mockedRequestJson.mockReset();
  mockedRequest.mockReset();
});

describe('fetchSummary', () => {
  it('returns trimmed extract for resolved page', async () => {
    mockedRequestJson.mockResolvedValueOnce(['query', ['Earth'], [], []]);
    mockedRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ extract: '  Planet Earth.  ' })
    } as Response);

    const summary = await fetchSummary(' Earth ');

    expect(mockedRequestJson).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(summary).toBe('Planet Earth.');
  });

  it('returns empty string when summary not found', async () => {
    mockedRequestJson.mockResolvedValueOnce(['query', [], [], []]);
    mockedRequest.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({})
    } as Response);

    const summary = await fetchSummary('Unknown subject');

    expect(summary).toBe('');
  });
});
