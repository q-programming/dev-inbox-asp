/**
 * Settings-specific domain types.
 * Density controls how much vertical space each inbox row occupies.
 */
import { Density } from '@shared/theme/theme.ts';
import { IntegrationStatus } from '@api';

export const DENSITY_LABELS: Record<Density, string> = {
  [Density.RELAXED]: 'Relaxed',
  [Density.TIGHT]: 'Tight',
  [Density.SUPER_TIGHT]: 'Super Tight',
};

export const DENSITY_DESCRIPTIONS: Record<Density, string> = {
  [Density.RELAXED]: 'Spacious layout for easier reading and focus.',
  [Density.TIGHT]: 'Standard view. Balanced information density.',
  [Density.SUPER_TIGHT]: 'Maximum data visibility. Ideal for power users.',
};

/** Integration connection status driven by the backend. */

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: IntegrationStatus;
  /** Shown beneath the name when status is active, e.g. "@janedev-git" */
  connectedAs?: string;
  actionLabel: string;
}
