import React, { useState, useEffect } from 'react';
import { validateMatch } from '../utils/schedulerLogic';
import { useSchedulerData } from '../hooks/useSchedulerData';
import { addDoc, collection, getDocs } from 'firebase/firestore'; 
import { db } from '../firebase'; 
import { UserGroupIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { addMinutes, format, isWithinInterval, areIntervalsOverlapping, parseISO, setHours, setMinutes } from 'date-fns';

export default function MatchCreator() {
  const { matches, permits, blackouts } = useSchedulerData();
  
  // Data Lists
  const [teams, setTeams] = useState([]);
  const [complexes, setComplexes] = useState([]);
  const [allFields, setAllFields] = useState([]);
  
  // Form State
  const [homeSelection, setHomeSelection] = useState({ type: 'existing', id: '', name: '' });
  const [awaySelection, setAwaySelection] = useState({ type: 'existing', id: '', name: '' });
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [availabilityWarning, setAvailabilityWarning] = useState(null);
  
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(90);
  const [selectedSlot, setSelectedSlot] = useState(null); // The chosen time string '14:00'
  const [availableSlots, setAvailableSlots] = useState([]); // Calculated valid slots
  const [allAvailability, setAllAvailability] = useState([]);
  
  const [status, setStatus] = useState({ type: 'idle', msgs: [] });

  // 1. Fetch Resources
  useEffect(() => {
    const fetchResources = async () => {
      const [teamsSnap, complexSnap, fieldsSnap] = await Promise.all([
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "complexes")),
        getDocs(collection(db, "fields"))
      ]);
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setComplexes(complexSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAllFields(fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchResources();

    const fetchAvail = async () => {
    const q = query(collection(db, "requests"), where("type", "==", "available"));
    const snap = await getDocs(q);
    setAllAvailability(snap.docs.map(d => ({
          id: d.id, ...d.data(), 
          start: d.data().start.toDate(), end: d.data().end.toDate()
      })));
    }
    fetchAvail();
  }, []);

  // 2. Filter Fields by Complex
  const availableFields = allFields.filter(f => f.complexId === selectedComplexId);

  // 3. THE SLOT CALCULATOR ENGINE
  useEffect(() => {
    // Reset if core inputs change
    setAvailableSlots([]);
    setSelectedSlot(null);

    if (!selectedFieldId || !date || !duration) return;

    const slots = [];
    const step = 15; // check every 15 minutes
    
    // We scan the day from 6:00 AM to 10:00 PM
    let scanner = setMinutes(setHours(parseISO(date), 6), 0);
    const endOfDay = setMinutes(setHours(parseISO(date), 22), 0);

    while (scanner < endOfDay) {
      const potentialStart = scanner;
      const potentialEnd = addMinutes(scanner, duration);
      const interval = { start: potentialStart, end: potentialEnd };

      // CHECK 1: PERMITS (Must be fully inside a permit)
      // We look for ONE permit that covers the WHOLE duration
      const hasPermit = permits.some(p => 
        p.fieldId === selectedFieldId &&
        isWithinInterval(potentialStart, { start: p.start, end: p.end }) &&
        isWithinInterval(potentialEnd, { start: p.start, end: p.end })
      );

      // CHECK 2: CONFLICTS (Must NOT overlap any existing match)
      const hasConflict = matches.some(m => 
        m.fieldId === selectedFieldId &&
        areIntervalsOverlapping(interval, { start: m.start, end: m.end })
      );

      if (hasPermit && !hasConflict) {
        slots.push(format(potentialStart, 'HH:mm'));
      }

      scanner = addMinutes(scanner, step);
    }

    setAvailableSlots(slots);
  }, [date, selectedFieldId, duration, matches, permits]);

  // 3. The Checker Function
  useEffect(() => {
    if (!date || !homeSelection.id || homeSelection.id === 'TEMP') {
      setAvailabilityWarning(null);
      return;
    }

    const selectedDate = parseISO(date);

    // Check Home Team
    const homeAvail = allAvailability.find(req => 
      req.teamId === homeSelection.id &&
      isWithinInterval(selectedDate, { start: req.start, end: req.end })
    );

    if (!homeAvail) {
      setAvailabilityWarning(`Warning: ${homeSelection.name} has NOT listed this date as available.`);
    } else {
      setAvailabilityWarning(null);
    }

  }, [date, homeSelection, allAvailability]);


  // 4. Helper: Final Object Construction
  const getTeamData = (selection) => {
    if (selection.type === 'temp') return { id: 'TEMP', name: selection.name };
    const team = teams.find(t => t.id === selection.id);
    return team ? { id: team.id, name: team.name } : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const home = getTeamData(homeSelection);
    const away = getTeamData(awaySelection);
    
    if (!home || !away || !selectedFieldId || !date || !selectedSlot) {
      setStatus({ type: 'error', msgs: ['Please fill in all fields'] });
      return;
    }

    // Double check logic (in case data changed while filling form)
    const start = new Date(`${date}T${selectedSlot}`);
    const end = addMinutes(start, duration);
    const proposal = {
      homeTeamId: home.id,
      homeTeamName: home.name,
      awayTeamId: away.id,
      awayTeamName: away.name,
      fieldId: selectedFieldId,
      start,
      end
    };

    // Run full validation (includes Blackouts which slots don't check)
    const result = validateMatch(proposal, matches, permits, blackouts);

    if (result.isValid) {
      try {
        await addDoc(collection(db, "matches"), proposal);
        alert("Match Scheduled!");
        // Optional: clear form logic here
        setStatus({ type: 'success', msgs: ['Match created successfully!'] });
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
      setStatus({ type: 'error', msgs: result.errors });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-indigo-600" />
            Schedule Match
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* TEAMS */}
          <div className="grid md:grid-cols-2 gap-6">
            <TeamSelector label="Home Team" teams={teams} selection={homeSelection} setSelection={setHomeSelection} />
            <TeamSelector label="Away Team" teams={teams} selection={awaySelection} setSelection={setAwaySelection} />
          </div>

          <hr className="border-slate-100" />

          {/* LOCATION & DATE */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Complex</label>
              <div className="relative">
                <select 
                  className="w-full border border-slate-300 rounded-lg p-3 appearance-none bg-white"
                  value={selectedComplexId}
                  onChange={e => { setSelectedComplexId(e.target.value); setSelectedFieldId(''); }}
                >
                  <option value="">-- Select Complex --</option>
                  {complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <MapPinIcon className="w-5 h-5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Field</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-3 disabled:bg-slate-50"
                value={selectedFieldId}
                onChange={e => setSelectedFieldId(e.target.value)}
                disabled={!selectedComplexId}
              >
                <option value="">-- Select Field --</option>
                {availableFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-1">
               <label className="block text-sm font-bold text-slate-700 mb-2">Game Date</label>
               <input 
                type="date" 
                className="w-full border border-slate-300 rounded-lg p-3"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* DURATION SLIDER */}
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">
               Match Duration: <span className="text-indigo-600">{duration} mins</span>
             </label>
             <input 
               type="range" min="30" max="180" step="15"
               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
               value={duration}
               onChange={e => setDuration(Number(e.target.value))}
             />
             <div className="flex justify-between text-xs text-slate-400 mt-1">
               <span>30m</span><span>60m</span><span>90m</span><span>120m</span><span>180m</span>
             </div>
          </div>

          {/* TIME SLOTS GRID */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
               <ClockIcon className="w-4 h-4" /> Available Start Times
             </label>
             
             {!date || !selectedFieldId ? (
               <div className="text-sm text-slate-400 italic text-center py-4">Select a Field and Date to see times</div>
             ) : availableSlots.length === 0 ? (
               <div className="text-sm text-red-500 font-medium text-center py-4 bg-red-50 rounded">
                 No open slots available (Field closed or fully booked).
               </div>
             ) : (
               <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                 {availableSlots.map(time => (
                   <button
                     key={time}
                     type="button"
                     onClick={() => setSelectedSlot(time)}
                     className={`px-2 py-2 text-sm font-medium rounded transition-all ${
                       selectedSlot === time 
                         ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                         : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                     }`}
                   >
                     {time}
                   </button>
                 ))}
               </div>
             )}
          </div>
          
          {availabilityWarning && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm font-bold border border-yellow-200 rounded flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              {availabilityWarning}
            </div>
          )}
          
          {/* STATUS & SUBMIT */}
          {status.type === 'error' && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-sm font-medium border border-red-100">
              {status.msgs.join(', ')}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={!selectedSlot}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-lg hover:bg-indigo-700 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedSlot ? `Confirm: ${date} @ ${selectedSlot}` : 'Select a Time Slot'}
          </button>

        </form>
      </div>
    </div>
  );
}

function TeamSelector({ label, teams, selection, setSelection }) {
  const isTemp = selection.type === 'temp';
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <button 
          type="button"
          onClick={() => setSelection({ type: isTemp ? 'existing' : 'temp', id: '', name: '' })}
          className="text-xs text-indigo-600 font-semibold hover:underline"
        >
          {isTemp ? 'Select Existing' : 'Add Temp Team'}
        </button>
      </div>
      {isTemp ? (
        <input 
          placeholder="Enter Temp Team Name"
          className="w-full border-2 border-indigo-100 bg-indigo-50 rounded-lg p-3 text-indigo-900 focus:outline-none focus:border-indigo-500"
          value={selection.name}
          onChange={e => setSelection({ ...selection, name: e.target.value })}
        />
      ) : (
        <select 
          className="w-full border border-slate-300 rounded-lg p-3 bg-white"
          value={selection.id}
          onChange={e => setSelection({ ...selection, id: e.target.value })}
        >
          <option value="">-- Select Team --</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
    </div>
  );
}