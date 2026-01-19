import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // <--- Added missing import
import { auth, db } from '../firebase';
import { 
  collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDoc, getDocs, Timestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format, areIntervalsOverlapping } from 'date-fns';
import { 
  UserGroupIcon, 
  ChevronUpDownIcon, 
  ShareIcon, 
  TrashIcon, 
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function ManagerDashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Data State
  const [teamsList, setTeamsList] = useState([]); 
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [availability, setAvailability] = useState([]);
  const [adminBlackouts, setAdminBlackouts] = useState([]);
  
  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('Open for games');

  // Ref for scrolling
  const formTopRef = useRef(null);

  // 1. AUTH & TEAMS SETUP
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      setUser(currentUser);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;
        setIsAdmin(userRole === 'admin');

        let availableTeams = [];
        
        // 1. Fetch ALL teams first (needed to map IDs to Names)
        const allTeamsSnap = await getDocs(collection(db, 'teams'));
        const allTeamsData = allTeamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (userRole === 'admin') {
          // Admin gets everything
          availableTeams = allTeamsData;
        } else {
          // Manager: Determine allowed IDs
          let allowedIds = [];
          
          // Support NEW Array format
          if (userData.managedTeamIds && Array.isArray(userData.managedTeamIds)) {
            allowedIds = userData.managedTeamIds;
          } 
          // Support OLD String format (Backward Compatibility)
          else if (userData.teamId) {
            allowedIds = [userData.teamId];
          }

          // Filter the master list
          availableTeams = allTeamsData.filter(t => allowedIds.includes(t.id));
        }

        availableTeams.sort((a, b) => a.name.localeCompare(b.name));
        setTeamsList(availableTeams);
        
        // Auto-select first team
        if (availableTeams.length > 0) setSelectedTeamId(availableTeams[0].id);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. LISTEN TO AVAILABILITY (Type: 'available')
  useEffect(() => {
    if (!selectedTeamId) {
      setAvailability([]);
      return;
    }
    const q = query(
      collection(db, "requests"), 
      where("teamId", "==", selectedTeamId),
      where("type", "==", "available") 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));
      data.sort((a, b) => a.start - b.start);
      setAvailability(data);
    });

    return () => unsubscribe();
  }, [selectedTeamId]);

  // 3. LISTEN TO ADMIN BLACKOUTS (Global Constraints)
  useEffect(() => {
    const q = query(collection(db, "requests"), where("type", "==", "blackout"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));
      setAdminBlackouts(data);
    });
    return () => unsub();
  }, []);

  // 4. HANDLERS
  const handleAddAvailability = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || !startDate || !endDate) return;
    if (endDate < startDate) { alert("End date cannot be before Start date"); return; }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    // CHECK FOR BLACKOUT CONFLICT
    const hasConflict = adminBlackouts.some(bo => 
      areIntervalsOverlapping(
        { start, end },
        { start: bo.start, end: bo.end }
      )
    );

    if (hasConflict) {
      alert("BLOCKED: The club has a mandatory blackout during these dates. You cannot post availability.");
      return;
    }

    const currentTeam = teamsList.find(t => t.id === selectedTeamId);

    await addDoc(collection(db, "requests"), {
      teamId: selectedTeamId,
      teamName: currentTeam?.name || 'Unknown',
      managerId: user.uid,
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      note,
      type: 'available',
      createdAt: new Date()
    });
    
    setStartDate(''); 
    setEndDate('');
    // Note remains the same for easier bulk entry
  };

  const handleDelete = async (id) => {
    if (confirm("Remove this availability slot?")) await deleteDoc(doc(db, "requests", id));
  };

  const handleDuplicate = (slot) => {
    setStartDate(format(slot.start, 'yyyy-MM-dd'));
    setEndDate(format(slot.end, 'yyyy-MM-dd'));
    setNote(slot.note);
    formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('startDateInput')?.focus();
  };

  const copyShareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}#/team/${selectedTeamId}/availability`;
    navigator.clipboard.writeText(link);
    alert("Link copied! Send this to opposing managers:\n\n" + link);
  };

  if (!user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* HEADER & TEAM SWITCHER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Dashboard</h1>
          <p className="text-slate-500 text-sm">Manage availability and schedule games.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Schedule Game Button */}
          <Link 
            to="/manager/schedule" 
            state={{ preselectedTeamId: selectedTeamId }}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg font-bold text-sm hover:bg-slate-900 transition shadow-sm"
          >
            <CalendarDaysIcon className="w-5 h-5" />
            Schedule Game
          </Link>

          {/* Team Switcher */}
          <div className="relative min-w-[200px]">
            <select
              className="w-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold rounded-lg py-3 pl-4 pr-10 focus:outline-none appearance-none"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronUpDownIcon className="w-5 h-5 text-indigo-500 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ADMIN BLACKOUT WARNING */}
      {adminBlackouts.length > 0 && (
         <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg shadow-sm">
           <h3 className="flex items-center gap-2 font-bold text-red-800 uppercase text-sm tracking-wide mb-2">
             <ExclamationCircleIcon className="w-5 h-5" />
             Club Blackout Dates (No Games)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
             {adminBlackouts.map(bo => (
               <div key={bo.id} className="text-sm text-red-700 font-medium ml-7">
                 • {format(bo.start, 'MMM do')} - {format(bo.end, 'MMM do')}: {bo.reason}
               </div>
             ))}
           </div>
         </div>
      )}

      {selectedTeamId && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* LEFT: ADD FORM */}
          <div className="md:col-span-1 space-y-4">
            {/* Share Card */}
            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md">
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <ShareIcon className="w-5 h-5" /> Share Availability
              </h3>
              <p className="text-xs text-blue-100 mb-3 leading-relaxed">
                Send a live link to other clubs so they can see when you are free.
              </p>
              <button 
                onClick={copyShareLink}
                className="w-full bg-white text-blue-700 font-bold py-2 rounded text-sm hover:bg-blue-50 transition"
              >
                Copy Public Link
              </button>
            </div>

            {/* Availability Form */}
            <div ref={formTopRef} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-green-600" />
                Add Open Dates
              </h3>
              <form onSubmit={handleAddAvailability} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                  <input 
                    id="startDateInput"
                    type="date" required 
                    className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                    value={startDate} onChange={e => setStartDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                  <input 
                    type="date" required 
                    className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                    value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note</label>
                  <input 
                    className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                    placeholder="e.g. Prefer mornings" 
                    value={note} onChange={e => setNote(e.target.value)} 
                  />
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition">
                  Post Availability
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: AVAILABILITY LIST */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-slate-700 mb-3">Posted Openings</h3>
            
            {availability.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400">No availability posted yet.</p>
              </div>
            )}

            <div className="grid gap-3">
              {availability.map(slot => {
                 const startStr = format(slot.start, 'MMM do');
                 const endStr = format(slot.end, 'MMM do');
                 const isRange = startStr !== endStr;
                 return (
                  <div key={slot.id} className="bg-white border-l-4 border-l-green-500 p-4 rounded-lg shadow-sm flex justify-between items-center group">
                    <div>
                      <div className="font-bold text-slate-800 text-lg">
                        {startStr} {isRange && <span className="text-slate-400 mx-1">➜</span>} {isRange && endStr}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">{slot.note}</div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* DUPLICATE BUTTON */}
                      <button 
                        onClick={() => handleDuplicate(slot)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded transition"
                        title="Duplicate & Edit"
                      >
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button 
                        onClick={() => handleDelete(slot.id)} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}