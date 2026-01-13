import React from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function DevTools() {
  
  const seedDatabase = async () => {
    if (!window.confirm("This will add test data to your REAL database. Continue?")) return;

    try {
      // 1. Create a Field
      const fieldRef = await addDoc(collection(db, "fields"), {
        name: "City Park - Field 1",
        location: "Downtown",
        surface: "Grass"
      });
      console.log("Field Created:", fieldRef.id);

      // 2. Create a Permit (We own this field next Saturday 8am-5pm)
      // Note: Using a fixed future date for testing
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay() + 7) % 7 + 7); // Next Sat
      nextSaturday.setHours(8, 0, 0, 0);
      
      const endSaturday = new Date(nextSaturday);
      endSaturday.setHours(17, 0, 0, 0);

      await addDoc(collection(db, "permits"), {
        fieldId: fieldRef.id,
        start: Timestamp.fromDate(nextSaturday),
        end: Timestamp.fromDate(endSaturday)
      });
      console.log("Permit Created");

      // 3. Create Teams (Just strings usually, but if you have a collection:)
      // For now, we just use string IDs in the Match Creator, so no action needed unless you built a Teams collection.

      alert("Database Seeded! You have a Field and a Permit for next Saturday.");
      window.location.reload();

    } catch (err) {
      console.error("Seeding Error:", err);
      alert("Error seeding data. Check console.");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={seedDatabase}
        className="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold border-2 border-white hover:bg-purple-700"
      >
        🛠 Seed Test Data
      </button>
    </div>
  );
}