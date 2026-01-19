import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { TrashIcon, UserPlusIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  
  // EDIT MODE STATE
  const [editingId, setEditingId] = useState(null); // If not null, we are editing this User ID

  useEffect(() => {
    const fetchData = async () => {
      const [uSnap, tSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'teams'))
      ]);
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)));
    };
    fetchData();
  }, []);

  // --- ACTIONS ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      // --- UPDATE EXISTING USER ---
      try {
        const userRef = doc(db, 'users', editingId);
        const updateData = {
          role,
          managedTeamIds: role === 'manager' ? selectedTeamIds : []
        };

        await updateDoc(userRef, updateData);

        // Update Local State
        setUsers(users.map(u => u.id === editingId ? { ...u, ...updateData } : u));
        
        resetForm();
        alert("User updated successfully.");
      } catch (err) {
        alert("Error updating user: " + err.message);
      }

    } else {
      // --- CREATE NEW USER ---
      if (!email || !password) return;
      try {
        alert("Creating user... (This may log you in as the new user in this demo environment)");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const userData = {
          email,
          role,
          managedTeamIds: role === 'manager' ? selectedTeamIds : [], 
          createdAt: new Date()
        };

        await setDoc(doc(db, 'users', uid), userData);
        setUsers([...users, { id: uid, ...userData }]);
        
        resetForm();
      } catch (err) {
        alert("Error adding user: " + err.message);
      }
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEmail(user.email);
    setRole(user.role);
    
    // Handle array or legacy string ID
    if (user.managedTeamIds && Array.isArray(user.managedTeamIds)) {
        setSelectedTeamIds(user.managedTeamIds);
    } else if (user.teamId) {
        setSelectedTeamIds([user.teamId]);
    } else {
        setSelectedTeamIds([]);
    }
    
    // Clear password (we can't edit it anyway)
    setPassword('');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setEmail('');
    setPassword('');
    setRole('manager');
    setSelectedTeamIds([]);
  };

  const handleTeamToggle = (teamId) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const handleDelete = async (uid) => {
    if(!confirm("Delete this user profile? (Note: Auth account remains in Firebase Auth until manually deleted)")) return;
    await deleteDoc(doc(db, 'users', uid));
    setUsers(users.filter(u => u.id !== uid));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">User Management</h2>

      {/* FORM CARD */}
      <div className={`p-6 rounded-xl shadow-sm border mb-8 transition-colors ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-bold flex items-center gap-2 ${editingId ? 'text-orange-800' : 'text-slate-700'}`}>
            {editingId ? <PencilSquareIcon className="w-5 h-5" /> : <UserPlusIcon className="w-5 h-5" />} 
            {editingId ? 'Edit User Permissions' : 'Add New User'}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-slate-500 flex items-center gap-1 hover:text-slate-800">
              <XMarkIcon className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input 
                className="w-full border p-2 rounded bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={!!editingId} // Cannot edit email (Auth restriction)
                placeholder="user@example.com"
              />
              {editingId && <p className="text-[10px] text-orange-600 mt-1">* Email cannot be changed here.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <input 
                className="w-full border p-2 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={!!editingId} // Cannot edit password (Auth restriction)
                placeholder={editingId ? "********" : "New Password"}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
            <select className="w-full border p-2 rounded bg-white" value={role} onChange={e => setRole(e.target.value)}>
              <option value="manager">Team Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* TEAM SELECTOR */}
          {role === 'manager' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign Teams</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-3 rounded max-h-48 overflow-y-auto bg-slate-50">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => handleTeamToggle(team.id)}
                    />
                    <span className="text-sm text-slate-700">{team.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button className={`px-6 py-2 rounded font-bold text-white shadow-sm transition ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
              {editingId ? 'Update Permissions' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      {/* USER LIST */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 font-bold text-slate-600">Email</th>
              <th className="p-3 font-bold text-slate-600">Role</th>
              <th className="p-3 font-bold text-slate-600">Assigned Teams</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-slate-50 transition ${editingId === u.id ? 'bg-orange-50' : ''}`}>
                <td className="p-3 font-medium text-slate-800">{u.email}</td>
                <td className="p-3 capitalize text-slate-500">{u.role}</td>
                <td className="p-3">
                  {u.role === 'admin' ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">ALL ACCESS</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(u.managedTeamIds) ? (
                         u.managedTeamIds.length > 0 ? (
                           u.managedTeamIds.map(tid => {
                             const t = teams.find(x => x.id === tid);
                             return (
                               <span key={tid} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                 {t ? t.name : 'Unknown'}
                               </span>
                             );
                           })
                         ) : <span className="text-slate-400 italic">None</span>
                      ) : (
                         u.teamId ? (
                           <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                             {teams.find(t => t.id === u.teamId)?.name || 'Legacy ID'}
                           </span>
                         ) : <span className="text-slate-400 italic">None</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => startEdit(u)} 
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition"
                      title="Edit User"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                      title="Delete User"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}