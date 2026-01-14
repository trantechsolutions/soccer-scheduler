import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { UserGroupIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

export default function ManagerDashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Team Selection State
  const [teamsList, setTeamsList] = useState([]); // List of teams I can manage
  const [selectedTeamId, setSelectedTeamId] = useState(''); // The currently active team
  
  // Data State
  const [blackouts, setBlackouts] = useState([]);
  
  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('Tournament');

  // 1. AUTH & PERMISSIONS SETUP
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      setUser(currentUser);

      // Get User Profile to check Role & Assignments
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userRole = userData.role;
        setIsAdmin(userRole === 'admin');

        let availableTeams = [];

        if (userRole === 'admin') {
          // ADMIN: Fetch ALL teams
          const allTeamsSnap = await getDocs(collection(db, 'teams'));
          availableTeams = allTeamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          // MANAGER: Fetch ONLY their assigned team
          // Assuming user.teamId is stored as a string. If you support multiple teamIds for managers later, adjust here.
          if (userData.teamId) {
             // We need the team name, so we fetch the team doc
             const teamDoc = await getDoc(doc(db, 'teams', userData.teamId));
             if (teamDoc.exists()) {
               availableTeams = [{ id: teamDoc.id, ...teamDoc.data() }];
             }
          }
        }

        // Sort teams alphabetically
        availableTeams.sort((a, b) => a.name.localeCompare(b.name));
        
        setTeamsList(availableTeams);
        // Default to first team if available
        if (availableTeams.length > 0) {
          setSelectedTeamId(availableTeams[0].id);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. LISTEN TO BLACKOUTS FOR SELECTED TEAM
  useEffect(() => {
    if (!selectedTeamId) {
      setBlackouts([]);
      return;
    }

    const q = query(collection(db, "requests"), where("teamId", "==", selectedTeamId));
    
    const unsubBlackouts = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));
      
      data.sort((a, b) => a.start - b.start);
      setBlackouts(data);
    });

    return () => unsubBlackouts();
  }, [selectedTeamId]);

  // 3. SUBMIT HANDLER
  const handleAddBlackout = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || !startDate || !endDate) return;
    
    // Validate Dates
    if (endDate < startDate) {
      alert("End date cannot be before Start date");
      return;
    }

    // Timezone Safe Construction
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    try {
      // Find Team Name for denormalization
      const currentTeam = teamsList.find(t => t.id === selectedTeamId);

      await addDoc(collection(db, "requests"), {
        teamId: selectedTeamId,
        teamName: currentTeam?.name || 'Unknown',
        managerId: user.uid,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        reason,
        type: 'blackout',
        createdAt: new Date()
      });
      
      setStartDate('');
      setEndDate('');
      alert("Blackout added.");
    } catch (err) {
      console.error(err);
      alert("Error saving.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this blackout?")) {
      await deleteDoc(doc(db, "requests", id));
    }
  };

  // RENDER HELPERS
  const currentTeamName = teamsList.find(t => t.id === selectedTeamId)?.name || 'Select Team';

  if (!user) return <div className="p-10 text-center animate-pulse">Loading Dashboard...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* 1. TEAM SWITCHER (The new feature) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Availability</h1>
          <p className="text-slate-500 text-sm">
            {isAdmin ? "Admin Mode: Manage any team's schedule" : "Manage your team's blackout dates"}
          </p>
        </div>

        {/* The Dropdown */}
        <div className="relative min-w-[250px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
             Managing Team
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-indigo-50 border border-indigo-200 text-indigo-900 text-base font-semibold rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={teamsList.length === 0}
            >
              {teamsList.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <ChevronUpDownIcon className="w-5 h-5 text-indigo-500 absolute right-3 top-3.5 pointer-events-none" />
          </div>
          {teamsList.length === 0 && (
             <p className="text-xs text-red-500 mt-1">No teams found assigned to you.</p>
          )}
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (Only show if a team is selected) */}
      {selectedTeamId && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* LEFT: ADD FORM */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-24">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                Block Dates
              </h3>
              
              <form onSubmit={handleAddBlackout} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                  <input 
                    type="date" required 
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                    value={startDate} onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                  <input 
                    type="date" required 
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                    value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                  <select 
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                    value={reason} onChange={e => setReason(e.target.value)}
                  >
                    <option>Tournament</option>
                    <option>School Event</option>
                    <option>Holidays</option>
                    <option>Other</option>
                  </select>
                </div>
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition">
                  Add Blackout
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: BLACKOUT LIST */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700">
                Blackout Dates for <span className="text-indigo-700">{currentTeamName}</span>
              </h3>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                Count: {blackouts.length}
              </span>
            </div>

            {blackouts.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 font-medium">No dates blocked.</p>
                <p className="text-xs text-slate-400 mt-1">This team is available every day.</p>
              </div>
            )}

            <div className="grid gap-3">
              {blackouts.map(req => {
                 const startStr = format(req.start, 'MMM do');
                 const endStr = format(req.end, 'MMM do');
                 const isRange = startStr !== endStr;

                 return (
                  <div key={req.id} className="bg-white border-l-4 border-l-red-500 p-4 rounded-lg shadow-sm flex justify-between items-center group hover:shadow-md transition">
                    <div>
                      <div className="font-bold text-slate-800 text-lg">
                        {startStr} {isRange && <span className="text-slate-400 font-normal mx-1">➜</span>} {isRange && endStr}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">{req.reason}</div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(req.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 p-2 transition-all"
                      title="Remove"
                    >
                      Delete
                    </button>
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