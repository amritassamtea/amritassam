import React, { useState } from 'react';
import { useStore } from '../services/store';
import { ShoppingCart, Menu, X, Phone, User as UserIcon, LogOut, Package, Coffee } from 'lucide-react';

export const Header = ({ onNavigate, onOpenCart }: { onNavigate: (page: string) => void, onOpenCart: () => void }) => {
  const { user, cart, logout, brandAssets } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleNav = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-tea-green shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo Area */}
        <div className="flex items-center cursor-pointer group" onClick={() => handleNav('HOME')}>
          {brandAssets.logo ? (
            <img 
              src={brandAssets.logo} 
              alt="Logo" 
              className="h-10 w-auto mr-3 rounded-md object-contain bg-white/10 p-1"
            />
          ) : (
            <div className="bg-white p-2 rounded-full mr-3 shadow-sm group-hover:scale-110 transition-transform">
              <Coffee className="text-tea-dark h-6 w-6 md:h-8 md:w-8" />
            </div>
          )}
          <div className="flex flex-col justify-center h-full">
             <h1 className="text-white font-bold text-lg md:text-2xl leading-none tracking-tight">AMRIT ASSAM</h1>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 text-white text-sm font-medium">
          <button onClick={() => handleNav('HOME')} className="hover:text-tea-gold transition">Home</button>
          <button onClick={() => handleNav('SHOP')} className="hover:text-tea-gold transition">Shop Now</button>
          <button onClick={() => handleNav('DISTRIBUTOR_INFO')} className="hover:text-tea-gold transition">Distributors</button>
          
          {user ? (
            <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-green-700">
              <span className="text-tea-goldlight flex items-center gap-1">
                <UserIcon size={16} />
                {user.role === 'ADMIN' ? 'Admin' : user.role === 'DISTRIBUTOR' ? 'Distributor' : 'User'}
              </span>
              <button 
                onClick={() => handleNav('DASHBOARD')}
                className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 transition"
              >
                Dashboard
              </button>
              <button onClick={logout} className="text-red-300 hover:text-red-100">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleNav('LOGIN')}
              className="bg-tea-gold text-tea-dark px-4 py-1.5 rounded font-bold hover:bg-yellow-400 transition"
            >
              Login
            </button>
          )}

          <button onClick={onOpenCart} className="relative p-2 hover:bg-white/10 rounded-full transition">
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-tea-red text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-tea-dark text-white p-4 space-y-4">
          <button onClick={() => handleNav('HOME')} className="block w-full text-left py-2 border-b border-white/10">Home</button>
          <button onClick={() => handleNav('SHOP')} className="block w-full text-left py-2 border-b border-white/10">Shop Tea</button>
          <button onClick={() => handleNav('DISTRIBUTOR_INFO')} className="block w-full text-left py-2 border-b border-white/10">Become Distributor</button>
          
          {user ? (
            <>
              <div className="py-2 text-tea-goldlight">Logged in as {user.name} ({user.role})</div>
              <button onClick={() => handleNav('DASHBOARD')} className="block w-full text-left py-2 font-bold text-tea-gold">Go to Dashboard</button>
              <button onClick={() => { logout(); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-red-400">Logout</button>
            </>
          ) : (
            <button onClick={() => handleNav('LOGIN')} className="block w-full bg-tea-gold text-tea-dark font-bold py-2 rounded text-center mt-4">Login / Register</button>
          )}
          
          <button onClick={() => { onOpenCart(); setIsMenuOpen(false); }} className="flex items-center space-x-2 py-2 w-full text-left border-t border-white/10 mt-2 pt-4">
            <ShoppingCart size={20} />
            <span>View Cart ({cartCount})</span>
          </button>
        </div>
      )}
    </header>
  );
};

export const Footer = ({ onNavigate }: { onNavigate: (page: string) => void }) => (
  <footer className="bg-tea-dark text-white pt-10 pb-6">
    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Coffee className="text-tea-gold" size={24} />
          <span className="text-xl font-bold text-tea-gold">Amrit Assam</span>
        </div>
        <p className="text-gray-400 text-sm">
          "Assam Ki Asli Amrit Chai" - Bringing the finest CTC tea gardens directly to your cup. Strong, aromatic, and authentic.
        </p>
      </div>
      
      <div>
        <h3 className="text-tea-gold font-bold mb-4">Contact Us</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>Email: support@amritassam.com</li>
        </ul>
      </div>

      <div>
        <h3 className="text-tea-gold font-bold mb-4">Quick Links</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li><button onClick={() => onNavigate('SHOP')} className="hover:text-white">Shop Online</button></li>
          <li><button onClick={() => onNavigate('DISTRIBUTOR_INFO')} className="hover:text-white">Distributor Enquiry</button></li>
          <li><button onClick={() => onNavigate('PRIVACY')} className="hover:text-white">Privacy Policy</button></li>
          <li><button onClick={() => onNavigate('TERMS')} className="hover:text-white">Terms & Conditions</button></li>
        </ul>
      </div>
    </div>
    <div className="text-center text-xs text-gray-600 mt-10 border-t border-white/10 pt-4">
      © {new Date().getFullYear()} Amrit Assam Gold Tea. All rights reserved.
    </div>
  </footer>
);

export const WhatsAppFloat = () => {
  const message = encodeURIComponent("Namaste, mujhe Amrit Assam Gold Tea order karna hai.");
  return (
    <a 
      href={`https://wa.me/919324270409?text=${message}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg z-40 flex items-center gap-2 hover:scale-105 transition-transform animate-bounce"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      <span className="font-bold hidden md:inline">Order on WhatsApp</span>
    </a>
  );
};