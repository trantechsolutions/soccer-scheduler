import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, getDoc, doc } from 'firebase/firestore'; 
import { useSchedulerData } from '../hooks/useSchedulerData';
import { addMinutes, format, isWithinInterval, areIntervalsOverlapping, parseISO, setMinutes, setHours } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth'; 
import { CalendarDaysIcon, HomeIcon, TruckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'; 

export default function ManagerMatchCreator() {
  const { matches, permits, blackouts: adminBlackouts } = useSchedulerData();
  const location = useLocation();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // CONTEXT
  const [myTeam, setMyTeam] = useState(null); 
  const [myManagedTeams, setMyManagedTeams] = useState([]); 
  const [opposingTeams, setOpposingTeams] = useState([]);
  
  // LOCATIONS
  const [internalComplexes, setInternalComplexes] = useState([]); // Club Managed (For Home)
  const [externalComplexes, setExternalComplexes] = useState([]); // Saved Away Locations
  const [allFields, setAllFields] = useState([]);

  // FORM STATE
  const [gameType, setGameType] = useState('home'); 
  
  // SELECTIONS (Using Objects to handle Temp/Existing)
  const [opponentSelection, setOpponentSelection] = useState({ type: 'existing', id: '', name: '' });
  const [complexSelection, setComplexSelection] = useState({ type: 'existing', id: '', name: '' });
  
  const [selectedFieldId, setSelectedFieldId] = useState(''); 
  const [externalFieldName, setExternalFieldName] = useState(''); 
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState(''); 
  const [duration, setDuration] = useState(90);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);

  // 1. INIT
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const userIsAdmin = userData.role === 'admin';
        setIsAdmin(userIsAdmin);

        // Fetch Resources
        const [teamsSnap, complexSnap, fieldsSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "complexes")),
          getDocs(collection(db, "fields"))
        ]);

        const allTeams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allTeams.sort((a, b) => a.name.localeCompare(b.name));
        setOpposingTeams(allTeams);

        const allComplexes = complexSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInternalComplexes(allComplexes.filter(c => c.isManaged)); 
        setExternalComplexes(allComplexes.filter(c => !c.isManaged)); 
        setAllFields(fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // DETERMINE MANAGED TEAMS
        let manageList = [];
        if (userIsAdmin) {
          manageList = allTeams;
        } else {
          // Determine IDs
          let allowedIds = [];
          if (userData.managedTeamIds && Array.isArray(userData.managedTeamIds)) {
            allowedIds = userData.managedTeamIds;
          } else if (userData.teamId) {
            allowedIds = [userData.teamId];
          }
          
          // Filter
          manageList = allTeams.filter(t => allowedIds.includes(t.id));
        }
        setMyManagedTeams(manageList);

        // DEFAULT SELECTION
        const preselectedId = location.state?.preselectedTeamId;
        if (preselectedId) {
          const target = manageList.find(t => t.id === preselectedId);
          if (target) setMyTeam(target);
          else if (manageList.length > 0) setMyTeam(manageList[0]);
        } else {
          if (manageList.length > 0) setMyTeam(manageList[0]);
        }
        
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. RESET ON GAME TYPE CHANGE
  useEffect(() => {
    // When switching modes, reset complex selection to avoid invalid states
    setComplexSelection({ type: 'existing', id: '', name: '' });
    setSelectedFieldId('');
    setSelectedSlot(null);
  }, [gameType]);

  // 3. FILTER FIELDS
  const availableFields = allFields.filter(f => f.complexId === complexSelection.id);

  // 4. SLOT CALCULATOR
  useEffect(() => {
    if (gameType === 'away') { setAvailableSlots([]); return; }

    setAvailableSlots([]);
    setSelectedSlot(null);
    // Home games MUST use an existing complex ID for validation
    if (complexSelection.type !== 'existing' || !complexSelection.id || !selectedFieldId || !date || !duration) return;

    const dayStart = parseISO(date);
    const isBlackoutDay = adminBlackouts.some(bo => 
      isWithinInterval(dayStart, { start: bo.start, end: bo.end })
    );
    if (isBlackoutDay) return; 

    const slots = [];
    const step = 15;
    let scanner = setMinutes(setHours(parseISO(date), 7), 0); 
    const endOfDay = setMinutes(setHours(parseISO(date), 21), 0);

    while (scanner < endOfDay) {
      const pStart = scanner;
      const pEnd = addMinutes(scanner, duration);
      const interval = { start: pStart, end: pEnd };

      const hasPermit = permits.some(p => 
        p.fieldId === selectedFieldId &&
        isWithinInterval(pStart, { start: p.start, end: p.end }) &&
        isWithinInterval(pEnd, { start: p.start, end: p.end })
      );
      const hasConflict = matches.some(m => 
        m.fieldId === selectedFieldId &&
        areIntervalsOverlapping(interval, { start: m.start, end: m.end })
      );

      if (hasPermit && !hasConflict) {
        slots.push(format(pStart, 'HH:mm'));
      }
      scanner = addMinutes(scanner, step);
    }
    setAvailableSlots(slots);
  }, [date, selectedFieldId, duration, matches, permits, adminBlackouts, gameType, complexSelection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myTeam) return;

    // VALIDATION
    const hasOpponent = opponentSelection.id || opponentSelection.name;
    const hasComplex = complexSelection.id || complexSelection.name;

    if (gameType === 'home') {
        // Home needs strict Existing Complex + Slot + Field
        if (!selectedSlot || !selectedFieldId || !hasOpponent || complexSelection.type === 'temp') return;
    } else {
        // Away needs Time + Complex + Opponent
        if (!time || !hasComplex || !hasOpponent) return;
    }

    const startTimeStr = gameType === 'home' ? selectedSlot : time;
    const start = new Date(`${date}T${startTimeStr}`);
    const end = addMinutes(start, duration);

    await addDoc(collection(db, "matches"), {
      homeTeamId: gameType === 'home' ? myTeam.id : (opponentSelection.id || 'TEMP'),
      homeTeamName: gameType === 'home' ? myTeam.name : opponentSelection.name,
      awayTeamId: gameType === 'home' ? (opponentSelection.id || 'TEMP') : myTeam.id,
      awayTeamName: gameType === 'home' ? opponentSelection.name : myTeam.name,
      
      // Field Logic
      fieldId: gameType === 'home' ? selectedFieldId : 'EXTERNAL',
      fieldName: gameType === 'home' ? '' : (externalFieldName || 'Field 1'),
      
      // Complex Logic (Supports TEMP now)
      complexId: complexSelection.type === 'temp' ? 'TEMP' : complexSelection.id,
      complexName: complexSelection.name,
      
      isHomeGame: gameType === 'home',
      start,
      end
    });

    alert("Match Scheduled!");
    setSelectedSlot(null);
    setTime('');
    setOpponentSelection({ type: 'existing', id: '', name: '' });
    // Keep complex selection if they are scheduling multiple games at same place
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (myManagedTeams.length === 0) return <div className="p-8 text-center text-red-500">Access Denied</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Schedule Game</h2>
        <div className="bg-slate-100 p-1 rounded-lg flex">
            <button 
                onClick={() => setGameType('home')}
                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${gameType === 'home' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
            >
                <HomeIcon className="w-4 h-4" /> Home
            </button>
            <button 
                onClick={() => setGameType('away')}
                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${gameType === 'away' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
            >
                <TruckIcon className="w-4 h-4" /> Away
            </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className={`p-6 rounded-xl shadow-sm border space-y-6 ${gameType === 'home' ? 'bg-white border-slate-200' : 'bg-orange-50 border-orange-200'}`}>
        
        {/* MATCHUP */}
        <div className="grid md:grid-cols-2 gap-4 items-center">
            
            {/* MY TEAM */}
            <div className={`order-1 ${gameType === 'home' ? 'order-1' : 'order-2'}`}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {gameType === 'home' ? 'Home' : 'Away'} (You)
              </label>
              {myManagedTeams.length > 1 ? (
                <div className="relative">
                  <select 
                    className="w-full border p-2 rounded bg-indigo-50 border-indigo-200 text-indigo-900 font-bold appearance-none"
                    value={myTeam?.id || ''}
                    onChange={e => {
                      const t = myManagedTeams.find(x => x.id === e.target.value);
                      setMyTeam(t);
                    }}
                  >
                    {myManagedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <ChevronUpDownIcon className="w-5 h-5 text-indigo-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              ) : (
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded font-bold text-indigo-900">
                  {myTeam?.name}
                </div>
              )}
            </div>

            {/* VS */}
            <div className="md:hidden text-center font-bold text-slate-400 order-last">VS</div>

            {/* OPPONENT */}
            <div className={`order-1 ${gameType === 'home' ? 'order-2' : 'order-1'}`}>
                <SmartSelector 
                    label={gameType === 'home' ? "Away Team (Opponent)" : "Home Team (Opponent)"}
                    items={opposingTeams.filter(t => t.id !== myTeam?.id)}
                    selection={opponentSelection}
                    setSelection={setOpponentSelection}
                    placeholder="Enter Team Name"
                    allowTemp={true}
                />
            </div>
        </div>

        {/* LOCATION SELECTOR */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            {/* LOGIC: 
               Home Games = MUST pick from internalComplexes (allowTemp=false)
               Away Games = Can pick from externalComplexes OR Type Manual (allowTemp=true)
            */}
            <SmartSelector 
               label={gameType === 'home' ? "Club Complex" : "Away Complex"}
               items={gameType === 'home' ? internalComplexes : externalComplexes}
               selection={complexSelection}
               setSelection={setComplexSelection}
               placeholder="Enter Address / Location Name"
               allowTemp={gameType === 'away'} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
            <input type="date" className="w-full border p-2 rounded" onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* TIME / SLOT SELECTION */}
        {gameType === 'home' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Field</label>
              <select className="w-full border p-2 rounded mb-4" disabled={complexSelection.type === 'temp' || !complexSelection.id} onChange={e => setSelectedFieldId(e.target.value)}>
                <option value="">-- Select Field --</option>
                {availableFields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.surface})</option>)}
              </select>

              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Verified Open Slots</label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {(!date || !selectedFieldId) && <div className="text-xs text-slate-400 col-span-4 italic">Select Date and Field...</div>}
                {date && selectedFieldId && availableSlots.length === 0 && <div className="text-xs text-red-500 col-span-4 bg-red-50 p-2 rounded">No slots available (Check Permits/Blackouts).</div>}
                {availableSlots.map(t => (
                  <button type="button" key={t} onClick={() => setSelectedSlot(t)} className={`p-2 text-xs font-bold rounded ${selectedSlot === t ? 'bg-indigo-600 text-white' : 'bg-slate-50 border'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Field Name (Optional)</label>
                    <input 
                        className="w-full border p-2 rounded" 
                        placeholder="e.g. Field 4B"
                        value={externalFieldName}
                        onChange={e => setExternalFieldName(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kickoff Time</label>
                    <input 
                        type="time" 
                        className="w-full border p-2 rounded" 
                        value={time}
                        onChange={e => setTime(e.target.value)}
                    />
                 </div>
            </div>
        )}

        <button className={`w-full text-white font-bold py-3 rounded shadow-sm ${gameType === 'home' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
          Confirm {gameType === 'home' ? 'Home' : 'Away'} Match
        </button>

      </form>
    </div>
  );
}

// --- REUSABLE SMART SELECTOR (Handles both Teams & Complexes) ---
function SmartSelector({ label, items, selection, setSelection, placeholder, allowTemp }) {
    const isTemp = selection.type === 'temp';
    
    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
          
          {allowTemp && (
            <button 
              type="button"
              onClick={() => setSelection({ type: isTemp ? 'existing' : 'temp', id: '', name: '' })}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              {isTemp ? 'Select Existing' : 'Enter Manual Name'}
            </button>
          )}
        </div>

        {isTemp ? (
          <input 
            placeholder={placeholder}
            className="w-full border-2 border-indigo-100 bg-indigo-50 rounded p-2 text-indigo-900 focus:outline-none"
            value={selection.name}
            onChange={e => setSelection({ ...selection, name: e.target.value })}
          />
        ) : (
          <select 
            className="w-full border border-slate-300 rounded p-2 bg-white"
            value={selection.id}
            onChange={e => {
               const item = items.find(i => i.id === e.target.value);
               setSelection({ ...selection, id: e.target.value, name: item?.name || '' });
            }}
          >
            <option value="">-- Select --</option>
            {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
      </div>
    );
  }