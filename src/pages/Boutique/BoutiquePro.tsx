import { useState, useEffect } from 'react';
import { UserCheck, Check, X, Pencil } from 'lucide-react';
import { useProRequestsStore } from '../../stores/proRequestsStore';
import { proRequestsService } from '../../services/supabaseService';
import { useAuth } from '../../hooks/useAuth';
import type { ProRequest, ProRequestStatus, User } from '../../types';
import toast from 'react-hot-toast';

type FilterTab = 'all' | ProRequestStatus;

const STATUS_LABELS: Record<ProRequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado'
};

const STATUS_CLASSES: Record<ProRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

function StatusBadge({ status }: { status: ProRequestStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function BoutiquePro() {
  const { requests, loading, fetchRequests, approveRequest, rejectRequest } = useProRequestsStore();
  const { user } = useAuth();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [approveModal, setApproveModal] = useState<ProRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<ProRequest | null>(null);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [proClients, setProClients] = useState<User[]>([]);
  const [editDiscountModal, setEditDiscountModal] = useState<{ client: User; discount: number } | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  const refreshProClients = () =>
    proRequestsService.fetchProClients()
      .then(clients => setProClients(clients))
      .catch(() => {});

  useEffect(() => {
    fetchRequests();
    refreshProClients();
  }, []);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const handleApprove = async () => {
    if (!approveModal) return;
    setSubmitting(true);
    try {
      await approveRequest(approveModal.id, approveModal.user_id, discountPercent, user?.id);
      setApproveModal(null);
      setDiscountPercent(10);
      refreshProClients();
    } catch {
      // handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Indique o motivo da rejeição.');
      return;
    }
    setSubmitting(true);
    try {
      await rejectRequest(rejectModal.id, rejectReason.trim(), user?.id);
      setRejectModal(null);
      setRejectReason('');
    } catch {
      // handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!editDiscountModal) return;
    setSavingDiscount(true);
    try {
      await proRequestsService.updateProDiscount(editDiscountModal.client.id, editDiscountModal.discount);
      toast.success('Desconto atualizado');
      setEditDiscountModal(null);
      refreshProClients();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDiscount(false);
    }
  };

  const FILTER_TABS: { value: FilterTab; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'approved', label: 'Aprovados' },
    { value: 'rejected', label: 'Rejeitados' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <UserCheck className="h-7 w-7 text-accent-600" />
        <h1 className="text-2xl font-bold text-primary-800">Clientes Pro</h1>
      </div>

      {/* Requests section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold text-primary-800 mb-4">Pedidos de acesso profissional</h2>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(tab => (
              <button key={tab.value} onClick={() => setFilter(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === tab.value ? 'bg-accent-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {tab.label}
                {tab.value !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({requests.filter(r => r.status === tab.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Nenhum pedido encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-gray-600">NIF</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-800">{req.company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{req.nif}</td>
                    <td className="px-4 py-3 text-gray-600">{req.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setApproveModal(req); setDiscountPercent(10); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition">
                            <Check className="h-3.5 w-3.5" /> Aprovar
                          </button>
                          <button onClick={() => { setRejectModal(req); setRejectReason(''); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition">
                            <X className="h-3.5 w-3.5" /> Rejeitar
                          </button>
                        </div>
                      )}
                      {req.status !== 'pending' && req.rejection_reason && (
                        <span className="text-xs text-gray-500 italic">{req.rejection_reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active pro clients section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold text-primary-800">Clientes Pro ativos</h2>
        </div>
        {proClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum cliente pro ativo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Desconto atual</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-800">{client.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{client.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        {client.pro_discount_percent ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditDiscountModal({ client, discount: client.pro_discount_percent ?? 0 })}
                        className="flex items-center gap-1 px-3 py-1.5 border border-accent-500 text-accent-600 text-xs rounded-md hover:bg-accent-50 transition">
                        <Pencil className="h-3.5 w-3.5" /> Editar desconto
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-primary-800 mb-2">Aprovar pedido</h3>
            <p className="text-gray-600 mb-4">
              Empresa: <strong>{approveModal.company_name}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto pro (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={e => setDiscountPercent(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={submitting}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50">
                {submitting ? 'A aprovar…' : 'Confirmar aprovação'}
              </button>
              <button onClick={() => setApproveModal(null)} disabled={submitting}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-primary-800 mb-2">Rejeitar pedido</h3>
            <p className="text-gray-600 mb-4">
              Empresa: <strong>{rejectModal.company_name}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da rejeição</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Indique o motivo…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={submitting}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50">
                {submitting ? 'A rejeitar…' : 'Confirmar rejeição'}
              </button>
              <button onClick={() => setRejectModal(null)} disabled={submitting}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit discount modal */}
      {editDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-primary-800 mb-1">Editar desconto</h3>
            <p className="text-sm text-gray-600 mb-4">{editDiscountModal.client.full_name}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto pro (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editDiscountModal.discount}
              onChange={e => setEditDiscountModal(prev => prev ? { ...prev, discount: Number(e.target.value) } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleSaveDiscount} disabled={savingDiscount}
                className="flex-1 bg-accent-500 text-white py-2 rounded-lg font-medium hover:bg-accent-600 transition disabled:opacity-50">
                {savingDiscount ? 'A guardar…' : 'Guardar'}
              </button>
              <button onClick={() => setEditDiscountModal(null)} disabled={savingDiscount}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
