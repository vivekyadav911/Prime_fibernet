import { Platform } from 'react-native';

/** Ensures the web root fills the viewport so nested ScrollViews can scroll. */
export function bootstrapWebLayout(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const { documentElement: html, body } = document;
  html.style.height = '100%';
  body.style.height = '100%';
  body.style.margin = '0';
  body.style.overflow = 'hidden';

  const root = document.getElementById('root');
  if (root) {
    root.style.height = '100%';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.minHeight = '0';
    root.style.overflow = 'hidden';
  }
}
