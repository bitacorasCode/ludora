'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageHeading } from '@/components/typography';

import { usePreviewProfile } from '../hooks/use-preview-profile';
import type { ProfilePreferences } from '../schema';
import { ProfileEditor } from './profile-editor';
import { ProfileIdentity } from './profile-identity';

const PROFILE_SAVED_TOAST_ID = 'profile-saved';

export function ProfilePageContent() {
  const t = useTranslations('Profile');
  const { profile, saveProfile } = usePreviewProfile();
  const [isEditing, setIsEditing] = useState(false);

  async function handleSave(values: ProfilePreferences) {
    saveProfile(values);
    setIsEditing(false);
    toast.success(t('saved'), { id: PROFILE_SAVED_TOAST_ID });
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
        onEdit={() => setIsEditing(true)}
      />

      {isEditing && profile && (
        <ProfileEditor
          profile={profile}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
