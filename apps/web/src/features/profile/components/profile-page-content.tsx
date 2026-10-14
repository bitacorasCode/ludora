'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';

import type { Profile } from '../config';
import { usePreviewProfile } from '../hooks';
import type { ProfilePreferences } from '../schema';
import { ProfileEditor } from './profile-editor';
import { ProfileIdentity } from './profile-identity';

type ProfilePageContentProps = {
  profile: Profile;
};

export function ProfilePageContent({
  profile: initialProfile,
}: ProfilePageContentProps) {
  const t = useTranslations('Profile');
  const { profile, saveProfile } = usePreviewProfile(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [wasSaved, setWasSaved] = useState(false);

  async function handleSave(values: ProfilePreferences) {
    saveProfile(values);
    setIsEditing(false);
    setWasSaved(true);
  }

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PageHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />

        <ProfileIdentity
          profile={profile}
          isEditing={isEditing}
          onEdit={() => {
            setWasSaved(false);
            setIsEditing(true);
          }}
        />

        {isEditing && (
          <ProfileEditor
            profile={profile}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {wasSaved && <p role='status'>{t('saved')}</p>}
      </PageSection>
    </PageContainer>
  );
}
