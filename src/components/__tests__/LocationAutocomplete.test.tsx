import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { LocationAutocomplete } from '../LocationAutocomplete';

const Harness = ({ onSubmitValue }: { onSubmitValue: (value: string) => void }) => {
  const [value, setValue] = useState('');

  return (
    <LocationAutocomplete
      value={value}
      onChange={setValue}
      onSubmitValue={onSubmitValue}
    />
  );
};

describe('LocationAutocomplete', () => {
  test('submits typed value on Enter when there are no suggestions', () => {
    const submitSpy = vi.fn();

    render(<Harness onSubmitValue={submitSpy} />);

    const input = screen.getByRole('combobox', { name: /buscar ubicación/i });
    fireEvent.change(input, { target: { value: 'Ushuaia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(submitSpy).toHaveBeenCalledWith('Ushuaia');
  });
});