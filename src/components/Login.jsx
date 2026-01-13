import React from 'react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in DB, if not, create them
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create the user profile
        await setDoc(userRef, {
          email: user.email,
          role: 'manager', // Default role
          teamId: null,
          createdAt: new Date()
        });
      }

      alert(`Welcome ${user.displayName}!`);
      navigate('/admin'); // Send them to admin after login
      
    } catch (error) {
      console.error("Login Error:", error);
      alert("Login Failed: " + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-4 text-slate-800">Soccer Scheduler</h1>
        <p className="mb-6 text-gray-600">Admin & Manager Access</p>
        
        <button 
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded shadow-sm hover:bg-gray-50 transition"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}