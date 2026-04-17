'use client';

import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export function MdEditor({
  value,
  onChange,
  height = 320,
  preview = 'live',
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
  preview?: 'live' | 'edit' | 'preview';
}) {
  return (
    <div data-color-mode="dark">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        height={height}
        preview={preview}
      />
    </div>
  );
}
