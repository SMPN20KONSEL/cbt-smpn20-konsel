// ================= IMPORT FIREBASE =================
import { db }
from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= ELEMENT =================
const soalContainer =
  document.getElementById(
    "soal-container"
  );

const noSoalEl =
  document.getElementById(
    "no-soal"
  );

const timerEl =
  document.getElementById(
    "timer"
  );

const btnPrev =
  document.getElementById(
    "prev"
  );

const btnNext =
  document.getElementById(
    "next"
  );

const toastEl =
  document.getElementById(
    "toast"
  );

const btnLogout =
  document.getElementById(
    "btnLogout"
  );

const modal =
  document.getElementById(
    "logoutModal"
  );

const cancelLogout =
  document.getElementById(
    "cancelLogout"
  );

const confirmLogout =
  document.getElementById(
    "confirmLogout"
  );

const submitModal =
  document.getElementById(
    "submitModal"
  );

const cancelSubmit =
  document.getElementById(
    "cancelSubmit"
  );

const confirmSubmit =
  document.getElementById(
    "confirmSubmit"
  );

// ================= SESSION =================
const kodeUjian =
  sessionStorage.getItem(
    "kodeUjian"
  );

const namaSiswa =
  sessionStorage.getItem(
    "namaSiswa"
  );

const siswaUid =
  sessionStorage.getItem(
    "siswaUid"
  );

const kelasSiswa =
  sessionStorage.getItem(
    "kelasSiswa"
  );

const durasiUjian =
  Number(
    sessionStorage.getItem(
      "durasiUjian"
    ) || 30
  );

// ================= VALIDASI SESSION =================
if (
  !siswaUid ||
  !kodeUjian ||
  !namaSiswa
) {

  alert(
    "Sesi ujian tidak valid"
  );

  location.replace(
    "token.html"
  );

  throw new Error(
    "SESSION_INVALID"
  );

}

// ================= WAKTU MULAI =================
let waktuMulai =
  sessionStorage.getItem(
    "waktuMulai"
  );

if (!waktuMulai) {

  waktuMulai =
    Date.now();

  sessionStorage.setItem(
    "waktuMulai",
    waktuMulai
  );

}

// ================= USER =================
document.getElementById(
  "c-nama"
).textContent =
  namaSiswa || "Siswa";

// ================= GLOBAL =================
let semuaSoal = [];
let indexSoal = 0;

let jadwal = {};

let mapelUjian = "";
let judulUjian = "";

let isSubmitting = false;
let sudahDikirim = false;
let sudahSelesai = false;

let toastTimer;
let sudahLoadSoal = false;
let timerInterval = null;
// ================= STORAGE =================
const LS_JAWABAN =
  `jawaban_${siswaUid}_${kodeUjian}`;

const LS_WAKTU =
  `waktu_${siswaUid}_${kodeUjian}`;

const LS_SOAL =
  `soal_${siswaUid}_${kodeUjian}`;

const LS_KIRIM =
  `kirim_${siswaUid}_${kodeUjian}`;

// ================= RESET CACHE =================
const lastKode =
  localStorage.getItem(
    "last_kode_ujian"
  );

if (
  lastKode !== kodeUjian
) {

  localStorage.removeItem(
    LS_JAWABAN
  );

  localStorage.removeItem(
    LS_SOAL
  );

  localStorage.removeItem(
    LS_WAKTU
  );

  localStorage.setItem(
    "last_kode_ujian",
    kodeUjian
  );

}

// ================= FINAL GUARD =================
if (
  localStorage.getItem(
    LS_KIRIM
  ) === "true"
) {

  location.replace(
    "selesai.html"
  );

}

// ================= JAWABAN =================
let jawabanSiswa = {
  pg: {},
  mcma: {},
  kategori: {},
  essay: {}
};

// ================= TOAST =================
function toast(msg) {

  clearTimeout(
    toastTimer
  );

  toastEl.textContent =
    msg;

  toastEl.style.display =
    "block";

  toastTimer =
    setTimeout(() => {

      toastEl.style.display =
        "none";

    }, 3000);

}

