import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function TeamManager() {
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  
  // 1. Fetch Teams
  useEffect(() => {
    const fetchTeams = async () => {
      const snap = await getDocs(collection(db, 'teams'));
      const loadedTeams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort alphabetically
      loadedTeams.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(loadedTeams);
    };
    fetchTeams();
  }, []);

  // 2. Add New Team
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      const ref = await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        contacts: [] 
      });
      const newTeam = { id: ref.id, name: newTeamName, contacts: [] };
      // Add to list and resort
      setTeams([...teams, newTeam].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName('');
    } catch (err) {
      console.error("Error adding team:", err);
      alert("Error creating team");
    }
  };

  // 3. Update Team Contacts (Passed down to child)
  const handleUpdateContacts = async (teamId, contacts) => {
    try {
      await updateDoc(doc(db, 'teams', teamId), { contacts });
      setTeams(teams.map(t => t.id === teamId ? { ...t, contacts } : t));
    } catch (err) {
      alert("Error updating contacts");
    }
  };

  // 4. Rename Team (Passed down to child)
  const handleRenameTeam = async (teamId, newName) => {
    try {
      await updateDoc(doc(db, 'teams', teamId), { name: newName });
      setTeams(teams.map(t => t.id === teamId ? { ...t, name: newName } : t));
    } catch (err) {
      alert("Error renaming team");
    }
  };

  // 5. Delete Team
  const handleDeleteTeam = async (teamId) => {
    if(!window.confirm("Delete this team? This will break any existing schedules for them.")) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      alert("Error deleting team");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Team Management</h2>

      {/* Add Team Form */}
      <form onSubmit={handleAddTeam} className="flex gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <input 
          className="flex-grow border border-slate-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          placeholder="New Team Name (e.g., U10 Boys Red)"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
          <PlusIcon className="w-5 h-5" /> Create Team
        </button>
      </form>

      {/* Teams Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {teams.map(team => (
          <TeamCard 
            key={team.id} 
            team={team} 
            onUpdateContacts={handleUpdateContacts} 
            onRename={handleRenameTeam}
            onDelete={handleDeleteTeam}
          />
        ))}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: Individual Team Card ---
function TeamCard({ team, onUpdateContacts, onRename, onDelete }) {
  // Editing State (Team Name)
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(team.name);

  // New Contact State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('Head Coach');

  const saveNameEdit = () => {
    if (editedName.trim() !== team.name) {
      onRename(team.id, editedName);
    }
    setIsEditing(false);
  };

  const addContact = () => {
    if (!contactName || !contactEmail) return;
    const newContact = { 
      name: contactName, 
      email: contactEmail, 
      role: contactRole 
    };
    const newContacts = [...(team.contacts || []), newContact];
    onUpdateContacts(team.id, newContacts);
    
    // Reset inputs
    setContactName('');
    setContactEmail('');
    setContactRole('Head Coach');
  };

  const removeContact = (emailToRemove) => {
    if(!window.confirm("Remove this contact?")) return;
    const newContacts = team.contacts.filter(c => c.email !== emailToRemove);
    onUpdateContacts(team.id, newContacts);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition">
      
      {/* HEADER: Team Name & Actions */}
      <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-grow mr-2">
            <input 
              className="w-full border p-1 rounded font-bold text-slate-800"
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              autoFocus
            />
            <button onClick={saveNameEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckIcon className="w-5 h-5"/></button>
            <button onClick={() => { setIsEditing(false); setEditedName(team.name); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><XMarkIcon className="w-5 h-5"/></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-800">{team.name}</h3>
            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-indigo-600">
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <button onClick={() => onDelete(team.id)} className="text-slate-300 hover:text-red-600">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {/* CONTACTS LIST */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roster / Staff</p>
        
        {(team.contacts || []).length === 0 && <p className="text-sm text-slate-400 italic">No contacts added.</p>}

        {(team.contacts || []).map((contact, idx) => (
          <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">{contact.name}</span>
                {/* ROLE BADGE */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                  contact.role === 'Head Coach' ? 'bg-indigo-100 text-indigo-700' :
                  contact.role === 'Team Manager' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {contact.role}
                </span>
              </div>
              <span className="text-xs text-slate-500">{contact.email}</span>
            </div>
            
            <button onClick={() => removeContact(contact.email)} className="text-slate-400 hover:text-red-500">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ADD CONTACT INPUTS */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
        <p className="text-xs font-bold text-slate-500 mb-2">Add Person</p>
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input 
              placeholder="Name" 
              className="border p-1.5 text-sm rounded flex-1 w-full"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
            <select 
              className="border p-1.5 text-sm rounded bg-white text-slate-700 w-1/3"
              value={contactRole}
              onChange={e => setContactRole(e.target.value)}
            >
              <option>Head Coach</option>
              <option>Asst Coach</option>
              <option>Team Manager</option>
              <option>Scheduler</option>
              <option>Parent Rep</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input 
              placeholder="Email" 
              className="border p-1.5 text-sm rounded flex-1 w-full"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
            />
            <button 
              onClick={addContact}
              disabled={!contactName || !contactEmail}
              className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold rounded hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}