import { useEffect } from 'react';

interface MetaOptions {
  title?: string;
  description?: string;
  canonical?: string;
}

/**
 * Set per-page <title>, meta description, og:title/description and canonical URL.
 * Restores previous values on unmount.
 */
export function useDocumentMeta({ title, description, canonical }: MetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const setMeta = (selector: string, attr: string, value?: string) => {
      if (!value) return null;
      let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
      const created = !el;
      if (!el) {
        if (selector.startsWith('link')) {
          el = document.createElement('link');
          (el as HTMLLinkElement).rel = 'canonical';
        } else {
          el = document.createElement('meta');
          const match = selector.match(/\[(name|property)="([^"]+)"\]/);
          if (match) (el as HTMLMetaElement).setAttribute(match[1], match[2]);
        }
        document.head.appendChild(el);
      }
      const prev = el.getAttribute(attr) || '';
      el.setAttribute(attr, value);
      return { el, prev, created };
    };

    const desc = setMeta('meta[name="description"]', 'content', description);
    const ogt = setMeta('meta[property="og:title"]', 'content', title);
    const ogd = setMeta('meta[property="og:description"]', 'content', description);
    const can = setMeta('link[rel="canonical"]', 'href', canonical || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined));

    return () => {
      document.title = prevTitle;
      [desc, ogt, ogd, can].forEach(item => {
        if (!item) return;
        if (item.created) item.el.remove();
        else item.el.setAttribute(item.el.tagName === 'LINK' ? 'href' : 'content', item.prev);
      });
    };
  }, [title, description, canonical]);
}