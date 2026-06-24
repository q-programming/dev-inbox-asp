import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '@app/routes.ts';
import useAlertStore, { AlertType } from '@shared/store/alert.store.ts';
import { modKey } from '@shared/utils/platform';

const LEADER = 'g';
const TIMEOUT_MS = 1000;

interface LeaderItem {
  key: string;
  route: AppRoute;
  label: string;
}

const LeaderItems: LeaderItem[] = [
  { key: 'i', route: AppRoute.INBOX, label: 'Inbox' },
  { key: 'n', route: AppRoute.NOTES, label: 'Notes' },
  // extend as new pages land
];

/**
 * g then i	Go to Inbox (all items)
 * g then r	Go to Review Requests
 * g then m	Go to Mentions
 * g then p	Go to My PRs
 * g then a	Go to ADO Items
 * g then n	Go to Notes
 * g then s	Go to Saved items
 * g then d	Go to Done
 * Ctrl/Cmd + Shift + S	Save current filter as a new saved view
 */

export function useLeaderKey() {
  const navigate = useNavigate();
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key === LEADER && !pending.current) {
        event.preventDefault();
        pending.current = true;
        timer.current = setTimeout(() => {
          pending.current = false;
        }, TIMEOUT_MS);
        return;
      }

      if (pending.current) {
        event.preventDefault();
        pending.current = false;
        if (timer.current) {
          clearTimeout(timer.current);
        }

        const item = LeaderItems.find((item) => item.key === event.key);
        if (item) {
          addAlert({
            type: AlertType.INFO,
            message: `Navigating to ${item.label} [ ${modKey}${item.key.toUpperCase()} ]`,
          });
          navigate(item.route);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [addAlert, navigate]);
}
