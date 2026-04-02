import React from 'react';
import StaffPageShell from '@/components/StaffPageShell';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffPageShell>{children}</StaffPageShell>;
}
