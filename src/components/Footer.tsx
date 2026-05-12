import { Pizza } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';

export function Footer() {
  const { settings } = usePizzariaSettings();

  return (
    <footer className="bg-[#D4AF37] text-black py-8">
      <div className="w-full px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.name}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <Pizza className="h-6 w-6 text-black/70" />
            )}
            <span className="font-bold text-lg text-black">{settings.name}</span>
          </div>
          <div className="flex flex-col md:flex-row md:space-x-8 items-center">
            <Link to="/contact" className="text-black hover:text-black/60 transition mb-2 md:mb-0 font-medium">
              Contacto
            </Link>
            <Link to="/privacy" className="text-black hover:text-black/60 transition mb-2 md:mb-0 font-medium">
              Termos e Condições (CGDV)
            </Link>
          </div>
        </div>
        <div className="text-center mt-8 text-black/70">
          © {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}