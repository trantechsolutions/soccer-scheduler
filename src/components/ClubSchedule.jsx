import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { CalendarDaysIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ClubSchedule() {
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTeam, setSearchTeam] = useState('');

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        // Fetch ALL matches ordered by start time
        const q = query(collection(db, 'matches'), orderBy('start', 'asc'));
        const snap = await getDocs(q);
        
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate()
        }));

        // Filter out old games (optional: show only future games by default)
        const today = startOfDay(new Date());
        const upcoming = data.filter(m => m.start >= today);

        setMatches(upcoming);
        setFilteredMatches(upcoming);
      } catch (err) {
        console.error("Error loading schedule:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = matches;

    // 1. Date Filter
    if (selectedDate) {
      const filterDay = parseISO(selectedDate);
      result = result.filter(m => isSameDay(m.start, filterDay));
    }

    // 2. Team Name Search
    if (searchTeam) {
      const lower = searchTeam.toLowerCase();
      result = result.filter(m => 
        m.homeTeamName.toLowerCase().includes(lower) || 
        m.awayTeamName.toLowerCase().includes(lower)
      );
    }

    setFilteredMatches(result);
  }, [selectedDate, searchTeam, matches]);

  // Group by Date for display
  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const dateKey = format(match.start, 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(match);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort();

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Club Schedule...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDaysIcon className="w-8 h-8 text-indigo-600" />
            Club Master Schedule
          </h1>
          <p className="text-slate-500 text-sm">View all upcoming matches for the entire club.</p>
        </div>

        {/* FILTERS */}
        <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              placeholder="Search Team..." 
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
              value={searchTeam}
              onChange={e => setSearchTeam(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          {(selectedDate || searchTeam) && (
            <button 
              onClick={() => { setSelectedDate(''); setSearchTeam(''); }}
              className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* SCHEDULE LIST */}
      {sortedDates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-400">No matches found matching your filters.</p>
        </div>
      )}

      <div className="space-y-8">
        {sortedDates.map(dateKey => (
          <div key={dateKey}>
            <div className="sticky top-16 bg-slate-50/95 backdrop-blur py-2 border-b border-slate-200 mb-3 z-10">
              <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                {format(parseISO(dateKey), 'EEEE, MMMM do')}
                <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border">
                  {groupedMatches[dateKey].length} Games
                </span>
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {groupedMatches[dateKey].map(match => (
                <div key={match.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  
                  {/* TEAMS */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-slate-800 text-lg">{match.homeTeamName}</div>
                    <div className="text-xs text-slate-400 uppercase font-bold px-2">vs</div>
                    <div className="font-bold text-slate-800 text-lg">{match.awayTeamName}</div>
                  </div>

                  {/* DETAILS */}
                  <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                    <div>
                      <div className="flex items-center gap-1 text-sm font-bold text-indigo-900">
                        {match.complexName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {match.fieldName ? match.fieldName : `Field ${match.fieldId}`}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-700">
                        {format(match.start, 'h:mm a')}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">
                        Kickoff
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}