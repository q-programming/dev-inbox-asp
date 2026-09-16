import { describe, expect, it, vi } from 'vitest';
import { TriggerType } from '@api';
import { AppRoute } from '@app/routes.ts';
import { AlertType } from '@shared/store/alert.store';
import { modKey } from '@shared/utils/platform';
import { SHORTCUT_ACTIONS, LEADER_KEY_ACTIONS } from './shortcuts.registry';
import type { ShortcutContext } from './shortcuts.types';

function makeCtx(overrides: Partial<ShortcutContext> = {}): ShortcutContext {
  return {
    navigate: vi.fn(),
    addAlert: vi.fn(),
    toggleSideBar: vi.fn(),
    closeInboxItem: vi.fn(),
    openItem: vi.fn(),
    isNoteModalOpen: false,
    openNoteModal: vi.fn(),
    closeNoteModal: vi.fn(),
    selectedItemId: undefined,
    itemIds: [],
    isSyncRunning: false,
    triggerSync: vi.fn(),
    selectedItemDetails: undefined,
    toggleDone: vi.fn(),
    toggleSave: vi.fn(),
    ...overrides,
  };
}

function action(id: string) {
  const found = SHORTCUT_ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`No shortcut action registered with id "${id}"`);
  }
  return found;
}

describe('shortcuts.registry', () => {
  it('should have a unique id for every action', () => {
    const ids = SHORTCUT_ACTIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('focus-search', () => {
    it('should dispatch the focus-search DOM event', () => {
      const listener = vi.fn();
      document.addEventListener('dev-inbox:focus-search', listener);
      action('focus-search').run(makeCtx());
      expect(listener).toHaveBeenCalledOnce();
      document.removeEventListener('dev-inbox:focus-search', listener);
    });
  });

  describe('open-settings', () => {
    it('should navigate to settings and raise an alert', () => {
      const ctx = makeCtx();
      action('open-settings').run(ctx);
      expect(ctx.navigate).toHaveBeenCalledWith(AppRoute.SETTINGS);
      expect(ctx.addAlert).toHaveBeenCalledWith(expect.objectContaining({ type: AlertType.INFO }));
    });
  });

  describe('trigger-sync', () => {
    it('should trigger a manual sync when not already running', () => {
      const ctx = makeCtx({ isSyncRunning: false });
      action('trigger-sync').run(ctx);
      expect(ctx.triggerSync).toHaveBeenCalledWith(TriggerType.Manual);
    });

    it('should be a no-op when a sync is already running', () => {
      const ctx = makeCtx({ isSyncRunning: true });
      action('trigger-sync').run(ctx);
      expect(ctx.triggerSync).not.toHaveBeenCalled();
    });
  });

  describe('toggle-sidebar', () => {
    it('should toggle the sidebar and raise an alert', () => {
      const ctx = makeCtx();
      action('toggle-sidebar').run(ctx);
      expect(ctx.toggleSideBar).toHaveBeenCalledOnce();
      expect(ctx.addAlert).toHaveBeenCalledOnce();
    });
  });

  describe('escape', () => {
    it('should close the note modal when open, even if an item is also selected', () => {
      const ctx = makeCtx({ isNoteModalOpen: true, selectedItemId: 42 });
      action('escape').run(ctx);
      expect(ctx.closeNoteModal).toHaveBeenCalledOnce();
      expect(ctx.closeInboxItem).not.toHaveBeenCalled();
    });

    it('should close the inbox detail panel when no modal is open', () => {
      const ctx = makeCtx({ isNoteModalOpen: false, selectedItemId: 42 });
      action('escape').run(ctx);
      expect(ctx.closeInboxItem).toHaveBeenCalledOnce();
    });

    it('should be a no-op when nothing is open', () => {
      const ctx = makeCtx();
      action('escape').run(ctx);
      expect(ctx.closeNoteModal).not.toHaveBeenCalled();
      expect(ctx.closeInboxItem).not.toHaveBeenCalled();
    });
  });

  describe('new-note', () => {
    it('should open the note modal and raise an alert', () => {
      const ctx = makeCtx();
      action('new-note').run(ctx);
      expect(ctx.openNoteModal).toHaveBeenCalledOnce();
      expect(ctx.addAlert).toHaveBeenCalledOnce();
    });
  });

  describe('nav-prev-item / nav-next-item', () => {
    it('should select the last item on nav-prev-item when nothing is selected', () => {
      const ctx = makeCtx({ itemIds: [10, 20, 30] });
      action('nav-prev-item').run(ctx);
      expect(ctx.openItem).toHaveBeenCalledWith(30);
    });

    it('should select the first item on nav-next-item when nothing is selected', () => {
      const ctx = makeCtx({ itemIds: [10, 20, 30] });
      action('nav-next-item').run(ctx);
      expect(ctx.openItem).toHaveBeenCalledWith(10);
    });

    it('should move to the previous item on nav-prev-item', () => {
      const ctx = makeCtx({ itemIds: [10, 20, 30], selectedItemId: 20 });
      action('nav-prev-item').run(ctx);
      expect(ctx.openItem).toHaveBeenCalledWith(10);
    });

    it('should move to the next item on nav-next-item', () => {
      const ctx = makeCtx({ itemIds: [10, 20, 30], selectedItemId: 10 });
      action('nav-next-item').run(ctx);
      expect(ctx.openItem).toHaveBeenCalledWith(20);
    });

    it('should wrap around at both ends', () => {
      const first = makeCtx({ itemIds: [10, 20, 30], selectedItemId: 10 });
      action('nav-prev-item').run(first);
      expect(first.openItem).toHaveBeenCalledWith(30);

      const last = makeCtx({ itemIds: [10, 20, 30], selectedItemId: 30 });
      action('nav-next-item').run(last);
      expect(last.openItem).toHaveBeenCalledWith(10);
    });

    it('should be a no-op when the list is empty', () => {
      const ctx = makeCtx({ itemIds: [] });
      action('nav-prev-item').run(ctx);
      action('nav-next-item').run(ctx);
      expect(ctx.openItem).not.toHaveBeenCalled();
    });
  });

  describe('toggle-save / toggle-done', () => {
    it('should toggle save for the currently open item', () => {
      const ctx = makeCtx({
        selectedItemDetails: { id: 42, title: 'PR title', isSaved: false } as ShortcutContext['selectedItemDetails'],
      });
      action('toggle-save').run(ctx);
      expect(ctx.toggleSave).toHaveBeenCalledWith(42, true, 'PR title');
    });

    it('should toggle done for the currently open item', () => {
      const ctx = makeCtx({
        selectedItemDetails: { id: 42, title: 'PR title', isDone: false } as ShortcutContext['selectedItemDetails'],
      });
      action('toggle-done').run(ctx);
      expect(ctx.toggleDone).toHaveBeenCalledWith(42, true, 'PR title');
    });

    it('should be a no-op when no detail panel is open', () => {
      const ctx = makeCtx({ selectedItemDetails: undefined });
      action('toggle-save').run(ctx);
      action('toggle-done').run(ctx);
      expect(ctx.toggleSave).not.toHaveBeenCalled();
      expect(ctx.toggleDone).not.toHaveBeenCalled();
    });
  });

  describe('attach-note', () => {
    it('should open the note modal with the selected item and raise an alert', () => {
      const details = { id: 42, title: 'PR title', attachedNote: undefined } as ShortcutContext['selectedItemDetails'];
      const ctx = makeCtx({ selectedItemDetails: details });
      action('attach-note').run(ctx);
      expect(ctx.openNoteModal).toHaveBeenCalledWith(details);
      expect(ctx.addAlert).toHaveBeenCalledOnce();
    });

    it('should be a no-op when no item is selected', () => {
      const ctx = makeCtx({ selectedItemDetails: undefined });
      action('attach-note').run(ctx);
      expect(ctx.openNoteModal).not.toHaveBeenCalled();
    });

    it('should be a no-op when the item already has an attached note', () => {
      const ctx = makeCtx({
        selectedItemDetails: { id: 42, title: 'PR title', attachedNote: { title: 'Existing' } } as ShortcutContext['selectedItemDetails'],
      });
      action('attach-note').run(ctx);
      expect(ctx.openNoteModal).not.toHaveBeenCalled();
    });
  });

  describe('goto-* navigation actions', () => {
    it('should navigate to the inbox with no filter for goto-inbox', () => {
      const ctx = makeCtx();
      action('goto-inbox').run(ctx);
      expect(ctx.navigate).toHaveBeenCalledWith(AppRoute.INBOX);
    });

    it('should navigate to the inbox filtered to notes for goto-notes', () => {
      const ctx = makeCtx();
      action('goto-notes').run(ctx);
      expect(ctx.navigate).toHaveBeenCalledWith(`${AppRoute.INBOX}?itemType=Note`);
    });

    it('should navigate with the right filter for the rest', () => {
      const cases: [string, string][] = [
        ['goto-review-requests', `${AppRoute.INBOX}?reason=ReviewRequested`],
        ['goto-mentions', `${AppRoute.INBOX}?reason=Mentioned`],
        ['goto-my-prs', `${AppRoute.INBOX}?itemType=PR&reason=Authored`],
        ['goto-ado-items', `${AppRoute.INBOX}?source=Ado`],
        ['goto-saved', `${AppRoute.INBOX}?status=Saved`],
        ['goto-done', `${AppRoute.INBOX}?status=Done`],
      ];
      cases.forEach(([id, expectedPath]) => {
        const ctx = makeCtx();
        action(id).run(ctx);
        expect(ctx.navigate).toHaveBeenCalledWith(expectedPath);
        expect(ctx.addAlert).toHaveBeenCalledOnce();
      });
    });
  });

  describe('LEADER_KEY_ACTIONS', () => {
    it('should map every leader letter to a registered action id', () => {
      Object.values(LEADER_KEY_ACTIONS).forEach((id) => expect(() => action(id)).not.toThrow());
    });
  });

  describe('command palette metadata', () => {
    it('should have non-empty keys/label/description/category for every action', () => {
      SHORTCUT_ACTIONS.forEach((entry) => {
        expect(entry.keys.length).toBeGreaterThan(0);
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.description.length).toBeGreaterThan(0);
        expect(entry.category.length).toBeGreaterThan(0);
      });
    });

    it('should include the platform modifier key in modifier-based shortcuts', () => {
      expect(action('open-settings').keys).toContain(modKey);
    });
  });
});
