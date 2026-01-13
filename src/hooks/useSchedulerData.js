import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useSchedulerData() {
  const [data, setData] = useState({
    matches: [],
    permits: [],
    blackouts: [],
    loading: true
  });

  useEffect(() => {
    // 1. Subscribe to Matches
    const unsubscribeMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(), // Convert Firestore Timestamp to JS Date
        end: doc.data().end.toDate()
      }));
      
      setData(prev => ({ ...prev, matches }));
    });

    // 2. Subscribe to Permits (Field Availability)
    const unsubscribePermits = onSnapshot(collection(db, 'permits'), (snapshot) => {
      const permits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));

      setData(prev => ({ ...prev, permits }));
    });

    // 3. Subscribe to Blackouts/Requests
    // (Optional: Filter for only 'approved' blackouts if you have an approval flow)
    const unsubscribeBlackouts = onSnapshot(collection(db, 'requests'), (snapshot) => {
      const blackouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));

      setData(prev => ({ ...prev, blackouts, loading: false }));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeMatches();
      unsubscribePermits();
      unsubscribeBlackouts();
    };
  }, []);

  return data;
}