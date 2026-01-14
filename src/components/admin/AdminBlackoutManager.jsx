import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { TrashIcon, GlobeAmericasIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AdminBlackoutManager() {
  const [blackouts, setBlackouts] = useState([]);
  
  // Form State (No Team Selection needed anymore)
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('Club Holiday');

  // 1. Listen to Global Blackouts Only
  useEffect(() => {
    // We filter by type 'blackout'. 
    // Since we are enforcing teamId: 'ALL' for these, this query remains simple.
    const q = query(collection(db, 'requests'), where('type', '==', 'blackout'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        start: d.data().start.toDate(),
        end: d.data().end.toDate()
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
    if (!date) return;

    // Create a Full Day Blackout (Timezone safe midnight)
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    await addDoc(collection(db, 'requests'), {
      teamId: 'ALL',          // <--- THE KEY CHANGE: Applies to everyone
      teamName: 'ENTIRE CLUB', // Display name for Managers
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      reason,
      type: 'blackout',       // Distinguished from 'available'
      managerId: 'ADMIN' 
    });
    
    setReason('Club Holiday');
    alert("Club-wide blackout added. Managers will be blocked from posting availability on this date.");
  };

  const handleDelete = async (id) => {
    if(confirm("Remove this club blackout?")) {
      await deleteDoc(doc(db, 'requests', id));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-100 p-3 rounded-full text-red-600">
           <GlobeAmericasIcon className="w-6 h-6" />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Club Blackouts</h2>
           <p className="text-slate-500 text-sm">Dates when NO games can be played (Holidays, Weather, Maintenance).</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* ADD FORM */}
        <div className="md:col-span-1 h-fit bg-red-50 border border-red-100 p-5 rounded-xl shadow-sm">
          <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            Block Entire Club
          </h3>
          <form onSubmit={handleAddBlackout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-red-700 uppercase mb-1">Date</label>
              <input 
                type="date" required 
                className="w-full border border-red-200 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none" 
                value={date} onChange={e => setDate(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-red-700 uppercase mb-1">Reason</label>
              <input 
                className="w-full border border-red-200 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none" 
                value={reason} onChange={e => setReason(e.target.value)} 
                placeholder="e.g. Thanksgiving"
              />
            </div>
            <button className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-sm transition">
              Block Date
            </button>
          </form>
          <p className="text-xs text-red-400 mt-4 leading-tight">
            * This will prevent ALL Managers from posting availability or scheduling home games on this date.
          </p>
        </div>

        {/* LIST */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs">Date</th>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs">Scope</th>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs">Reason</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blackouts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                      No club-wide blackouts set.
                    </td>
                  </tr>
                )}
                {blackouts.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-800">{format(b.start, 'EEEE, MMM do, yyyy')}</td>
                    <td className="p-4">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        {b.teamName}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{b.reason}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-600 p-2 rounded hover:bg-red-50 transition">
                        <TrashIcon className="w-5 h-5" />
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