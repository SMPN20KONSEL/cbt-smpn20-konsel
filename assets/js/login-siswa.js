import { auth, db }
from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ================= ELEMENT ================= */

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const errorDiv =
  document.getElementById("error");

const btnLogin =
  document.getElementById("btnLogin");

/* ================= ERROR ================= */

function showError(msg) {

  if (!errorDiv) return;

  errorDiv.innerHTML = msg;

}

/* ================= LOGIN ================= */

async function login() {

  /* ================= OFFLINE ================= */

  if (!navigator.onLine) {

    showError(
      "Koneksi internet terputus"
    );

    return;

  }

  /* ================= VALIDASI ================= */

  const email =
    emailInput?.value
    .trim();

  const password =
    passwordInput?.value
    .trim();

  if (!email || !password) {

    showError(
      "Isi email dan password"
    );

    return;

  }

  /* ================= DOUBLE CLICK ================= */

  if (btnLogin.disabled)
    return;

  btnLogin.disabled = true;

  btnLogin.innerHTML =
    "⏳ Masuk...";

  showError("");

  try {

    /* ================= LOGIN AUTH ================= */

    const cred =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid =
      cred.user.uid;

    /* ================= CEK AKUN ================= */

    const akunSnap =
      await getDoc(
        doc(
          db,
          "akun_siswa",
          uid
        )
      );

    if (!akunSnap.exists()) {

      await signOut(auth);

      throw new Error(
        "Akun tidak ditemukan"
      );

    }

    const akun =
      akunSnap.data();

    /* ================= CEK STATUS ================= */

    if (
      akun.aktif !== true
    ) {

      await signOut(auth);

      throw new Error(
        "Akun nonaktif"
      );

    }

    /* ================= SESSION SISWA ================= */

    sessionStorage.setItem(
      "siswaUid",
      uid
    );

    sessionStorage.setItem(
      "nisSiswa",
      akun.nis || ""
    );

    sessionStorage.setItem(
      "namaSiswa",
      akun.nama || ""
    );

    sessionStorage.setItem(
      "kelasSiswa",
      akun.kelas || ""
    );

    /* ================= RESET SESSION UJIAN ================= */

    sessionStorage.removeItem(
      "kodeUjian"
    );

    sessionStorage.removeItem(
      "bankSoalId"
    );

    sessionStorage.removeItem(
      "durasiUjian"
    );

    sessionStorage.removeItem(
      "mapelUjian"
    );

    sessionStorage.removeItem(
      "judulUjian"
    );

    sessionStorage.removeItem(
      "waktuMulai"
    );

    /* ================= TRACK LOGIN ================= */

    await setDoc(
      doc(
        db,
        "peserta",
        uid
      ),
      {
        uid,
        nis:
          akun.nis || "",

        nama:
          akun.nama || "",

        kelas:
          akun.kelas || "",

        status:
          "login",

        loginAt:
          serverTimestamp(),

        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

    /* ================= MASUK ================= */

    location.replace(
      "./siswa/token.html"
    );

  } catch (err) {

    console.error(err);

    let pesan =
      "Login gagal";

    if (
      err.code ===
      "auth/invalid-credential"
    ) {

      pesan =
        "Email atau password salah";

    }

    if (
      err.message ===
      "Akun nonaktif"
    ) {

      pesan =
        "Akun nonaktif";

    }

    if (
      err.message ===
      "Akun tidak ditemukan"
    ) {

      pesan =
        "Data siswa tidak ditemukan";

    }

    showError(pesan);

  } finally {

    btnLogin.disabled =
      false;

    btnLogin.innerHTML =
      "Masuk";

  }

}

/* ================= BUTTON ================= */

btnLogin.onclick = login;

/* ================= ENTER ================= */

passwordInput?.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      login();

    }

  }
);

/* ================= ONLINE STATUS ================= */

window.addEventListener(
  "offline",
  () => {

    showError(
      "Koneksi internet terputus"
    );

  }
);