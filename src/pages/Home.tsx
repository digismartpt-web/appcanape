import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';

export function Home() {
  const { settings, loading } = usePizzariaSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          {settings.logo_url && (
            <div className="flex justify-center mb-3 sm:mb-4">
              <img
                src={settings.logo_url}
                alt={settings.name || 'Logótipo'}
                className="h-12 sm:h-16 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">{settings.name || 'Loja'}</h1>
          <p className="text-sm sm:text-base text-gray-600">Contacto</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Morada</h3>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {settings.address || 'Morada não configurada'}
                  </a>
                </div>
              </div>

              {settings.phone && typeof settings.phone === 'string' && settings.phone.trim() && (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Telefone</h3>
                    <p className="text-sm text-gray-700">{settings.phone}</p>
                  </div>
                </div>
              )}

              {settings.email && typeof settings.email === 'string' && settings.email.trim() && (
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">E-mail</h3>
                    <p className="text-sm text-gray-700">{settings.email}</p>
                  </div>
                </div>
              )}

              {settings.opening_hours && Object.values(settings.opening_hours).some(h => h && typeof h === 'string' && h.trim()) && (
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Horário</h3>
                    <div className="space-y-1 text-sm">
                      {([
                        ['monday',    'Segunda-feira'],
                        ['tuesday',   'Terça-feira'],
                        ['wednesday', 'Quarta-feira'],
                        ['thursday',  'Quinta-feira'],
                        ['friday',    'Sexta-feira'],
                        ['saturday',  'Sábado'],
                        ['sunday',    'Domingo'],
                      ] as [string, string][]).map(([day, label]) => {
                        const val = settings.opening_hours?.[day as keyof typeof settings.opening_hours];
                        if (!val || typeof val !== 'string' || !val.trim()) return null;
                        return (
                          <div key={day} className="flex justify-between">
                            <span className="text-gray-600">{label}</span>
                            <span className="text-gray-700">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-6">
            <a
              href="/menu"
              className="inline-block bg-gray-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Ver o catálogo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
