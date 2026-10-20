import { ContentSkeleton } from '@/components/feedback';

type AccountContentSkeletonProps = {
  label: string;
};

export function AccountContentSkeleton({ label }: AccountContentSkeletonProps) {
  return <ContentSkeleton variant='text' withCard withHeading label={label} />;
}
