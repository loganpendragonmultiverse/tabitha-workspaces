import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
let openIcons: Promise<Map<string, string>> | undefined;
export function TabFavicon({
  url,
  icon,
  title,
}: {
  url: string;
  icon?: string | undefined;
  title: string;
}) {
  const [source, setSource] = useState(icon ?? '');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSource(icon ?? '');
    if (!icon && /^https?:/.test(url)) {
      const base = new URL('/_favicon/', browser.runtime.getURL('/dashboard.html')).href;
      if (base.startsWith('chrome-extension:')) {
        const value = new URL(base);
        value.searchParams.set('pageUrl', url);
        value.searchParams.set('size', '32');
        setSource(value.href);
      } else {
        openIcons ??= browser.tabs
          .query({})
          .then(
            (tabs) =>
              new Map(
                tabs.filter((t) => t.url && t.favIconUrl).map((t) => [t.url!, t.favIconUrl!]),
              ),
          );
        void openIcons
          .then((icons) => {
            if (!cancelled) setSource(icons.get(url) ?? '');
          })
          .catch(() => {
            openIcons = undefined;
          });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [url, icon]);
  return source && !failed ? (
    <img src={source} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : (
    <>{title.slice(0, 1)}</>
  );
}
