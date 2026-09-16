import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CommandPalette from './CommandPalette';
import { useShortcutStore } from '@shared/store/shortcut.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Density } from '@api';

describe('CommandPalette', () => {
  afterEach(() => {
    useShortcutStore.setState({ isPaletteOpen: false, lastAction: null });
    useSettingsStore.setState({ density: Density.Relaxed });
  });

  it('should not render its content when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText('Search actions...')).not.toBeInTheDocument();
  });

  it('should list every registered shortcut action when opened', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);
    expect(screen.getByText('Trigger manual sync')).toBeInTheDocument();
    expect(screen.getByText('Go to Review Requests')).toBeInTheDocument();
  });

  it('should filter the list by search text', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    act(() => {
      fireEvent.change(screen.getByPlaceholderText('Search actions...'), { target: { value: 'sidebar' } });
    });

    expect(screen.getByText('Toggle sidebar')).toBeInTheDocument();
    expect(screen.queryByText('Trigger manual sync')).not.toBeInTheDocument();
  });

  it('should show a "no matching actions" message for an unmatched query', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    act(() => {
      fireEvent.change(screen.getByPlaceholderText('Search actions...'), { target: { value: 'zzz-nope' } });
    });

    expect(screen.getByText('No matching actions')).toBeInTheDocument();
  });

  it('should not dispatch or close when Enter is pressed with no matching actions', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Search actions...');
    act(() => {
      fireEvent.change(input, { target: { value: 'zzz-nope' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(useShortcutStore.getState().lastAction).toBeNull();
    expect(useShortcutStore.getState().isPaletteOpen).toBe(true);
  });

  it('should keep the highlighted action within the result boundaries', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Search actions...');
    act(() => {
      Array.from({ length: 100 }).forEach(() => fireEvent.keyDown(input, { key: 'ArrowDown' }));
    });
    const lastActionButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('Go to Done'));
    expect(lastActionButton).toHaveClass('Mui-selected');

    act(() => {
      Array.from({ length: 100 }).forEach(() => fireEvent.keyDown(input, { key: 'ArrowUp' }));
    });
    const firstActionButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('Focus search'));
    expect(firstActionButton).toHaveClass('Mui-selected');
  });

  it('should dispatch the action id and close the palette when an item is clicked', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    act(() => {
      fireEvent.click(screen.getByText('Toggle sidebar'));
    });

    expect(useShortcutStore.getState().lastAction?.id).toBe('toggle-sidebar');
    expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
  });

  it('should dispatch the highlighted action on Enter', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Search actions...');
    act(() => {
      fireEvent.change(input, { target: { value: 'sidebar' } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(useShortcutStore.getState().lastAction?.id).toBe('toggle-sidebar');
  });

  it('should scroll the highlighted row into view when navigating with arrow keys', () => {
    useShortcutStore.setState({ isPaletteOpen: true });
    const scrollIntoViewSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Search actions...');
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    });

    expect(scrollIntoViewSpy).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
  });

  it('should apply the current density as row padding', () => {
    useSettingsStore.setState({ density: Density.SuperTight });
    useShortcutStore.setState({ isPaletteOpen: true });
    render(<CommandPalette />);

    const row = screen.getByText('Toggle sidebar').closest('.MuiListItemButton-root') as HTMLElement;
    expect(getComputedStyle(row).paddingTop).toBe('3px');
  });
});