// ================= SHUFFLE =================
function shuffle(arr) {

  const a = [...arr];

  for (
    let i = a.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [a[i], a[j]] =
      [a[j], a[i]];

  }

  return a;

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

      jawabanSiswa.pg[
        soal.id
      ] =
        pilih.dataset.key;

    }

  }

// ================= MCMA =================

  if (soal.tipe === "mcma") {
   const checked =
    document.querySelectorAll(
      `input[name="soal_${soal.id}"]:checked`
    );

  jawabanSiswa.mcma[
    soal.id
  ] =
    Array.from(checked)
    .map(cb => cb.value);

}

// ================= KATEGORI =================
if (soal.tipe === "kategori") {

  const hasil = [];

  document
    .querySelectorAll(
      `[data-kat="${soal.id}"]`
    )
    .forEach((row) => {

      const pilih =
        row.querySelector(
          "input:checked"
        );

      hasil.push(
        pilih
          ? pilih.value === "true"
          : null
      );

    });

  jawabanSiswa.kategori[
    soal.id
  ] = hasil;

}

  // ================= ESSAY =================
  if (soal.tipe === "essay") {

    const textarea =
      document.querySelector(
        `textarea[name="soal_${soal.id}"]`
      );

    jawabanSiswa.essay[
      soal.id
    ] =
      textarea?.value.trim()
      || "";

  }

  localStorage.setItem(
    LS_JAWABAN,
    JSON.stringify(
      jawabanSiswa
    )
  );

}

function hitungNilai() {

  let totalSkor = 0;
  let totalMaks = 0;

  semuaSoal.forEach((soal) => {

    // =====================================
    // HANYA SOAL YANG DINILAI
    // =====================================
    const tipeValid = [
      "pg",
      "mcma",
      "kategori"
    ];

    if (!tipeValid.includes(soal.tipe)) {
      return;
    }

    // tiap soal maksimal 2 poin
    totalMaks += 2;

    // =====================================
    // PILIHAN GANDA
    // =====================================
    if (soal.tipe === "pg") {

      const jawaban =
        String(
          jawabanSiswa.pg?.[soal.id] || ""
        );

      const kunci =
        String(soal.kunci || "");

      if (jawaban === kunci) {
        totalSkor += 2;
      }

    }

    // =====================================
    // MCMA
    // =====================================
    else if (soal.tipe === "mcma") {

      const kunci =
        Array.isArray(soal.kunci)
          ? soal.kunci
          : [];

      const jawaban =
        Array.isArray(
          jawabanSiswa.mcma?.[soal.id]
        )
          ? jawabanSiswa.mcma[soal.id]
          : [];

      // jika tidak ada kunci
      if (kunci.length > 0) {

        let benar = 0;
        let salah = 0;

        jawaban.forEach((j) => {

          if (kunci.includes(j)) {
            benar++;
          } else {
            salah++;
          }

        });

        // =============================
        // SKOR BERSIH
        // =============================
        let skorBersih =
          benar - salah;

        // minimal 0
        skorBersih =
          Math.max(0, skorBersih);

        // maksimal jumlah kunci
        skorBersih =
          Math.min(
            skorBersih,
            kunci.length
          );

        // konversi ke 2 poin
        const nilaiMcma =
          (skorBersih / kunci.length) * 2;

        totalSkor += nilaiMcma;

      }

    }

    // =====================================
    // KATEGORI
    // =====================================
    else if (soal.tipe === "kategori") {

      const pernyataan =
        Array.isArray(soal.pernyataan)
          ? soal.pernyataan
          : [];

      const jawaban =
        Array.isArray(
          jawabanSiswa.kategori?.[soal.id]
        )
          ? jawabanSiswa.kategori[soal.id]
          : [];

      if (pernyataan.length > 0) {

        let benar = 0;

        pernyataan.forEach((p, i) => {

          if (
            String(jawaban[i]) ===
            String(p.jawabanBenar)
          ) {
            benar++;
          }

        });

        const nilaiKategori =
          (benar / pernyataan.length) * 2;

        totalSkor += nilaiKategori;

      }

    }

  });

  // =====================================
  // PEMBULATAN SKOR
  // =====================================
  totalSkor =
    Number(totalSkor.toFixed(2));

  // =====================================
  // NILAI AKHIR
  // =====================================
  const nilaiAkhir =
    totalMaks > 0
      ? (totalSkor / totalMaks) * 100
      : 0;

  // =====================================
  // RETURN
  // =====================================
  return {

    nilaiPG:
      Number(
        nilaiAkhir.toFixed(2)
      ),

    nilaiEssay: 0,

    totalNilai:
      Math.round(nilaiAkhir),

    // tambahan info
    totalSkor,

    totalMaks

  };

}

