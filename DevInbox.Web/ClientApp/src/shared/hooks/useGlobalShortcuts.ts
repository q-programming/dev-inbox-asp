import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppRoute } from '@app/routes.ts';
import useAlertStore, { AlertType } from '@shared/store/alert.store.ts';

export const FOCUS_SEARCH_EVENT = 'dev-inbox:focus-search';

/**
 * --------- Global Shortcuts (always active) -----------------
 *
 * Ctrl/Cmd + K	Open command palette	Already in spec; the universal power-user entry point
 * Ctrl/Cmd + F or /	Focus search bar	Instant filter access from anywhere
 * Ctrl/Cmd + N	Create new note	Header has a [+ Note] button — mirror it globally
 * Ctrl/Cmd + R	Trigger manual sync	Header has [Sync] button
 * Ctrl/Cmd + ,	Open settings	Universal convention for settings
 * Ctrl/Cmd + \	Toggle sidebar	Collapse/expand the 240px left nav panel
 * Esc	Close detail panel / dismiss modal	Works contextually at any level
 * ?	Show keyboard shortcut cheatsheet	Standard in devel
 *
 * -------- List Navigation ( focus on the inbox list ) --------
 *
 * j	Select next item	Vim-style; already in spec
 * k	Select previous item	Vim-style; already in spec
 * Enter	Open detail panel for selected item	Already in spec
 * Ctrl/Cmd + Enter	Open source in browser (GitHub PR / ADO item)	Jump to origin without leaving inbox
 * Space	Scroll list down one page	Standard scrolling shortcut
 *
 * --------- Item Actions (selected item, list context) -------
 * s	Save / Unsave	SAVED status toggle
 * d	Mark done	DONE status
 * p	Pin / Unpin	PINNED status
 * u	Mark as unread	UNREAD status
 * z	Snooze (set follow-up date picker)	SNOOZED status + follow_up_at
 * n	Add / open note	Opens note field in detail panel
 * t	Add tag	Opens inline tag input
 * 1 / 2 / 3 / 4	Set priority Low / Medium / High / Critical	Maps to LOW, MEDIUM, HIGH, CRITICAL
 * x	Select/deselect item (for batch ops)	Enables multi-select row
 *
 *
 */

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { addAlert } = useAlertStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Suppress shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }
      const isMod = event.metaKey || event.ctrlKey;
      // Ctrl/Cmd + F or just / — focus search
      if ((isMod && event.key === 'f') || event.key === '/') {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
        return;
      }
      if (isMod && event.key === ',') {
        event.preventDefault();
        addAlert({ type: AlertType.INFO, message: `Navigating to Settings` });
        navigate(AppRoute.SETTINGS);
        return;
      }
      if (isMod && event.key === 'r') {
        event.preventDefault();
        addAlert({ type: AlertType.INFO, message: `Triggering manual sync...` });
        return;
      }

      // Plain key — only when no modifier
      if (isMod || event.altKey || event.shiftKey) {
        return;
      }

      switch (event.key) {
        case 'g':
          // leader key — handled separately (see useLeaderKey)
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, addAlert]);
}
