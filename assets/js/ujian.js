// ================= FIREBASE =================
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= SESSION =================
const nis = sessionStorage.getItem("nisSiswa");
const nama = sessionStorage.getItem("namaSiswa");
const kelas = sessionStorage.getItem("kelasSiswa");
const kodeUjian = sessionStorage.getItem("kodeUjian");
const uid = sessionStorage.getItem("siswaUid");

// ================= VALIDASI =================
if (!nis || !kodeUjian || !uid) {
  alert("Sesi ujian tidak valid");
  location.href = "token.html";
  throw new Error("SESSION_INVALID");
}

// ================= CEK JIKA SUDAH MULAI =================
if (sessionStorage.getItem("waktuMulai")) {
  location.href = "soal.html";
}

// ================= ELEMENT =================
const elNis = document.getElementById("c-nisn");
const elNama1 = document.getElementById("c-nama");
const elNama2 = document.getElementById("c-nama2");
const elKelas = document.getElementById("c-kelas");
const elMapel = document.getElementById("c-mata-ujian");
const btnMulai = document.getElementById("btn-mulai");

// ================= TAMPILKAN DATA =================
elNis.textContent = nis;
elNama1.textContent = nama;
elNama2.textContent = nama;
elKelas.textContent = kelas;

// ================= LOAD MAPEL =================
async function loadMapel() {
  try {
    const snap = await getDoc(doc(db, "jadwal_ujian", kodeUjian));

    if (!snap.exists()) {
      elMapel.textContent = "-";
      return;
    }

    const data = snap.data();

    elMapel.textContent = data.mapel || "-";

    sessionStorage.setItem("mapelUjian", data.mapel || "-");
    sessionStorage.setItem("durasiUjian", data.durasi || 60);

  } catch (err) {
    console.error(err);
    elMapel.textContent = "-";
  }
}

loadMapel();

// ================= LOCK ANTI DOUBLE CLICK =================
let isStarting = false;

// ================= MULAI UJIAN =================
btnMulai.addEventListener("click", async (e) => {
  e.preventDefault();

  if (isStarting) return;
  isStarting = true;

  try {
    btnMulai.disabled = true;
    btnMulai.innerText = "Memulai...";

    await setDoc(doc(db, "peserta", uid), {
      status: "mengerjakan",
      kodeUjian,
      namaSiswa: nama,
      kelas,
      waktuMulai: serverTimestamp()
    }, { merge: true });

    sessionStorage.setItem("waktuMulai", Date.now());
    sessionStorage.setItem("statusUjian", "aktif");

    location.href = "soal.html";

  } catch (err) {
    console.error("ERROR FIRESTORE:", err);

    alert("Gagal memulai ujian: " + err.message);

    isStarting = false;
    btnMulai.disabled = false;
    btnMulai.innerText = "Mulai Ujian";
  }
});