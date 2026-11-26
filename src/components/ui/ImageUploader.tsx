'use client';

import * as React from 'react';
import { FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import {
  deleteStorageAsset,
  getUploadConstraints,
  uploadFileToStorage,
  type UploadFolder,
  type UploadResult,
} from '@/lib/storage/upload';
import { cn } from '@/lib/utils';

export interface UploadedItem {
  id: string;
  url: string;
  storagePath: string;
  name?: string;
  mimeType?: string;
}

export function ImageUploader({
  folder,
  items,
  onChange,
  maxFiles = 5,
  label = 'Upload images',
  helperText,
  accept = 'image/jpeg,image/png,image/webp,image/avif',
  disabled = false,
}: {
  folder: UploadFolder;
  items: UploadedItem[];
  onChange: (nextItems: UploadedItem[]) => void;
  maxFiles?: number;
  label?: string;
  helperText?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const constraints = getUploadConstraints(folder);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setError(null);
    const remaining = maxFiles - items.length;
    const files = Array.from(fileList).slice(0, remaining);

    try {
      const uploaded: UploadedItem[] = [];
      for (const file of files) {
        setProgress(5);
        const res: UploadResult = await uploadFileToStorage(file, folder, (pct) => {
          setProgress(pct);
        });
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: res.url,
          storagePath: res.storagePath,
          name: res.name,
          mimeType: res.mimeType,
        });
      }
      onChange([...items, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove(item: UploadedItem) {
    onChange(items.filter((i) => i.id !== item.id));
    await deleteStorageAsset(item.storagePath);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#242331]">{label}</span>
        <span className="text-xs text-[#6B6879]">
          {items.length}/{maxFiles} uploaded • Max {constraints.label}
        </span>
      </div>

      {items.length < maxFiles && (
        <label
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E9E5EF] bg-[#FFFCF8] px-4 py-6 text-center transition-colors',
            disabled || progress !== null
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:border-[#7655D9]/60 hover:bg-[#F5F0FF]/40 cursor-pointer'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            disabled={disabled || progress !== null}
            onChange={handleFileSelect}
            className="sr-only"
          />
          {progress !== null ? (
            <div className="space-y-2 w-full max-w-xs">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#5B3EB5]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {progress}%
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#EDE5FF] overflow-hidden">
                <div
                  className="h-full bg-[#7655D9] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-[#7655D9] mb-2" />
              <p className="text-sm font-medium text-[#242331]">
                Click to choose file{maxFiles > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-[#6B6879]">
                {helperText || 'Images are automatically compressed before upload.'}
              </p>
            </>
          )}
        </label>
      )}

      {error && (
        <p className="rounded-xl bg-[#FFF0F3] px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const isPdf = item.mimeType === 'application/pdf' || item.url.endsWith('.pdf');
            const isVideo = item.mimeType?.startsWith('video/');
            return (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[#E9E5EF] bg-white"
              >
                {isPdf ? (
                  <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                    <FileText className="h-8 w-8 text-[#7655D9] mb-1.5" />
                    <span className="text-xs font-medium text-[#242331] line-clamp-2">
                      {item.name || 'PDF Document'}
                    </span>
                  </div>
                ) : isVideo ? (
                  <video src={item.url} className="h-full w-full object-cover" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.name || 'Uploaded image'}
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  aria-label="Remove uploaded file"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#242331]/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
