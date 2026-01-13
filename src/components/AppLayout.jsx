import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, UserGroupIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';
import { auth } from '../firebase'; // Import auth
import { signOut, onAuthStateChanged } from 'firebase/auth'; // Import signOut
import { Outlet } from 'react-router-dom';


export default function AppLayout({ children }) { 
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check login status to show/hide Logout button
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navigation = [
    { name: 'Schedule', href: '/', icon: CalendarDaysIcon },
    { name: 'My Team', href: '/manager', icon: UserGroupIcon },
    { name: 'Admin', href: '/admin', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-20 sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">SoccerScheduler</h1>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-6 items-center">
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
            
            {/* LOGOUT BUTTON (Desktop) */}
            {user && (
              <button 
                onClick={handleLogout}
                className="ml-4 flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-full transition"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            )}
            
            {!user && (
               <Link to="/login" className="ml-4 text-sm font-bold text-indigo-600">Login</Link>
            )}
          </div>
          
          {/* Mobile Logout Icon (Top Right) */}
          <div className="md:hidden">
             {user ? (
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500">
                  <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
             ) : (
                <Link to="/login" className="text-sm font-bold text-indigo-600">Login</Link>
             )}
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Use Outlet to render the child route */}
        <Outlet /> 
      </main>

      {/* Mobile Bottom Nav */}
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

      <Toaster position="top-center" />
    </div>
  );
}