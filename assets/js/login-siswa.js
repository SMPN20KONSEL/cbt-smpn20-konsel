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

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const errorDiv =
  document.getElementById("error");

const btnLogin =
  document.getElementById("btnLogin");

/* LOGIN */
async function login() {

  if (!navigator.onLine) {

    showError(
      "Koneksi internet terputus"
    );

    return;

  }

  // lanjut login...

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value.trim();

  if (!email || !password) {

    errorDiv.innerHTML =
      "Isi email dan password";

    return;
  }

  btnLogin.disabled = true;
  btnLogin.innerHTML =
    "⏳ Masuk...";

  try {

    /* LOGIN AUTH */
    const cred =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid =
      cred.user.uid;

    /* CEK akun_siswa */
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

    /* CEK STATUS */
    if (
      akun.aktif !== true
    ) {

      await signOut(auth);

      throw new Error(
        "Akun nonaktif"
      );
    }

    /* SESSION */
    sessionStorage.setItem(
      "uid",
      uid
    );

    sessionStorage.setItem(
      "nis",
      akun.nis || ""
    );

    sessionStorage.setItem(
      "nama",
      akun.nama || ""
    );

    sessionStorage.setItem(
      "kelas",
      akun.kelas || ""
    );

    /* TRACK LOGIN */
    setDoc(
      doc(
        db,
        "peserta",
        uid
      ),
      {
        uid,
        nis: akun.nis,
        nama: akun.nama,
        kelas: akun.kelas,
        status: "login",
        loginAt:
          serverTimestamp()
      },
      { merge: true }
    );

    /* MASUK */
    location.href =
      "./siswa/token.html";

  } catch (err) {

    console.error(err);

    errorDiv.innerHTML =
      "Login gagal";

  } finally {

    btnLogin.disabled =
      false;

    btnLogin.innerHTML =
      "Masuk";
  }
}

/* BUTTON */
btnLogin.onclick = login;

/* ENTER */
passwordInput.addEventListener(
  "keydown",
  e => {

    if (e.key === "Enter") {

      login();

    }

  }
);