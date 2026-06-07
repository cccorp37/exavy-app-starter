import { supabase } from "@/integrations/supabase/client";

/** Resolves a stored cover value to a displayable URL.
 *  Accepts either a full http(s) URL or a storage path in the `marketplace-covers` bucket. */
export async function resolveCoverUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await supabase.storage
    .from("marketplace-covers")
    .createSignedUrl(value, 60 * 60 * 24 * 7); // 7 days
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function resolveCoverUrls(values: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(values.map(resolveCoverUrl));
}
