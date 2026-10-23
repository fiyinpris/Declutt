import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Values from `firebase apps:sdkconfig web` for declutt-9f8d4. Photos are stored in Firestore
// as compressed images, so Firebase Storage isn't used.
const firebaseConfig = {
  apiKey: "AIzaSyApzdLEcrv2osCkvQ2TLVofwp3O5uxnyD8",
  authDomain: "declutt-9f8d4.firebaseapp.com",
  projectId: "declutt-9f8d4",
  storageBucket: "declutt-9f8d4.firebasestorage.app",
  messagingSenderId: "603012165517",
  appId: "1:603012165517:web:33650377d044b066e117c4",
  measurementId: "G-V4J3XB5B9S",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
