import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestJson } from './http.js';
import { searchImages } from './googleImages';

const configStub = {
  GOOGLE_CSE_API_KEY: '',
  GOOGLE_CSE_CX: ''
};

vi.mock('../config.js', () => ({
  cfg: configStub
}));

vi.mock('./http.js', () => ({
  requestJson: vi.fn()
}));

const mockedRequestJson = vi.mocked(requestJson);

afterEach(() => {
  mockedRequestJson.mockReset();
  configStub.GOOGLE_CSE_API_KEY = '';
  configStub.GOOGLE_CSE_CX = '';
});

describe('searchImages', () => {
  it('returns empty list when credentials are missing', async () => {
    const results = await searchImages('museum');
    expect(results).toEqual([]);
    expect(mockedRequestJson).not.toHaveBeenCalled();
  });

  it('queries Google Custom Search when configured', async () => {
    configStub.GOOGLE_CSE_API_KEY = 'key';
    configStub.GOOGLE_CSE_CX = 'cx';

    mockedRequestJson.mockResolvedValueOnce({
      items: [
        {
          link: 'https://example.com/image.jpg',
          image: {
            width: 640,
            height: 480,
            thumbnailLink: 'https://example.com/thumb.jpg'
          }
        }
      ]
    });

    const results = await searchImages('ancient library');

    expect(mockedRequestJson).toHaveBeenCalledTimes(1);
    const [url] = mockedRequestJson.mock.calls[0];
    expect(String(url)).toContain('ancient+library');
    expect(results).toEqual([
      {
        url: 'https://example.com/image.jpg',
        width: 640,
        height: 480,
        thumbnailUrl: 'https://example.com/thumb.jpg'
      }
    ]);
  });
});
