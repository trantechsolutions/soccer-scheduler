import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  format, 
  areIntervalsOverlapping, 
  eachDayOfInterval, 
  startOfDay, 
  endOfDay
} from 'date-fns';
import { CalendarDaysIcon, EnvelopeIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function PublicTeamAvailability() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  
  const [dailySlots, setDailySlots] = useState([]);
  const [matches, setMatches] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Team
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        if (teamDoc.exists()) {
          setTeam({ id: teamDoc.id, ...teamDoc.data() });
        }

        // 2. Fetch Availability Ranges
        const availQ = query(
          collection(db, "requests"), 
          where("teamId", "==", teamId),
          where("type", "==", "available")
        );
        const availSnap = await getDocs(availQ);
        const ranges = availSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          start: d.data().start.toDate(),
          end: d.data().end.toDate()
        }));

        // 3. Fetch Matches (For Conflict Checking)
        const matchesRef = collection(db, "matches");
        const [homeSnap, awaySnap] = await Promise.all([
            getDocs(query(matchesRef, where("homeTeamId", "==", teamId))),
            getDocs(query(matchesRef, where("awayTeamId", "==", teamId)))
        ]);
        
        const allMatches = [];
        const processMatch = (doc) => ({
            id: doc.id,
            ...doc.data(),
            start: doc.data().start.toDate(),
            end: doc.data().end.toDate()
        });
        homeSnap.forEach(doc => allMatches.push(processMatch(doc)));
        awaySnap.forEach(doc => allMatches.push(processMatch(doc)));
        
        // Deduplicate matches
        const uniqueMatches = Array.from(new Set(allMatches.map(a => a.id)))
            .map(id => allMatches.find(a => a.id === id));
        setMatches(uniqueMatches);

        // 4. "EXPLODE" RANGES INTO INDIVIDUAL DAYS
        const today = startOfDay(new Date());
        let explodedSlots = [];

        ranges.forEach(range => {
            const days = eachDayOfInterval({ start: range.start, end: range.end });
            days.forEach(day => {
                if (day < today) return; // Skip past

                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);

                explodedSlots.push({
                    id: range.id + "_" + day.toISOString(),
                    dateDisplay: day,
                    originalNote: range.note,
                    start: dayStart,
                    end: dayEnd
                });
            });
        });

        // Sort by date
        explodedSlots.sort((a, b) => a.start - b.start);
        setDailySlots(explodedSlots);

      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) fetchData();
  }, [teamId]);

  const getConflictsForDay = (daySlot) => {
    return matches.filter(match => 
      areIntervalsOverlapping(
        { start: daySlot.start, end: daySlot.end }, 
        { start: match.start, end: match.end }      
      )
    ).sort((a,b) => a.start - b.start); // Sort conflicts by time
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Schedule...</div>;
  if (!team) return <div className="p-10 text-center text-red-500">Team not found.</div>;

  const primaryContact = team.contacts?.[0] || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
            <p className="text-indigo-100 text-sm">Availability Schedule</p>
          </div>
          <div className="p-6">
             <div className="flex items-start gap-4">
               <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
                 <EnvelopeIcon className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-sm font-bold text-slate-500 uppercase">Contact for Games</p>
                 <p className="text-slate-900 font-medium">{primaryContact.name || 'Team Manager'}</p>
                 {primaryContact.email && (
                   <a href={`mailto:${primaryContact.email}`} className="text-indigo-600 hover:underline">
                     {primaryContact.email}
                   </a>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* LIST */}
        <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5" /> Open Dates
        </h2>

        <div className="space-y-4">
          {dailySlots.length === 0 && (
             <div className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <p className="text-slate-400 italic">No upcoming availability posted.</p>
             </div>
          )}

          {dailySlots.map(slot => {
            const dateStr = format(slot.start, 'EEEE, MMMM do');
            const conflicts = getConflictsForDay(slot);
            const hasConflict = conflicts.length > 0;

            return (
              <div key={slot.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                
                {/* 1. GREEN BAR: Date info */}
                <div className={`border-l-4 ${hasConflict ? 'border-l-green-500' : 'border-l-green-500'} p-4`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                            <div className="font-bold text-slate-800 text-lg">
                                {dateStr}
                            </div>
                            {hasConflict ? (
                                <div className="text-xs font-bold text-orange-600 mt-1 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    Partial Availability
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 mt-1">
                                    All Day Availability
                                </div>
                            )}
                        </div>
                        
                        {slot.originalNote && (
                            <div className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm font-medium self-start">
                                {slot.originalNote}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. RED BAR: BUSY TIMES (Anonymized) */}
                {hasConflict && (
                    <div className="bg-slate-50 border-t border-slate-100 p-3 px-4">
                        <div className="flex items-start gap-2 mb-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5" />
                            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                                Unavailable Times
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-6">
                            {conflicts.map(match => (
                                <div key={match.id} className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-3 py-1 rounded shadow-sm">
                                    {format(match.start, 'h:mm a')} - {format(match.end, 'h:mm a')}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}