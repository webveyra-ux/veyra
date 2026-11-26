import { getFirebaseServices } from '@/lib/firebase/client';

export async function callAuthedApi<TResponse>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<TResponse> {
  const services = getFirebaseServices();
  if (!services || !services.auth.currentUser) {
    throw new Error('You must be signed in to perform this action.');
  }

  const idToken = await services.auth.currentUser.getIdToken();
  const response = await fetch(path, {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & TResponse;

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  return payload;
}
