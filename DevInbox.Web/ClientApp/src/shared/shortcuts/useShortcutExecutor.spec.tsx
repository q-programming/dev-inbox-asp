import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShortcutExecutor } from './useShortcutExecutor';
import { useShortcutStore } from '@shared/store/shortcut.store';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import useNoteModalStore from '@feature/notes/store/noteModal.store';
import useSettingsStore from '@feature/settings/store/settings.store';

function renderExecutor(queryClient: QueryClient = new QueryClient()) {
  return renderHook(() => useShortcutExecutor(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  });
}

describe('useShortcutExecutor', () => {
  afterEach(() => {
    useShortcutStore.setState({ lastAction: null });
    useInboxStore.setState({ selectedItemId: undefined, itemIds: [] });
    useNoteModalStore.setState({ isOpen: false });
  });

  it('should open the note modal when "new-note" is dispatched', () => {
    renderExecutor();
    act(() => useShortcutStore.getState().dispatch('new-note'));
    expect(useNoteModalStore.getState().isOpen).toBe(true);
  });

  it('should toggle the sidebar when "toggle-sidebar" is dispatched', () => {
    renderExecutor();
    const before = useSettingsStore.getState().sideBarCollapsed;
    act(() => useShortcutStore.getState().dispatch('toggle-sidebar'));
    expect(useSettingsStore.getState().sideBarCollapsed).toBe(!before);
    useSettingsStore.setState({ sideBarCollapsed: before });
  });

  it('should navigate to the next item when "nav-next-item" is dispatched', () => {
    useInboxStore.setState({ itemIds: [10, 20, 30], selectedItemId: 10 });
    renderExecutor();
    act(() => useShortcutStore.getState().dispatch('nav-next-item'));
    expect(useInboxStore.getState().selectedItemId).toBe(20);
  });

  it('should close the inbox detail panel when "escape" is dispatched', () => {
    useInboxStore.setState({ selectedItemId: 42 });
    renderExecutor();
    act(() => useShortcutStore.getState().dispatch('escape'));
    expect(useInboxStore.getState().selectedItemId).toBeUndefined();
  });

  it('should save the currently open item when "toggle-save" is dispatched', async () => {
    const { inboxApi, inboxKeys } = await import('@feature/inbox/hooks/useInboxQuery');
    const saveSpy = vi.spyOn(inboxApi, 'saveInboxItem').mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    queryClient.setQueryData([...inboxKeys.detail, 42], { id: 42, title: 'PR title', isSaved: false });
    useInboxStore.setState({ selectedItemId: 42 });

    renderExecutor(queryClient);
    act(() => useShortcutStore.getState().dispatch('toggle-save'));
    await act(async () => {});

    expect(saveSpy).toHaveBeenCalledWith(42, true);
    saveSpy.mockRestore();
  });

  it('should ignore unknown action ids', () => {
    renderExecutor();
    expect(() =>
      act(() =>
        useShortcutStore.setState({
          lastAction: { id: 'not-a-real-action' as never, token: 1 },
        }),
      ),
    ).not.toThrow();
  });
});
