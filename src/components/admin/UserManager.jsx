import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  // Fetch Users AND Teams
  useEffect(() => {
    const fetchData = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const teamsSnap = await getDocs(collection(db, 'teams'));
      
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleTeamChange = async (userId, newTeamId) => {
    await updateDoc(doc(db, 'users', userId), { teamId: newTeamId });
    setUsers(users.map(u => u.id === userId ? { ...u, teamId: newTeamId } : u));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">User Administration</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">Email</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Role</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Assigned Team</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="p-4 text-sm font-medium text-slate-800">
                  {user.email}
                  <div className="text-xs text-slate-400 font-mono mt-1">{user.id}</div>
                </td>
                
                {/* Role Selector */}
                <td className="p-4">
                  <select 
                    className="border border-slate-300 rounded p-1 text-sm bg-white"
                    value={user.role || 'manager'}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="scheduler">Scheduler</option>
                  </select>
                </td>

                {/* Team Selector */}
                <td className="p-4">
                  <select 
                    className="border border-slate-300 rounded p-1 text-sm bg-white w-full max-w-xs"
                    value={user.teamId || ''}
                    onChange={(e) => handleTeamChange(user.id, e.target.value)}
                  >
                    <option value="">-- No Team Assigned --</option>
                    <option value="all">ALL (Admin Access)</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}