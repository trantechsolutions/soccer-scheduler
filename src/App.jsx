import React from 'react';
import { Routes, Route, Link, HashRouter } from 'react-router-dom';
import MatchCreator from './components/MatchCreator';
import ManagerDashboard from './components/ManagerDashboard';
import PublicSchedule from './components/PublicSchedule';
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TeamManager from './components/admin/TeamManager';
import UserManager from './components/admin/UserManager';
import ComplexManager from './components/admin/ComplexManager';
import FieldAvailability from './components/admin/FieldAvailability';
import AdminBlackoutManager from './components/admin/AdminBlackoutManager';
import AppLayout from './components/AppLayout';

function Layout({ children }) {
  return (
    <div>
      <nav className="p-4 bg-white border-b flex gap-4 justify-center text-sm font-medium">
        <Link to="/" className="text-blue-600 hover:underline">Schedule</Link>
        <Link to="/manager" className="text-blue-600 hover:underline">Manager Portal</Link>
        <Link to="/admin" className="text-blue-600 hover:underline">Admin</Link>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Area */}
          <Route path="/*" element={
          <AppLayout>
            <Routes>
              <Route path="/" element={<PublicSchedule />} />
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/matches" element={<MatchCreator />} />
              <Route path="/admin/complexes" element={<ComplexManager />} />
              <Route path="/admin/teams" element={<TeamManager />} />
              <Route path="/admin/users" element={<UserManager />} />
              <Route path="/admin/availability" element={<FieldAvailability />} />
              <Route path="/admin/blackouts" element={<AdminBlackoutManager />} />              
            </Routes>
          </AppLayout>
        } />
      </Routes>
      {/* <DevTools /> Keep this for testing if you want */}
    </HashRouter>
  );
}