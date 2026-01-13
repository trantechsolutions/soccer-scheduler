import React from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon, NoSymbolIcon, ClockIcon, MapPinIcon, ShieldCheckIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const tools = [
    { name: 'Schedule Matches', path: '/admin/matches', icon: CalendarDaysIcon, color: 'bg-blue-500' },
    { name: 'Team Blackouts', path: '/admin/blackouts', icon: NoSymbolIcon, color: 'bg-red-500' },
    { name: 'Manage Complexes', path: '/admin/complexes', icon: MapPinIcon, color: 'bg-orange-500' },    
    { name: 'Field Availability', path: '/admin/availability', icon: ClockIcon, color: 'bg-teal-500' },
    { name: 'Manage Teams', path: '/admin/teams', icon: UsersIcon, color: 'bg-green-500' },
    { name: 'Manage Users', path: '/admin/users', icon: ShieldCheckIcon, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-slate-800">Admin Control Center</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link key={tool.name} to={tool.path} className="block group">
            <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-4 transition group-hover:shadow-md group-hover:border-indigo-200">
              <div className={`${tool.color} p-3 rounded-lg text-white`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-700 group-hover:text-indigo-600">{tool.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}