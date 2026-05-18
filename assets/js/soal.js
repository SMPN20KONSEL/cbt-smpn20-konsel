// ================= IMPORT FIREBASE =================
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= ELEMENT =================
const soalContainer = document.getElementById("soal-container");
const noSoalEl = document.getElementById("no-soal");
const timerEl = document.getElementById("timer");

const btnPrev = document.getElementById("prev");
const btnNext = document.getElementById("next");

const toastEl = document.getElementById("toast");

const btnLogout = document.getElementById("btnLogout");

const modal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

const submitModal = document.getElementById("submitModal");
const cancelSubmit = document.getElementById("cancelSubmit");
const confirmSubmit = document.getElementById("confirmSubmit");

// ================= SESSION =================
const kodeUjian = sessionStorage.getItem("kodeUjian");
const namaSiswa = sessionStorage.getItem("namaSiswa");
const siswaUid = sessionStorage.getItem("siswaUid");
const waktuMulai = sessionStorage.getItem("waktuMulai");
const kelasSiswa = sessionStorage.getItem("kelasSiswa");
const durasiUjian = Number(
  sessionStorage.getItem("durasiUjian") || 30
);

if (!siswaUid || !kodeUjian || !waktuMulai) {
  alert("Sesi ujian tidak valid");
  location.href = "login-siswa.html";
}

document.getElementById("c-nama").textContent =
  namaSiswa || "Siswa";

// ================= GLOBAL =================
let semuaSoal = [];
let indexSoal = 0;

let jadwal = {};

let mapelUjian = "";
let judulUjian = "";

let sudahDikirim = false;
let sudahSelesai = false;

let pelanggaran = 0;
let lastPelanggaranTime = 0;

let toastTimer;

let jawabanSiswa = {
  pg: {},
  mcma: {},
  kategori: {},
  essay: {}
};

// ================= STORAGE =================
const LS_JAWABAN =
  `jawaban_${siswaUid}_${kodeUjian}`;

const LS_WAKTU =
  `waktu_${siswaUid}_${kodeUjian}`;

const LS_SOAL =
  `soal_${siswaUid}_${kodeUjian}`;

