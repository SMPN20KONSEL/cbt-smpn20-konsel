// ================= FIREBASE =================
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= ELEMENT =================
const soalContainer = document.getElementById("soal-container");
const noSoalEl = document.getElementById("no-soal");
const timerEl = document.getElementById("timer");

const btnPrev = document.getElementById("prev");
const btnNext = document.getElementById("next");

const toastEl = document.getElementById("toast");

// ================= SESSION =================
const kodeUjian = sessionStorage.getItem("kodeUjian");
const namaSiswa = sessionStorage.getItem("namaSiswa");
const siswaUid = sessionStorage.getItem("siswaUid");
const waktuMulai = sessionStorage.getItem("waktuMulai");
const kelasSiswa = sessionStorage.getItem("kelasSiswa");
const durasiUjian = sessionStorage.getItem("durasiUjian");

if (!siswaUid || !kodeUjian) {
  location.href = "login-siswa.html";
}

// ================= STORAGE =================
const LS_JAWABAN =
  `jawaban_${siswaUid}_${kodeUjian}`;

const LS_SOAL =
  `soal_${siswaUid}_${kodeUjian}`;

const LS_WAKTU =
  `waktu_${siswaUid}_${kodeUjian}`;

const LS_KIRIM =
  `kirim_${siswaUid}_${kodeUjian}`;

// ================= GLOBAL =================
let semuaSoal = [];
let indexSoal = 0;

let sudahDikirim = false;

let jawabanSiswa = {
  pg: {},
  mcma: {},
  kategori: {},
  essay: {}
};

let jadwal = {};

// ================= TOAST =================
function toast(msg) {

  toastEl.textContent = msg;
  toastEl.style.display = "block";

  setTimeout(() => {
    toastEl.style.display = "none";
  }, 3000);

}

