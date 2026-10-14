'use client';

import { useTranslations } from 'next-intl';
import { RadioGroup } from 'radix-ui';
import { useId } from 'react';

import {
  type AvatarPresetId,
  avatarPresets,
  isAvatarPresetId,
} from '../config';
import { ProfileAvatar } from './profile-avatar';

const optionClassName =
  'relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft';

type AvatarPickerProps = {
  nickname: string;
  value: AvatarPresetId | null;
  onChange: (value: AvatarPresetId | null) => void;
};

export function AvatarPicker({ nickname, value, onChange }: AvatarPickerProps) {
  const t = useTranslations('Profile');
  const legendId = useId();
  const options = [
    { id: 'initial', avatarPresetId: null, label: t('useInitial') },
    ...avatarPresets.map((preset) => ({
      id: preset.id,
      avatarPresetId: preset.id,
      label: t(`avatars.${preset.id}`),
    })),
  ];

  return (
    <fieldset className='space-y-4'>
      <legend id={legendId} className='font-medium'>
        {t('avatarLabel')}
      </legend>
      <RadioGroup.Root
        name='avatarPresetId'
        value={value ?? 'initial'}
        onValueChange={(selected) =>
          onChange(isAvatarPresetId(selected) ? selected : null)
        }
        aria-labelledby={legendId}
        className='grid grid-cols-2 gap-3 sm:grid-cols-4'
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.id}
            value={option.id}
            aria-label={option.label}
            className={optionClassName}
          >
            <span
              aria-hidden='true'
              className='absolute right-2 top-2 flex size-5 items-center justify-center rounded-full border border-border text-xs'
            >
              <RadioGroup.Indicator>✓</RadioGroup.Indicator>
            </span>
            <ProfileAvatar
              nickname={nickname}
              avatarPresetId={option.avatarPresetId}
            />
            <span>{option.label}</span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </fieldset>
  );
}
