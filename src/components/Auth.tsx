"use client";

import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getUser, onAuthStateChange, signInWithGoogle, signOut } from '../lib/supabaseClient';

export default function Auth(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    getUser().then(u => { if (mounted) setUser(u); });
    const sub = onAuthStateChange((_event, _session) => {
      // refresh user and app state on auth changes
      getUser().then(u => { setUser(u); window.dispatchEvent(new CustomEvent('kanban:refresh')); });
    });
    return () => { mounted = false; sub?.unsubscribe?.(); };
  }, []);

  if (!user) {
    return (
      <div>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm">{user.email}</div>
      <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => signOut().then(() => window.dispatchEvent(new CustomEvent('kanban:refresh')))}>Sign out</button>
    </div>
  );
}
