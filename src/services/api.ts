import { supabase } from '@/lib/supabase';

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(`${import.meta.env.BASE_URL}api/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? response.statusText);
  return data as T;
}
