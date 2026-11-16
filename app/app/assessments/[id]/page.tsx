'use client';

import { use } from 'react';
import SemesterDetail from './SemesterDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SemesterDetail id={Number(id)} />;
}
