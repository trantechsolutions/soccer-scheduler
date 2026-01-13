import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function MatchManager() {
  const [matches, setMatches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // Edit Form State
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  
  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const q = query(collection(db, 'matches'), orderBy('start', 'asc'));
    const snap = await getDocs(q);
    setMatches(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      start: d.data().start.toDate(),
      end: d.data().end.toDate()
    })));
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to cancel this match?")) {
      await deleteDoc(doc(db, 'matches', id));
      setMatches(matches.filter(m => m.id !== id));
    }
  };

  const startEdit = (match) => {
    setEditingId(match.id);
    setEditDate(format(match.start, 'yyyy-MM-dd'));
    setEditTime(format(match.start, 'HH:mm'));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditTime('');
  };

  const saveEdit = async (match) => {
    try {
      const newStart = new Date(`${editDate}T${editTime}`);
      // Calculate new end time based on original duration
      const durationMs = match.end - match.start; 
      const newEnd = new Date(newStart.getTime() + durationMs);

      await updateDoc(doc(db, 'matches', match.id), {
        start: Timestamp.fromDate(newStart),
        end: Timestamp.fromDate(newEnd)
      });

      // Update local state
      setMatches(matches.map(m => m.id === match.id ? { ...m, start: newStart, end: newEnd } : m));
      setEditingId(null);
    } catch (err) {
      alert("Error updating match: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Match Management</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Date & Time</th>
              <th className="p-4 font-semibold text-slate-600">Teams</th>
              <th className="p-4 font-semibold text-slate-600">Location</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matches.map(match => (
              <tr key={match.id} className="hover:bg-slate-50 transition">
                
                {/* DATE & TIME (Editable) */}
                <td className="p-4">
                  {editingId === match.id ? (
                    <div className="flex flex-col gap-1">
                      <input 
                        type="date" 
                        className="border rounded p-1 text-xs"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                      />
                      <input 
                        type="time" 
                        className="border rounded p-1 text-xs"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-slate-800">{format(match.start, 'MMM do, yyyy')}</div>
                      <div className="text-slate-500">{format(match.start, 'h:mm a')}</div>
                    </div>
                  )}
                </td>

                {/* TEAMS (Read Only for now) */}
                <td className="p-4">
                  <div className="font-medium text-slate-900">{match.homeTeamName || match.homeTeamId}</div>
                  <div className="text-xs text-slate-400">vs</div>
                  <div className="font-medium text-slate-900">{match.awayTeamName || match.awayTeamId}</div>
                </td>

                {/* LOCATION */}
                <td className="p-4 text-slate-600">
                  {/* You can add a Field Selector here later if needed */}
                  {match.complexName || 'Unknown Complex'} 
                  <div className="text-xs text-slate-400">Field {match.fieldId}</div>
                </td>

                {/* ACTIONS */}
                <td className="p-4 text-right">
                  {editingId === match.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => saveEdit(match)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(match)} className="text-indigo-500 hover:text-indigo-700 p-1">
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(match.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        
        {matches.length === 0 && (
          <div className="p-8 text-center text-slate-400">No matches found.</div>
        )}
      </div>
    </div>
  );
}