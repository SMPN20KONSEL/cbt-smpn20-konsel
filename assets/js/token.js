import { db, auth }
from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
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
   AUTH CHECK
============================= */
onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      location.href =
        "login.html";

      return;
    }

    currentUser = user;

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

  if (!navigator.onLine) {

    errorDiv.textContent =
      "Koneksi internet terputus";

    return;

  }

  // lanjut cek token...

  /* BUTTON TIDAK ADA */
  if (!btnMasuk) return;

  /* CEGAH DOUBLE CLICK */
  if (btnMasuk.disabled)
    return;

  /* CLEAR ERROR */
  errorDiv.textContent = "";

  /* VALIDASI LOGIN */
  if (!currentUser) {

    errorDiv.textContent =
      "Sesi belum siap.";

    return;
  }

  /* AMBIL TOKEN */
  const token =
    tokenInput.value
      .trim()
      .toUpperCase();

  /* VALIDASI TOKEN */
  if (!token) {

    errorDiv.textContent =
      "Token wajib diisi.";

    return;
  }

  try {

    /* LOADING */
    btnMasuk.disabled =
      true;

    btnMasuk.innerHTML =
      "⏳ Memeriksa...";

    /* CEK TOKEN */
    const snap =
      await getDoc(
        doc(
          db,
          "jadwal_ujian",
          token
        )
      );

    /* TOKEN TIDAK ADA */
    if (!snap.exists()) {

      errorDiv.textContent =
        "Token tidak ditemukan.";

      return;
    }

    const ujian =
      snap.data();

    /* CEK STATUS UJIAN */
    if (
      ujian.aktif !== true
    ) {

      errorDiv.textContent =
        "Ujian belum aktif.";

      return;
    }

    /* SIMPAN PESERTA
       NON BLOCKING
    */
    setDoc(
      doc(
        db,
        "peserta",
        currentUser.uid
      ),
      {
        kodeUjian:
          token,

        status:
          "belum_mulai"
      },
      { merge: true }
    ).catch(console.error);

    /* SESSION */
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
      ujian.durasi || 0
    );

    sessionStorage.setItem(
      "mapelUjian",
      ujian.mapel || ""
    );

    sessionStorage.setItem(
      "judulUjian",
      ujian.judul || ""
    );

    /* MASUK UJIAN */
    location.href =
      "ujian.html";

  } catch (err) {

    console.error(err);

    errorDiv.textContent =
      "Koneksi bermasalah.";

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