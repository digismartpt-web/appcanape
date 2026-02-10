import { AlertCircle, CheckCircle, Settings, Database } from 'lucide-react';

interface InitializationBannerProps {
  firebaseAvailable: boolean;
  pizzasInitialized: boolean;
  source: 'firebase' | 'mock';
}

export function InitializationBanner({ 
  firebaseAvailable, 
  pizzasInitialized, 
  source 
}: InitializationBannerProps) {
  if (firebaseAvailable && pizzasInitialized && source === 'firebase') {
    return null; // Tout fonctionne parfaitement, pas besoin de banner
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {!firebaseAvailable ? (
            <Settings className="h-5 w-5 text-blue-400" />
          ) : source === 'mock' ? (
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            {!firebaseAvailable && "Configuration Firebase requise"}
            {firebaseAvailable && !pizzasInitialized && "Initialisation en cours"}
            {firebaseAvailable && source === 'mock' && "Mode démonstration"}
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            {!firebaseAvailable && (
              <div className="space-y-2">
                <p>Firebase n'est pas configuré. L'application fonctionne en mode démonstration.</p>
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Données : Mock (temporaires)</span>
                </div>
                <p className="text-xs">
                  Pour activer Firebase : configurez votre fichier .env avec vos clés Firebase
                </p>
              </div>
            )}
            {firebaseAvailable && source === 'mock' && (
              <div className="space-y-2">
                <p>Firebase est configuré mais utilise des données de démonstration.</p>
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Données : Démonstration</span>
                </div>
              </div>
            )}
            {firebaseAvailable && pizzasInitialized && source === 'firebase' && (
              <div className="space-y-2">
                <p>✅ Firebase configuré et opérationnel</p>
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Données : Firebase (temps réel)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}