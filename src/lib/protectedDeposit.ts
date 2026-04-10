export type ProtectedDepositPricing = {
  depositAmount: number;
  serviceFee: number;
  totalCharge: number;
  currency: 'ARS';
  depositNights: number;
  feeRate: number;
};

export const PROTECTED_DEPOSIT_SERVICE_FEE_RATE = 0.08;

const DAY_MS = 24 * 60 * 60 * 1000;

const toWholeCurrency = (value: number) => Math.max(0, Math.round(value));

const normalizeNightCount = (nights: number) => Math.max(1, Math.round(nights));

const getNightCountFromDates = (startDate: string, endDate: string) => {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
};

export const getProtectedDepositNightCount = (nights: number) => (
  normalizeNightCount(nights) >= 4 ? 2 : 1
);

export const getProtectedDepositPricing = (input: {
  nights: number;
  nightlyPrice: number;
  totalPrice: number;
}): ProtectedDepositPricing => {
  const nights = normalizeNightCount(input.nights);
  const nightlyPrice = toWholeCurrency(input.nightlyPrice);
  const totalPrice = toWholeCurrency(input.totalPrice);
  const depositNights = getProtectedDepositNightCount(nights);
  const depositAmount = Math.min(totalPrice, nightlyPrice * depositNights);
  const serviceFee = toWholeCurrency(depositAmount * PROTECTED_DEPOSIT_SERVICE_FEE_RATE);

  return {
    depositAmount,
    serviceFee,
    totalCharge: depositAmount + serviceFee,
    currency: 'ARS',
    depositNights,
    feeRate: PROTECTED_DEPOSIT_SERVICE_FEE_RATE,
  };
};

export const getProtectedDepositPricingFromBooking = (input: {
  startDate?: string | null;
  endDate?: string | null;
  totalPrice?: number | null;
}): ProtectedDepositPricing | null => {
  if (!input.startDate || !input.endDate) {
    return null;
  }

  const nights = getNightCountFromDates(input.startDate, input.endDate);
  if (nights < 1) {
    return null;
  }

  const totalPrice = toWholeCurrency(Number(input.totalPrice ?? 0));
  if (totalPrice <= 0) {
    return null;
  }

  return getProtectedDepositPricing({
    nights,
    nightlyPrice: totalPrice / nights,
    totalPrice,
  });
};