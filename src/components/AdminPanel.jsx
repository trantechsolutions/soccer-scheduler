// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function AdminPanel() {
  const [fieldName, setFieldName] = useState('');
  const [fields, setFields] = useState([]);

  // Fetch Fields
  useEffect(() => {
    const fetchFields = async () => {
      const querySnapshot = await getDocs(collection(db, "fields"));
      setFields(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchFields();
  }, []);

  // Add New Field
  const handleAddField = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "fields"), {
        name: fieldName,
        createdAt: new Date()
      });
      setFieldName('');
      alert("Field Added!");
      // Re-fetch logic here
    } catch (err) {
      console.error("Error adding field:", err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin: Resource Management</h2>
      
      {/* Field Creator */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h3 className="font-semibold">Add Soccer Field</h3>
        <form onSubmit={handleAddField} className="flex gap-2 mt-2">
          <input 
            className="border p-2 rounded flex-grow"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="e.g., City Park Field 3" 
          />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded">
            Add Field
          </button>
        </form>
      </div>

      {/* Existing Fields List */}
      <div className="grid gap-4">
        {fields.map(field => (
          <div key={field.id} className="border p-3 rounded shadow-sm bg-white flex justify-between">
            <span>{field.name}</span>
            <button className="text-red-500 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}