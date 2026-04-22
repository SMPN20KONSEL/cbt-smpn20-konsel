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
const submitModal   = document.getElementById("submitModal");
const cancelSubmit  = document.getElementById("cancelSubmit");
const confirmSubmit = document.getElementById("confirmSubmit");
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
let sudahSelesai = false;

let jawabanSiswa = {
  pg: {},
  mcma: {},
  kategori: {},
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
// ===== MCMA =====
if (soal.tipe === "mcma") {
  const checked = document.querySelectorAll(
    `input[name="soal_${soal.id}"]:checked`
  );
  jawabanSiswa.mcma[soal.id] = Array.from(checked).map(cb => cb.value);
}

// ===== KATEGORI =====
if (soal.tipe === "kategori") {
  const hasil = new Array(soal.pernyataan.length).fill(null);

  document.querySelectorAll(`[data-kat="${soal.id}"]`).forEach((row, i) => {
    const pilih = row.querySelector("input:checked");
    hasil[i] = pilih ? pilih.value === "true" : null;
  });

  jawabanSiswa.kategori[soal.id] = hasil;
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
document.addEventListener("change", (e) => {
  if (e.target.type === "radio") {
    const id = e.target.dataset.id;
    const index = e.target.dataset.index;

    if (!jawabanSiswa.kategori[id]) {
      jawabanSiswa.kategori[id] = [];
    }

    jawabanSiswa.kategori[id][index] = (e.target.value === "true");
  }
});

// ================= HITUNG NILAI =================
function hitungNilai() {
  let skorDapat = 0;
  let skorMax   = 0;

  semuaSoal.forEach(soal => {

    // ===== PG =====
    if (soal.tipe === "pg") {
      const max = soal.skor || 2;
      skorMax += max;

      if ((jawabanSiswa.pg[soal.id] || "") === soal.kunci) {
        skorDapat += max;
      }
    }

    // ===== MCMA =====
if (soal.tipe === "mcma") {
  const kunci = soal.kunci || [];
  const jawaban = jawabanSiswa.mcma[soal.id] || [];
  const semuaOpsi = Object.keys(soal.opsi || {});

  const max = soal.skor || 2;
  skorMax += max;

  let benar = 0;
  let salah = 0;

  jawaban.forEach(j => {
    if (kunci.includes(j)) {
      benar++;
    } else {
      salah++;
    }
  });

  const jumlahKunci = kunci.length;
  const jumlahSalahOpsi = semuaOpsi.length - jumlahKunci;

  let skor = 0;

  if (jumlahKunci > 0 && jumlahSalahOpsi > 0) {
    skor =
      (benar / jumlahKunci) -
      (salah / jumlahSalahOpsi);
  }

  if (skor < 0) skor = 0;

  skorDapat += skor * max;
}

    // ===== KATEGORI =====
    if (soal.tipe === "kategori") {
      const pernyataan = soal.pernyataan || [];
      const jawaban = jawabanSiswa.kategori[soal.id] || [];

      const max = soal.skor || 2;
      skorMax += max;

      let benar = 0;

      pernyataan.forEach((p, i) => {
        if (jawaban[i] === p.jawabanBenar) {
          benar++;
        }
      });

      let skor = pernyataan.length > 0
        ? (benar / pernyataan.length)
        : 0;

      skorDapat += skor * max;
    }

  });

  // 🔥 NORMALISASI KE 100
  const nilaiPG =
    skorMax === 0 ? 0 : (skorDapat / skorMax) * 100;

  return {
    nilaiPG: Number(nilaiPG.toFixed(2)),
    nilaiEssay: 0,
    totalNilai: Math.round(nilaiPG)
  };
}

// ================= CEK SOAL KOSONG =================
function cekSoalKosong() {
  const kosong = [];

  semuaSoal.forEach((soal, i) => {

    // ===== PG =====
    if (soal.tipe === "pg") {
      if (!jawabanSiswa.pg[soal.id]) {
        kosong.push(i + 1);
      }
    }

    // ===== MCMA =====
    if (soal.tipe === "mcma") {
      if (!jawabanSiswa.mcma[soal.id] || jawabanSiswa.mcma[soal.id].length === 0) {
        kosong.push(i + 1);
      }
    }

    // ===== KATEGORI =====
    if (soal.tipe === "kategori") {
      const jwb = jawabanSiswa.kategori[soal.id] || [];

      // cek apakah ada yang null / belum dipilih
      if (jwb.length === 0 || jwb.includes(null)) {
        kosong.push(i + 1);
      }
    }

    // ===== ESSAY =====
    if (soal.tipe === "essay") {
      if (!jawabanSiswa.essay[soal.id] || jawabanSiswa.essay[soal.id].trim() === "") {
        kosong.push(i + 1);
      }
    }

  });

  // ❌ kalau ada yang kosong
  if (kosong.length > 0) {
    tampilkanToast(`❗ Soal belum dijawab: ${kosong.join(", ")}`);
    return;
  }

  // ✅ kalau semua terisi
submitModal.classList.add("show");
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
  t.replace(/^\s*\d+[\.\)]\s+/, "") // WAJIB ada titik / kurung + spasi
   .replace(/\s*\(.*?\)\s*/g, "")
   .trim();
   
const soalPG = (bank.soalPG || []).map((s, i) => ({
  tipe: "pg",
  id: s.id || "pg_" + i,
      pertanyaan: bersihkan(s.pertanyaan),
      opsi: s.opsi,
      kunci: s.jawabanBenar || s.kunci,
      skor: s.skor || 2
    }));
const soalMCMA = (bank.soalMCMA || []).map((s, i) => ({
  tipe: "mcma",
  id: s.id || "mcma_" + i,
  pertanyaan: bersihkan(s.pertanyaan),
  opsi: s.opsi,
  kunci: s.jawabanBenar || [],
  skor: s.skor || 2
}));

const soalKategori = (bank.soalKategori || []).map((s, i) => ({
  tipe: "kategori",
  id: s.id || "kat_" + i,
  pertanyaan: bersihkan(s.pertanyaan),
  pernyataan: s.pernyataan || [],
  skor: s.skor || 2
}));
const soalEssay = (bank.soalEssay || []).map((s, i) => ({
  tipe: "essay",
  id: s.id || "essay_" + i,
      pertanyaan: bersihkan(s.pertanyaan),
      skorMax: s.skorMax || 10
    }));

semuaSoal = [...soalPG, ...soalMCMA, ...soalKategori, ...soalEssay];
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

if (soal.tipe === "mcma") {
  html += `<div class="mcma-options">`;

  Object.entries(soal.opsi).forEach(([key, teks]) => {
    const checked = jawabanSiswa.mcma[soal.id]?.includes(key);

    html += `
      <div class="opsi-row">

        <span class="opsi-text">
          ${teks}
        </span>

        <input type="checkbox"
          name="soal_${soal.id}"
          value="${key}"
          ${checked ? "checked" : ""}
        >
      </div>
    `;
  });

  html += `</div>`;
}

if (soal.tipe === "kategori") {
  html += `<div class="kategori-options">`;

  html += `
    <table class="kategori-table">
      <thead>
        <tr>
          <th>Pernyataan</th>
          <th>Benar</th>
          <th>Salah</th>
        </tr>
      </thead>
      <tbody>
  `;

  soal.pernyataan.forEach((p, i) => {
    const jawaban = jawabanSiswa.kategori[soal.id]?.[i];

    html += `
      <tr data-kat="${soal.id}">
        <td class="teks">${p.teks}</td>

        <td>
          <input type="radio"
            name="kat_${soal.id}_${i}"
            value="true"
            data-id="${soal.id}"
            data-index="${i}"
            ${jawaban === true ? "checked" : ""}
          >
        </td>

        <td>
          <input type="radio"
            name="kat_${soal.id}_${i}"
            value="false"
            data-id="${soal.id}"
            data-index="${i}"
            ${jawaban === false ? "checked" : ""}
          >
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
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
  const soal = semuaSoal[indexSoal];

  let sudahIsi = false;

  // ===== CEK PG =====
  if (soal.tipe === "pg") {
    const pilih = document.querySelector(
      `input[name="soal_${soal.id}"]:checked`
    );
    sudahIsi = !!pilih;
  }

  // ===== CEK MCMA =====
  if (soal.tipe === "mcma") {
    const pilih = document.querySelectorAll(
      `input[name="soal_${soal.id}"]:checked`
    );
    sudahIsi = pilih.length > 0;
  }

  // ===== CEK KATEGORI =====
if (soal.tipe === "kategori") {
  const total = soal.pernyataan.length;
  const isi = jawabanSiswa.kategori[soal.id] || [];

  sudahIsi = isi.length === total && isi.every(v => v !== null && v !== undefined);
}

  // ===== CEK ESSAY =====
  if (soal.tipe === "essay") {
    const textarea = document.querySelector(
      `textarea[name="soal_${soal.id}"]`
    );
    sudahIsi = textarea && textarea.value.trim() !== "";
  }

  // ❌ BELUM ISI → TOLAK PINDAH
  if (!sudahIsi) {
    tampilkanToast(`⚠️ Soal nomor ${indexSoal + 1} belum dijawab!`);
    return;
  }

  // ✅ SIMPAN JAWABAN
  simpanJawaban();

  // 🔚 SOAL TERAKHIR
  if (indexSoal === semuaSoal.length - 1) {
    cekSoalKosong();
  } else {
    indexSoal++;
    tampilkanSoal();
  }
};

btnPrev.onclick = () => {
  if (!confirm("Kembali ke soal sebelumnya?")) return;

  simpanJawaban();
  if (indexSoal > 0) {
    indexSoal--;
    tampilkanSoal();
  }
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

setInterval(async () => {
  if (sudahSelesai) return;

  await setDoc(doc(db, "peserta", siswaUid), {
    status: "mengerjakan",
    lastOnline: serverTimestamp()
  }, { merge: true });

}, 30000);

// ================= CEK SUDAH KIRIM =================
if (localStorage.getItem(LS_KIRIM_KEY) === "true") {
  alert("Ujian sudah dikirim sebelumnya. Anda tidak bisa mengulang.");
  location.href = "selesai.html";
}

// ================= NONAKTIF COPY/PASTE ESSAY =================
document.addEventListener("paste", e => {
  if (e.target.tagName === "TEXTAREA") e.preventDefault();
});
document.addEventListener("copy", e => {
  if (e.target.tagName === "TEXTAREA") e.preventDefault();
});

// ================= LEPAS MULTI LOGIN =================
async function lepasSesiUjian() {
  try {
    await setDoc(doc(db, "sesi_ujian", siswaUid), {
      sedangUjian: false
    }, { merge: true });
  } catch (err) {
    console.error("Error lepas sesi:", err);
  }
}

// ================= SIMPAN FIRESTORE =================
async function simpanJawabanFirestore() {
  if (sudahDikirim) return;
sudahDikirim = true;
sudahSelesai = true;

  const nilai = hitungNilai();
  const docId = `${siswaUid}_${kodeUjian}`;

  try {
await setDoc(doc(db, "jawaban_siswa", docId), {
  siswaUid,
  namaSiswa,
  kelas: kelasSiswa,
  mapel: mapelUjian,

  // 🔥 PENTING
  guruId: jadwal.guruId,
  bankSoalId: jadwal.bankSoalId,

  jawabanPG: jawabanSiswa.pg,
  jawabanMCMA: jawabanSiswa.mcma,
  jawabanKategori: jawabanSiswa.kategori,
  jawabanEssay: jawabanSiswa.essay,

  nilaiPG: nilai.nilaiPG,
  nilaiEssay: nilai.nilaiEssay,
  totalNilai: nilai.totalNilai,
  statusNilai: "belum",
  waktu_mulai: serverTimestamp(),
  waktu_selesai: serverTimestamp()
});

// 🔥 TAMBAHAN WAJIB
await setDoc(doc(db, "peserta", siswaUid), {
  status: "selesai",
  lastOnline: serverTimestamp()
}, { merge: true });

    console.log("✅ Jawaban tersimpan");

  } catch (err) {
    console.error("❌ Firestore error:", err);
  } finally {
    // 🚀 Set flag kirim
    localStorage.setItem(LS_KIRIM_KEY, "true");
    localStorage.removeItem(LS_JAWABAN_KEY);
    localStorage.removeItem(LS_WAKTU_KEY);

    // lepas multi login
    await lepasSesiUjian();

    setTimeout(() => {
      window.location.replace("selesai.html");
    }, 300);
  }
}

// Mencegah klik kanan, copy, dan print screen
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("copy", e => e.preventDefault());
document.addEventListener("keydown", e => {
  // PrintScreen, Ctrl+S, Ctrl+P, Ctrl+C
  if (
    e.key === "PrintScreen" ||
    (e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "c"))
  ) {
    e.preventDefault();
    tampilkanToast("Dilarang melakukan screenshot, simpan, atau menyalin jawaban!");
  }
});

// Nonaktifkan paste di essay
document.addEventListener("paste", e => {
  if (e.target.tagName === "TEXTAREA") e.preventDefault();
});

// ================= LOGOUT =================
btnLogout.onclick = () => modal.classList.add("show");
cancelLogout.onclick = () => modal.classList.remove("show");

// hapus definisi lama confirmLogout.onclick
confirmLogout.onclick = async () => {
  simpanJawaban();

  await setDoc(doc(db, "peserta", siswaUid), {
    status: "keluar",
    lastOnline: serverTimestamp()
  }, { merge: true });

  sessionStorage.clear();
  location.href = "../login-siswa.html";
};
// ================= SUBMIT MODAL =================
cancelSubmit.onclick = () => {
  submitModal.classList.remove("show");
};

confirmSubmit.onclick = () => {
  submitModal.classList.remove("show");
  simpanJawabanFirestore();
};
// ================= INIT =================
loadSoal(); 