import { db, auth }
from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* =============================
   GLOBAL USER
============================= */

let currentUser = null;

/* =============================
   ELEMENT
============================= */

const tokenInput =
  document.getElementById(
    "token"
  );

const errorDiv =
  document.getElementById(
    "error"
  );

const btnMasuk =
  document.getElementById(
    "btnMasuk"
  );

/* =============================
   ERROR
============================= */

function showError(msg) {

  if (!errorDiv) return;

  errorDiv.textContent = msg;

}

/* =============================
   AUTH CHECK
============================= */

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      location.replace(
        "../login.html"
      );

      return;

    }

    currentUser = user;

    /* SESSION UID */

    sessionStorage.setItem(
      "siswaUid",
      user.uid
    );

  }
);

/* =============================
   VERIFY TOKEN
============================= */

async function verifyToken() {

  /* =============================
     OFFLINE
  ============================= */

  if (!navigator.onLine) {

    showError(
      "Koneksi internet terputus"
    );

    return;

  }

  /* =============================
     BUTTON TIDAK ADA
  ============================= */

  if (!btnMasuk) return;

  /* =============================
     DOUBLE CLICK
  ============================= */

  if (btnMasuk.disabled)
    return;

  /* =============================
     CLEAR ERROR
  ============================= */

  showError("");

  /* =============================
     VALIDASI LOGIN
  ============================= */

  if (!currentUser) {

    showError(
      "Sesi login belum siap"
    );

    return;

  }

  /* =============================
     AMBIL TOKEN
  ============================= */

  const token =
    tokenInput.value
      .trim()
      .toUpperCase();

  /* =============================
     VALIDASI TOKEN
  ============================= */

  if (!token) {

    showError(
      "Token wajib diisi"
    );

    return;

  }

  try {

    /* =============================
       LOADING
    ============================= */

    btnMasuk.disabled =
      true;

    btnMasuk.innerHTML =
      "⏳ Memeriksa...";

    /* =============================
       CEK TOKEN
    ============================= */

    const snap =
      await getDoc(
        doc(
          db,
          "jadwal_ujian",
          token
        )
      );

    /* =============================
       TOKEN TIDAK ADA
    ============================= */

    if (!snap.exists()) {

      showError(
        "Token tidak ditemukan"
      );

      return;

    }

    const ujian =
      snap.data();

    /* =============================
       CEK STATUS
    ============================= */

    if (
      ujian.aktif !== true
    ) {

      showError(
        "Ujian belum aktif"
      );

      return;

    }

    /* =============================
       VALIDASI BANK SOAL
    ============================= */

    if (
      !ujian.bankSoalId
    ) {

      showError(
        "Bank soal belum tersedia"
      );

      return;

    }

    /* =============================
       SESSION UJIAN
    ============================= */

    sessionStorage.setItem(
      "kodeUjian",
      token
    );

    sessionStorage.setItem(
      "bankSoalId",
      ujian.bankSoalId || ""
    );

    sessionStorage.setItem(
      "durasiUjian",
      ujian.durasi || 30
    );

    sessionStorage.setItem(
      "mapelUjian",
      ujian.mapel || ""
    );

    sessionStorage.setItem(
      "judulUjian",
      ujian.judul || ""
    );

    /* PENTING */

    sessionStorage.setItem(
      "waktuMulai",
      Date.now()
    );

    /* =============================
       TRACK PESERTA
    ============================= */

    await setDoc(
      doc(
        db,
        "peserta",
        currentUser.uid
      ),
      {
        kodeUjian:
          token,

        status:
          "mengerjakan",

        mulaiAt:
          serverTimestamp(),

        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

    /* =============================
       MASUK UJIAN
    ============================= */

    location.replace(
      "ujian.html"
    );

  } catch (err) {

    console.error(err);

    showError(
      "Koneksi bermasalah"
    );

  } finally {

    btnMasuk.disabled =
      false;

    btnMasuk.innerHTML =
      "Mulai Ujian";

  }

}

/* =============================
   BUTTON
============================= */

window.verifyToken =
  verifyToken;

/* =============================
   ENTER TOKEN
============================= */

tokenInput?.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      verifyToken();

    }

  }
);

/* =============================
   OFFLINE
============================= */

window.addEventListener(
  "offline",
  () => {

    showError(
      "Koneksi internet terputus"
    );

  }
);