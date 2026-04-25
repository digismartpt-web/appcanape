import React, { useState } from 'react';
import { useReservations } from '../hooks/useReservations';
import clsx from 'clsx';

export const AdminDashboard: React.FC = () => {
  const { reservations, isLoading, error, updateReservation } = useReservations();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredReservations = reservations.filter((reservation) => {
    const searchTermMatch = reservation.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || reservation.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || reservation.status === statusFilter;
    const dateMatch = !dateFilter || reservation.date === dateFilter;
    return searchTermMatch && statusMatch && dateMatch;
  });

  const handleStatusChange = async (id: string, status: string) => {
    await updateReservation(id, { status });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">Tableau de bord Admin</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Rechercher
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invités
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reservation.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.clientEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reservation.date + 'T' + reservation.time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reservation.guests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={clsx(
                          'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                          reservation.status === 'pending' ? 'bg-amber-100 text-amber-800' : '',
                          reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' : '',
                          reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' : '',
                        )}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select
                        value={reservation.status}
                        onChange={(e) => handleStatusChange(reservation.id, e.target.value)}
                        className="mt-1 p-2 border rounded-md focus:ring focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
