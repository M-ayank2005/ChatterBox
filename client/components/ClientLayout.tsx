"use client";

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Re-hydrate store manually if needed or just mark mounted
    useStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (!mounted) {
     return <div className="min-h-screen bg-[#111b21]"></div>; // Prevent flash of unstyled content/wrong state
  }

  return <>{children}</>;
}
