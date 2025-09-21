'use client';

import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { DiffLine } from '@/utils/diffEngine';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  showDiff?: boolean;
  diffLines?: DiffLine[];
  onApplyDiff?: () => void;
  onRejectDiff?: () => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  showDiff = false,
  diffLines = [],
  onApplyDiff,
  onRejectDiff
}) => {
  const handleChange = useCallback((val: string) => {
    if (!showDiff) {
      onChange(val);
    }
  }, [onChange, showDiff]);

  // If showing diff, render diff view instead of editor
  if (showDiff && diffLines.length > 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Diff Control Bar */}
        <div className="flex items-center justify-between bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-800">
              AI suggested changes (Review mode)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRejectDiff}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApplyDiff}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200 transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>

        {/* Diff Display */}
        <div className="flex-1 overflow-auto bg-gray-50 font-mono text-sm">
          <div className="p-4">
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`flex px-2 py-1 ${
                  line.type === 'added'
                    ? 'bg-green-100 text-green-800'
                    : line.type === 'removed'
                    ? 'bg-red-100 text-red-800'
                    : 'text-gray-700'
                }`}
              >
                <span className="select-none mr-3 text-gray-400 w-8 text-right">
                  {line.lineNumber || ''}
                </span>
                <span className="select-none mr-2">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="flex-1">
                  {line.content || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <CodeMirror
        value={value}
        height="calc(100vh - 73px)"
        theme={undefined}
        extensions={[
          markdown(),
          EditorView.theme({
            '&': {
              fontSize: '14px',
            },
            '.cm-content': {
              padding: '16px',
              fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace',
            },
            '.cm-focused .cm-cursor': {
              borderLeftColor: '#000',
            },
            '.cm-gutters': {
              backgroundColor: '#f9fafb',
              borderRight: '1px solid #e5e7eb',
            },
          }),
          EditorView.lineWrapping,
        ]}
        onChange={handleChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        editable={!showDiff}
      />
    </div>
  );
};

export default MarkdownEditor;