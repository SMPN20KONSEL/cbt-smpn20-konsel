import { db, auth } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* =============================
   AUTH CHECK
============================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  sessionStorage.setItem("siswaUid", user.uid);
});

/* =============================
   VERIFY TOKEN
============================= */
async function verifyToken() {
  const tokenInput = document.getElementById("token").value.trim();
  const errorDiv = document.getElementById("error");

  errorDiv.textContent = "";

  if (!tokenInput) {
    errorDiv.textContent = "Token tidak boleh kosong!";
    return;
  }

  try {
    const ref = doc(db, "jadwal_ujian", tokenInput);
    const snap = await getDoc(ref);

    // ❌ token tidak ada
    if (!snap.exists()) {
      errorDiv.textContent = "Kode ujian tidak ditemukan!";
      return;
    }

    const ujian = snap.data();

    // ❌ belum aktif
    if (!ujian.aktif) {
      errorDiv.textContent = "Ujian belum aktif atau sudah selesai!";
      return;
    }

    // ✅ baru update status SETELAH valid
    const uid = sessionStorage.getItem("siswaUid");

    await setDoc(doc(db, "peserta", uid), {
      kodeUjian: tokenInput,
      status: "belum_mulai",
      lastOnline: serverTimestamp()
    }, { merge: true });

    // 💾 SESSION
    sessionStorage.setItem("kodeUjian", tokenInput);
    sessionStorage.setItem("bankSoalId", ujian.bankSoalId);
    sessionStorage.setItem("durasiUjian", ujian.durasi);
    sessionStorage.setItem("mapelUjian", ujian.mapel);
    sessionStorage.setItem("judulUjian", ujian.judul);

    location.href = "ujian.html";

  } catch (err) {
    console.error(err);
    errorDiv.textContent = "Terjadi kesalahan sistem";
  }
}

window.verifyToken = verifyToken;