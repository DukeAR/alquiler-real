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
    expect(heroSection).toHaveClass('app-page-explore', 'mt-8');
    expect(heroCard).toHaveClass('relative', 'overflow-hidden', 'rounded-[28px]', 'bg-slate-100', 'shadow-[0_30px_90px_rgba(15,23,42,0.16)]', 'md:min-h-[600px]', 'xl:min-h-[640px]');
    expect(heroContentWrapper).toHaveClass('relative', 'z-10', 'items-center', 'justify-center', 'px-5', 'py-14', 'text-center', 'md:min-h-[600px]', 'md:px-8', 'md:py-16', 'xl:min-h-[640px]', 'xl:px-10');
    expect(contentStack).toHaveClass('w-full', 'max-w-[980px]', 'items-center', 'text-center');
    expect(title).toHaveClass('max-w-[920px]', '!text-[42px]', 'font-semibold', 'leading-[1.03]', 'tracking-[-0.05em]', 'text-slate-950', 'md:!text-[58px]', 'lg:!text-[68px]');
    expect(subtitle).toHaveClass('mt-7', 'max-w-[740px]', '!text-[18px]', 'font-medium', 'leading-relaxed', 'text-slate-700', 'md:!text-[21px]', 'lg:!text-[24px]');
    expect(searchForm).toHaveClass('mt-12', 'w-full', 'max-w-[980px]');
    expect(searchShell).toHaveClass('rounded-[28px]', 'border', 'border-white/70', 'bg-white/95', 'p-3', 'shadow-[0_24px_70px_rgba(15,23,42,0.18)]', 'backdrop-blur-md', 'transition-all', 'duration-300', 'hover:shadow-[0_28px_90px_rgba(15,23,42,0.22)]', 'focus-within:ring-4', 'focus-within:ring-indigo-500/20', 'md:h-[80px]', 'md:rounded-full', 'md:p-0', 'md:px-5');
    expect(search).toHaveClass('!h-12', '!min-h-12', 'rounded-full', '!border-0', 'bg-transparent', '!text-[1.05rem]', 'font-medium', 'text-slate-800', '!shadow-none', 'outline-none', 'placeholder:text-slate-400', 'transition-all', 'duration-200', 'hover:!border-transparent', 'hover:!shadow-none', 'focus:!border-transparent', 'focus:!shadow-none', 'focus:outline-none', 'focus-visible:!border-transparent', 'focus-visible:!shadow-none', 'md:!h-[80px]', 'md:pr-[16rem]', 'md:!text-[1.1rem]');
    expect(searchButton).toHaveClass('h-[52px]', 'w-full', 'gap-2', 'rounded-full', 'bg-indigo-600', 'text-base', 'font-semibold', 'text-white', 'shadow-[0_14px_35px_rgba(79,70,229,0.35)]', 'transition-all', 'duration-200', 'hover:-translate-y-[1px]', 'hover:bg-indigo-700', 'md:h-[60px]', 'md:w-auto', 'md:px-10', 'md:text-[1.04rem]');
    expect(searchButton.querySelector('svg')).not.toBeNull();
    expect(badge).toBeInTheDocument();
    expect(badgeRow).toHaveClass('mt-8', 'flex-wrap', 'justify-center', 'gap-3.5');
    expect(badgeWrapper).toHaveClass('gap-2', 'rounded-full', 'border', 'border-white/70', 'bg-white/90', 'px-4.5', 'py-2.5', 'text-[0.95rem]', 'font-semibold', 'text-slate-700', 'shadow-sm', 'backdrop-blur-md', 'transition-all', 'duration-200', 'hover:-translate-y-0.5', 'hover:bg-white');
    expect(badgeWrapper?.querySelector('svg')).toHaveClass('h-4', 'w-4', 'text-emerald-500');
    expect(screen.getByText('Identidad validada')).toBeInTheDocument();
    expect(screen.getByText('Verificación presencial')).toBeInTheDocument();
  });
});