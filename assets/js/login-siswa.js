/* ===============================
   IMPORT FIREBASE
================================ */
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ===============================
   LOGIN SISWA
================================ */
async function login() {
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorDiv      = document.getElementById("error");

  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  errorDiv.textContent = "";

  if (!email || !password) {
    errorDiv.textContent = "Email dan password harus diisi!";
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;

    const akunSnap = await getDoc(doc(db, "akun_siswa", uid));
    if (!akunSnap.exists()) {
      await auth.signOut();
      errorDiv.textContent = "Akun siswa tidak aktif.";
      return;
    }

    const { nis } = akunSnap.data();
    const siswaSnap = await getDoc(doc(db, "siswa", nis));

    if (!siswaSnap.exists() || !siswaSnap.data().aktif) {
      await auth.signOut();
      errorDiv.textContent = "Data siswa tidak valid.";
      return;
    }

    const siswa = siswaSnap.data();

    // setelah login sukses
sessionStorage.setItem("siswaUid", uid);
sessionStorage.setItem("nisSiswa", nis);
sessionStorage.setItem("namaSiswa", siswa.nama);
sessionStorage.setItem("kelasSiswa", siswa.kelas);

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
   TOGGLE PASSWORD
================================ */
const passwordField = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");

toggleBtn?.addEventListener("click", () => {
  const show = passwordField.type === "password";
  passwordField.type = show ? "text" : "password";
  toggleBtn.textContent = show ? "🙈" : "👁";
});
