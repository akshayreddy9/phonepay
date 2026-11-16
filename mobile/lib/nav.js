import { router } from 'expo-router';

// Clear the stack (onboarding / payment flow) and land on a root screen.
export function resetTo(path) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(path);
}

export const goHome = () => resetTo('/home');
