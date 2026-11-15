import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Trash2, CalendarDays, CreditCard, Star,
  AlertTriangle, Info, Mail, ExternalLink, Inbox
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useUtility';
import { useNotifications } from '../../context/NotificationContext';
import { PageIntro, Panel, Tabs, StateBlock, ConfirmDialog } from '../../components/ui/DashboardBits';
import { EmptyState } from '../../components/ui/Primitives';

const TYPE_ICON = {
  appointment: CalendarDays,
  success: CheckCheck,
  payment: CreditCard,
  warning: AlertTriangle,
  review: Star,
  info: Info,
  email: Mail
};

const TYPE_DOT = {
  appointment: 'bg-burgundy',
  success: 'bg-emerald-500',
  payment: 'bg-gold',
  warning: 'bg-amber-500',
  review: 'bg-rosewood',
  info: 'bg-rosewood',
  email: 'bg-rosewood'
};

export default function CustomerNotificationsPage() {
  useDocumentTitle('Notifications');
  const { items, unread, loading, markRead, markAllRead, remove, fetchNotifications } = useNotifications();

  const [tab, setTab] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const visible = useMemo(
    () => (tab === 'unread' ? items.filter((n) => !n.is_read) : items),
    [items, tab]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <PageIntro
        eyebrow="Stay in the loop"
        title="Notifications"
        description="Booking confirmations, reminders and account activity — everything Appointify has told you."
        actions={
          <>
            <button onClick={fetchNotifications} className="btn-secondary !py-2.5 text-sm">
              <Bell className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={() => setConfirmAll(true)}
              disabled={unread === 0}
              className="btn-primary !py-2.5 text-sm disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Tabs
          tabs={[
            { value: 'all', label: 'All', count: items.length },
            { value: 'unread', label: 'Unread', count: unread }
          ]}
          value={tab}
          onChange={setTab}
          className="max-w-sm"
        />
        <p className="text-xs text-muted">
          {unread > 0
            ? <><span className="font-bold text-burgundy">{unread}</span> unread notification{unread === 1 ? '' : 's'}</>
            : 'You are all caught up'}
        </p>
      </div>

      <Panel flush>
        <StateBlock
          loading={loading && items.length === 0}
          empty={visible.length === 0}
          emptyIcon={Inbox}
          emptyTitle={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          emptyDescription={
            tab === 'unread'
              ? 'Everything has been read — nice work.'
              : 'Confirmations, reminders and payment receipts will appear here.'
          }
        >
          <ul className="divide-y divide-edge/70">
            <AnimatePresence initial={false}>
              {visible.map((n, i) => {
                const Icon = TYPE_ICON[n.type] || Info;
                return (
                  <motion.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0 }}
                    transition={{ duration: 0.32, delay: Math.min(i * 0.03, 0.2), ease: [0.22, 1, 0.36, 1] }}
                    className={`group relative flex gap-4 px-5 py-4 transition-colors sm:px-6 ${
                      n.is_read ? 'hover:bg-ivory/50' : 'bg-burgundy-50/35 hover:bg-burgundy-50/60'
                    }`}
                  >
                    {!n.is_read && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-burgundy" aria-hidden="true" />
                    )}

                    <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-card`}>
                      <Icon className={`h-4.5 w-4.5 h-5 w-5 ${n.is_read ? 'text-rosewood' : 'text-burgundy'}`} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`truncate text-[14px] ${n.is_read ? 'font-semibold text-charcoal' : 'font-bold text-burgundy-800'}`}>
                          {n.title}
                        </p>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[n.type] || TYPE_DOT.info}`} />
                        <span className="badge border border-edge bg-white !text-[10px] text-muted">
                          {String(n.type || 'info').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.message}</p>
                      <p className="mt-1.5 text-[10.5px] uppercase tracking-wider text-muted/70">
                        {new Date(n.created_at).toLocaleString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => { if (!n.is_read) markRead(n.id); }}
                          className="btn-ghost !px-2.5 !py-1.5 text-[11.5px]"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          title="Mark as read"
                          aria-label={`Mark "${n.title}" as read`}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(n)}
                        title="Delete"
                        aria-label={`Delete "${n.title}"`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </StateBlock>
      </Panel>

      {visible.length > 0 && (
        <p className="mt-5 text-center text-[11.5px] text-muted">
          Notifications are also emailed to you — manage email preferences from your profile.
        </p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this notification?"
        message={deleteTarget ? `"${deleteTarget.title}" will be removed from your list. This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={confirmAll}
        tone="info"
        title="Mark everything as read?"
        message={`${unread} notification${unread === 1 ? '' : 's'} will be marked as read. They'll stay in your list for reference.`}
        confirmLabel="Mark all read"
        cancelLabel="Not now"
        onConfirm={async () => { await markAllRead(); setConfirmAll(false); }}
        onCancel={() => setConfirmAll(false)}
      />

      {visible.length === 0 && tab === 'all' && !loading && (
        <div className="mt-6">
          <EmptyState
            icon={Bell}
            title="Quiet in here"
            description="Book an appointment and your confirmation will land in this list."
            action={<Link to="/services" className="btn-primary btn-sm">Browse services</Link>}
          />
        </div>
      )}
    </div>
  );
}
