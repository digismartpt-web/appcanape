import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProRequestsStore } from '../stores/proRequestsStore';
import { supabase, supabaseAuth } from '../lib/supabase';
import toast from 'react-hot-toast';

const ACTIVITY_SECTORS = [
  'Construção civil',
  'Imobiliário',
  'Hotelaria e turismo',
  'Restauração',
  'Escritórios e espaços comerciais',
  'Decoração de interiores',
  'Outro'
];

const PURCHASE_VOLUMES = [
  'Menos de 1 000€/ano',
  '1 000€ - 5 000€/ano',
  '5 000€ - 20 000€/ano',
  'Mais de 20 000€/ano'
];

const validateNif = (nif: string) => /^\d{9}$/.test(nif.trim());
const validatePostalCode = (cp: string) => /^\d{4}-\d{3}$/.test(cp.trim());

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-primary-800 pb-2 border-b border-gray-200 mb-4">
      {children}
    </h2>
  );
}

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm';
const INPUT_ERROR_CLASS = 'w-full px-3 py-2 border border-red-400 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 text-sm';

export function PedidoPro() {
  const { user } = useAuth();
  const { submitRequest } = useProRequestsStore();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    // Personal
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    // Password (only for non-logged users)
    password: '',
    confirm_password: '',
    // Company
    company_name: '',
    nif: '',
    morada: '',
    codigo_postal: '',
    localidade: '',
    activity_sector: '',
    // Additional
    purchase_volume: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Campo obrigatório';
    if (!form.email.trim()) newErrors.email = 'Campo obrigatório';
    if (!form.phone.trim()) newErrors.phone = 'Campo obrigatório';
    if (!user) {
      if (!form.password) {
        newErrors.password = 'Campo obrigatório';
      } else if (form.password.length < 8) {
        newErrors.password = 'Mínimo 8 caracteres';
      }
      if (!form.confirm_password) {
        newErrors.confirm_password = 'Campo obrigatório';
      } else if (form.password !== form.confirm_password) {
        newErrors.confirm_password = 'As palavras-passe não coincidem';
      }
    }
    if (!form.company_name.trim()) newErrors.company_name = 'Campo obrigatório';
    if (!form.nif.trim()) {
      newErrors.nif = 'Campo obrigatório';
    } else if (!validateNif(form.nif)) {
      newErrors.nif = 'NIF deve ter 9 dígitos';
    }
    if (!form.morada.trim()) newErrors.morada = 'Campo obrigatório';
    if (!form.codigo_postal.trim()) {
      newErrors.codigo_postal = 'Campo obrigatório';
    } else if (!validatePostalCode(form.codigo_postal)) {
      newErrors.codigo_postal = 'Formato inválido (ex: 1000-001)';
    }
    if (!form.localidade.trim()) newErrors.localidade = 'Campo obrigatório';
    if (!form.activity_sector) newErrors.activity_sector = 'Selecione um setor';
    if (!form.purchase_volume) newErrors.purchase_volume = 'Selecione um volume';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Por favor corrija os erros antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      let userId = user?.id;

      if (!user) {
        const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.full_name.trim() }
          }
        });
        if (signUpError) throw new Error(signUpError.message);
        userId = signUpData.user?.id;
        if (!userId) throw new Error('Erro ao criar conta. Tente novamente.');

        // Create profile immediately so this user is recognised as a canape client on first login
        const now = new Date().toISOString();
        await supabase
          .from('users_profiles')
          .insert({
            id: userId,
            email: form.email.trim(),
            role: 'client',
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            created_at: now
          });
      }

      const address = `${form.morada.trim()}, ${form.codigo_postal.trim()} ${form.localidade.trim()}`;
      const messageParts = [
        `Nome do contacto: ${form.full_name.trim()}`,
        `Volume de compras estimado: ${form.purchase_volume}`
      ];
      if (form.message.trim()) messageParts.push(`\nMensagem: ${form.message.trim()}`);

      await submitRequest({
        user_id: userId,
        company_name: form.company_name.trim(),
        nif: form.nif.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address,
        activity_sector: form.activity_sector,
        message: messageParts.join('\n')
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-primary-800 mb-3">Pedido enviado com sucesso!</h1>
        <p className="text-primary-600 mb-4">
          O seu pedido de acesso profissional está em análise. Entraremos em contacto em breve através do email fornecido.
        </p>
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-sm font-medium px-4 py-2 rounded-full mb-8">
          <Clock className="h-4 w-4" />
          Prazo de resposta: 2 a 5 dias úteis
        </div>
        <div>
          <Link to="/" className="inline-block bg-accent-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent-700 transition">
            Voltar à loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <Building2 className="h-12 w-12 text-accent-600 mx-auto mb-3" />
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 mb-2">Acesso Profissional</h1>
        <p className="text-primary-600 text-sm">
          Preencha o formulário abaixo para solicitar preços profissionais. Campos marcados com <span className="text-red-500">*</span> são obrigatórios.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-6">

        {/* Informações pessoais */}
        <div className="space-y-4">
          <SectionTitle>Informações pessoais</SectionTitle>

          <Field label="Nome completo" required error={errors.full_name}>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="João Silva"
              className={errors.full_name ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          <Field label="Email" required error={errors.email}>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="joao@empresa.pt"
              className={errors.email ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          <Field label="Telefone" required error={errors.phone}>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+351 912 345 678"
              className={errors.phone ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          {/* Password fields — only for non-logged users */}
          {!user && (
            <>
              <Field label="Palavra-passe" required error={errors.password}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    className={`${errors.password ? INPUT_ERROR_CLASS : INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirmar palavra-passe" required error={errors.confirm_password}>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder="Repita a palavra-passe"
                    className={`${errors.confirm_password ? INPUT_ERROR_CLASS : INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Informações da empresa */}
        <div className="space-y-4">
          <SectionTitle>Informações da empresa</SectionTitle>

          <Field label="Nome da empresa" required error={errors.company_name}>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="Empresa Lda."
              className={errors.company_name ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          <Field label="NIF" required error={errors.nif}>
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleChange}
              placeholder="123456789"
              maxLength={9}
              inputMode="numeric"
              className={errors.nif ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          <Field label="Morada da empresa" required error={errors.morada}>
            <input
              type="text"
              name="morada"
              value={form.morada}
              onChange={handleChange}
              placeholder="Rua Exemplo, nº 10"
              className={errors.morada ? INPUT_ERROR_CLASS : INPUT_CLASS}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código postal" required error={errors.codigo_postal}>
              <input
                type="text"
                name="codigo_postal"
                value={form.codigo_postal}
                onChange={handleChange}
                placeholder="1000-001"
                maxLength={8}
                className={errors.codigo_postal ? INPUT_ERROR_CLASS : INPUT_CLASS}
              />
            </Field>
            <Field label="Localidade" required error={errors.localidade}>
              <input
                type="text"
                name="localidade"
                value={form.localidade}
                onChange={handleChange}
                placeholder="Lisboa"
                className={errors.localidade ? INPUT_ERROR_CLASS : INPUT_CLASS}
              />
            </Field>
          </div>

          <Field label="Setor de atividade" required error={errors.activity_sector}>
            <select
              name="activity_sector"
              value={form.activity_sector}
              onChange={handleChange}
              className={errors.activity_sector ? INPUT_ERROR_CLASS : INPUT_CLASS}
            >
              <option value="">Selecione um setor…</option>
              {ACTIVITY_SECTORS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Informações complementares */}
        <div className="space-y-4">
          <SectionTitle>Informações complementares</SectionTitle>

          <Field label="Volume de compras estimado" required error={errors.purchase_volume}>
            <select
              name="purchase_volume"
              value={form.purchase_volume}
              onChange={handleChange}
              className={errors.purchase_volume ? INPUT_ERROR_CLASS : INPUT_CLASS}
            >
              <option value="">Selecione um volume…</option>
              {PURCHASE_VOLUMES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Mensagem / Como nos encontrou?">
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder="Informações adicionais, como nos encontrou, necessidades específicas…"
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>
        </div>

        <p className="text-sm text-gray-500 text-center">
          Enquanto o seu pedido está em análise, terá acesso à loja como cliente normal. Após aprovação, os seus preços profissionais serão automaticamente aplicados.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-600 text-white py-3.5 rounded-lg font-semibold hover:bg-accent-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
        >
          {loading ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />A enviar…</>
          ) : 'Enviar pedido de acesso profissional'}
        </button>
      </form>
    </div>
  );
}
