// assets/js/firebase.js

/* ===============================
   FIREBASE APP
================================ */
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

/* ===============================
   FIREBASE AUTH
================================ */
import {
  initializeAuth,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* ===============================
   FIRESTORE
================================ */
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ===============================
   CONFIG
================================ */
const firebaseConfig = {

  apiKey:
    "AIzaSyDNj37IaDG51SoXKweOKQwD9WidR1DsB7I",

  authDomain:
    "cbt-smpn20konsel.firebaseapp.com",

  projectId:
    "cbt-smpn20konsel",

  storageBucket:
    "cbt-smpn20konsel.firebasestorage.app",

  messagingSenderId:
    "805318519638",

  appId:
    "1:805318519638:web:7d7136bfe7263bef9ec4f7",

  measurementId:
    "G-JCFE6R1S93"
};

/* ===============================
   INIT APP
================================ */
export const app =
  initializeApp(firebaseConfig);

/* ===============================
   AUTH STABIL CBT
================================ */
export const auth =
  initializeAuth(app, {

    persistence:
      browserLocalPersistence

  });

/* ===============================
   FIRESTORE CACHE OFFLINE
================================ */
export const db =
  initializeFirestore(app, {

    localCache:
      persistentLocalCache({

        tabManager:
          persistentSingleTabManager()

      })

  });