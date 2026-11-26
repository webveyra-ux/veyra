export function formatFirebaseError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password you entered does not match our records.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password with at least 8 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a couple of minutes before trying again.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number including the country code (e.g. +91...).';
    case 'auth/invalid-verification-code':
      return 'That verification code is incorrect. Please check and try again.';
    case 'auth/code-expired':
      return 'Your OTP code has expired. Please request a new code.';
    case 'auth/requires-recent-login':
      return 'For security, please reauthenticate before performing this sensitive action.';
    case 'auth/user-disabled':
      return 'This account has been disabled or suspended. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network connection interrupted. Please check your internet connection and retry.';
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'unavailable':
      return 'The service is temporarily unreachable. Please retry in a moment.';
    case 'storage/unauthorized':
      return 'You are not permitted to upload or access this file.';
    case 'storage/canceled':
      return 'File upload was cancelled.';
    case 'storage/retry-limit-exceeded':
      return 'Upload timed out due to slow network. Please try again.';
    default:
      if (error instanceof Error && error.message && !error.message.includes('Firebase:')) {
        return error.message;
      }
      return fallback;
  }
}
