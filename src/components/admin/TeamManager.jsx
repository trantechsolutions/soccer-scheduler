import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function TeamManager() {
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Fetch Teams
  useEffect(() => {
    const fetchTeams = async () => {
      const snap = await getDocs(collection(db, 'teams'));
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTeams();
  }, []);

  // Add Team
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) return;
    const ref = await addDoc(collection(db, 'teams'), {
      name: newTeamName,
      contacts: [] // Initialize empty contacts array
    });
    setTeams([...teams, { id: ref.id, name: newTeamName, contacts: [] }]);
    setNewTeamName('');
  };

  // Update Contacts
  const handleUpdateContacts = async (teamId, contacts) => {
    await updateDoc(doc(db, 'teams', teamId), { contacts });
    // Update local state to reflect changes UI
    setTeams(teams.map(t => t.id === teamId ? { ...t, contacts } : t));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Team Management</h2>

      {/* Add Team Bar */}
      <form onSubmit={handleAddTeam} className="flex gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
        <input 
          className="flex-grow border p-2 rounded" 
          placeholder="New Team Name (e.g., U10 Boys Red)"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700">
          <PlusIcon className="w-5 h-5" /> Create Team
        </button>
      </form>

      {/* Teams List */}
      <div className="grid gap-6">
        {teams.map(team => (
          <TeamCard key={team.id} team={team} onUpdate={handleUpdateContacts} />
        ))}
      </div>
    </div>
  );
}

// Sub-component for individual team logic
function TeamCard({ team, onUpdate }) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const addContact = () => {
    if (!contactName || !contactEmail) return;
    const newContacts = [...(team.contacts || []), { name: contactName, email: contactEmail }];
    onUpdate(team.id, newContacts);
    setContactName('');
    setContactEmail('');
  };

  const removeContact = (emailToRemove) => {
    const newContacts = team.contacts.filter(c => c.email !== emailToRemove);
    onUpdate(team.id, newContacts);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-bold text-lg text-slate-800">{team.name}</h3>
        <span className="text-xs text-slate-400 font-mono">{team.id}</span>
      </div>

      {/* Contacts List */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase">Contacts</p>
        {(team.contacts || []).map(contact => (
          <div key={contact.email} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
            <div>
              <span className="font-medium text-slate-900">{contact.name}</span>
              <span className="text-slate-500 ml-2">({contact.email})</span>
            </div>
            <button onClick={() => removeContact(contact.email)} className="text-red-400 hover:text-red-600">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {(team.contacts || []).length === 0 && <p className="text-sm text-slate-400 italic">No contacts added.</p>}
      </div>

      {/* Add Contact Inputs */}
      <div className="flex gap-2 items-center mt-2">
        <input 
          placeholder="Contact Name" 
          className="border p-1 text-sm rounded flex-1"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
        />
        <input 
          placeholder="Email" 
          className="border p-1 text-sm rounded flex-1"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
        />
        <button 
          onClick={addContact}
          className="bg-slate-100 text-slate-600 px-3 py-1 text-sm rounded hover:bg-slate-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}