import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AskBar from './AskBar';

describe('AskBar focus behaviour', () => {
  it('keeps input focused while loading toggles', async () => {
    const onSubmit = () => Promise.resolve();
    const { rerender } = render(
      <AskBar loading={false} disabled={false} onSubmit={onSubmit} />
    );

    const input = screen.getByRole('textbox', { name: 'Ask Book Lens' }) as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'Hello' } });

    // Simulate loading change
    rerender(<AskBar loading={true} disabled={false} onSubmit={onSubmit} />);
    expect(document.activeElement).toBe(input);

    // Back to idle
    rerender(<AskBar loading={false} disabled={false} onSubmit={onSubmit} />);
    expect(document.activeElement).toBe(input);
  });
});


