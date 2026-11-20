'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useSessionRecoveryController } from '@/components/auth/use-session-recovery-controller';
import { ErrorState } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';
import { Button, Spinner } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { useRequestScope } from '@/hooks/use-request-scope';
import { Link } from '@/i18n/navigation';
import { type ActionError, OPERATION_STATUS } from '@/lib/actions';

export function SessionRecovery({ showStatus = true }: { showStatus?: boolean }) {
  const common = useTranslations('Common');
  const routeError = useTranslations('RouteError');
  const { recoverSession } = useSessionRecoveryController();
  const { capture } = useRequestScope();
  const [error, setError] = useState<ActionError | null>(null);

  const recover = useCallback(() => {
    const isCurrent = capture();

    void recoverSession().then((result) => {
      if (showStatus && isCurrent() && result.status === OPERATION_STATUS.error) {
        setError(result.error);
      }
    });
  }, [capture, recoverSession, showStatus]);

  useEffect(recover, [recover]);

  if (!showStatus) return null;

  function retry() {
    setError(null);
    recover();
  }

  const descriptionKey = error ? `errors.${error.errorCode}` : null;
  const description = descriptionKey && common.has(descriptionKey)
    ? common(descriptionKey)
    : routeError('description');

  return (
    <PageContainer>
      <PageSection>
        {error ? (
          <ErrorState
            title={routeError('title')}
            description={description}
            primaryAction={(
              <Button type='button' onClick={retry}>{common('actions.retry')}</Button>
            )}
            secondaryAction={(
              <Button asChild variant='outline'>
                <Link href={APP_ROUTES.home}>{common('actions.backHome')}</Link>
              </Button>
            )}
          />
        ) : (
          <div role='status' className='flex items-center justify-center gap-3 py-12'>
            <Spinner aria-hidden='true' />
            <span>{common('status.checkingSession')}</span>
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
