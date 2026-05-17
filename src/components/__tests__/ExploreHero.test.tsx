import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreHero } from '../explore/ExploreHero';

describe('ExploreHero', () => {
  test('renders the focused hero with a direct subtitle and a solid search card', () => {
    render(
      <ExploreHero
        searchValue=""
        locationSuggestions={[]}
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        onSearchSubmitValue={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    const eyebrow = screen.getByText('COSTA ATLÁNTICA ARGENTINA');
    const title = screen.getByRole('heading', { name: /La información real importa\.\s*Elegí mejor antes de reservar\./ });
    const subtitle = screen.getByText('Compará precio, zona y verificación antes de reservar.');
    const search = screen.getByRole('combobox', { name: 'Destino' });
    const searchShell = screen.getByTestId('hero-search-shell');
    const searchButton = screen.getByRole('button', { name: 'Buscar alojamientos' });
    const badge = screen.getByText('Ubicación real');
    const badgeWrapper = badge.parentElement;
    const badgeRow = badgeWrapper?.parentElement;
    const searchForm = searchShell.parentElement;
    const contentStack = badgeRow?.parentElement;
    const heroContentWrapper = contentStack?.parentElement;
    const heroCard = heroContentWrapper?.parentElement;
    const heroSection = heroCard?.parentElement;

    expect(eyebrow).toBeInTheDocument();
    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(title.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(subtitle.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(search.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    expect(screen.queryByText('Costa Atlántica Argentina')).toBeNull();
    expect(screen.queryByText('Alquileres verificados en la Costa Atlántica Argentina')).toBeNull();
    expect(search).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(searchShell).toBeInTheDocument();
    expect(screen.queryByText('Buscador principal')).toBeNull();
    expect(heroSection).toHaveClass('app-page-explore', 'mt-4', 'sm:mt-6', 'md:mt-8');
    expect(heroCard).toHaveClass('relative', 'overflow-hidden', 'rounded-[24px]', 'bg-slate-100', 'shadow-[0_24px_72px_rgba(15,23,42,0.14)]', 'md:min-h-[600px]', 'xl:min-h-[640px]');
    expect(heroContentWrapper).toHaveClass('relative', 'z-10', 'items-center', 'justify-center', 'px-4', 'py-10', 'text-center', 'sm:px-5', 'sm:py-12', 'md:min-h-[600px]', 'md:px-8', 'md:py-16', 'xl:min-h-[640px]', 'xl:px-10');
    expect(contentStack).toHaveClass('w-full', 'max-w-[980px]', 'items-center', 'text-center');
    expect(title).toHaveClass('max-w-[920px]', '!text-[34px]', 'font-semibold', 'leading-[1.02]', 'tracking-[-0.045em]', 'text-slate-950', 'sm:!text-[38px]', 'md:!text-[58px]', 'lg:!text-[68px]');
    expect(subtitle).toHaveClass('mt-5', 'max-w-[740px]', '!text-[16px]', 'font-medium', 'leading-7', 'text-slate-700', 'sm:mt-6', 'sm:!text-[17px]', 'md:!text-[21px]', 'lg:!text-[24px]');
    expect(searchForm).toHaveClass('mt-8', 'w-full', 'max-w-[980px]', 'sm:mt-10', 'md:mt-12');
    expect(searchShell).toHaveClass('rounded-[24px]', 'border', 'border-white/70', 'bg-white/95', 'p-2.5', 'shadow-[0_20px_56px_rgba(15,23,42,0.16)]', 'backdrop-blur-md', 'transition-all', 'duration-300', 'hover:shadow-[0_28px_90px_rgba(15,23,42,0.22)]', 'focus-within:ring-4', 'focus-within:ring-indigo-500/20', 'md:h-[80px]', 'md:rounded-full', 'md:p-0', 'md:px-5');
    expect(search).toHaveClass('!h-11', '!min-h-11', 'rounded-full', '!border-0', 'bg-transparent', '!text-[0.98rem]', 'font-medium', 'text-slate-800', '!shadow-none', 'outline-none', 'placeholder:text-slate-400', 'transition-all', 'duration-200', 'hover:!border-transparent', 'hover:!shadow-none', 'focus:!border-transparent', 'focus:!shadow-none', 'focus:outline-none', 'focus-visible:!border-transparent', 'focus-visible:!shadow-none', 'md:!h-[80px]', 'md:pr-[16rem]', 'md:!text-[1.1rem]');
    expect(searchButton).toHaveClass('h-[50px]', 'w-full', 'gap-2', 'rounded-full', 'bg-indigo-600', 'text-[0.98rem]', 'font-semibold', 'text-white', 'shadow-[0_14px_35px_rgba(79,70,229,0.35)]', 'transition-all', 'duration-200', 'hover:-translate-y-[1px]', 'hover:bg-indigo-700', 'md:h-[60px]', 'md:w-auto', 'md:px-10', 'md:text-[1.04rem]');
    expect(searchButton.querySelector('svg')).not.toBeNull();
    expect(badge).toBeInTheDocument();
    expect(badgeRow).toHaveClass('mt-6', 'flex-wrap', 'justify-center', 'gap-2.5', 'sm:mt-8', 'sm:gap-3.5');
    expect(badgeWrapper).toHaveClass('gap-2', 'rounded-full', 'border', 'border-white/60', 'bg-white/78', 'px-3', 'py-1.75', 'text-[0.76rem]', 'font-medium', 'text-slate-600', 'shadow-[0_10px_24px_rgba(15,23,42,0.08)]', 'backdrop-blur-md', 'transition-all', 'duration-200', 'hover:-translate-y-0.5', 'hover:bg-white/88', 'sm:px-4', 'sm:py-2', 'sm:text-[0.88rem]');
    expect(badgeWrapper?.querySelector('svg')).toHaveClass('h-3.5', 'w-3.5', 'text-emerald-500');
    expect(screen.getByText('Identidad validada')).toBeInTheDocument();
    expect(screen.getByText('Verificado presencialmente')).toBeInTheDocument();
  });
});