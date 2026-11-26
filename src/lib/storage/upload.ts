import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase/client';
import { formatFirebaseError } from '@/lib/firebase/errors';

export type UploadFolder =
  | { type: 'user_profile'; uid: string }
  | { type: 'professional_portfolio'; uid: string }
  | { type: 'request_image'; requestId: string }
  | { type: 'conversation_attachment'; conversationId: string }
  | { type: 'review_image'; reviewId: string }
  | { type: 'verification_document'; uid: string };

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
const PORTFOLIO_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'video/mp4', 'video/webm']);
const VERIFICATION_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

export function getUploadConstraints(folder: UploadFolder): {
  maxBytes: number;
  allowedMimes: Set<string>;
  label: string;
} {
  switch (folder.type) {
    case 'user_profile':
      return { maxBytes: 5 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, label: '5 MB image' };
    case 'professional_portfolio':
      return {
        maxBytes: 15 * 1024 * 1024,
        allowedMimes: PORTFOLIO_MIME_TYPES,
        label: '15 MB image or MP4/WebM video',
      };
    case 'request_image':
    case 'conversation_attachment':
      return { maxBytes: 8 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, label: '8 MB image' };
    case 'review_image':
      return { maxBytes: 6 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, label: '6 MB image' };
    case 'verification_document':
      return {
        maxBytes: 10 * 1024 * 1024,
        allowedMimes: VERIFICATION_MIME_TYPES,
        label: '10 MB image or PDF',
      };
  }
}

export function buildStoragePath(folder: UploadFolder, fileName: string): string {
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  switch (folder.type) {
    case 'user_profile':
      return `users/${folder.uid}/profile/${safeName}`;
    case 'professional_portfolio':
      return `professionals/${folder.uid}/portfolio/${safeName}`;
    case 'request_image':
      return `requests/${folder.requestId}/images/${safeName}`;
    case 'conversation_attachment':
      return `conversations/${folder.conversationId}/attachments/${safeName}`;
    case 'review_image':
      return `reviews/${folder.reviewId}/images/${safeName}`;
    case 'verification_document':
      return `verification/${folder.uid}/documents/${safeName}`;
  }
}

export async function compressImageIfNeeded(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  if (typeof window === 'undefined') return file;
  if (!IMAGE_MIME_TYPES.has(file.type) || file.size < 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const ext = outputType === 'image/png' ? 'png' : 'webp';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}.${ext}`, { type: outputType }));
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export interface UploadResult {
  url: string;
  storagePath: string;
  mimeType: string;
  name: string;
}

export async function uploadFileToStorage(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase Storage is not configured in this environment.');
  }

  const constraints = getUploadConstraints(folder);
  if (!constraints.allowedMimes.has(file.type)) {
    throw new Error(`Unsupported file type (${file.type || 'unknown'}). Allowed: ${constraints.label}.`);
  }

  const processedFile = IMAGE_MIME_TYPES.has(file.type)
    ? await compressImageIfNeeded(file)
    : file;

  if (processedFile.size > constraints.maxBytes) {
    throw new Error(`File exceeds maximum allowed size (${constraints.label}).`);
  }

  const storagePath = buildStoragePath(folder, processedFile.name);
  const storageRef = ref(services.storage, storagePath);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, processedFile, {
      contentType: processedFile.type,
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        reject(new Error(formatFirebaseError(error, 'Failed to upload file.')));
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            storagePath,
            mimeType: processedFile.type,
            name: processedFile.name,
          });
        } catch (err) {
          reject(new Error(formatFirebaseError(err, 'Uploaded file could not be accessed.')));
        }
      }
    );
  });
}

export async function deleteStorageAsset(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const services = getFirebaseServices();
  if (!services) return;
  try {
    await deleteObject(ref(services.storage, storagePath));
  } catch {
    // Ignore already-deleted paths safely
  }
}
