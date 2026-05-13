import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


// Paste YOUR NEW keys exactly here:
const firebaseConfig = {
  apiKey: "AIzaSyCPBEh61R-aB35msEwAJFwNltl1kosIpyk",
  authDomain: "ketiejili-enterprise.firebaseapp.com",
  projectId: "ketiejili-enterprise",
  storageBucket: "ketiejili-enterprise.firebasestorage.app",
  messagingSenderId: "36008086538",
  appId: "1:36008086538:web:d3f6e7c7098f565a1063f3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);