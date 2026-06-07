import { useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/marketplace-covers";

interface Props {
  value: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export const MarketplaceCover = ({ value, alt = "", className, fallback }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await resolveCoverUrl(value);
      if (!cancelled) setUrl(u);
    })();
    return () => { cancelled = true; };
  }, [value]);

  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
};
