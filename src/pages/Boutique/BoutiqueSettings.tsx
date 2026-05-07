import { useState, useEffect, useRef } from 'react';
import { Save, Upload, MapPin, Phone, Mail, Clock, Building, Volume2, VolumeX } from 'lucide-react';
import { usePizzariaSettings, type PizzariaSettings } from '../../hooks/usePizzariaSettings';
import { audioNotificationService } from '../../services/audioNotificationService';
import { OpeningHoursInput } from '../../components/OpeningHoursInput';
import { supabase } from '../../lib/supabase';

export function BoutiqueSettings() {
  const { settings: remoteSettings, loading, updateSettings } = usePizzariaSettings();
  const [settings, setSettings] = useState<PizzariaSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(audioNotificationService.getEnabled());
  const [audioVolume, setAudioVolume] = useState(audioNotificationService.getVolume() * 100);
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const [soundFileName, setSoundFileName] = useState<string | null>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
      if (remoteSettings.notification_sound) {
        audioNotificationService.setCustomSoundUrl(remoteSettings.notification_sound);
        const parts = remoteSettings.notification_sound.split('/');
        setSoundFileName(decodeURIComponent(parts[parts.length - 1]));
      }
    }
  }, [remoteSettings]);

  if (loading || !settings) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-500" />
    </div>
  );

  const updateField = (field: keyof PizzariaSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateOpeningHour = (day: keyof PizzariaSettings['opening_hours'], value: string) => {
    setSettings(prev => prev ? { ...prev, opening_hours: { ...prev.opening_hours, [day]: value } } : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.name?.trim()) { setMessage({ type: 'error', text: 'O nome da loja é obrigatório.' }); return; }
    if (!settings.address?.trim()) { setMessage({ type: 'error', text: 'A morada é obrigatória.' }); return; }

    setIsSaving(true);
    setMessage(null);
    try {
      const success = await updateSettings(settings);
      if (success) {
        setMessage({ type: 'success', text: 'Definições guardadas com sucesso!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Erro ao guardar.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSound(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `notification_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('notification-sounds').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('notification-sounds').getPublicUrl(fileName);
      await updateSettings({ notification_sound: data.publicUrl });
      updateField('notification_sound', data.publicUrl);
      audioNotificationService.setCustomSoundUrl(data.publicUrl);
      setSoundFileName(file.name);
      setMessage({ type: 'success', text: 'Som carregado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao carregar som: ' + err.message });
    } finally {
      setIsUploadingSound(false);
      if (soundInputRef.current) soundInputRef.current.value = '';
    }
  };

  const dayLabels: Record<string, string> = {
    monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center gap-3">
        <Building className="h-8 w-8 text-accent-500" />
        <div>
          <h1 className="text-3xl font-bold text-primary-800">Definições</h1>
          <p className="text-primary-600">Configure as informações da sua loja</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" /> Logo
          </h2>
          {settings.logo_url && (
            <div className="flex justify-center mb-4">
              <img src={settings.logo_url} alt="Logo" className="h-24 w-auto object-contain rounded-lg border" />
            </div>
          )}
          <label className="block text-sm font-medium text-primary-700 mb-1">URL do logótipo</label>
          <input type="url" value={settings.logo_url || ''} onChange={e => updateField('logo_url', e.target.value)}
            placeholder="https://…/logo.png"
            className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
        </div>

        {/* Infos générales */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
            <Building className="h-5 w-5" /> Informações gerais
          </h2>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Nome da loja *</label>
            <input type="text" value={settings.name || ''} onChange={e => updateField('name', e.target.value)}
              required placeholder="Nome da sua loja"
              className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
          </div>
        </div>

        {/* Statut ouverture */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Estado da loja
          </h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-primary-800">Loja {settings.is_open ? 'aberta' : 'fechada'}</p>
              <p className="text-sm text-primary-600">
                {settings.is_open ? 'As encomendas são aceites' : 'As encomendas estão suspensas'}
              </p>
            </div>
            <button type="button"
              onClick={async () => {
                const newValue = !settings.is_open;
                setSettings(prev => prev ? { ...prev, is_open: newValue } : null);
                await updateSettings({ is_open: newValue });
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings.is_open ? 'bg-green-500' : 'bg-red-500'}`}>
              <span className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${settings.is_open ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">Custos de entrega (€)</label>
              <input type="number" min="0" step="0.01"
                value={settings.delivery_fee ?? ''}
                onChange={e => updateField('delivery_fee', e.target.value ? Number(e.target.value) : 0)}
                placeholder="Ex: 9.90"
                className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">Montante mínimo para entrega (€)</label>
              <input type="number" min="0" step="0.50"
                value={settings.min_order_amount ?? ''}
                onChange={e => updateField('min_order_amount', e.target.value ? Number(e.target.value) : 0)}
                placeholder="Ex: 50"
                className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Prazo de entrega estimado (dias úteis)</label>
            <input type="number" min="1" max="365"
              value={settings.estimated_delivery_days ?? 14}
              onChange={e => updateField('estimated_delivery_days', e.target.value ? Number(e.target.value) : 14)}
              placeholder="Ex: 14"
              className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
            <p className="text-xs text-gray-400 mt-1">Prazo indicativo mostrado aos clientes no carrinho.</p>
          </div>
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
            <Phone className="h-5 w-5" /> Contactos
          </h2>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Morada de recolha *
            </label>
            <textarea value={settings.address || ''} onChange={e => updateField('address', e.target.value)}
              rows={2} required placeholder="Morada completa da loja"
              className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1">
                <Phone className="h-4 w-4" /> Telefone
              </label>
              <input type="tel" value={settings.phone || ''} onChange={e => updateField('phone', e.target.value)}
                placeholder="+351 9X XXX XXXX"
                className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1">
                <Mail className="h-4 w-4" /> Email
              </label>
              <input type="email" value={settings.email || ''} onChange={e => updateField('email', e.target.value)}
                placeholder="contacto@loja.pt"
                className="w-full px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Horaires */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Horário de funcionamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(dayLabels).map(([day, label]) => (
              <OpeningHoursInput key={day}
                value={settings.opening_hours?.[day as keyof typeof settings.opening_hours] || ''}
                onChange={v => updateOpeningHour(day as keyof typeof settings.opening_hours, v)}
                dayLabel={label} />
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t">
            <label className="text-sm font-medium text-primary-700 flex-shrink-0">
              Bloquear encomendas (min. antes de fechar)
            </label>
            <input type="number" min="0" max="120"
              value={settings.cutoff_minutes_before_closing ?? 30}
              onChange={e => updateField('cutoff_minutes_before_closing', Number(e.target.value))}
              className="w-20 px-3 py-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
          </div>
        </div>

        {/* Notifications sonores */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary-800 flex items-center gap-2">
            <Volume2 className="h-5 w-5" /> Notificações sonoras
          </h2>
          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center gap-3">
              {audioEnabled ? <Volume2 className="h-6 w-6 text-accent-500" /> : <VolumeX className="h-6 w-6 text-gray-400" />}
              <div>
                <p className="font-medium text-primary-800">Som de notificação</p>
                <p className="text-sm text-primary-600">{audioEnabled ? 'Ativado' : 'Desativado'}</p>
              </div>
            </div>
            <button type="button"
              onClick={() => { const v = !audioEnabled; setAudioEnabled(v); audioNotificationService.setEnabled(v); }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${audioEnabled ? 'bg-accent-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${audioEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {audioEnabled && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-primary-700">Volume: {Math.round(audioVolume)}%</label>
                <button type="button" onClick={() => audioNotificationService.playNotification()}
                  className="text-sm text-accent-500 hover:text-accent-600 font-medium">Testar</button>
              </div>
              <input type="range" min="0" max="100" value={audioVolume}
                onChange={e => { const v = Number(e.target.value); setAudioVolume(v); audioNotificationService.setVolume(v / 100); }}
                className="w-full h-2 bg-primary-200 rounded-lg cursor-pointer accent-accent-500" />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary-700">Som personalizado</p>
            <input ref={soundInputRef} type="file" accept=".mp3,.wav,.ogg,audio/*" onChange={handleSoundUpload} className="hidden" />
            <button type="button" onClick={() => soundInputRef.current?.click()} disabled={isUploadingSound}
              className="flex items-center gap-2 px-4 py-2 border border-primary-300 rounded-md text-sm text-primary-700 hover:bg-primary-50 disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {isUploadingSound ? 'A carregar…' : 'Escolher som (MP3/WAV/OGG)'}
            </button>
            {soundFileName && <p className="text-xs text-primary-500">Ficheiro atual: <strong>{soundFileName}</strong></p>}
          </div>
        </div>

        {/* Save button */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-end gap-4">
          {message && (
            <span className={`text-sm font-medium px-3 py-1.5 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </span>
          )}
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-md hover:bg-accent-600 transition disabled:opacity-50">
            <Save className="h-5 w-5" />
            {isSaving ? 'A guardar…' : 'Guardar definições'}
          </button>
        </div>
      </form>
    </div>
  );
}
