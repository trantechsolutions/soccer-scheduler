import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function AdminBlackoutManager() {
  const [blackouts, setBlackouts] = useState([]);
  const [teams, setTeams] = useState([]);
  
  // Form State
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('Admin Override');

  // 1. Fetch Teams (for dropdown)
  useEffect(() => {
    const fetchTeams = async () => {
      const snap = await getDocs(collection(db, 'teams'));
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTeams();
  }, []);

  // 2. Listen to ALL Blackouts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'requests'), (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        start: d.data().start.toDate()
      }));
      // Sort by date
      data.sort((a, b) => a.start - b.start);
      setBlackouts(data);
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleAddBlackout = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || !date) return;

    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);

    // Look up team name for display
    const team = teams.find(t => t.id === selectedTeamId);

    await addDoc(collection(db, 'requests'), {
      teamId: selectedTeamId,
      teamName: team?.name || 'Unknown Team',
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      reason,
      type: 'blackout',
      managerId: 'ADMIN' 
    });
    
    setReason('Admin Override');
    alert("Blackout Added");
  };

  const handleDelete = async (id) => {
    if(confirm("Delete this blackout date?")) {
      await deleteDoc(doc(db, 'requests', id));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Master Blackout Schedule</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ADD FORM */}
        <div className="md:col-span-1 h-fit bg-red-50 border border-red-100 p-4 rounded-lg">
          <h3 className="font-bold text-red-900 mb-4">Add Team Constraint</h3>
          <form onSubmit={handleAddBlackout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-red-700">Target Team</label>
              <select 
                className="w-full border p-2 rounded"
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
              >
                <option value="">-- Select Team --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-red-700">Date</label>
              <input type="date" required className="w-full border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-red-700">Reason</label>
              <input className="w-full border p-2 rounded" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <button className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
              Block Date
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-slate-500 font-bold">Date</th>
                  <th className="p-3 text-slate-500 font-bold">Team</th>
                  <th className="p-3 text-slate-500 font-bold">Reason</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {blackouts.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">{format(b.start, 'MMM do')}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4 text-slate-400" />
                        {b.teamName || 'Team ' + b.teamId}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{b.reason}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-600">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}