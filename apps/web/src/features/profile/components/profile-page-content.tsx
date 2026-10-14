'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeading } from '@/components/typography';

import type { Profile } from '../config';
import { usePreviewProfile } from '../hooks/use-preview-profile';
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
    <>
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

      {isEditing && profile && (
        <ProfileEditor
          profile={profile}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {wasSaved && <p role='status'>{t('saved')}</p>}
    </>
  );
}
