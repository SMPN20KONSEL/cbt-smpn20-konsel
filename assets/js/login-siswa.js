/* ===============================
   IMPORT FIREBASE
================================ */
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ===============================
   ELEMENT
================================ */
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorDiv      = document.getElementById("error");
const btnLogin      = document.getElementById("btnLogin");

/* ===============================
   AUTO ISI EMAIL DARI QR
================================ */
const params = new URLSearchParams(window.location.search);

const nis  = params.get("nis")?.trim();

const nama = params
  .get("nama")
  ?.trim()
  .toLowerCase()
  .replace(/\s+/g, "");

if (nis && nama) {

  emailInput.value =
    `${nama}${nis}@smp.belajar.id`;

  passwordInput.focus();
}

/* ===============================
   SHOW ERROR
================================ */
function showError(text) {

  errorDiv.textContent = text;

  errorDiv.style.display = "block";
}

/* ===============================
   CLEAR ERROR
================================ */
function clearError() {

  errorDiv.textContent = "";

  errorDiv.style.display = "none";
}

/* ===============================
   LOADING BUTTON
================================ */
function setLoading(state) {

  if (!btnLogin) return;

  btnLogin.disabled = state;

  btnLogin.innerHTML = state
    ? "⏳ Masuk..."
    : "Masuk";
}

/* ===============================
   LOGIN SISWA
================================ */
async function login() {

  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  clearError();

  // VALIDASI INPUT
  if (!email || !password) {

    showError(
      "Email dan password harus diisi!"
    );

    return;
  }

  setLoading(true);

  try {

    /* ===============================
       LOGIN FIREBASE AUTH
    ================================ */
    const cred =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid = cred.user.uid;

    /* ===============================
       VALIDASI akun_siswa
    ================================ */
    const akunRef =
      doc(db, "akun_siswa", uid);

    const akunSnap =
      await getDoc(akunRef);

    // akun tidak ada
    if (!akunSnap.exists()) {

      await signOut(auth);

      showError(
        "Akun siswa tidak ditemukan."
      );

      return;
    }

    const akun = akunSnap.data();

    // akun nonaktif
    if (akun.aktif !== true) {

      await signOut(auth);

      showError(
        "Akun dinonaktifkan."
      );

      return;
    }

    // role salah
    if (
      akun.role &&
      akun.role !== "siswa"
    ) {

      await signOut(auth);

      showError(
        "Akses ditolak."
      );

      return;
    }

    const nisDB = akun.nis;

    /* ===============================
       VALIDASI DATA SISWA
    ================================ */
    const siswaRef =
      doc(db, "siswa", nisDB);

    const siswaSnap =
      await getDoc(siswaRef);

    if (!siswaSnap.exists()) {

      await signOut(auth);

      showError(
        "Data siswa tidak ditemukan."
      );

      return;
    }

    const siswa = siswaSnap.data();

    /* ===============================
       SIMPAN SESSION
    ================================ */
    sessionStorage.setItem(
      "siswaUid",
      uid
    );

    sessionStorage.setItem(
      "nisSiswa",
      nisDB
    );

    sessionStorage.setItem(
      "namaSiswa",
      siswa.nama || ""
    );

    sessionStorage.setItem(
      "kelasSiswa",
      siswa.kelas || ""
    );

    /* ===============================
       TRACKING LOGIN PESERTA
    ================================ */
    const pesertaRef =
      doc(db, "peserta", uid);

    await setDoc(
      pesertaRef,
      {
        uid,
        nis: nisDB,

        nama:
          siswa.nama || "",

        kelas:
          siswa.kelas || "",

        email,

        status: "login",

        // reset token lama
        kodeUjian: "",

        loginAt:
          serverTimestamp(),

        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

    /* ===============================
       UPDATE ONLINE TIAP 30 DETIK
    ================================ */
    const interval =
      setInterval(async () => {

        try {

          await setDoc(
            pesertaRef,
            {
              lastOnline:
                serverTimestamp()
            },
            { merge: true }
          );

        } catch (e) {

          console.log(
            "Update online gagal:",
            e
          );
        }

      }, 30000);

    /* ===============================
       STOP INTERVAL SAAT KELUAR
    ================================ */
    window.addEventListener(
      "beforeunload",
      () => {

        clearInterval(interval);

      }
    );

    /* ===============================
       LOGIN BERHASIL
    ================================ */
    location.href =
      "./siswa/token.html";

  } catch (err) {

    console.error(err);

    let pesan =
      "Login gagal.";

    // ERROR FIREBASE AUTH
    switch (err.code) {

      case "auth/invalid-credential":
        pesan =
          "Email atau password salah.";
        break;

      case "auth/user-not-found":
        pesan =
          "Akun tidak ditemukan.";
        break;

      case "auth/wrong-password":
        pesan =
          "Password salah.";
        break;

      case "auth/too-many-requests":
        pesan =
          "Terlalu banyak percobaan login.";
        break;

      case "auth/network-request-failed":
        pesan =
          "Koneksi internet bermasalah.";
        break;
    }

    showError(pesan);

  } finally {

    setLoading(false);

  }
}

/* ===============================
   BUTTON LOGIN
================================ */
btnLogin?.addEventListener(
  "click",
  login
);

/* ===============================
   ENTER = LOGIN
================================ */
passwordInput?.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {
      login();
    }

  }
);

/* ===============================
   TOGGLE PASSWORD
================================ */
const toggleBtn =
  document.getElementById(
    "togglePassword"
  );

toggleBtn?.addEventListener(
  "click",
  () => {

    const show =
      passwordInput.type === "password";

    passwordInput.type =
      show
        ? "text"
        : "password";

    toggleBtn.textContent =
      show
        ? "🙈"
        : "👁";
  }
);