import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, deleteDoc, doc } from 'firebase/firestore';
import { MapPinIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ComplexManager() {
  const [complexes, setComplexes] = useState([]);
  const [selectedComplex, setSelectedComplex] = useState(null);
  const [fields, setFields] = useState([]);

  // Form States
  const [newComplexName, setNewComplexName] = useState('');
  const [newComplexAddress, setNewComplexAddress] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [surfaceType, setSurfaceType] = useState('Grass');

  // 1. Fetch Complexes on Load
  useEffect(() => {
    const fetchComplexes = async () => {
      const snap = await getDocs(collection(db, 'complexes'));
      setComplexes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchComplexes();
  }, []);

  // 2. Fetch Fields when a Complex is selected
  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedComplex) {
        setFields([]);
        return;
      }
      // Query fields where complexId matches the selected complex
      const q = query(collection(db, 'fields'), where('complexId', '==', selectedComplex.id));
      const snap = await getDocs(q);
      setFields(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchFields();
  }, [selectedComplex]);

  // --- HANDLERS ---

  const handleAddComplex = async (e) => {
    e.preventDefault();
    if (!newComplexName) return;

    const docRef = await addDoc(collection(db, 'complexes'), {
      name: newComplexName,
      address: newComplexAddress
    });

    const newComplex = { id: docRef.id, name: newComplexName, address: newComplexAddress };
    setComplexes([...complexes, newComplex]);
    setNewComplexName('');
    setNewComplexAddress('');
    setSelectedComplex(newComplex); // Auto-select the new complex
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newFieldName || !selectedComplex) return;

    const docRef = await addDoc(collection(db, 'fields'), {
      name: newFieldName,
      complexId: selectedComplex.id, // THE LINK
      complexName: selectedComplex.name, // Denormalize for easier scheduling display
      surface: surfaceType,
      isActive: true
    });

    setFields([...fields, { 
      id: docRef.id, 
      name: newFieldName, 
      surface: surfaceType, 
      complexId: selectedComplex.id 
    }]);
    setNewFieldName('');
  };

  const handleDeleteField = async (fieldId) => {
    if(!window.confirm("Delete this field? Matches scheduled here will lose their location.")) return;
    await deleteDoc(doc(db, 'fields', fieldId));
    setFields(fields.filter(f => f.id !== fieldId));
  };

  return (
    <div className="flex h-[calc(100vh-100px)] max-w-6xl mx-auto p-4 gap-6">
      
      {/* LEFT COLUMN: COMPLEXES */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Complexes</h2>
          <p className="text-xs text-slate-500">Select one to manage fields</p>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {complexes.map(complex => (
            <button
              key={complex.id}
              onClick={() => setSelectedComplex(complex)}
              className={`w-full text-left p-3 rounded-md transition-all ${
                selectedComplex?.id === complex.id 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                  : 'hover:bg-gray-50 text-slate-700'
              }`}
            >
              <div className="font-semibold">{complex.name}</div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" /> {complex.address || "No address"}
              </div>
            </button>
          ))}
        </div>

        {/* Add Complex Form */}
        <div className="p-4 border-t bg-slate-50">
          <form onSubmit={handleAddComplex} className="space-y-2">
            <input 
              placeholder="Complex Name" 
              className="w-full text-sm border p-2 rounded"
              value={newComplexName}
              onChange={e => setNewComplexName(e.target.value)}
            />
            <input 
              placeholder="Address" 
              className="w-full text-sm border p-2 rounded"
              value={newComplexAddress}
              onChange={e => setNewComplexAddress(e.target.value)}
            />
            <button className="w-full bg-indigo-600 text-white text-sm py-2 rounded font-medium hover:bg-indigo-700">
              Add Complex
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: FIELDS */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
        {!selectedComplex ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a complex on the left to add fields.
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-800">{selectedComplex.name}</h2>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {fields.length} Fields
                </span>
              </div>
            </div>

            {/* Fields List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">
              {fields.map(field => (
                <div key={field.id} className="border p-4 rounded-lg relative group hover:border-indigo-300 transition">
                  <h4 className="font-bold text-slate-800">{field.name}</h4>
                  <p className="text-xs text-slate-500 uppercase mt-1">{field.surface}</p>
                  
                  <button 
                    onClick={() => handleDeleteField(field.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {/* Add Field Card */}
              <form onSubmit={handleAddField} className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col justify-center gap-2 hover:border-indigo-200 transition">
                <input 
                  autoFocus
                  placeholder="New Field Name" 
                  className="text-sm border-b p-1 focus:outline-none focus:border-indigo-500"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                />
                <select 
                  className="text-xs bg-slate-50 p-1 rounded"
                  value={surfaceType}
                  onChange={e => setSurfaceType(e.target.value)}
                >
                  <option>Grass</option>
                  <option>Turf</option>
                  <option>Indoor</option>
                </select>
                <button className="bg-indigo-50 text-indigo-600 text-xs py-1.5 rounded font-bold hover:bg-indigo-100 flex items-center justify-center gap-1">
                  <PlusIcon className="w-3 h-3" /> Add Field
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}