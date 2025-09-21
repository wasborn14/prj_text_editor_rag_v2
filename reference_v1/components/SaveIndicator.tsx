'use client';

import React from 'react';
import { SaveStatus } from '@/hooks/useAutoSave';

interface SaveIndicatorProps {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  className?: string;
}

export default function SaveIndicator({ saveStatus, lastSaved, className = '' }: SaveIndicatorProps) {
  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
        );
      case 'saved':
        return (
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'unsaved':
        return (
          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? formatTimeAgo(lastSaved) : 'Saved';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return '';
    }
  };

  const getTextColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-gray-600';
      case 'saved':
        return 'text-green-600';
      case 'unsaved':
        return 'text-orange-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getTextColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
}

/**
 * Format time ago in a Notion-like style
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return 'Saved just now';
  } else if (diffSeconds < 60) {
    return `Saved ${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    return `Saved ${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `Saved ${diffHours}h ago`;
  } else {
    return `Saved on ${date.toLocaleDateString()}`;
  }
}