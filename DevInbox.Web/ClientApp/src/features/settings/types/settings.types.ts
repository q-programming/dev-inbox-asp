/**
 * Settings-specific domain types.
 * Density controls how much vertical space each inbox row occupies.
 */
import { Density, IntegrationStatus } from '@api';

export const DENSITY_LABELS: Record<Density, string> = {
  [Density.Relaxed]: 'Relaxed',
  [Density.Tight]: 'Tight',
  [Density.SuperTight]: 'Super Tight',
};

export const DENSITY_DESCRIPTIONS: Record<Density, string> = {
  [Density.Relaxed]: 'Spacious layout for easier reading and focus.',
  [Density.Tight]: 'Standard view. Balanced information density.',
  [Density.SuperTight]: 'Maximum data visibility. Ideal for power users.',
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
