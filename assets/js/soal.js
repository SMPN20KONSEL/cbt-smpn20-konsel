// ================= FIREBASE =================
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= ELEMENT =================
const soalContainer = document.getElementById("soal-container");
const noSoalEl      = document.getElementById("no-soal");
const timerEl       = document.getElementById("timer");
const btnPrev       = document.getElementById("prev");
const btnNext       = document.getElementById("next");
const toastEl       = document.getElementById("toast");

const btnLogout     = document.getElementById("btnLogout");
const modal         = document.getElementById("logoutModal");
const cancelLogout  = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

// ================= SESSION =================
const kodeUjian    = sessionStorage.getItem("kodeUjian");
const namaSiswa   = sessionStorage.getItem("namaSiswa");
const siswaUid    = sessionStorage.getItem("siswaUid");
const waktuMulai  = sessionStorage.getItem("waktuMulai");
const kelasSiswa  = sessionStorage.getItem("kelasSiswa");
const durasiUjian = sessionStorage.getItem("durasiUjian");

if (!siswaUid || !kodeUjian || !waktuMulai) {
  alert("Sesi ujian tidak valid");
  location.href = "login-siswa.html";
}

document.getElementById("c-nama").textContent = namaSiswa || "Siswa";

// ================= GLOBAL =================
let semuaSoal = [];
let indexSoal = 0;
let sudahDikirim = false;

let jawabanSiswa = {
  pg: {},
  essay: {}
};

let mapelUjian = "";
let judulUjian = "";

// ================= STORAGE KEY =================
const LS_JAWABAN_KEY = `jawaban_${siswaUid}_${kodeUjian}`;
const LS_WAKTU_KEY   = `waktu_${siswaUid}_${kodeUjian}`;
const LS_KIRIM_KEY   = `sudah_kirim_${siswaUid}_${kodeUjian}`;

// ================= TOAST =================
function tampilkanToast(pesan) {
  toastEl.textContent = pesan;
  toastEl.style.display = "block";
  setTimeout(() => toastEl.style.display = "none", 4000);
}

// ================= SIMPAN JAWABAN =================
function simpanJawaban() {
  const soal = semuaSoal[indexSoal];
  if (!soal) return;

  if (soal.tipe === "pg") {
    const pilih = document.querySelector(
      `input[name="soal_${soal.id}"]:checked`
    );
    if (pilih) {
      jawabanSiswa.pg[soal.id] = pilih.dataset.key;
    }
  }

  if (soal.tipe === "essay") {
    const textarea = document.querySelector(
      `textarea[name="soal_${soal.id}"]`
    );
    if (textarea) {
      jawabanSiswa.essay[soal.id] = textarea.value.trim();
    }
  }

  localStorage.setItem(LS_JAWABAN_KEY, JSON.stringify(jawabanSiswa));
}

// ================= HITUNG NILAI =================
function hitungNilai() {
  let nilaiPG = 0;

  semuaSoal.forEach(soal => {
    if (soal.tipe === "pg") {
      if ((jawabanSiswa.pg[soal.id] || "") === soal.kunci) {
        nilaiPG += soal.skor;
      }
    }
  });

  return {
    nilaiPG,
    nilaiEssay: 0,
    totalNilai: nilaiPG
  };
}

// ================= SIMPAN FIRESTORE =================
async function simpanJawabanFirestore() {
  if (sudahDikirim) return;
  sudahDikirim = true;

  const nilai = hitungNilai();
  const docId = `${siswaUid}_${kodeUjian}`;

  try {
    await setDoc(doc(db, "jawaban_siswa", docId), {
      siswaUid,
      nis: sessionStorage.getItem("nisSiswa"),
      namaSiswa,
      kelas: kelasSiswa,
      kodeUjian,
      mapel: mapelUjian,
      judulUjian,

      jawabanPG: jawabanSiswa.pg,
      jawabanEssay: jawabanSiswa.essay,

      nilaiPG: nilai.nilaiPG,
      nilaiEssay: nilai.nilaiEssay,
      totalNilai: nilai.totalNilai,

      waktu_mulai: new Date(Number(waktuMulai)),
      waktu_selesai: serverTimestamp()
    });

    console.log("✅ Jawaban tersimpan");

  } catch (err) {
    console.error("❌ Firestore error:", err);
  } finally {
    // 🚀 REDIRECT DIJAMIN JALAN
    localStorage.setItem(LS_KIRIM_KEY, "true");
    localStorage.removeItem(LS_JAWABAN_KEY);
    localStorage.removeItem(LS_WAKTU_KEY);

    setTimeout(() => {
      window.location.replace("selesai.html");
    }, 300);
  }
}


// ================= CEK SOAL KOSONG =================
function cekSoalKosong() {
  const kosong = [];

  semuaSoal.forEach((soal, i) => {
    if (soal.tipe === "pg" && !jawabanSiswa.pg[soal.id]) kosong.push(i + 1);
    if (soal.tipe === "essay" && !jawabanSiswa.essay[soal.id]) kosong.push(i + 1);
  });

  if (kosong.length) {
    tampilkanToast(`Soal belum dijawab: ${kosong.join(", ")}`);
    return;
  }

  if (confirm("Semua soal sudah dijawab. Kirim ujian?")) {
    simpanJawabanFirestore();
  }
}

