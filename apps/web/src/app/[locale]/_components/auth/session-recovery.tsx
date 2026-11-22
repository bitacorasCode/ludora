'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { useSessionRecoveryController } from '@/components/auth/use-session-recovery-controller';
import { ErrorState } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { useRequestScope } from '@/hooks/use-request-scope';
import { Link } from '@/i18n/navigation';
import { type ActionError, OPERATION_STATUS } from '@/lib/actions';

export function SessionRecovery({ fallback }: { fallback?: ReactNode }) {
  const common = useTranslations('Common');
  const routeError = useTranslations('RouteError');
  const { recoverSession } = useSessionRecoveryController();
  const { capture } = useRequestScope();
  const [error, setError] = useState<ActionError | null>(null);
  const showFeedback = fallback !== undefined;

  const recover = useCallback(() => {
    const isCurrent = capture();

    void recoverSession().then((result) => {
      if (showFeedback && isCurrent() && result.status === OPERATION_STATUS.error) {
        setError(result.error);
      }
    });
  }, [capture, recoverSession, showFeedback]);

  useEffect(recover, [recover]);

  if (!showFeedback) return null;
  if (!error) return fallback;

  function retry() {
    setError(null);
    recover();
  }

  const descriptionKey = `errors.${error.errorCode}`;
  const description = common.has(descriptionKey)
    ? common(descriptionKey)
    : routeError('description');

  return (
    <PageContainer>
      <PageSection>
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
      </PageSection>
    </PageContainer>
  );
}
