import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Pencil, Trash2, X, UserCheck, UserX, Shield,
  AlertCircle, CheckCircle2, KeyRound, Filter, Mail, Phone
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, SelectInput, Tabs, Pagination,
  StateBlock, ConfirmDialog, StatCard, BusyOverlay
} from '../../components/ui/DashboardBits';
import { EmptyState, StatusBadge } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatDate, initials, statusLabel } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY = { name: '', email: '', password: '', role: 'customer', phone: '', is_active: 1 };

export default function AdminUsersPage() {
  useDocumentTitle('User management');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  const [editor, setEditor] = useState(null);   // null | 'new' | row
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      const res = await api.get(`/api/admin/users?${params.toString()}`);
      setRows(res.data?.data?.users || []);
      setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, [q, role, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, role, status]);

  const openEditor = (row) => {
    if (row === 'new') {
      setEditor('new');
      setForm({ ...EMPTY });
    } else {
      setEditor(row);
      setForm({
        name: row.name, email: row.email, password: '',
        role: row.role, phone: row.phone || '',
        is_active: Number(row.is_active)
      });
    }
    setFormErrors({});
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter a full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (editor === 'new') {
      if (form.password.length < 8) next.password = 'Minimum 8 characters';
      else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        next.password = 'Include at least one letter and one number';
      }
    } else if (form.password && form.password.length < 8) {
      next.password = 'Minimum 8 characters';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      if (editor === 'new') {
        await api.post('/api/admin/users', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          phone: form.phone.trim() || undefined,
          is_active: Number(form.is_active)
        });
        toast.success('User created');
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          phone: form.phone.trim(),
          is_active: Number(form.is_active)
        };
        if (form.password) payload.password = form.password;
        await api.put(`/api/admin/users/${editor.id}`, payload);
        toast.success('User updated');
      }
      setEditor(null);
      load();
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setFormErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      } else {
        setFormErrors({ email: err.message });
      }
      toast.error(err.message || 'Could not save the user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      setBusyId(row.id);
      await api.put(`/api/admin/users/${row.id}`, { is_active: Number(row.is_active) ? 0 : 1 });
      toast.success(row.is_active ? 'Account deactivated' : 'Account reactivated');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update this account');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      setBusyId(deleteTarget.id);
      const res = await api.delete(`/api/admin/users/${deleteTarget.id}`);
      toast.success(res.data?.message || 'User deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete this user');
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'User',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-burgundy-gradient text-[11px] font-bold text-ivory">
            {initials(r.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.name}</p>
            <p className="truncate text-xs text-muted">{r.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (r) => (
        <span className={`badge border ${
          r.role === 'admin' ? 'border-burgundy-200 bg-burgundy-50 text-burgundy-700'
          : r.role === 'provider' ? 'border-gold/40 bg-gold-100 text-gold-700'
          : 'border-edge bg-ivory text-muted'
        }`}>
          {r.role === 'admin' && <Shield className="h-3 w-3" />}
          {statusLabel(r.role)}
        </span>
      )
    },
    { key: 'phone', header: 'Phone', render: (r) => r.phone || <span className="text-muted">—</span> },
    {
      key: 'bookings',
      header: 'Bookings',
      render: (r) => (
        <span className="text-xs text-muted">
          {Number(r.bookings_as_customer || 0)} as customer
          {Number(r.bookings_as_provider) > 0 && <> · {r.bookings_as_provider} as provider</>}
        </span>
      )
    },
    { key: 'created_at', header: 'Joined', render: (r) => formatDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => (Number(r.is_active)
        ? <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700"><UserCheck className="h-3 w-3" /> Active</span>
        : <span className="badge border border-edge bg-cream text-muted"><UserX className="h-3 w-3" /> Disabled</span>)
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); openEditor(r); }}
            aria-label={`Edit ${r.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleActive(r); }}
            disabled={busyId === r.id}
            title={Number(r.is_active) ? 'Deactivate' : 'Reactivate'}
            aria-label={`${Number(r.is_active) ? 'Deactivate' : 'Reactivate'} ${r.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy">
            {busyId === r.id ? <Spinner className="h-3.5 w-3.5" /> : Number(r.is_active) ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            aria-label={`Delete ${r.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [busyId]);

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Users"
        description="Create accounts, change roles and control access across the platform."
        actions={
          <button onClick={() => openEditor('new')} className="btn-primary !py-2.5 text-sm">
            <Plus className="h-4 w-4" /> New user
          </button>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={6}>
        <>
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchInput value={search} onChange={setSearch}
              placeholder="Search name, email or phone…" className="min-w-[240px] flex-1"
              label="Search users" />
            <div className="flex flex-wrap gap-2.5">
              <SelectInput value={role} onChange={setRole} label="All roles"
                ariaLabel="Filter by role"
                options={[
                  { value: 'customer', label: 'Customers' },
                  { value: 'provider', label: 'Providers' },
                  { value: 'admin', label: 'Admins' }
                ]} />
              <SelectInput value={status} onChange={setStatus} label="Any status"
                ariaLabel="Filter by status"
                options={[
                  { value: '1', label: 'Active' },
                  { value: '0', label: 'Disabled' }
                ]} />
              {(q || role || status) && (
                <button onClick={() => { setSearch(''); setRole(''); setStatus(''); }}
                  className="btn-ghost !py-2.5 text-xs">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>

          <Panel flush>
            <StateBlock
              loading={false}
              empty={rows.length === 0}
              emptyIcon={Users}
              emptyTitle="No users match"
              emptyDescription="Adjust your filters or create a new account."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-ivory/70">
                      {columns.map((c) => (
                        <th key={c.key} scope="col"
                          className={`whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted ${c.className || ''}`}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2) }}
                        className="border-b border-edge/60 transition-colors last:border-0 hover:bg-ivory/60"
                      >
                        {columns.map((c) => (
                          <td key={c.key} className={`px-5 py-4 align-middle text-[13.5px] text-charcoal ${c.className || ''}`}>
                            {c.render ? c.render(r) : r[c.key]}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StateBlock>
          </Panel>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total}
            onChange={setPage} noun="users" />
        </>
      </StateBlock>

      {rows.length === 0 && !loading && !error && (
        <div className="mt-6">
          <EmptyState icon={Users} title="No users found" description="Try different filters or create an account."
            action={<button onClick={() => openEditor('new')} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> New user</button>} />
        </div>
      )}

      {/* ============================ editor ============================ */}
      <AnimatePresence>
        {editor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditor(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="user-editor-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {editor === 'new' ? 'Create account' : 'Edit account'}
                    </p>
                    <h3 id="user-editor-title" className="mt-1 font-display text-xl">
                      {editor === 'new' ? 'New user' : form.name}
                    </h3>
                  </div>
                  <button onClick={() => !saving && setEditor(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={save} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={saving} label="Saving…" />

                <div className="space-y-4">
                  <div>
                    <label htmlFor="usr-name" className="field-label">Full name *</label>
                    <input id="usr-name" value={form.name} onChange={set('name')} className="field"
                      placeholder="Sofia Bennett" aria-invalid={!!formErrors.name} />
                    {formErrors.name && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="usr-email" className="field-label">Email *</label>
                    <input id="usr-email" type="email" value={form.email} onChange={set('email')} className="field"
                      placeholder="user@example.com" aria-invalid={!!formErrors.email} />
                    {formErrors.email && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.email}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="usr-role" className="field-label">Role</label>
                      <select id="usr-role" value={form.role} onChange={set('role')} className="field">
                        <option value="customer">Customer</option>
                        <option value="provider">Provider</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="usr-phone" className="field-label">Phone</label>
                      <input id="usr-phone" value={form.phone} onChange={set('phone')} className="field"
                        placeholder="+1 (555) 010-2030" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="usr-pw" className="field-label">
                      {editor === 'new' ? 'Password *' : 'Reset password '}
                      {editor !== 'new' && <span className="font-normal text-muted">(leave blank to keep)</span>}
                    </label>
                    <input id="usr-pw" type="password" autoComplete="new-password" value={form.password}
                      onChange={set('password')} className="field"
                      placeholder={editor === 'new' ? 'Min. 8 chars, letter + number' : '••••••••'}
                      aria-invalid={!!formErrors.password} />
                    {formErrors.password && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.password}</p>}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-edge bg-ivory/60 px-4 py-3">
                    <input type="checkbox" checked={Number(form.is_active) === 1} onChange={set('is_active')}
                      className="h-4 w-4 accent-[#641E32]" />
                    <span className="text-sm font-semibold text-charcoal">Account active</span>
                    <span className="ml-auto text-xs text-muted">Disabled users cannot sign in</span>
                  </label>

                  {form.role === 'provider' && (
                    <p className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-xs leading-relaxed text-charcoal">
                      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
                      New providers are created <strong>pre-approved</strong> so they can publish services right away.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setEditor(null)} disabled={saving} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-3 text-sm">
                    {saving ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {editor === 'new' ? 'Create user' : 'Save changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this user?"
        message={deleteTarget
          ? `${deleteTarget.name} (${deleteTarget.email}) will be removed. If they have upcoming bookings the account is deactivated instead, so history stays intact.`
          : ''}
        confirmLabel="Delete user"
        cancelLabel="Keep account"
        loading={busyId === deleteTarget?.id}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
