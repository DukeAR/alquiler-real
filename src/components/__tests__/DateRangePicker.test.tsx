import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useState } from 'react';

const apiJsonMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

import DateRangePicker from '../DateRangePicker';

const Harness = ({ initialCheckIn = '', initialCheckOut = '', propertyId }: { initialCheckIn?: string; initialCheckOut?: string; propertyId?: string }) => {
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);

  return (
    <div>
      <DateRangePicker
        checkIn={checkIn}
        checkOut={checkOut}
        setCheckIn={setCheckIn}
        setCheckOut={setCheckOut}
        propertyId={propertyId}
      />
      <div data-testid="selection">{`${checkIn}|${checkOut}`}</div>
    </div>
  );
};

const formatIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isoPlusDays = (days: number) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return formatIso(next);
};

const getDayButton = (iso: string) => screen.getByRole('button', { name: new RegExp(iso) });

describe('DateRangePicker (smoke)', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    apiJsonMock.mockResolvedValue([]);
  });

  test('focuses today when opened without selection', async () => {
    const todayIso = formatIso(new Date());

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    await waitFor(() => expect(getDayButton(todayIso)).toHaveFocus());
  });

  test('focuses selected check-in when reopened', async () => {
    const selectedCheckIn = isoPlusDays(3);

    render(<Harness initialCheckIn={selectedCheckIn} />);
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    await waitFor(() => expect(getDayButton(selectedCheckIn)).toHaveFocus());
  });

  test('escape clears a partial selection and closes the calendar', async () => {
    const selectedCheckIn = isoPlusDays(4);

    render(<Harness />);

    const toggleButton = screen.getByRole('button', { name: /abrir calendario de fechas/i });
    fireEvent.click(toggleButton);

    const checkInDay = await screen.findByRole('button', { name: new RegExp(selectedCheckIn) });
    fireEvent.click(checkInDay);

    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent(`${selectedCheckIn}|`));

    fireEvent.keyDown(checkInDay, { key: 'Escape' });

    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent('|'));
    await waitFor(() => expect(toggleButton).toHaveAttribute('aria-expanded', 'false'));
  });

  test('lets the user clear dates from the panel', async () => {
    const selectedCheckIn = isoPlusDays(5);

    render(<Harness initialCheckIn={selectedCheckIn} />);
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    fireEvent.click(await screen.findByRole('button', { name: /limpiar/i }));

    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent('|'));
  });

  test('supports page navigation with the keyboard across months', async () => {
    const today = new Date();
    const todayIso = formatIso(today);
    const nextMonthSameDay = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(today.getDate(), new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()));
    const nextMonthIso = formatIso(nextMonthSameDay);

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    const todayButton = await screen.findByRole('button', { name: new RegExp(todayIso) });
    fireEvent.keyDown(todayButton, { key: 'PageDown' });

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(nextMonthIso) })).toHaveFocus());
  });

  test('blocks occupied dates from availability and keeps the checkout boundary available', async () => {
    const checkInIso = isoPlusDays(2);
    const blockedStartIso = isoPlusDays(4);
    const blockedEndIso = isoPlusDays(6);
    const invalidCheckoutIso = isoPlusDays(5);

    apiJsonMock.mockResolvedValue([{ start: blockedStartIso, end: blockedEndIso }]);

    render(<Harness propertyId="property-1" />);
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    const blockedStartDay = await screen.findByRole('button', { name: new RegExp(blockedStartIso) });
    await waitFor(() => expect(blockedStartDay).toBeDisabled());

    fireEvent.click(await screen.findByRole('button', { name: new RegExp(checkInIso) }));

    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent(`${checkInIso}|`));
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(blockedStartIso) })).not.toBeDisabled());
    expect(screen.getByRole('button', { name: new RegExp(invalidCheckoutIso) })).toBeDisabled();
  });
});