// ================= SHUFFLE =================
function shuffle(arr) {

  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

// ================= SIMPAN LOCAL =================
function simpanLocal() {

  localStorage.setItem(
    LS_JAWABAN,
    JSON.stringify(jawabanSiswa)
  );

}

// ================= LOAD SOAL =================
async function loadSoal() {

  soalContainer.innerHTML =
    "<p>Memuat soal...</p>";

  try {

    const jadwalSnap = await getDoc(
      doc(db, "jadwal_ujian", kodeUjian)
    );

    if (!jadwalSnap.exists()) {

      soalContainer.innerHTML =
        "<p>Jadwal tidak ditemukan</p>";

      return;
    }

    jadwal = jadwalSnap.data();

    const bankSnap = await getDoc(
      doc(db, "bank_soal", jadwal.bankSoalId)
    );

    if (!bankSnap.exists()) {

      soalContainer.innerHTML =
        "<p>Bank soal tidak ditemukan</p>";

      return;
    }

    const bank = bankSnap.data();

    let id = 0;

    const soalPG =
      (bank.soalPG || []).map(s => ({
        tipe: "pg",
        id: id++,
        pertanyaan: s.pertanyaan,
        opsi: shuffle(
          Object.entries(s.opsi)
        ),
        kunci: s.jawabanBenar
      }));

    const soalMCMA =
      (bank.soalMCMA || []).map(s => ({
        tipe: "mcma",
        id: id++,
        pertanyaan: s.pertanyaan,
        opsi: shuffle(
          Object.entries(s.opsi)
        ),
        kunci: s.jawabanBenar || []
      }));

    const soalEssay =
      (bank.soalEssay || []).map(s => ({
        tipe: "essay",
        id: id++,
        pertanyaan: s.pertanyaan
      }));

    // ================= CACHE =================
    const cacheSoal =
      localStorage.getItem(LS_SOAL);

    if (cacheSoal) {

      semuaSoal =
        JSON.parse(cacheSoal);

    } else {

      semuaSoal = shuffle([
        ...soalPG,
        ...soalMCMA,
        ...soalEssay
      ]);

      localStorage.setItem(
        LS_SOAL,
        JSON.stringify(semuaSoal)
      );

    }

    // ================= CACHE JAWABAN =================
    const cacheJawaban =
      localStorage.getItem(LS_JAWABAN);

    if (cacheJawaban) {

      jawabanSiswa =
        JSON.parse(cacheJawaban);

    }

    tampilkanSoal();

  } catch (err) {

    console.error(err);

    soalContainer.innerHTML =
      "<p>Gagal memuat soal</p>";

  }

}

// ================= TAMPILKAN =================
function tampilkanSoal() {

  const soal =
    semuaSoal[indexSoal];

  if (!soal) return;

  noSoalEl.textContent =
    indexSoal + 1;

  let html = `
    <div class="soal-item">

      <div class="soal-text">
        ${soal.pertanyaan}
      </div>
  `;

  // ================= PG =================
  if (soal.tipe === "pg") {

    soal.opsi.forEach(([key, val]) => {

      const checked =
        jawabanSiswa.pg[soal.id] === key
        ? "checked"
        : "";

      html += `
        <label class="opsi">

          <input
            type="radio"
            name="soal_${soal.id}"
            value="${key}"
            ${checked}
          >

          ${val}

        </label>
      `;

    });

  }

  // ================= MCMA =================
  if (soal.tipe === "mcma") {

    soal.opsi.forEach(([key, val]) => {

      const checked =
        jawabanSiswa.mcma[soal.id]
        ?.includes(key)
          ? "checked"
          : "";

      html += `
        <label class="opsi">

          <input
            type="checkbox"
            value="${key}"
            name="soal_${soal.id}"
            ${checked}
          >

          ${val}

        </label>
      `;

    });

  }

  // ================= ESSAY =================
  if (soal.tipe === "essay") {

    html += `
      <textarea
        name="essay_${soal.id}"
        rows="5"
      >${jawabanSiswa.essay[soal.id] || ""}</textarea>
    `;
  }

  html += `</div>`;

  soalContainer.innerHTML = html;

  btnPrev.disabled =
    indexSoal === 0;

  btnNext.innerText =
    indexSoal === semuaSoal.length - 1
      ? "Kirim"
      : "Next";

}

// ================= SIMPAN JAWABAN =================
function simpanJawaban() {

  const soal =
    semuaSoal[indexSoal];

  if (!soal) return;

  // ================= PG =================
  if (soal.tipe === "pg") {

    const pilih =
      document.querySelector(
        `input[name="soal_${soal.id}"]:checked`
      );

    if (pilih) {

      jawabanSiswa.pg[soal.id] =
        pilih.value;

    }

  }

  // ================= MCMA =================
  if (soal.tipe === "mcma") {

    const pilih =
      document.querySelectorAll(
        `input[name="soal_${soal.id}"]:checked`
      );

    jawabanSiswa.mcma[soal.id] =
      Array.from(pilih).map(i => i.value);

  }

  // ================= ESSAY =================
  if (soal.tipe === "essay") {

    const textarea =
      document.querySelector(
        `textarea[name="essay_${soal.id}"]`
      );

    if (textarea) {

      jawabanSiswa.essay[soal.id] =
        textarea.value.trim();

    }

  }

  simpanLocal();

}

// ================= NEXT =================
btnNext.onclick = () => {

  simpanJawaban();

  if (
    indexSoal === semuaSoal.length - 1
  ) {

    submitUjian();

  } else {

    indexSoal++;
    tampilkanSoal();

  }

};

// ================= PREV =================
btnPrev.onclick = () => {

  simpanJawaban();

  if (indexSoal > 0) {

    indexSoal--;
    tampilkanSoal();

  }

};

// ================= TIMER =================
let waktu =
  Number(
    localStorage.getItem(LS_WAKTU)
  ) ||
  (Number(durasiUjian || 30) * 60);

const timer = setInterval(() => {

  const menit =
    Math.floor(waktu / 60);

  const detik =
    waktu % 60;

  timerEl.textContent =
    `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}`;

  waktu--;

  localStorage.setItem(
    LS_WAKTU,
    waktu
  );

  if (waktu <= 0) {

    clearInterval(timer);

    submitUjian();

  }

}, 1000);

// ================= SUBMIT =================
async function submitUjian() {

  if (sudahDikirim) return;

  sudahDikirim = true;

  simpanJawaban();

  btnNext.disabled = true;
  btnPrev.disabled = true;

  try {

    await setDoc(
      doc(
        db,
        "jawaban_siswa",
        `${siswaUid}_${kodeUjian}`
      ),
      {
        siswaUid,
        namaSiswa,
        kelas: kelasSiswa,

        kodeUjian,

        jawabanPG:
          jawabanSiswa.pg,

        jawabanMCMA:
          jawabanSiswa.mcma,

        jawabanEssay:
          jawabanSiswa.essay,

        waktuMulai,
        waktuSelesai:
          serverTimestamp(),

        createdAt:
          serverTimestamp()
      }
    );

    localStorage.setItem(
      LS_KIRIM,
      "true"
    );

    localStorage.removeItem(
      LS_JAWABAN
    );

    localStorage.removeItem(
      LS_SOAL
    );

    localStorage.removeItem(
      LS_WAKTU
    );

    toast("✅ Jawaban berhasil dikirim");

    setTimeout(() => {

      location.href =
        "selesai.html";

    }, 1200);

  } catch (err) {

    console.error(err);

    toast("❌ Gagal mengirim");

    sudahDikirim = false;

    btnNext.disabled = false;
    btnPrev.disabled = false;

  }

}

// ================= AUTO SAVE LOCAL ONLY =================
window.addEventListener(
  "beforeunload",
  simpanJawaban
);

// ================= START =================
loadSoal();