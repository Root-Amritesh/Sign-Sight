import { useEffect } from 'react';

export const useDocumentTitle = (pageTitle: string, unreadCount?: number) => {
  useEffect(() => {
    const base = 'SignSight SOC';
    const titlePart = pageTitle ? `${pageTitle} — ${base}` : base;
    const prefix = unreadCount && unreadCount > 0 ? `(${unreadCount}) ` : '';
    document.title = `${prefix}${titlePart}`;
  }, [pageTitle, unreadCount]);
};