// ================= LOAD SOAL =================
async function loadSoal() {
  soalContainer.innerHTML = "<p>Memuat soal...</p>";

  try {
    const jadwalSnap = await getDoc(doc(db, "jadwal_ujian", kodeUjian));
    if (!jadwalSnap.exists()) {
      soalContainer.innerHTML = "<p>Jadwal tidak ditemukan</p>";
      return;
    }

    const jadwal = jadwalSnap.data();
    mapelUjian = jadwal.mapel || "";
    judulUjian = jadwal.judul || "";

    const bankSnap = await getDoc(doc(db, "bank_soal", jadwal.bankSoalId));
    if (!bankSnap.exists()) {
      soalContainer.innerHTML = "<p>Bank soal tidak ditemukan</p>";
      return;
    }

    const bank = bankSnap.data();

    const bersihkan = t =>
      t.replace(/^\s*\d+[\.\)]?\s*/, "")
       .replace(/\s*\(.*?\)\s*/g, "")
       .trim();

    const soalPG = (bank.soalPG || []).map(s => ({
      tipe: "pg",
      id: s.id,
      pertanyaan: bersihkan(s.pertanyaan),
      opsi: s.opsi,
      kunci: s.jawabanBenar || s.kunci,
      skor: s.skor || 2
    }));

    const soalEssay = (bank.soalEssay || []).map(s => ({
      tipe: "essay",
      id: s.id,
      pertanyaan: bersihkan(s.pertanyaan),
      skorMax: s.skorMax || 10
    }));

    semuaSoal = [...soalPG, ...soalEssay];

    const cache = localStorage.getItem(LS_JAWABAN_KEY);
    if (cache) jawabanSiswa = JSON.parse(cache);

    tampilkanSoal();

  } catch (e) {
    console.error(e);
    soalContainer.innerHTML = "<p>Gagal memuat soal</p>";
  }
}

// ================= TAMPILKAN SOAL =================
function tampilkanSoal() {
  const soal = semuaSoal[indexSoal];
  const no = indexSoal + 1;

  let html = `
    <div class="soal-item">
      <div class="soal-text">${soal.pertanyaan}</div>
  `;

  if (soal.tipe === "pg") {
    html += `<div class="opsi">`;
    Object.entries(soal.opsi).forEach(([key, teks]) => {
      const checked = jawabanSiswa.pg[soal.id] === key ? "checked" : "";
      html += `
        <label>
          <input type="radio"
            name="soal_${soal.id}"
            data-key="${key}"
            ${checked}>
          <span>${teks}</span>
        </label>
      `;
    });
    html += `</div>`;
  }

  if (soal.tipe === "essay") {
    html += `
      <textarea name="soal_${soal.id}" rows="4">
${jawabanSiswa.essay[soal.id] || ""}
      </textarea>
    `;
  }

  html += `</div>`;
  soalContainer.innerHTML = html;

  noSoalEl.textContent = no;
  btnPrev.disabled = indexSoal === 0;
  btnNext.textContent =
    indexSoal === semuaSoal.length - 1 ? "Kirim" : "Selanjutnya ➡";
}

// ================= NAVIGASI =================
btnNext.onclick = () => {
  simpanJawaban();
  indexSoal === semuaSoal.length - 1
    ? cekSoalKosong()
    : (indexSoal++, tampilkanSoal());
};

btnPrev.onclick = () => {
  simpanJawaban();
  if (indexSoal > 0) indexSoal--, tampilkanSoal();
};

// ================= TIMER =================
let waktu =
  Number(localStorage.getItem(LS_WAKTU_KEY)) ||
  Number(durasiUjian) * 60;

const intervalTimer = setInterval(() => {
  const m = Math.floor(waktu / 60);
  const d = waktu % 60;

  timerEl.textContent =
    `${m.toString().padStart(2, "0")}:${d.toString().padStart(2, "0")}`;

  // ⏰ WAKTU HABIS
  if (waktu <= 0) {
    clearInterval(intervalTimer);
    localStorage.removeItem(LS_WAKTU_KEY);

    tampilkanToast("⏰ Waktu habis! Jawaban dikirim otomatis.");

    // ⛔ cegah klik & input lagi
    btnNext.disabled = true;
    btnPrev.disabled = true;
    document
      .querySelectorAll("input, textarea")
      .forEach(el => el.disabled = true);

    simpanJawabanFirestore();
    return; // ⛔ STOP interval
  }

  waktu--;
  localStorage.setItem(LS_WAKTU_KEY, waktu);
}, 1000);


// ================= LOGOUT =================
btnLogout.onclick = () => modal.classList.add("show");
cancelLogout.onclick = () => modal.classList.remove("show");

confirmLogout.onclick = () => {
  simpanJawaban();
  sessionStorage.clear();
  localStorage.removeItem(LS_WAKTU_KEY);
  location.href = "login-siswa.html";
};

// ================= INIT =================
loadSoal();
