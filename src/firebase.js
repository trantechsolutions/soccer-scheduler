import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEEiHNizVWIMDfUS8d1g_vD7pCmEPY7jc",
  authDomain: "soccer-scheduler-2774f.firebaseapp.com",
  projectId: "soccer-scheduler-2774f",
  storageBucket: "soccer-scheduler-2774f.firebasestorage.app",
  messagingSenderId: "2892629143",
  appId: "1:2892629143:web:eba3ba8482612b4d1455d2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);