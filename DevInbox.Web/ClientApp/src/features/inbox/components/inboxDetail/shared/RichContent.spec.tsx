import { ContentFormat } from '@api';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RichContent from './RichContent';

describe('RichContent', () => {
  describe('markdown format (default)', () => {
    it('renders a markdown link as an anchor element', () => {
      render(<RichContent>{'Visit [Example](https://example.com) now'}</RichContent>);

      const link = screen.getByRole('link', { name: 'Example' });
      expect(link.getAttribute('href')).toBe('https://example.com');
    });

    it('renders bold text with a strong element', () => {
      render(<RichContent>{'This is **bold** text'}</RichContent>);

      const strong = screen.getByText('bold');
      expect(strong.tagName).toBe('STRONG');
    });

    it('renders a markdown list as list items', () => {
      render(<RichContent>{'- one\n- two\n- three'}</RichContent>);

      expect(screen.getByText('one').tagName).toBe('LI');
      expect(screen.getByText('two').tagName).toBe('LI');
      expect(screen.getByText('three').tagName).toBe('LI');
    });

    it('renders markdown explicitly when format is set to markdown', () => {
      render(<RichContent format={ContentFormat.Markdown}>{'**explicit**'}</RichContent>);

      expect(screen.getByText('explicit').tagName).toBe('STRONG');
    });
  });

  describe('html format', () => {
    it('renders sanitized html as real markup', () => {
      const { container } = render(
        <RichContent format={ContentFormat.Html}>{'<strong>bold</strong> text'}</RichContent>,
      );

      expect(container.querySelector('strong')).not.toBeNull();
      expect(container.querySelector('strong')?.textContent).toBe('bold');
    });

    it('strips scripts and dangerous attributes via DOMPurify', () => {
      const { container } = render(
        <RichContent format={ContentFormat.Html}>
          {'<img src="x" onerror="alert(1)" /><script>alert(1)</script>safe'}
        </RichContent>,
      );

      expect(container.querySelector('script')).toBeNull();
      expect(container.innerHTML).not.toContain('onerror');
      expect(container.textContent).toContain('safe');
    });
  });

  describe('plainText format', () => {
    it('renders raw text without parsing markdown or html', () => {
      const { container } = render(
        <RichContent format={ContentFormat.PlainText}>
          {'<strong>bold</strong> and [a link](https://example.com)'}
        </RichContent>,
      );

      expect(container.querySelector('strong')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(container.textContent).toContain(
        '<strong>bold</strong> and [a link](https://example.com)',
      );
    });
  });
});