// ================= TAMPILKAN SOAL =================
function tampilkanSoal() {

  if (
    !semuaSoal.length
  ) {

    soalContainer.innerHTML =
      "<p>Tidak ada soal</p>";

    return;

  }

  const soal =
    semuaSoal[indexSoal];

  noSoalEl.textContent =
    indexSoal + 1;

  let html = `
    <div class="soal-item">

      <div class="soal-text">
        ${
          DOMPurify.sanitize(
            soal.pertanyaan || ""
          )
        }
      </div>
  `;

  // ================= PG =================
  if (
    soal.tipe === "pg"
  ) {

    html += `
      <div class="opsi">
    `;

    (soal.opsi || [])
    .forEach(([key, teks]) => {

      html += `
        <label>

          <input
            type="radio"
            name="soal_${soal.id}"
            data-key="${key}"

            ${
              jawabanSiswa.pg[
                soal.id
              ] === key
              ? "checked"
              : ""
            }
          >

          <span>
            ${
              DOMPurify.sanitize(
                teks || ""
              )
            }
          </span>

        </label>
      `;

    });

    html += `
      </div>
    `;

  }

  // ================= MCMA =================
if (
  soal.tipe === "mcma"
) {

  html += `
    <div class="opsi">
  `;

  (soal.opsi || [])
  .forEach(([key, teks]) => {

    html += `
      <label>

        <input
          type="checkbox"
          name="soal_${soal.id}"
          value="${key}"

          ${
            jawabanSiswa.mcma?.[
              soal.id
            ]?.includes(key)
              ? "checked"
              : ""
          }
        >

        <span>
          ${
            DOMPurify.sanitize(
              teks || ""
            )
          }
        </span>

      </label>
    `;

  });

  html += `
    </div>
  `;

}

// ================= KATEGORI =================
if (
  soal.tipe === "kategori"
) {

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

  (soal.pernyataan || [])
  .forEach((p, i) => {

    const jawab =
      jawabanSiswa.kategori?.[
        soal.id
      ]?.[i];

    html += `
      <tr data-kat="${soal.id}">

        <td>
          ${
            DOMPurify.sanitize(
              p.teks || ""
            )
          }
        </td>

        <td>
          <input
            type="radio"
            name="kat_${soal.id}_${i}"
            value="true"

            ${
              jawab === true
                ? "checked"
                : ""
            }
          >
        </td>

        <td>
          <input
            type="radio"
            name="kat_${soal.id}_${i}"
            value="false"

            ${
              jawab === false
                ? "checked"
                : ""
            }
          >
        </td>

      </tr>
    `;

  });

  html += `
      </tbody>

    </table>
  `;

}

  // ================= ESSAY =================
  if (
    soal.tipe === "essay"
  ) {

    html += `
      <textarea
        name="soal_${soal.id}"
        rows="5"
      >${
        jawabanSiswa.essay[
          soal.id
        ] || ""
      }</textarea>
    `;

  }

  html += `
    </div>
  `;

  soalContainer.innerHTML =
    html;

  // ================= MATHJAX =================
  if (
    window.MathJax &&
    typeof MathJax.typesetPromise
    === "function"
  ) {

    requestAnimationFrame(() => {

      MathJax.typesetPromise([
        soalContainer
      ])
      .catch(console.error);

    });

  }

  // ================= BUTTON =================
  btnPrev.disabled =
    indexSoal === 0;

  btnNext.textContent =
    indexSoal ===
    semuaSoal.length - 1
      ? "Kirim"
      : "Selanjutnya";

}

