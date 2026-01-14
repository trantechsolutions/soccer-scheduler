import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, deleteDoc, doc } from 'firebase/firestore';
import { MapPinIcon, PlusIcon, TrashIcon, BuildingOffice2Icon, GlobeAmericasIcon } from '@heroicons/react/24/outline';

export default function ComplexManager() {
  const [complexes, setComplexes] = useState([]);
  const [selectedComplex, setSelectedComplex] = useState(null);
  const [fields, setFields] = useState([]);

  // Complex Form State
  const [newComplexName, setNewComplexName] = useState('');
  const [newComplexAddress, setNewComplexAddress] = useState('');
  const [isManaged, setIsManaged] = useState(true); // Default to Club-Owned

  // Field Form State
  const [newFieldName, setNewFieldName] = useState('');
  const [surfaceType, setSurfaceType] = useState('Grass');

  // 1. Fetch Complexes on Load
  useEffect(() => {
    const fetchComplexes = async () => {
      const snap = await getDocs(collection(db, 'complexes'));
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: Managed first, then alphabetical
      loaded.sort((a, b) => {
        if (a.isManaged === b.isManaged) return a.name.localeCompare(b.name);
        return a.isManaged ? -1 : 1;
      });
      setComplexes(loaded);
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

    try {
      const docData = {
        name: newComplexName,
        address: newComplexAddress,
        isManaged: isManaged // Crucial Flag
      };

      const docRef = await addDoc(collection(db, 'complexes'), docData);

      const newComplex = { id: docRef.id, ...docData };
      setComplexes([...complexes, newComplex].sort((a, b) => {
         if (a.isManaged === b.isManaged) return a.name.localeCompare(b.name);
         return a.isManaged ? -1 : 1;
      }));
      
      // Reset Form
      setNewComplexName('');
      setNewComplexAddress('');
      setIsManaged(true);
      setSelectedComplex(newComplex); 
    } catch (error) {
      console.error("Error adding complex:", error);
      alert("Failed to add complex.");
    }
  };

  const handleDeleteComplex = async (e, id) => {
    e.stopPropagation(); // Prevent selecting the complex while deleting
    if (!window.confirm("Delete this complex? ALL associated fields will need to be manually deleted.")) return;
    
    await deleteDoc(doc(db, 'complexes', id));
    setComplexes(complexes.filter(c => c.id !== id));
    if (selectedComplex?.id === id) setSelectedComplex(null);
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newFieldName || !selectedComplex) return;

    const docRef = await addDoc(collection(db, 'fields'), {
      name: newFieldName,
      complexId: selectedComplex.id,
      complexName: selectedComplex.name, // Denormalization
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
    if(!window.confirm("Delete this field? Matches scheduled here will lose their location data.")) return;
    await deleteDoc(doc(db, 'fields', fieldId));
    setFields(fields.filter(f => f.id !== fieldId));
  };

  return (
    <div className="flex h-[calc(100vh-100px)] max-w-6xl mx-auto p-4 gap-6">
      
      {/* LEFT COLUMN: COMPLEXES LIST & FORM */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Locations</h2>
          <p className="text-xs text-slate-500">Manage Club Facilities & Away Venues</p>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {complexes.map(complex => (
            <button
              key={complex.id}
              onClick={() => setSelectedComplex(complex)}
              className={`w-full text-left p-3 rounded-md transition-all group relative ${
                selectedComplex?.id === complex.id 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                  : 'hover:bg-gray-50 text-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {complex.isManaged ? (
                      <BuildingOffice2Icon className="w-4 h-4 text-indigo-500" title="Club Managed" />
                    ) : (
                      <GlobeAmericasIcon className="w-4 h-4 text-orange-500" title="External / Away" />
                    )}
                    {complex.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-1 pl-6">
                    <MapPinIcon className="w-3 h-3" /> {complex.address || "No address"}
                  </div>
                </div>
                
                {/* Delete Button (Hidden unless hovering) */}
                <div 
                  onClick={(e) => handleDeleteComplex(e, complex.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                >
                  <TrashIcon className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Add Complex Form */}
        <div className="p-4 border-t bg-slate-50">
          <form onSubmit={handleAddComplex} className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Add New Location</h4>
            
            <input 
              placeholder="Complex Name" 
              className="w-full text-sm border p-2 rounded focus:outline-none focus:border-indigo-500"
              value={newComplexName}
              onChange={e => setNewComplexName(e.target.value)}
            />
            
            <input 
              placeholder="Address / City" 
              className="w-full text-sm border p-2 rounded focus:outline-none focus:border-indigo-500"
              value={newComplexAddress}
              onChange={e => setNewComplexAddress(e.target.value)}
            />
            
            {/* Managed Toggle */}
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
              <input 
                type="checkbox" 
                id="managedCheck"
                checked={isManaged} 
                onChange={e => setIsManaged(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="managedCheck" className="text-sm text-slate-700 font-bold cursor-pointer select-none">
                Club-Owned Facility?
              </label>
            </div>
            <p className="text-[10px] text-slate-400 px-1">
              Check this if you manage permits/availability for this location. Uncheck for Away venues.
            </p>

            <button className="w-full bg-indigo-600 text-white text-sm py-2 rounded font-medium hover:bg-indigo-700 transition">
              Add Complex
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: FIELDS */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
        {!selectedComplex ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <BuildingOffice2Icon className="w-16 h-16 mb-2 text-slate-200" />
            <p>Select a complex on the left to manage fields.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-800">{selectedComplex.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                    selectedComplex.isManaged ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {selectedComplex.isManaged ? 'Club Managed' : 'External Location'}
                  </span>
                  <span className="text-xs text-slate-400">
                    • {fields.length} Fields Defined
                  </span>
                </div>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start">
              {fields.map(field => (
                <div key={field.id} className="border p-4 rounded-lg relative group hover:border-indigo-300 hover:shadow-sm transition bg-white">
                  <div className="pr-6">
                    <h4 className="font-bold text-slate-800 truncate" title={field.name}>{field.name}</h4>
                    <p className="text-xs text-slate-500 uppercase mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {field.surface}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteField(field.id)}
                    className="absolute top-2 right-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {/* Add Field Card */}
              <form onSubmit={handleAddField} className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col justify-center gap-2 hover:border-indigo-200 hover:bg-slate-50 transition">
                <input 
                  autoFocus
                  placeholder="New Field Name" 
                  className="text-sm border-b border-slate-300 bg-transparent p-1 focus:outline-none focus:border-indigo-500"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                />
                <select 
                  className="text-xs bg-white border border-slate-200 p-1 rounded focus:outline-none"
                  value={surfaceType}
                  onChange={e => setSurfaceType(e.target.value)}
                >
                  <option>Grass</option>
                  <option>Turf</option>
                  <option>Indoor</option>
                  <option>Clay</option>
                </select>
                <button className="bg-indigo-50 text-indigo-600 text-xs py-1.5 rounded font-bold hover:bg-indigo-100 flex items-center justify-center gap-1 mt-1">
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