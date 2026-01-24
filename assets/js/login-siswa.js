/* ===============================
   IMPORT FIREBASE
================================ */
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ===============================
   AUTO ISI EMAIL DARI QR
================================ */
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorDiv      = document.getElementById("error");

const params = new URLSearchParams(window.location.search);
const nis  = params.get("nis")?.trim();
const nama = params.get("nama")?.trim().toLowerCase();

if (nis && nama) {
  emailInput.value = `${nama}${nis}@smp.belajar.id`;
  passwordInput.focus();
}

/* ===============================
   LOGIN SISWA
================================ */
async function login() {
  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  errorDiv.textContent = "";

  if (!email || !password) {
    errorDiv.textContent = "Email dan password harus diisi!";
    return;
  }

  try {
    // 🔐 LOGIN FIREBASE AUTH
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;

    // 🔎 VALIDASI AKUN SISWA
    const akunSnap = await getDoc(doc(db, "akun_siswa", uid));
    if (!akunSnap.exists()) {
      await auth.signOut();
      errorDiv.textContent = "Akun siswa tidak aktif.";
      return;
    }

    const { nis: nisDB } = akunSnap.data();

    // 🔎 VALIDASI DATA SISWA
    const siswaSnap = await getDoc(doc(db, "siswa", nisDB));
    if (!siswaSnap.exists() || !siswaSnap.data().aktif) {
      await auth.signOut();
      errorDiv.textContent = "Data siswa tidak valid.";
      return;
    }

    const siswa = siswaSnap.data();

    // 💾 SIMPAN SESSION
    sessionStorage.setItem("siswaUid", uid);
    sessionStorage.setItem("nisSiswa", nisDB);
    sessionStorage.setItem("namaSiswa", siswa.nama);
    sessionStorage.setItem("kelasSiswa", siswa.kelas);

    // 🚀 MASUK HALAMAN TOKEN
    location.href = "./siswa/token.html";

  } catch (err) {
    console.error(err);
    errorDiv.textContent = "Login gagal. Email atau password salah.";
  }
}

/* ===============================
   BUTTON EVENT
================================ */
document.getElementById("btnLogin")
  ?.addEventListener("click", login);

/* ===============================
   ENTER = LOGIN
================================ */
passwordInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

/* ===============================
   TOGGLE PASSWORD
================================ */
const toggleBtn = document.getElementById("togglePassword");
toggleBtn?.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  toggleBtn.textContent = show ? "🙈" : "👁";
});
