'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

export interface Me {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get<{ user: Me }>('/api/auth/me')
      .then((r) => {
        if (alive) setMe(r.user);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          if (alive) setMe(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}
