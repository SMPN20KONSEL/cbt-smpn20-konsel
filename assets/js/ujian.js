// ================= FIREBASE =================
import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= SESSION =================
const nis   = sessionStorage.getItem("nisSiswa");
const nama  = sessionStorage.getItem("namaSiswa");
const kelas = sessionStorage.getItem("kelasSiswa");
const kodeUjian = sessionStorage.getItem("kodeUjian");

if (!nis || !kodeUjian) {
  alert("Sesi ujian tidak valid");
  location.href = "token.html";
}

// ================= ELEMENT =================
const elNis   = document.getElementById("c-nisn");
const elNama1 = document.getElementById("c-nama");
const elNama2 = document.getElementById("c-nama2");
const elKelas = document.getElementById("c-kelas");
const elMapel = document.getElementById("c-mata-ujian");
const btnMulai = document.getElementById("btn-mulai");

// ================= ISI DATA SISWA =================
elNis.textContent   = nis;
elNama1.textContent = nama;
elNama2.textContent = nama;
elKelas.textContent = kelas;

// ================= AMBIL MATA UJIAN =================
async function loadMapel() {
  try {
    const ujianRef  = doc(db, "jadwal_ujian", kodeUjian);
    const ujianSnap = await getDoc(ujianRef);

    if (!ujianSnap.exists()) {
      elMapel.textContent = "-";
      return;
    }

    const ujian = ujianSnap.data();

    elMapel.textContent = ujian.mapel || "-";

    // simpan untuk halaman soal
    sessionStorage.setItem("mapelUjian", ujian.mapel || "-");

  } catch (e) {
    console.error(e);
    elMapel.textContent = "-";
  }
}

loadMapel();

// ================= MULAI =================
btnMulai.onclick = () => {
  sessionStorage.setItem("waktuMulai", Date.now());
  location.href = "soal.html";
};

