import { useEffect, useState } from 'react';
import { Shield, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import Overlay from '../../components/ui/Overlay';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services';
import { formatDate, initials, money, pluralize } from '../../utils/format';
import { setSeo } from '../../utils/seo';

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useApi((signal) => adminService.users({ page, limit: 15 }, signal), [page]);
  const rows = data?.data || [];
  const meta = data?.meta || {};

  useEffect(() => setSeo({ title: 'Travellers', description: 'LUXORA accounts, roles and lifetime value.', noindex: true }), []);

  const patch = async (user, body, message) => {
    setBusy(true);
    try {
      await adminService.setUser(user.id, body);
      toast.success(message, `${user.name} updated.`);
      setSelected(null);
      refetch();
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Traveller',
      sortKey: 'name',
      render: (r) => (
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[0.625rem] font-bold uppercase text-accent-soft">{initials(r.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-tiny font-semibold text-ink">{r.name}</span>
            <span className="block truncate text-[0.625rem] text-muted">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', label: 'Role', sortKey: 'role', render: (r) => <Tag tone={r.role === 'admin' ? 'accent' : 'outline'} size="sm">{r.role}</Tag> },
    { key: 'bookings', label: 'Bookings', sortKey: 'bookings', align: 'right', mono: true, render: (r) => <span className="text-tiny font-semibold">{r.bookings}</span> },
    { key: 'spend', label: 'Lifetime', sortKey: 'spend', align: 'right', mono: true, render: (r) => <span className="text-tiny">{money(r.spend, { compact: true })}</span> },
    { key: 'lastLoginAt', label: 'Last seen', render: (r) => <span className="text-[0.6875rem] text-muted">{r.lastLoginAt ? formatDate(r.lastLoginAt, { style: 'short' }) : 'never'}</span> },
    { key: 'createdAt', label: 'Joined', sortKey: 'createdAt', render: (r) => <span className="text-[0.6875rem] text-muted">{formatDate(r.createdAt, { style: 'short', withYear: true })}</span> },
    {
      key: 'status',
      label: '',
      align: 'right',
      render: (r) => (
        <span className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Tag tone={r.active === false ? 'danger' : 'success'} size="sm">
            {r.active === false ? 'disabled' : 'active'}
          </Tag>
          <Button size="sm" variant="ghost" className="!min-h-8 !px-3" onClick={() => setSelected(r)}>
            Manage
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-luxe text-muted">Accounts</p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-light leading-none text-ink">Travellers</h1>
          <p className="mt-2 text-tiny text-muted">{meta.total ? `${pluralize(meta.total, 'account')} · ${rows.filter((r) => r.role === 'admin').length} staff on this page` : '—'}</p>
        </div>
      </header>

      {error ? (
        <div className="card border-danger/30 bg-danger/[0.04] p-6">
          <p className="text-small font-semibold text-danger">Accounts could not be loaded</p>
          <p className="mt-1 text-tiny text-ink-2">{error.message}</p>
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} loading={loading} page={page} pages={meta.pages || 1} onPage={setPage} searchKeys={['name', 'email']} emptyLabel="No accounts" onRowClick={setSelected} />
      )}

      <Overlay open={Boolean(selected)} onClose={() => setSelected(null)} labelledBy="user-title" className="!max-w-md">
        {selected ? (
          <div className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink font-display text-[0.9rem] uppercase text-accent-soft">{initials(selected.name)}</span>
              <div>
                <h2 id="user-title" className="font-display text-[1.3rem] leading-none text-ink">
                  {selected.name}
                </h2>
                <p className="mt-1 text-tiny text-muted">{selected.email}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3">
              {[
                ['Bookings', selected.bookings],
                ['Lifetime', money(selected.spend, { compact: true })],
                ['Role', selected.role],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm bg-sunk/60 px-3 py-2.5">
                  <dt className="text-[0.625rem] uppercase tracking-luxe text-muted">{k}</dt>
                  <dd className="mt-0.5 truncate text-tiny font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 rounded-sm border-l-2 border-accent bg-accent-faint/50 px-3.5 py-2.5 text-[0.6875rem] leading-relaxed text-ink-2">
              Changing a role takes effect the moment the account’s next request is signed — access is checked on every admin route, not cached in the browser.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" icon={selected.role === 'admin' ? UserX : Shield} loading={busy} onClick={() => patch(selected, { role: selected.role === 'admin' ? 'guest' : 'admin' }, selected.role === 'admin' ? 'Role reverted to traveller' : 'Promoted to staff')}>
                {selected.role === 'admin' ? 'Remove admin' : 'Make admin'}
              </Button>
              <Button
                size="sm"
                variant={selected.active === false ? 'accent' : 'danger'}
                icon={selected.active === false ? UserCheck : ShieldCheck}
                loading={busy}
                disabled={String(selected.id) === String(me?._id || me?.id)}
                onClick={() => patch(selected, { active: selected.active === false }, selected.active === false ? 'Account re-enabled' : 'Account disabled')}
              >
                {selected.active === false ? 'Re-enable' : 'Disable account'}
              </Button>
            </div>
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}
