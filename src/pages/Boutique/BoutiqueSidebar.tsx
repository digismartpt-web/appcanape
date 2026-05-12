import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Package, Settings, Tag, Menu, X, Gift, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

const menuItems = [
  { path: '/boutique/commandes',  label: 'Encomendas',   icon: ShoppingBag },
  { path: '/boutique/catalogue',  label: 'Catálogo',     icon: Package },
  { path: '/boutique/categories', label: 'Categorias',   icon: Tag },
  { path: '/boutique/promotions', label: 'Promoções',    icon: Gift },
  { path: '/boutique/pro',        label: 'Clientes Pro', icon: UserCheck },
  { path: '/boutique/parametres', label: 'Definições',   icon: Settings },
];

export function BoutiqueSidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed top-64 left-4 z-50 bg-[#1a1a1a] text-[#D4AF37] border border-[#D4AF37]/40 p-3 rounded-md shadow-lg hover:bg-[#D4AF37] hover:text-black transition-colors">
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 w-64 bg-primary-800 min-h-screen p-6 z-40 transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <nav className="space-y-2 mt-16">
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-md transition',
                location.pathname === item.path
                  ? 'bg-[#D4AF37] text-black font-semibold'
                  : 'text-gray-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]'
              )}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
