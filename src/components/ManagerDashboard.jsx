import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ManagerDashboard() {
  const [user, setUser] = useState(null);
  const [teamId, setTeamId] = useState(null); // The team this user manages
  const [blackouts, setBlackouts] = useState([]);
  
  // Form State
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('Tournament');

  // 1. AUTH & TEAM DISCOVERY
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch the user's profile to find their assigned teamId
        // Assuming you have a 'users' collection: { uid: '...', teamId: 'team_A' }
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setTeamId(userDoc.data().teamId);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. LISTEN TO MY TEAM'S BLACKOUTS
  useEffect(() => {
    if (!teamId) return;

    const q = query(collection(db, "requests"), where("teamId", "==", teamId));
    
    const unsubBlackouts = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Timestamp to Date for display if needed
        start: doc.data().start.toDate() 
      }));
      setBlackouts(data);
    });

    return () => unsubBlackouts();
  }, [teamId]);

  // 3. SUBMIT NEW BLACKOUT
  const handleAddBlackout = async (e) => {
    e.preventDefault();
    if (!teamId || !date) return;

    // Create start/end for the WHOLE day (or specific times if you prefer)
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    try {
      await addDoc(collection(db, "requests"), {
        teamId,
        managerId: user.uid,
        start,
        end,
        reason,
        type: 'blackout',
        createdAt: new Date()
      });
      alert("Blackout added");
      setDate('');
    } catch (err) {
      console.error("Error adding blackout:", err);
    }
  };

  // 4. DELETE BLACKOUT
  const handleDelete = async (id) => {
    if (window.confirm("Remove this blackout date?")) {
      await deleteDoc(doc(db, "requests", id));
    }
  };

  if (!user) return <div className="p-8">Please Log In</div>;
  if (!teamId) return <div className="p-8">You are not assigned to a team yet. Contact Admin.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">Team Availability Manager</h2>
        <p className="text-gray-600 mb-4">Managing Team: <span className="font-mono bg-gray-100 px-2 rounded">{teamId}</span></p>
        
        <form onSubmit={handleAddBlackout} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700">Date Unavailable</label>
            <input 
              type="date" 
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <select 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option>Tournament</option>
              <option>School Event</option>
              <option>Holidays</option>
              <option>Coach Unavailable</option>
            </select>
          </div>

          <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Block Date
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Current Blackout Dates</h3>
        {blackouts.length === 0 && <p className="text-gray-500 italic">No blackout dates set.</p>}
        
        {blackouts.map(req => (
          <div key={req.id} className="flex items-center justify-between bg-white border border-l-4 border-l-red-500 p-4 rounded shadow-sm">
            <div>
              <p className="font-bold">{req.start.toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">{req.reason}</p>
            </div>
            <button 
              onClick={() => handleDelete(req.id)}
              className="text-gray-400 hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}