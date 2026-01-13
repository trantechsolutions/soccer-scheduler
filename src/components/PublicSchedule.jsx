import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, isSameDay } from 'date-fns';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function PublicSchedule() {
  const [matches, setMatches] = useState([]);
  const [fieldsMap, setFieldsMap] = useState({}); // To look up field names
  const [loading, setLoading] = useState(true);
  
  // State for Filters
  const [teamFilter, setTeamFilter] = useState('');
  const [uniqueTeams, setUniqueTeams] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Fields (Reference Data)
        // We do this so we can show "City Park Field 1" instead of "field_abc"
        const fieldsSnap = await getDocs(collection(db, "fields"));
        const fMap = {};
        fieldsSnap.docs.forEach(doc => {
          fMap[doc.id] = doc.data(); 
          // doc.data() includes { name: "Field 1", complexName: "City Park" }
        });
        setFieldsMap(fMap);

        // 2. Fetch Matches
        const matchesRef = collection(db, "matches");
        const q = query(matchesRef, orderBy("start", "asc"), limit(100));
        const matchSnap = await getDocs(q);
        
        const loadedMatches = matchSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate()
        }));

        setMatches(loadedMatches);

        // 3. Extract Unique Teams for the Filter Dropdown
        const teamsSet = new Set();
        loadedMatches.forEach(m => {
          if (m.homeTeamName) teamsSet.add(m.homeTeamName);
          if (m.awayTeamName) teamsSet.add(m.awayTeamName);
        });
        setUniqueTeams(Array.from(teamsSet).sort());

      } catch (error) {
        console.error("Error fetching schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter Logic
  const filteredMatches = teamFilter 
    ? matches.filter(m => m.homeTeamName === teamFilter || m.awayTeamName === teamFilter)
    : matches;

  // Group by Date
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const dateKey = format(match.start, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});

  // Helper to format field name
  const getLocationName = (fieldId) => {
    const field = fieldsMap[fieldId];
    if (!field) return "Unknown Field";
    // Returns "City Park - Field 1"
    return `${field.complexName || ''} - ${field.name}`;
  };

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 mb-3">Club Schedule</h1>
        
        {/* Filter */}
        <select 
          className="w-full bg-slate-100 border-none text-slate-800 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="">All Teams</option>
          {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="p-4 space-y-6">
        {loading && (
          <div className="text-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-slate-400 text-sm">Loading Schedule...</p>
          </div>
        )}
        
        {!loading && matches.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p>No games scheduled yet.</p>
          </div>
        )}

        {Object.entries(groupedMatches).map(([dateKey, daysMatches]) => (
          <div key={dateKey}>
            {/* Date Sticky Header */}
            <div className="sticky top-[88px] z-0 bg-slate-50/95 backdrop-blur py-2 mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {format(parseISO(dateKey), 'EEEE, MMMM do')}
              </h3>
            </div>

            <div className="space-y-3">
              {daysMatches.map(match => (
                <div key={match.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  
                  {/* Card Top: Location & Time */}
                  <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {format(match.start, 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {getLocationName(match.fieldId)}
                    </div>
                  </div>

                  {/* Card Body: Teams */}
                  <div className="p-4 flex items-center justify-between">
                    {/* Home */}
                    <div className="flex-1 text-center">
                      <div className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                        {match.homeTeamName || 'TBD'}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="px-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                        VS
                      </div>
                    </div>

                    {/* Away */}
                    <div className="flex-1 text-center">
                      <div className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                        {match.awayTeamName || 'TBD'}
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