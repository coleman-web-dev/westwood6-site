'use client';

import type { ViolationNotice, NoticeType } from '@/lib/types/database';

const NOTICE_LABELS: Record<NoticeType, string> = {
  courtesy: 'Courtesy Notice',
  first_notice: 'First Notice',
  second_notice: 'Second Notice',
  final_notice: 'Final Notice',
  hearing_notice: 'Hearing Notice',
};

interface NoticeHistoryProps {
  notices: ViolationNotice[];
}

export function NoticeHistory({ notices }: NoticeHistoryProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
        Notice History
      </h4>
      <div className="space-y-3">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="flex items-start gap-3 text-meta"
          >
            <div className="w-2 h-2 mt-1.5 rounded-full bg-secondary-400 shrink-0" />
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                {NOTICE_LABELS[notice.notice_type]}
              </p>
              <p className="text-text-muted-light dark:text-text-muted-dark">
                {new Date(notice.sent_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {' via '}
                {notice.delivery_method}
              </p>
              {notice.notes && (
                <p className="text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                  {notice.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
