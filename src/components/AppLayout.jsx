import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDaysIcon, UserGroupIcon, PlusCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';

export default function AppLayout({ children }) {
  const location = useLocation();

  const navigation = [
    { name: 'Schedule', href: '/', icon: CalendarDaysIcon },
    { name: 'My Team', href: '/manager', icon: UserGroupIcon },
    { name: 'Admin', href: '/admin', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Desktop Top Bar / Mobile Header */}
      <header className="bg-white shadow-sm z-20 sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">SoccerScheduler</h1>
          </div>
          {/* Desktop Nav (Hidden on Mobile) */}
          <div className="hidden md:flex gap-6">
            {navigation.map((item) => (
              <Link 
                key={item.name} 
                to={item.href}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === item.href ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* 3. Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-30">
        <div className="flex justify-around items-center h-16">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link 
                key={item.name} 
                to={item.href} 
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 4. Toast Notifications (Replaces ugly alerts) */}
      <Toaster position="top-center" />
    </div>
  );
}