'use client';

import dynamic from 'next/dynamic';

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export function CodeEditor({
  language,
  value,
  onChange,
  height = '100%',
}: {
  language: string;
  value: string;
  onChange: (v: string) => void;
  height?: string | number;
}) {
  return (
    <Monaco
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      height={height}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
