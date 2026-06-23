import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import SectionLabel from './SectionLabel.tsx';

describe('SectionLabel', () => {
  it('should render the label text when not collapsed', () => {
    renderWithProviders(<SectionLabel label="Focus" collapsed={false} />);
    expect(screen.getByTestId('section-label')).toBeTruthy();
    expect(screen.getByTestId('section-label').textContent).toBe('Focus');
  });

  it('should render nothing when collapsed', () => {
    renderWithProviders(<SectionLabel label="Focus" collapsed={true} />);
    expect(screen.queryByTestId('section-label')).toBeNull();
  });

  it('should render arbitrary label text', () => {
    renderWithProviders(<SectionLabel label="Filters" collapsed={false} />);
    expect(screen.getByTestId('section-label').textContent).toBe('Filters');
  });
});
