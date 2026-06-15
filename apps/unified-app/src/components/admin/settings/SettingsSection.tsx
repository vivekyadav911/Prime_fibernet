import type { ReactNode } from 'react';
import { SectionCard } from '@/components/admin';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function SettingsSection({ title, children, actionLabel, onAction }: SettingsSectionProps) {
  return (
    <SectionCard title={title} actionLabel={actionLabel} onAction={onAction}>
      {children}
    </SectionCard>
  );
}
