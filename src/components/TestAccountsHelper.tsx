import React, { useState } from 'react';
import { Users, Key, CheckCircle, XCircle, Copy } from 'lucide-react';
import { TEST_ACCOUNTS, createTestAccountsInFirebase } from '../data/testAccounts';

export function TestAccountsHelper() {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleCreateAccounts = async () => {
    setIsCreating(true);
    try {
      const creationResults = await createTestAccountsInFirebase();
      setResults(creationResults);
    } catch (error: any) {
      console.error('Erro ao criar contas:', error);
      alert('Erro: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">Contas de Teste</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 transition"
          >
            Instruções manuais
          </button>
          <button
            onClick={handleCreateAccounts}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isCreating ? 'A criar...' : 'Criar automaticamente'}
          </button>
        </div>
      </div>

      {/* Comptes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(TEST_ACCOUNTS).map(([role, account]) => (
          <div key={role} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 capitalize">{role}</h3>
              <Key className="h-4 w-4 text-gray-500" />
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Email:</span>
                <div className="flex items-center space-x-1">
                  <code className="bg-white px-2 py-1 rounded text-xs">{account.email}</code>
                  <button
                    onClick={() => copyToClipboard(account.email)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Palavra-passe:</span>
                <div className="flex items-center space-x-1">
                  <code className="bg-white px-2 py-1 rounded text-xs">{account.password}</code>
                  <button
                    onClick={() => copyToClipboard(account.password)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                <div>{account.full_name}</div>
                <div>{account.phone}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Résultats de création */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Resultados da criação:</h3>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 p-3 rounded-lg ${
                  result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="capitalize font-medium">{result.role}</span>
                <span>({result.email})</span>
                {result.success ? (
                  <span className="text-sm">✅ Criado com sucesso</span>
                ) : (
                  <span className="text-sm">❌ {result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions manuelles */}
      {showInstructions && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Instruções manuais:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Vá para <a href="https://console.firebase.google.com" target="_blank" className="text-blue-600 hover:underline">Firebase Console</a></li>
              <li>Selecione o seu projeto</li>
              <li>Vá para Authentication → Users</li>
              <li>Clique "Add user" para cada conta acima</li>
              <li>Vá para Firestore Database → Coleção "users"</li>
              <li>Crie um documento para cada utilizador com o seu UID como ID</li>
              <li>Adicione os campos: email, role, full_name, phone, address, created_at, updated_at</li>
            </ol>
          </div>
        </div>
      )}

      {/* Aide rapide */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">🚀 Teste rápido:</h4>
        <p className="text-sm text-blue-800">
          Depois das contas criadas, pode testar cada papel:
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li><strong>Admin:</strong> Acesso ao painel financeiro e gestão completa</li>
          <li><strong>Pizzeria:</strong> Gestão de pedidos e do menu</li>
          <li><strong>Client:</strong> Fazer pedidos de pizzas e acompanhar pedidos</li>
        </ul>
      </div>
    </div>
  );
}