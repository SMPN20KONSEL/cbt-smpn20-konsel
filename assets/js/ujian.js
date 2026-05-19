// ================= FIREBASE =================
import { db }
from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= SESSION =================
const nis =
  sessionStorage.getItem(
    "nisSiswa"
  );

const nama =
  sessionStorage.getItem(
    "namaSiswa"
  );

const kelas =
  sessionStorage.getItem(
    "kelasSiswa"
  );

const kodeUjian =
  sessionStorage.getItem(
    "kodeUjian"
  );

const uid =
  sessionStorage.getItem(
    "siswaUid"
  );

// ================= VALIDASI =================
if (
  !nis ||
  !kodeUjian ||
  !uid
) {

  alert(
    "Sesi ujian tidak valid"
  );

  location.href =
    "token.html";

  throw new Error(
    "SESSION_INVALID"
  );

}

// ================= SUDAH MULAI =================
if (
  sessionStorage.getItem(
    "waktuMulai"
  )
) {

  location.href =
    "soal.html";

}

// ================= ELEMENT =================
const elNis =
  document.getElementById(
    "c-nisn"
  );

const elNama1 =
  document.getElementById(
    "c-nama"
  );

const elNama2 =
  document.getElementById(
    "c-nama2"
  );

const elKelas =
  document.getElementById(
    "c-kelas"
  );

const elMapel =
  document.getElementById(
    "c-mata-ujian"
  );

const btnMulai =
  document.getElementById(
    "btn-mulai"
  );

// ================= TAMPILKAN DATA =================
if (elNis)
  elNis.textContent =
    nis;

if (elNama1)
  elNama1.textContent =
    nama;

if (elNama2)
  elNama2.textContent =
    nama;

if (elKelas)
  elKelas.textContent =
    kelas;

// ================= LOAD MAPEL =================
async function loadMapel() {

  try {

    const snap =
      await getDoc(
        doc(
          db,
          "jadwal_ujian",
          kodeUjian
        )
      );

    if (!snap.exists()) {

      if (elMapel) {

        elMapel.textContent =
          "-";

      }

      return;
    }

    const data =
      snap.data();

    /* CEK STATUS UJIAN */
    if (
      data.aktif !== true
    ) {

      alert(
        "Ujian belum aktif"
      );

      location.href =
        "token.html";

      return;
    }

    /* TAMPIL MAPEL */
    if (elMapel) {

      elMapel.textContent =
        data.mapel || "-";

    }

    /* SESSION */
    sessionStorage.setItem(
      "mapelUjian",
      data.mapel || ""
    );

    sessionStorage.setItem(
      "durasiUjian",
      data.durasi || 60
    );

    sessionStorage.setItem(
      "bankSoalId",
      data.bankSoalId || ""
    );

  } catch (err) {

    console.error(err);

    if (elMapel) {

      elMapel.textContent =
        "-";

    }

  }

}

loadMapel();

// ================= LOCK =================
let isStarting =
  false;

// ================= MULAI UJIAN =================
btnMulai?.addEventListener(
  "click",
  async (e) => {

    if (!navigator.onLine) {

      alert(
        "Koneksi internet terputus"
      );

      return;

    }

    e.preventDefault();

    /* CEGAH DOUBLE CLICK */
    if (
      isStarting ||
      btnMulai.disabled
    ) return;

    isStarting = true;

    try {

      /* LOADING */
      btnMulai.disabled =
        true;

      btnMulai.innerHTML =
        "⏳ Memulai...";

      /* SIMPAN PESERTA
         NON BLOCKING
      */
      setDoc(
        doc(
          db,
          "peserta",
          uid
        ),
        {
          status:
            "mengerjakan",

          kodeUjian,

          namaSiswa:
            nama || "",

          kelas:
            kelas || "",

          waktuMulai:
            serverTimestamp()
        },
        { merge: true }
      ).catch(console.error);

/* SESSION */
sessionStorage.setItem(
  "waktuMulai",
  Date.now()
);

sessionStorage.setItem(
  "statusUjian",
  "aktif"
);

/* RESET CACHE UJIAN */
localStorage.removeItem(
  `kirim_${uid}_${kodeUjian}`
);

localStorage.removeItem(
  `waktu_${uid}_${kodeUjian}`
);

localStorage.removeItem(
  `soal_${uid}_${kodeUjian}`
);

localStorage.removeItem(
  `jawaban_${uid}_${kodeUjian}`
);

/* MASUK SOAL */
location.href =
  "soal.html";

    } catch (err) {

      console.error(
        "ERROR:",
        err
      );

      alert(
        "Gagal memulai ujian"
      );

      isStarting =
        false;

      btnMulai.disabled =
        false;

      btnMulai.innerHTML =
        "Mulai Ujian";

    }

  }
);