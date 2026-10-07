import { useEffect, useCallback } from 'react';

export interface TriageShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onEscalate?: () => void;
  onResolve?: () => void;
  onFalsePositive?: () => void;
  onTruePositive?: () => void;
  onCopyIp?: () => void;
  onToggleShortcuts?: () => void;
  onOpenSelected?: () => void;
  enabled?: boolean;
}

export const useTriageShortcuts = ({
  onNext,
  onPrev,
  onEscalate,
  onResolve,
  onFalsePositive,
  onTruePositive,
  onCopyIp,
  onToggleShortcuts,
  onOpenSelected,
  enabled = true,
}: TriageShortcutHandlers) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore keystrokes if focused inside text inputs, textareas, selects, or editable elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Do not capture shortcuts when Meta/Control/Alt modifiers are held (allow browser shortcuts & Cmd+K)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          onNext?.();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          onPrev?.();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          onEscalate?.();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onResolve?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onFalsePositive?.();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          onTruePositive?.();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          onCopyIp?.();
          break;
        case 'Enter':
          onOpenSelected?.();
          break;
        case '?':
          e.preventDefault();
          onToggleShortcuts?.();
          break;
        default:
          break;
      }
    },
    [
      enabled,
      onNext,
      onPrev,
      onEscalate,
      onResolve,
      onFalsePositive,
      onTruePositive,
      onCopyIp,
      onToggleShortcuts,
      onOpenSelected,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
