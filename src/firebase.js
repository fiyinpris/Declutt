import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyApzdLEcrv2osCkvQ2TLVofwp3O5uxnyD8",
  authDomain: "declutt-9f8d4.firebaseapp.com",
  projectId: "declutt-9f8d4",
  storageBucket: "declutt-9f8d4.appspot.com", // ← FIXED
  messagingSenderId: "603012165517",
  appId: "1:603012165517:web:33650377d044b066e117c4",
  measurementId: "G-V4J3XB5B9S",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
