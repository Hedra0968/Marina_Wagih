// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZsHIu_Q6b_mUdEyEc4rqd-sHlEycN-cA",
  authDomain: "student-portal-2026.firebaseapp.com",
  projectId: "student-portal-2026",
  storageBucket: "student-portal-2026.firebasestorage.app",
  messagingSenderId: "66159138260",
  appId: "1:66159138260:web:a3c9aca2d534f68065b241",
  measurementId: "G-28BMS45ZHK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);