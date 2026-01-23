// assets/js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
// Analytics OPTIONAL (boleh dihapus kalau tidak dipakai)
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNj37IaDG51SoXKweOKQwD9WidR1DsB7I",
  authDomain: "cbt-smpn20konsel.firebaseapp.com",
  projectId: "cbt-smpn20konsel",
  storageBucket: "cbt-smpn20konsel.firebasestorage.app",
  messagingSenderId: "805318519638",
  appId: "1:805318519638:web:7d7136bfe7263bef9ec4f7",
  measurementId: "G-JCFE6R1S93"
};

// INIT
export const app = initializeApp(firebaseConfig);

// SERVICES
export const auth = getAuth(app);
export const db = getFirestore(app);

// OPTIONAL
export const analytics = getAnalytics(app);
