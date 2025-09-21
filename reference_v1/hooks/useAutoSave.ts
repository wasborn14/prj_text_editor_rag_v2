'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface UseAutoSaveOptions {
  delay?: number;
  key?: string;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  save: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

/**
 * Notion-style auto-save hook with debouncing
 */
export function useAutoSave(
  content: string,
  onSave?: (content: string) => Promise<void> | void,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { delay = 300, key = 'markdown-editor-content' } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(content);

  // Use mutation for save operation
  const saveMutation = useMutation({
    mutationFn: async (contentToSave: string) => {
      // Call custom save function if provided
      if (onSave) {
        await onSave(contentToSave);
      }

      // Always save to localStorage as backup
      localStorage.setItem(key, contentToSave);
      localStorage.setItem(`${key}-timestamp`, new Date().toISOString());

      return contentToSave;
    },
    onMutate: () => {
      // Optimistic update
    },
    onSuccess: (savedContent) => {
      lastSavedContentRef.current = savedContent;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      console.error('Save failed:', error);
    },
  });

  const saveStatus: SaveStatus = saveMutation.isPending
    ? 'saving'
    : saveMutation.isError || hasUnsavedChanges
    ? 'unsaved'
    : 'saved';

  // Save function
  const save = useCallback(async () => {
    if (saveMutation.isPending || content === lastSavedContentRef.current) {
      return;
    }

    saveMutation.mutate(content);
  }, [content, saveMutation]);

  // Debounced auto-save effect
  useEffect(() => {
    // Skip if content hasn't changed
    if (content === lastSavedContentRef.current) {
      return;
    }

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Cleanup timeout on unmount or content change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, save, delay]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && content !== lastSavedContentRef.current) {
        // Synchronous save for page unload
        localStorage.setItem(key, content);
        localStorage.setItem(`${key}-timestamp`, new Date().toISOString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, hasUnsavedChanges, key]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    save,
    hasUnsavedChanges,
  };
}

/**
 * Load content from localStorage
 */
export function loadSavedContent(key: string = 'markdown-editor-content'): {
  content: string | null;
  timestamp: Date | null;
} {
  try {
    const content = localStorage.getItem(key);
    const timestampStr = localStorage.getItem(`${key}-timestamp`);
    const timestamp = timestampStr ? new Date(timestampStr) : null;

    return { content, timestamp };
  } catch (error) {
    console.error('Failed to load saved content:', error);
    return { content: null, timestamp: null };
  }
}

/**
 * Clear saved content from localStorage
 */
export function clearSavedContent(key: string = 'markdown-editor-content'): void {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-timestamp`);
  } catch (error) {
    console.error('Failed to clear saved content:', error);
  }
}