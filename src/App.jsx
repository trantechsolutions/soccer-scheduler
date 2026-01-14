import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth'; // <--- Import this

// Public Pages
import PublicSchedule from './components/PublicSchedule';
import PublicTeamAvailability from './components/PublicTeamAvailability';

// Protected Pages
import AdminDashboard from './components/admin/AdminDashboard';
import MatchCreator from './components/MatchCreator';
import TeamManager from './components/admin/TeamManager';
import UserManager from './components/admin/UserManager';
import ComplexManager from './components/admin/ComplexManager';
import FieldAvailability from './components/admin/FieldAvailability';
import AdminBlackoutManager from './components/admin/AdminBlackoutManager';
import ManagerDashboard from './components/ManagerDashboard';
import MatchManager from './components/admin/MatchManager';
import ManagerMatchCreator from './components/ManagerMatchCreator';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 1. Login Page (Public) */}
        <Route path="/login" element={<Login />} />

        {/* 2. The Main App Wrapper */}
        <Route path="/" element={<AppLayout />}>
          
          {/* Public Route (Anyone can see the schedule) */}
          <Route index element={<PublicSchedule />} />
          <Route path="team/:teamId/availability" element={<PublicTeamAvailability />} />

          {/* Protected Manager Routes */}
          <Route path="manager" element={
            <RequireAuth>
              <ManagerDashboard />
            </RequireAuth>
          } />
          <Route path="manager/schedule" element={<RequireAuth><ManagerMatchCreator /></RequireAuth>} />

          {/* Protected Admin Routes */}
          <Route path="admin" element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          } />
          
          {/* Admin Sub-routes */}
          <Route path="admin/matches" element={<RequireAuth><MatchCreator /></RequireAuth>} />
          <Route path="admin/teams" element={<RequireAuth><TeamManager /></RequireAuth>} />
          <Route path="admin/users" element={<RequireAuth><UserManager /></RequireAuth>} />
          <Route path="admin/complexes" element={<RequireAuth><ComplexManager /></RequireAuth>} />
          <Route path="admin/availability" element={<RequireAuth><FieldAvailability /></RequireAuth>} />
          <Route path="admin/blackouts" element={<RequireAuth><AdminBlackoutManager /></RequireAuth>} />
          <Route path="admin/manage-matches" element={<RequireAuth><MatchManager /></RequireAuth>} />
        
        </Route>
      </Routes>
    </HashRouter>
  );
}