import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

export interface KeyboardShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

/**
 * Custom hook for managing keyboard shortcuts
 * @param shortcuts Array of keyboard shortcuts to register
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.enabled === false) return false;
      
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = (shortcut.ctrlKey || false) === event.ctrlKey;
      const metaMatches = (shortcut.metaKey || false) === event.metaKey;
      const shiftMatches = (shortcut.shiftKey || false) === event.shiftKey;
      const altMatches = (shortcut.altKey || false) === event.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Utility function to format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Meta');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Format key name
  let keyName = shortcut.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName === 'ArrowUp') keyName = '↑';
  if (keyName === 'ArrowDown') keyName = '↓';
  if (keyName === 'ArrowLeft') keyName = '←';
  if (keyName === 'ArrowRight') keyName = '→';
  if (keyName === 'Enter') keyName = '↵';
  if (keyName === 'Escape') keyName = 'Esc';
  if (keyName === 'Backspace') keyName = '⌫';
  if (keyName === 'Delete') keyName = 'Del';
  
  parts.push(keyName.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}

/**
 * Common keyboard shortcuts for the application
 */
export const commonShortcuts = {
  save: { key: 's', ctrlKey: true, metaKey: true },
  copy: { key: 'c', ctrlKey: true, metaKey: true },
  paste: { key: 'v', ctrlKey: true, metaKey: true },
  undo: { key: 'z', ctrlKey: true, metaKey: true },
  redo: { key: 'z', ctrlKey: true, metaKey: true, shiftKey: true },
  selectAll: { key: 'a', ctrlKey: true, metaKey: true },
  find: { key: 'f', ctrlKey: true, metaKey: true },
  new: { key: 'n', ctrlKey: true, metaKey: true },
  delete: { key: 'Delete' },
  escape: { key: 'Escape' },
  enter: { key: 'Enter' },
  space: { key: ' ' },
  arrowUp: { key: 'ArrowUp' },
  arrowDown: { key: 'ArrowDown' },
  arrowLeft: { key: 'ArrowLeft' },
  arrowRight: { key: 'ArrowRight' },
};

export default useKeyboardShortcuts;