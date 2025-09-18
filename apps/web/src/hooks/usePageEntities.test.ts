import { act, renderHook } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import usePageEntities from './usePageEntities';
import { useEntitiesStore } from '../state/entitiesStore';
import { useJourneyStore } from '../state/journeyStore';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  useEntitiesStore.setState({ entities: [] });
  useJourneyStore.setState({ items: [] });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('usePageEntities', () => {
  it('sets an error when the query is empty', async () => {
    const { result } = renderHook(() => usePageEntities());

    await act(async () => {
      await result.current.ask('   ');
    });

    expect(result.current.error).toBe('Enter a phrase or place to explore.');
    expect(useEntitiesStore.getState().entities).toEqual([]);
  });

  it('populates entities and summary on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: 'Earth',
        summary: 'Planet Earth is our home world.',
        items: [
          { id: 'Q1', label: 'Earth', description: 'Planet', rank: 500 }
        ]
      })
    } as Response);

    const { result } = renderHook(() => usePageEntities());

    await act(async () => {
      await result.current.ask('Earth');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/link', expect.objectContaining({
      method: 'POST'
    }));
    expect(result.current.status).toBe('success');
    expect(result.current.summary).toBe('Planet Earth is our home world.');
    expect(result.current.error).toBeNull();
    expect(useEntitiesStore.getState().entities).toHaveLength(1);
    expect(useJourneyStore.getState().items[0]).toMatchObject({
      query: 'Earth',
      resultCount: 1
    });
  });

  it('records a failure when the fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => usePageEntities());

    await act(async () => {
      await result.current.ask('Library');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('offline');
  });
});
