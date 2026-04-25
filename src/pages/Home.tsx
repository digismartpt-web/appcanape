import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';
import { ReservationForm } from '../components/reservation/ReservationForm';
import { MapDisplay } from '../components/location/MapDisplay';
import clsx from 'clsx';
import { useReservations } from '../hooks/useReservations';

export function Home() {
  const { settings, loading } = usePizzariaSettings();
  const { submitReservation, isLoading } = useReservations();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Sécurité supplémentaire
  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimalista */}
      <div className="bg-white border-b border-gray-200 py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          {settings.logo_url && (
            <div className="flex justify-center mb-3 sm:mb-4">
              <img
                src={settings.logo_url}
                alt={settings.name || 'Logo'}
                className="h-12 sm:h-16 w-auto object-contain"
                onError={(e) => {
                  console.error('Erreur lors du chargement du logo');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">Réserver chez App Canapé</h1>
          <ReservationForm />
          <MapDisplay center={{ lat: 38.7223, lng: -9.1393 }} />
          <p className="text-sm sm:text-base text-gray-600">Contactez-nous</p>
        </div>
      </div>

      {/* Informations de contact */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="space-y-6">
              {/* Adresse */}
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Adresse</h3>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {settings.address || 'Adresse non configurée'}
                  </a>
                </div>
              </div>

              {/* Téléphone */}
              {settings.phone && typeof settings.phone === 'string' && settings.phone.trim() && (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Téléphone</h3>
                    <p className="text-sm text-gray-700">{settings.phone}</p>
                  </div>
                </div>
              )}

              {/* Email */}
              {settings.email && typeof settings.email === 'string' && settings.email.trim() && (
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Email</h3>
                    <p className="text-sm text-gray-700">{settings.email}</p>
                  </div>
                </div>
              )}

              {/* Horaires */}
              {settings.opening_hours && Object.values(settings.opening_hours).some(hours => hours && typeof hours === 'string' && hours.trim()) && (
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Horaires</h3>
                    <div className="space-y-1 text-sm">
                      {settings.opening_hours.monday && typeof settings.opening_hours.monday === 'string' && settings.opening_hours.monday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lundi</span>
                          <span className="text-gray-700">{settings.opening_hours.monday}</span>
                        </div>
                      )}
                      {settings.opening_hours.tuesday && typeof settings.opening_hours.tuesday === 'string' && settings.opening_hours.tuesday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mardi</span>
                          <span className="text-gray-700">{settings.opening_hours.tuesday}</span>
                        </div>
                      )}
                      {settings.opening_hours.wednesday && typeof settings.opening_hours.wednesday === 'string' && settings.opening_hours.wednesday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mercredi</span>
                          <span className="text-gray-700">{settings.opening_hours.wednesday}</span>
                        </div>
                      )}
                      {settings.opening_hours.thursday && typeof settings.opening_hours.thursday === 'string' && settings.opening_hours.thursday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Jeudi</span>
                          <span className="text-gray-700">{settings.opening_hours.thursday}</span>
                        </div>
                      )}
                      {settings.opening_hours.friday && typeof settings.opening_hours.friday === 'string' && settings.opening_hours.friday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vendredi</span>
                          <span className="text-gray-700">{settings.opening_hours.friday}</span>
                        </div>
                      )}
                      {settings.opening_hours.saturday && typeof settings.opening_hours.saturday === 'string' && settings.opening_hours.saturday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Samedi</span>
                          <span className="text-gray-700">{settings.opening_hours.saturday}</span>
                        </div>
                      )}
                      {settings.opening_hours.sunday && typeof settings.opening_hours.sunday === 'string' && settings.opening_hours.sunday.trim() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dimanche</span>
                          <span className="text-gray-700">{settings.opening_hours.sunday}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <ReservationForm />
          <MapDisplay center={{ lat: 38.7223, lng: -9.1393 }} />
        </div>
      </div>
    </div>
  );
};
