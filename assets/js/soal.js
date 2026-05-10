// ================= FIREBASE =================
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { arrayUnion } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
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
let pelanggaran = 0;
let lastPelanggaranTime = 0;

async function tambahPelanggaran(pesan) {
  const now = Date.now();

  if (now - lastPelanggaranTime < 3000) return; // ⛔ tahan 3 detik
  lastPelanggaranTime = now;

  pelanggaran++;

  tampilkanToast(pesan);

  try {
    await setDoc(doc(db, "peserta", siswaUid), {
      jumlahPelanggaran: pelanggaran,
      catatanPelanggaran: arrayUnion({
        pesan: pesan,
        waktu: new Date().toISOString()
      }),
      lastOnline: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Gagal simpan pelanggaran:", err);
  }

if (pelanggaran >= 3 && !sudahDikirim) {

  sudahDikirim = true;

  tampilkanToast("❌ Terlalu banyak pelanggaran! Ujian dikirim.");

  simpanJawaban();

  simpanJawabanFirestore();
}
}

let jawabanSiswa = {
  pg: {},
  mcma: {},
  kategori: {},
  essay: {}
};

let jadwal = {};
let mapelUjian = "";
let judulUjian = "";
// ================= STORAGE KEY =================
const LS_JAWABAN_KEY = `jawaban_${siswaUid}_${kodeUjian}`;
const LS_WAKTU_KEY   = `waktu_${siswaUid}_${kodeUjian}`;
const LS_KIRIM_KEY   = `sudah_kirim_${siswaUid}_${kodeUjian}`;
const LS_SOAL_KEY = `urutan_${siswaUid}_${kodeUjian}`;
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

document.querySelectorAll(`[data-kat="${soal.id}"]`).forEach((row) => {
  const pilih = row.querySelector("input:checked");

  if (pilih) {
    const index = pilih.dataset.index;
    hasil[index] = pilih.value === "true";
  }
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

// ================= AUTO SAVE ESSAY =================
document.addEventListener("input", (e) => {

  if (e.target.tagName === "TEXTAREA") {

    const soalId = e.target.name.replace("soal_", "");

    jawabanSiswa.essay[soalId] = e.target.value;

    localStorage.setItem(
      LS_JAWABAN_KEY,
      JSON.stringify(jawabanSiswa)
    );
  }

});

// ================= HITUNG NILAI =================
function hitungNilai() {

  let totalSkor = 0;
  let totalMaks = 0;

  semuaSoal.forEach(soal => {

    if (
      soal.tipe === "pg" ||
      soal.tipe === "mcma" ||
      soal.tipe === "kategori"
    ) {
      totalMaks += 2;
    }

    // ================= PG =================
    if (soal.tipe === "pg") {

      if ((jawabanSiswa.pg[soal.id] || "") === soal.kunci) {
        totalSkor += 2;
      }
    }

    // ================= MCMA =================
    if (soal.tipe === "mcma") {

      const kunci = soal.kunci || [];
      const jawaban = jawabanSiswa.mcma[soal.id] || [];

      let benar = 0;
      let salah = 0;

      jawaban.forEach(j => {
        if (kunci.includes(j)) {
          benar++;
        } else {
          salah++;
        }
      });

      let skor = 0;

      if (kunci.length > 0) {

        const poinPerKunci = 2 / kunci.length;

        skor = (benar * poinPerKunci) - (salah * poinPerKunci);

        // minimal 0 maksimal 2
        skor = Math.max(0, Math.min(2, skor));
      }

      totalSkor += skor;
    }

    // ================= KATEGORI =================
    if (soal.tipe === "kategori") {

      const pernyataan = soal.pernyataan || [];
      const jawaban = jawabanSiswa.kategori[soal.id] || [];

      let benar = 0;

      pernyataan.forEach((p, i) => {
        if (jawaban[i] === p.jawabanBenar) {
          benar++;
        }
      });

      let skor = 0;

      // hindari pembagian 0
      if (pernyataan.length > 0) {
        skor = (benar / pernyataan.length) * 2;
      }

      // batas nilai 0 - 2
      skor = Math.max(0, Math.min(2, skor));

      totalSkor += skor;
    }

  });

  // ================= NILAI AKHIR =================
  const nilai = totalMaks > 0
    ? (totalSkor / totalMaks) * 100
    : 0;

  return {
    nilaiPG: Number(nilai.toFixed(2)),
    nilaiEssay: 0,
    totalNilai: Math.round(nilai)
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

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

    jadwal = jadwalSnap.data();
    mapelUjian = jadwal.mapel || "";
    judulUjian = jadwal.judul || "";

// 🔥 AMBIL DATA PELANGGARAN DARI FIRESTORE
const pesertaSnap = await getDoc(doc(db, "peserta", siswaUid));
if (pesertaSnap.exists()) {
  pelanggaran = pesertaSnap.data().jumlahPelanggaran || 0;
}
console.log("Data peserta:", pesertaSnap.data());
console.log("Jumlah pelanggaran awal:", pelanggaran);

    const bankSnap = await getDoc(doc(db, "bank_soal", jadwal.bankSoalId));
    if (!bankSnap.exists()) {
      soalContainer.innerHTML = "<p>Bank soal tidak ditemukan</p>";
      return;
    }

    const bank = bankSnap.data();

    const bersihkan = t =>
      t.replace(/^\s*\d+[\.\)]\s+/, "")
       .replace(/\s*\(.*?\)\s*/g, "")
       .trim();

    let counter = 0;

    const soalPG = (bank.soalPG || []).map(s => ({
      tipe: "pg",
      id: counter++,
      pertanyaan: bersihkan(s.pertanyaan),
      opsi: shuffleArray(Object.entries(s.opsi)), // 🔥 acak sekali
      kunci: s.jawabanBenar || s.kunci,
      skor: s.skor || 2
    }));

    const soalMCMA = (bank.soalMCMA || []).map(s => ({
      tipe: "mcma",
      id: counter++,
      pertanyaan: bersihkan(s.pertanyaan),
      opsi: shuffleArray(Object.entries(s.opsi)), // 🔥 acak sekali
      kunci: s.jawabanBenar || [],
      skor: s.skor || 2
    }));

    const soalKategori = (bank.soalKategori || []).map(s => ({
      tipe: "kategori",
      id: counter++,
      pertanyaan: bersihkan(s.pertanyaan),
      pernyataan: shuffleArray(
        (s.pernyataan || []).map((p, i) => ({
          ...p,
          originalIndex: i
        }))
      ),
      skor: s.skor || 2
    }));

    const soalEssay = (bank.soalEssay || []).map(s => ({
      tipe: "essay",
      id: counter++,
      pertanyaan: bersihkan(s.pertanyaan),
      skorMax: s.skorMax || 20
    }));

    // 🔐 CEK SUDAH ADA URUTAN?
    const cacheUrutan = localStorage.getItem(LS_SOAL_KEY);

    if (cacheUrutan) {
      semuaSoal = JSON.parse(cacheUrutan);
    } else {
      const soalObjektif = shuffleArray([
        ...soalPG,
        ...soalMCMA,
        ...soalKategori
      ]);

      semuaSoal = [...soalObjektif, ...soalEssay];

      localStorage.setItem(LS_SOAL_KEY, JSON.stringify(semuaSoal));
    }

    const cacheJawaban = localStorage.getItem(LS_JAWABAN_KEY);
    if (cacheJawaban) jawabanSiswa = JSON.parse(cacheJawaban);

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
    soal.opsi.forEach(([key, teks]) => {
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

  soal.opsi.forEach(([key, teks]) => {
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

soal.pernyataan.forEach((p) => {
  const jawaban = jawabanSiswa.kategori[soal.id]?.[p.originalIndex];

  html += `
    <tr data-kat="${soal.id}">
      <td class="teks">${p.teks}</td>

      <td>
        <input type="radio"
          name="kat_${soal.id}_${p.originalIndex}"
          value="true"
          data-id="${soal.id}"
          data-index="${p.originalIndex}"
          ${jawaban === true ? "checked" : ""}
        >
      </td>

      <td>
        <input type="radio"
          name="kat_${soal.id}_${p.originalIndex}"
          value="false"
          data-id="${soal.id}"
          data-index="${p.originalIndex}"
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
      <textarea name="soal_${soal.id}" rows="4">${jawabanSiswa.essay[soal.id] || ""}</textarea>
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
  (Number(durasiUjian || 0) * 60);

if (!waktu || waktu <= 0) {
  waktu = 60 * 30; // fallback 30 menit
}

const intervalTimer = setInterval(() => {
  const m = Math.floor(waktu / 60);
  const d = waktu % 60;

  timerEl.textContent =
    `${m.toString().padStart(2, "0")}:${d.toString().padStart(2, "0")}`;

  // ⏰ WAKTU HABIS
if (waktu <= 0 && !sudahDikirim) {
  clearInterval(intervalTimer);
  localStorage.removeItem(LS_WAKTU_KEY);

  tampilkanToast("⏰ Waktu habis! Jawaban dikirim otomatis.");

  btnNext.disabled = true;
  btnPrev.disabled = true;

  document.querySelectorAll("input, textarea")
    .forEach(el => el.disabled = true);

  simpanJawaban(); // 🔥 WAJIB
  simpanJawabanFirestore();
  return;
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
if (!navigator.onLine) {

  tampilkanToast(
    "❌ Tidak ada koneksi internet!"
  );

  btnNext.disabled = false;
  btnPrev.disabled = false;

  sudahDikirim = false;
  sudahSelesai = false;

  return;
}
if (sudahDikirim) return;

  btnNext.disabled = true;
  btnPrev.disabled = true;

  simpanJawaban();

  // ❗ VALIDASI
if (!jadwal || !jadwal.guruId) {

  console.error("❌ Jadwal belum siap!");

  tampilkanToast("Terjadi kesalahan, coba lagi...");

  btnNext.disabled = false;
  btnPrev.disabled = false;

  sudahDikirim = false;
  sudahSelesai = false;

  return;
}

  sudahDikirim = true;
  sudahSelesai = true;

  const nilai = hitungNilai();
  const docId = `${siswaUid}_${kodeUjian}`;

  try {

    // ================= SIMPAN JAWABAN =================
    await setDoc(doc(db, "jawaban_siswa", docId), {

      siswaUid,
      namaSiswa,
      kelas: kelasSiswa,
      mapel: mapelUjian,

      guruId: jadwal.guruId || "",
      bankSoalId: jadwal.bankSoalId || "",

      judulUjian: judulUjian,

      jawabanPG: jawabanSiswa.pg,
      jawabanMCMA: jawabanSiswa.mcma,
      jawabanKategori: jawabanSiswa.kategori,
      jawabanEssay: jawabanSiswa.essay,

      nilaiPG: nilai.nilaiPG,
      nilaiEssay: nilai.nilaiEssay,
      totalNilai: nilai.totalNilai,

      statusNilai: "belum",

      waktu_mulai: waktuMulai,
      waktu_selesai: serverTimestamp()

    });

    // ================= UPDATE PESERTA =================
    await setDoc(doc(db, "peserta", siswaUid), {

      status: "selesai",
      lastOnline: serverTimestamp()

    }, { merge: true });

    console.log("✅ Jawaban tersimpan");

    // ✅ HAPUS STORAGE HANYA JIKA BERHASIL
    localStorage.setItem(LS_KIRIM_KEY, "true");

    localStorage.removeItem(LS_JAWABAN_KEY);
    localStorage.removeItem(LS_WAKTU_KEY);
    localStorage.removeItem(LS_SOAL_KEY);

    await lepasSesiUjian();

    setTimeout(() => {
      window.location.replace("selesai.html");
    }, 1200);

  } catch (err) {

    console.error("❌ Firestore error:", err);

    tampilkanToast(
      "❌ Gagal mengirim jawaban. Periksa internet!"
    );

    // ✅ AKTIFKAN LAGI TOMBOL
    btnNext.disabled = false;
    btnPrev.disabled = false;

    // ✅ RESET STATUS
    sudahDikirim = false;
    sudahSelesai = false;
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

// ================= LOGOUT =================
btnLogout.onclick = () => modal.classList.add("show");
cancelLogout.onclick = () => modal.classList.remove("show");

// hapus definisi lama confirmLogout.onclick
let isLoggingOut = false;

confirmLogout.onclick = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  simpanJawaban();

  await setDoc(doc(db, "peserta", siswaUid), {
    status: "keluar",
    lastOnline: serverTimestamp()
  }, { merge: true });

  await lepasSesiUjian();

  sessionStorage.clear();

  localStorage.removeItem(LS_SOAL_KEY);
  localStorage.removeItem(LS_JAWABAN_KEY);
  localStorage.removeItem(LS_WAKTU_KEY);

  location.href = "../login-siswa.html";
};

// ================= SUBMIT MODAL =================
cancelSubmit.onclick = () => {
  submitModal.classList.remove("show");
};

let isSubmitting = false;

confirmSubmit.onclick = () => {
  if (isSubmitting) return;
  isSubmitting = true;

  btnNext.innerText = "Mengirim...";
  btnNext.disabled = true;

  submitModal.classList.remove("show");
  simpanJawaban();
  simpanJawabanFirestore();
};

window.addEventListener("beforeunload", () => {

  if (!sudahSelesai) {
    simpanJawaban();
  }

});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    tambahPelanggaran("⚠️ Tidak boleh pindah tab!");
  }
});

document.addEventListener("fullscreenchange", () => {

  if (!document.fullscreenElement) {

    tambahPelanggaran("⚠️ Tidak boleh keluar dari fullscreen!");

    document.documentElement.requestFullscreen()
      .catch(() => {});

  }

});

window.addEventListener("offline", () => {
  tampilkanToast("⚠️ Internet terputus!");
});

window.addEventListener("online", () => {
  tampilkanToast("✅ Internet tersambung kembali");
});

// ================= INIT =================
loadSoal(); 