// ================= LOAD SOAL =================
async function loadSoal() {

  if (
    sudahLoadSoal
  ) return;

  sudahLoadSoal = true;

  soalContainer.innerHTML =
    "<p>Memuat soal...</p>";

  try {

    // ================= JADWAL =================
    const jadwalSnap =
      await getDoc(
        doc(
          db,
          "jadwal_ujian",
          kodeUjian
        )
      );

    if (
      !jadwalSnap.exists()
    ) {

      soalContainer.innerHTML =
        "<p>Jadwal tidak ditemukan</p>";

      return;

    }

    jadwal =
      jadwalSnap.data();

    mapelUjian =
      jadwal.mapel || "";

    judulUjian =
      jadwal.judul || "";

    // ================= BANK =================
    const bankSnap =
      await getDoc(
        doc(
          db,
          "bank_soal",
          jadwal.bankSoalId
        )
      );

    if (
      !bankSnap.exists()
    ) {

      soalContainer.innerHTML =
        "<p>Bank soal tidak ditemukan</p>";

      return;

    }

    const bank =
      bankSnap.data() || {};

    let id = 0;

    const soalPG =
      (bank.soalPG || [])
      .map((s) => ({

        tipe: "pg",

        id: id++,

        pertanyaan:
          s.pertanyaan,

        opsi:
          shuffle(
            Object.entries(
              s.opsi || {}
            )
          ),

        kunci:
          s.jawabanBenar
          || s.kunci,
         skor: s.skor || 2
      }));

const soalMCMA =
  (bank.soalMCMA || [])
  .map((s) => ({

    tipe: "mcma",

    id: id++,

    pertanyaan:
      s.pertanyaan,

    opsi:
      shuffle(
        Object.entries(
          s.opsi || {}
        )
      ),

    kunci:
      s.jawabanBenar
      || [],
    skor: s.skor || 2
  }));
    const soalKategori = (bank.soalKategori || []).map(s => ({
      tipe: "kategori",
      id: id++,
      pertanyaan: (s.pertanyaan),
      pernyataan: shuffle(
        (s.pernyataan || []).map((p, i) => ({
          ...p,
          originalIndex: i
        }))
      ),
      skor: s.skor || 2
    }));

   const soalEssay = (bank.soalEssay || []).map(s => ({
      tipe: "essay",
      id: id++,
      pertanyaan: (s.pertanyaan),
      skorMax: s.skorMax || 20
    }));
 
    const cacheUrutan = localStorage.getItem(LS_SOAL);

    if (cacheUrutan) {
      semuaSoal = JSON.parse(cacheUrutan);
    } else {
      const soalObjektif = shuffle([
        ...soalPG,
        ...soalMCMA,
        ...soalKategori
      ]);

      semuaSoal = [...soalObjektif, ...soalEssay];

      localStorage.setItem(LS_SOAL, JSON.stringify(semuaSoal));
    }


    // ================= CACHE =================
    const cacheSoal =
      localStorage.getItem(
        LS_SOAL
      );

    if (cacheSoal) {

      try {

        semuaSoal =
          JSON.parse(
            cacheSoal
          );

      } catch {

        semuaSoal = [];

        localStorage.removeItem(
          LS_SOAL
        );

      }

    }

    // ================= GENERATE =================
    if (
      !semuaSoal.length
    ) {

semuaSoal = [

  ...shuffle(
    soalPG
  ),

  ...shuffle(
    soalMCMA
  ),

  ...shuffle(
    soalKategori
  ),

  ...soalEssay

];

      localStorage.setItem(
        LS_SOAL,
        JSON.stringify(
          semuaSoal
        )
      );

    }

    // ================= CACHE JAWABAN =================
    const cacheJawaban =
      localStorage.getItem(
        LS_JAWABAN
      );

    if (cacheJawaban) {

      try {

        jawabanSiswa =
          JSON.parse(
            cacheJawaban
          );

      } catch {

        jawabanSiswa = {
          pg: {},
          mcma: {},
          kategori: {},
          essay: {}
        };

      }

    }

    tampilkanSoal();

    mulaiTimer();

  } catch (err) {

    console.error(err);

    soalContainer.innerHTML =
      "<p>Gagal memuat soal</p>";

  }

}

