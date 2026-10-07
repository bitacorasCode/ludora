import {
  BodyText,
  Eyebrow,
  LeadText,
  PageTitle,
  SectionTitle,
} from './typography';

type BaseProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeading({ eyebrow, title, description }: BaseProps) {
  return (
    <div className='max-w-3xl space-y-4'>
      <Eyebrow>{eyebrow}</Eyebrow>
      <PageTitle>{title}</PageTitle>
      <LeadText>{description}</LeadText>
    </div>
  );
}

type SectionHeadingProps = Pick<BaseProps, 'eyebrow' | 'title'> & {
  description?: string;
  titleId?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  titleId,
}: SectionHeadingProps) {
  return (
    <div className='space-y-2'>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle id={titleId}>{title}</SectionTitle>
      {description && <BodyText>{description}</BodyText>}
    </div>
  );
}
