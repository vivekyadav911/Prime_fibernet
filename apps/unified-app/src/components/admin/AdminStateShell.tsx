import type { ReactNode } from 'react';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { queryErrorMessage } from '@/utils/queryError';

import { AdminScreenLayout } from './AdminScreenLayout';

type AdminStateShellProps = {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  errorMessage?: string;
  onRetry?: () => void;
  loadingRows?: number;
  loadingShape?: 'line' | 'card' | 'circle';
};

/**
 * Standard loading/error shell for admin screens — same canvas and layout as success body.
 * Wrap screen content; shows skeleton or error inside AdminScreenLayout when fetching fails.
 */
export function AdminStateShell({
  children,
  isLoading = false,
  isError = false,
  error,
  errorMessage,
  onRetry,
  loadingRows = 6,
  loadingShape = 'line',
}: AdminStateShellProps) {
  if (isLoading) {
    return (
      <AdminScreenLayout padded>
        <SkeletonLoader rows={loadingRows} shape={loadingShape} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout padded>
        <ErrorState message={errorMessage ?? queryErrorMessage(error)} onRetry={onRetry} />
      </AdminScreenLayout>
    );
  }

  return children;
}