// ================= NEXT =================
btnNext.onclick = () => {

  if (
    !semuaSoal.length
  ) return;

  simpanJawaban();

  // ================= KIRIM =================
  if (
    indexSoal ===
    semuaSoal.length - 1
  ) {

    submitModal.classList.add(
      "show"
    );

    return;

  }

  indexSoal++;

  tampilkanSoal();

};

// ================= PREV =================
btnPrev.onclick = () => {

  simpanJawaban();

  if (
    indexSoal > 0
  ) {

    indexSoal--;

    tampilkanSoal();

  }

};

// ================= TIMER =================
function mulaiTimer() {

  let waktuCache =
    localStorage.getItem(
      LS_WAKTU
    );

  let waktu =
    waktuCache !== null
    ? Number(waktuCache)
    : durasiUjian * 60;

  if (
    isNaN(waktu)
  ) {

    waktu =
      durasiUjian * 60;

  }

  clearInterval(timerInterval);
  timerInterval =
  setInterval(() => {

      const menit =
        Math.floor(
          waktu / 60
        );

      const detik =
        waktu % 60;

      timerEl.textContent =
        `${String(menit).padStart(2,"0")}:${String(detik).padStart(2,"0")}`;

      localStorage.setItem(
        LS_WAKTU,
        waktu
      );

      // ================= HABIS =================
      if (waktu <= 0) {

        clearInterval(timerInterval);

        timerEl.textContent =
          "00:00";

        if (
          !sudahDikirim
        ) {

          toast(
            "Waktu habis"
          );

          simpanJawaban();

          simpanJawabanFirestore();

        }

        return;

      }

      waktu--;

    }, 1000);

}

// ================= SIMPAN FIRESTORE =================
async function simpanJawabanFirestore() {

  if (
    sudahDikirim ||
    isSubmitting
  ) return;

  isSubmitting = true;
  sudahDikirim = true;
  sudahSelesai = true;
const nilai = hitungNilai();
  try {

    await setDoc(doc(db, "jawaban_siswa", `${siswaUid}_${kodeUjian}`),{

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

      }
    );

    // ================= UPDATE PESERTA =================
    await setDoc(
      doc(
        db,
        "peserta",
        siswaUid
      ),
      {
        status:
          "selesai",

        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

    // ================= STORAGE =================
    localStorage.setItem(
      LS_KIRIM,
      "true"
    );

    localStorage.removeItem(
      LS_JAWABAN
    );

    localStorage.removeItem(
      LS_WAKTU
    );

    localStorage.removeItem(
      LS_SOAL
    );

    toast(
      "Jawaban berhasil dikirim"
    );

    setTimeout(() => {

      location.replace(
        "selesai.html"
      );

    }, 1500);

  } catch (err) {

    console.error(err);

    toast(
      "Gagal mengirim jawaban"
    );

    sudahDikirim = false;
    sudahSelesai = false;

  }

}

// ================= SUBMIT =================
cancelSubmit.onclick = () => {

  submitModal.classList.remove(
    "show"
  );

};

confirmSubmit.onclick = () => {

  submitModal.classList.remove(
    "show"
  );

  simpanJawaban();

  simpanJawabanFirestore();

};

// ================= LOGOUT =================
btnLogout.onclick = () => {

  modal.classList.add(
    "show"
  );

};

cancelLogout.onclick = () => {

  modal.classList.remove(
    "show"
  );

};

confirmLogout.onclick =
  async () => {

    simpanJawaban();

    await setDoc(
      doc(
        db,
        "peserta",
        siswaUid
      ),
      {
        status:
          "keluar",

        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

    sessionStorage.clear();

    location.replace(
      "../login-siswa.html"
    );

};

// ================= BEFORE UNLOAD =================
window.addEventListener(
  "beforeunload",
  () => {

    if (
      !sudahSelesai &&
      !isSubmitting
    ) {

      simpanJawaban();

    }

  }
);

// ================= INIT =================
loadSoal();