import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function FieldAvailability() {
  // State for Dropdowns
  const [complexes, setComplexes] = useState([]);
  const [fields, setFields] = useState([]);
  const [permits, setPermits] = useState([]);

  // Selection State
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');

  // Form State
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  // 1. Fetch Complexes on Load
  useEffect(() => {
    const fetchComplexes = async () => {
      const snap = await getDocs(collection(db, 'complexes'));
      const myComplexes = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.isManaged === true);
      setComplexes(myComplexes);
    };
    fetchComplexes();
  }, []);

  // 2. Fetch Fields when Complex Selected
  useEffect(() => {
    if (!selectedComplexId) {
      setFields([]);
      return;
    }
    const fetchFields = async () => {
      const q = query(collection(db, 'fields'), where('complexId', '==', selectedComplexId));
      const snap = await getDocs(q);
      setFields(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchFields();
  }, [selectedComplexId]);

  // 3. Real-time Listener for Permits on Selected Field
  useEffect(() => {
    if (!selectedFieldId) {
      setPermits([]);
      return;
    }
    const q = query(collection(db, 'permits'), where('fieldId', '==', selectedFieldId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        start: d.data().start.toDate(),
        end: d.data().end.toDate()
      }));
      // Sort by date
      data.sort((a, b) => a.start - b.start);
      setPermits(data);
    });
    return () => unsubscribe();
  }, [selectedFieldId]);

  // --- HANDLERS ---
  const handleAddPermit = async (e) => {
    e.preventDefault();
    if (!selectedFieldId || !date) return;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (end <= start) {
      alert("End time must be after start time");
      return;
    }

    await addDoc(collection(db, 'permits'), {
      fieldId: selectedFieldId,
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end)
    });
  };

  const handleDeletePermit = async (id) => {
    if (confirm("Revoke this permit? Scheduled games might become invalid.")) {
      await deleteDoc(doc(db, 'permits', id));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Field Availability (Permits)</h2>

      {/* STEP 1: SELECT LOCATION */}
      <div className="grid md:grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complex</label>
          <select 
            className="w-full border p-2 rounded"
            value={selectedComplexId}
            onChange={e => { setSelectedComplexId(e.target.value); setSelectedFieldId(''); }}
          >
            <option value="">-- Select Complex --</option>
            {complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Field</label>
          <select 
            className="w-full border p-2 rounded disabled:bg-slate-100"
            value={selectedFieldId}
            onChange={e => setSelectedFieldId(e.target.value)}
            disabled={!selectedComplexId}
          >
            <option value="">-- Select Field --</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {selectedFieldId && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* STEP 2: ADD PERMIT FORM */}
          <div className="md:col-span-1">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
              <h3 className="font-bold text-indigo-900 mb-3">Add Open Slot</h3>
              <form onSubmit={handleAddPermit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-700">Date</label>
                  <input type="date" required className="w-full border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700">Start</label>
                    <input type="time" required className="w-full border p-2 rounded" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700">End</label>
                    <input type="time" required className="w-full border p-2 rounded" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
                <button className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700">
                  Grant Permit
                </button>
              </form>
            </div>
          </div>

          {/* STEP 3: EXISTING PERMITS LIST */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-700">Active Permits for this Field</h3>
            {permits.length === 0 && <p className="text-slate-400 italic">No open slots defined. Field is closed.</p>}
            
            {permits.map(permit => (
              <div key={permit.id} className="flex items-center justify-between bg-white border border-l-4 border-l-green-500 p-3 rounded shadow-sm">
                <div>
                  <div className="font-bold text-slate-800">{format(permit.start, 'EEEE, MMMM do, yyyy')}</div>
                  <div className="text-sm text-slate-500">
                    {format(permit.start, 'h:mm a')} - {format(permit.end, 'h:mm a')}
                  </div>
                </div>
                <button onClick={() => handleDeletePermit(permit.id)} className="text-slate-400 hover:text-red-500">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}