const LS_KIRIM =
  `kirim_${siswaUid}_${kodeUjian}`;
  if (
  localStorage.getItem(LS_KIRIM)
  === "true"
) {

  location.href =
    "selesai.html";

}
// ================= TOAST =================
function toast(msg) {

  clearTimeout(toastTimer);

  toastEl.textContent = msg;
  toastEl.style.display = "block";

  toastTimer = setTimeout(() => {

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

// ================= SIMPAN JAWABAN =================
function simpanJawaban() {

  const soal = semuaSoal[indexSoal];

  if (!soal) return;

  // ================= PG =================
  if (soal.tipe === "pg") {

    const pilih = document.querySelector(
      `input[name="soal_${soal.id}"]:checked`
    );

    if (pilih) {

      jawabanSiswa.pg[soal.id] =
        pilih.dataset.key;

    }

  }

  // ================= MCMA =================
  if (soal.tipe === "mcma") {

    const checked = document.querySelectorAll(
      `input[name="soal_${soal.id}"]:checked`
    );

    jawabanSiswa.mcma[soal.id] =
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

    jawabanSiswa.kategori[soal.id] =
      hasil;

  }

  // ================= ESSAY =================
  if (soal.tipe === "essay") {

    const textarea = document.querySelector(
      `textarea[name="soal_${soal.id}"]`
    );

    jawabanSiswa.essay[soal.id] =
      textarea?.value.trim() || "";

  }

  // ================= LOCAL SAVE =================
  localStorage.setItem(
    LS_JAWABAN,
    JSON.stringify(jawabanSiswa)
  );

}

// ================= HITUNG NILAI =================
function hitungNilai() {

  let skor = 0;
  let total = 0;

  semuaSoal.forEach((soal) => {

    // ================= BATASI TIPE =================
    if (
      !["pg", "mcma", "kategori"]
      .includes(soal.tipe)
    ) return;

    total += 2;

    // ================= PG =================
    if (soal.tipe === "pg") {

      const jawaban =
        jawabanSiswa.pg?.[soal.id];

      if (
        String(jawaban) ===
        String(soal.kunci)
      ) {

        skor += 2;

      }

    }

    // ================= MCMA =================
    if (soal.tipe === "mcma") {

      const kunci =
        Array.isArray(soal.kunci)
        ? soal.kunci
        : [];

      const jawab =
        Array.isArray(
          jawabanSiswa.mcma?.[soal.id]
        )
        ? jawabanSiswa.mcma[soal.id]
        : [];

      // jika tidak ada kunci
      if (kunci.length === 0) return;

      let benar = 0;

      jawab.forEach((j) => {

        if (kunci.includes(j)) {
          benar++;
        }

      });

      // maksimal benar = jumlah kunci
      benar = Math.min(
        benar,
        kunci.length
      );

      const nilaiMcma =
        (benar / kunci.length) * 2;

      skor += nilaiMcma;

    }

    // ================= KATEGORI =================
    if (soal.tipe === "kategori") {

      const pernyataan =
        Array.isArray(
          soal.pernyataan
        )
        ? soal.pernyataan
        : [];

      const jawab =
        Array.isArray(
          jawabanSiswa.kategori?.[soal.id]
        )
        ? jawabanSiswa.kategori[soal.id]
        : [];

      // cegah division by zero
      if (pernyataan.length === 0)
        return;

      let benar = 0;

      pernyataan.forEach((p, i) => {

        if (
          String(jawab[i]) ===
          String(p.jawabanBenar)
        ) {

          benar++;

        }

      });

      const nilaiKategori =
        (benar / pernyataan.length)
        * 2;

      skor += nilaiKategori;

    }

  });

  // ================= NORMALISASI =================
  skor =
    Number(skor.toFixed(2));

  const nilaiAkhir =
    total > 0
    ? (skor / total) * 100
    : 0;

  return {

    nilaiPG:
      Number(
        nilaiAkhir.toFixed(2)
      ),

    nilaiEssay: 0,

    totalNilai:
      Math.round(nilaiAkhir)

  };

}

// ================= TAMPILKAN SOAL =================
function tampilkanSoal() {

  // ================= VALIDASI =================
  if (
    !Array.isArray(semuaSoal) ||
    semuaSoal.length === 0
  ) {

    soalContainer.innerHTML =
      "<p>Tidak ada soal</p>";

    return;

  }

  // ================= CEGAH INDEX ERROR =================
  if (
    indexSoal < 0 ||
    indexSoal >= semuaSoal.length
  ) {

    indexSoal = 0;

  }

  const soal =
    semuaSoal[indexSoal];

  // ================= VALIDASI SOAL =================
  if (!soal) {

    soalContainer.innerHTML =
      "<p>Soal tidak ditemukan</p>";

    return;

  }

  noSoalEl.textContent =
    indexSoal + 1;

  let html = `
    <div class="soal-item">

      <div class="soal-text">
        ${DOMPurify.sanitize(
          soal.pertanyaan || ""
        )}
      </div>
  `;

  // ================= PG =================
  if (soal.tipe === "pg") {

    html += `<div class="opsi">`;

    (soal.opsi || [])
    .forEach(([key, teks]) => {

      html += `
        <label>

          <input
            type="radio"
            name="soal_${soal.id}"
            data-key="${key}"
            ${
              jawabanSiswa.pg?.[soal.id]
              === key
                ? "checked"
                : ""
            }
          >

          <span>
            ${DOMPurify.sanitize(
              teks || ""
            )}
          </span>

        </label>
      `;

    });

    html += `</div>`;
  }

  // ================= MCMA =================
  if (soal.tipe === "mcma") {

    html += `<div class="opsi">`;

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
            ${DOMPurify.sanitize(
              teks || ""
            )}
          </span>

        </label>
      `;

    });

    html += `</div>`;
  }

  // ================= KATEGORI =================
  if (soal.tipe === "kategori") {

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
        <tr>

          <td>
            ${DOMPurify.sanitize(
              p.teks || ""
            )}
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
  if (soal.tipe === "essay") {

    html += `
      <textarea
        name="soal_${soal.id}"
        rows="5"
      >${
        jawabanSiswa.essay?.[
          soal.id
        ] || ""
      }</textarea>
    `;
  }

  html += `</div>`;

  // ================= RENDER =================
  soalContainer.innerHTML = html;

  // ================= MATHJAX =================
  if (
    window.MathJax &&
    typeof MathJax.typesetPromise
    === "function"
  ) {

    requestAnimationFrame(() => {

      MathJax.typesetPromise()
      .catch(err => console.log(err));

    });

  }

  // ================= BUTTON =================
  btnPrev.disabled =
    indexSoal === 0;

  btnNext.textContent =
    indexSoal === semuaSoal.length - 1
      ? "Kirim"
      : "Selanjutnya";

}
// ================= LOAD SOAL =================
async function loadSoal() {

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

    if (!jadwalSnap.exists()) {

      soalContainer.innerHTML =
        "<p>Jadwal tidak ditemukan</p>";

      return;

    }

    jadwal = jadwalSnap.data();

    mapelUjian =
      jadwal.mapel || "";

    judulUjian =
      jadwal.judul || "";

    // ================= BANK SOAL =================
    const bankSnap =
      await getDoc(
        doc(
          db,
          "bank_soal",
          jadwal.bankSoalId
        )
      );

    if (!bankSnap.exists()) {

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
          || s.kunci

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
          || []

      }));

    const soalKategori =
      (bank.soalKategori || [])
      .map((s) => ({

        tipe: "kategori",

        id: id++,

        pertanyaan:
          s.pertanyaan,

        pernyataan:
          s.pernyataan || []

      }));

    const soalEssay =
      (bank.soalEssay || [])
      .map((s) => ({

        tipe: "essay",

        id: id++,

        pertanyaan:
          s.pertanyaan

      }));

    // ================= CACHE SOAL =================
    const cacheSoal =
      localStorage.getItem(
        LS_SOAL
      );

    if (cacheSoal) {

      semuaSoal =
        JSON.parse(cacheSoal);

    } else {
semuaSoal = [
  ...shuffle(soalPG),
  ...shuffle(soalMCMA),
  ...shuffle(soalKategori),
  ...soalEssay
];

      localStorage.setItem(
        LS_SOAL,
        JSON.stringify(semuaSoal)
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
          JSON.parse(cacheJawaban);
        } 
        catch {
          jawabanSiswa = {
           pg: {},
           mcma: {},
           kategori: {},
          essay: {}
          };
        }
      }

    tampilkanSoal();

  } catch (err) {

    console.error(err);

    soalContainer.innerHTML =
      "<p>Gagal memuat soal</p>";

  }

}

// ================= NEXT =================
btnNext.onclick = () => {

  simpanJawaban();

  // ================= TERAKHIR =================
  if (
    indexSoal ===
    semuaSoal.length - 1
  ) {

    submitModal.classList.add("show");

    return;

  }

  indexSoal++;

  tampilkanSoal();

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
// ================= TIMER =================
let waktu =
  Number(
    localStorage.getItem(
      LS_WAKTU
    )
  ) ||
  durasiUjian * 60;

const timer = setInterval(() => {

  const menit =
    Math.floor(waktu / 60);

  const detik =
    waktu % 60;

  timerEl.textContent =
    `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}`;

  localStorage.setItem(
    LS_WAKTU,
    waktu
  );

  // ================= HABIS =================
  if (
    waktu <= 0 &&
    !sudahDikirim
  ) {

    clearInterval(timer);

    waktu = 0;

    timerEl.textContent =
      "00:00";

    toast(
      "Waktu habis, jawaban dikirim"
    );

    simpanJawaban();

    simpanJawabanFirestore();

    return;

  }

  waktu--;

}, 1000);

// ================= SIMPAN FINAL =================
async function simpanJawabanFirestore() {

  if (sudahDikirim) return;

  sudahDikirim = true;
  sudahSelesai = true;

  btnNext.disabled = true;
  btnPrev.disabled = true;

  const nilai =
    hitungNilai();

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

        kelas:
          kelasSiswa,

        mapel:
          mapelUjian,

        judulUjian,

        guruId:
          jadwal.guruId || "",

        bankSoalId:
          jadwal.bankSoalId || "",

        jawabanPG:
          jawabanSiswa.pg,

        jawabanMCMA:
          jawabanSiswa.mcma,

        jawabanKategori:
          jawabanSiswa.kategori,

        jawabanEssay:
          jawabanSiswa.essay,

        nilaiPG:
          nilai.nilaiPG,

        nilaiEssay:
          nilai.nilaiEssay,

        totalNilai:
          nilai.totalNilai,

        statusNilai:
          "belum",

        waktu_mulai:
          waktuMulai,

        waktu_selesai:
          serverTimestamp()
      }
    );

    // ================= UPDATE PESERTA =================
    await updateDoc(
      doc(db, "peserta", siswaUid),
      {
        status: "selesai",
        lastOnline:
          serverTimestamp()
      }
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

      location.href =
        "selesai.html";

    }, 1500);

  } catch (err) {

    console.error(err);

    toast(
      "Gagal mengirim jawaban"
    );

    sudahDikirim = false;
    sudahSelesai = false;

    btnNext.disabled = false;
    btnPrev.disabled = false;

  }

}

// ================= SUBMIT =================
cancelSubmit.onclick = () => {

  submitModal.classList.remove("show");

};

confirmSubmit.onclick = () => {

  submitModal.classList.remove("show");

  simpanJawaban();
  simpanJawabanFirestore();

};

// ================= LOGOUT =================
btnLogout.onclick = () => {

  modal.classList.add("show");

};

cancelLogout.onclick = () => {

  modal.classList.remove("show");

};

confirmLogout.onclick = async () => {

  simpanJawaban();

  await setDoc(
    doc(db, "peserta", siswaUid),
    {
      status: "keluar",
      lastOnline:
        serverTimestamp()
    },
    { merge: true }
  );

  sessionStorage.clear();

  location.href =
    "../login-siswa.html";

};

// ================= PELANGGARAN =================
async function tambahPelanggaran(pesan) {

  const now = Date.now();

  if (
    now - lastPelanggaranTime < 3000
  ) return;

  lastPelanggaranTime = now;

  pelanggaran++;

  toast(pesan);

await setDoc(
  doc(db, "peserta", siswaUid),
  {
    jumlahPelanggaran:
      pelanggaran,

    lastOnline:
      serverTimestamp()
  },
  { merge: true }
);

  if (
    pelanggaran >= 3 &&
    !sudahDikirim
  ) {

    toast(
      "Terlalu banyak pelanggaran"
    );

    simpanJawaban();
    simpanJawabanFirestore();

  }

}

// ================= ONLINE STATUS =================
setInterval(async () => {

  if (sudahSelesai) return;

  try {

    await setDoc(
      doc(db, "peserta", siswaUid),
      {
        status: "mengerjakan",
        lastOnline:
          serverTimestamp()
      },
      { merge: true }
    );

  } catch (err) {

    console.log(err);

  }

}, 120000);

// ================= BLOK AKSI =================
document.addEventListener(
  "contextmenu",
  (e) => e.preventDefault()
);

document.addEventListener(
  "copy",
  (e) => e.preventDefault()
);

// ================= TAB CHANGE =================
document.addEventListener(
  "visibilitychange",
  () => {

    if (document.hidden) {

      tambahPelanggaran(
        "Tidak boleh pindah tab"
      );

    }

  }
);

// ================= BEFORE UNLOAD =================
window.addEventListener(
  "beforeunload",
  () => {

    if (!sudahSelesai) {

      simpanJawaban();

    }

  }
);

// ================= INIT =================
loadSoal();