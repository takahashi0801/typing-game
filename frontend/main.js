document.addEventListener("DOMContentLoaded", () => {
  // ── DOM 要素 ─────────────────────────────────────────────
  const startScreen   = document.getElementById("start-screen");
  const gameScreen    = document.getElementById("game");
  const startBtn      = document.getElementById("start-btn");
  const difficultySel = document.getElementById("difficulty");
  const display       = document.getElementById("phrase-display");
  const translationEl = document.getElementById("translation");
  const romajiEl      = document.getElementById("romaji");
  const input         = document.getElementById("input-area");
  const timerEl       = document.getElementById("timer");
  const timeSpan      = timerEl.querySelector(".time");
  const errorsEl      = document.getElementById("errors");
  const successesEl   = document.getElementById("successes");

  // ── BGM トグル & オーディオ要素 ─────────────────────────
  const bgmToggle = document.getElementById("bgm-toggle");
  const bgm       = document.getElementById("bgm");
  const gameBgm   = document.getElementById("game-bgm");
  let bgmOn       = localStorage.getItem("bgmOn") === "true";

  // トグル初期アイコン
  bgmToggle.textContent = bgmOn ? "🔊" : "🔇";

  // ページロード時に、トップ画面用BGMのみ再生
  if (bgmOn) {
    bgm.play().catch(()=>{});
  }

  bgmToggle.addEventListener("click", () => {
    bgmOn = !bgmOn;
    localStorage.setItem("bgmOn", bgmOn);
    bgmToggle.textContent = bgmOn ? "🔊" : "🔇";

    if (bgmOn) {
      // いまどちらの画面かで再生を切り替え
      if (startScreen.style.display !== "none") {
        bgm.play().catch(()=>{});
      } else {
        gameBgm.currentTime = 0;
        gameBgm.play().catch(()=>{});
      }
    } else {
      // OFF なら両方停止
      bgm.pause();
      gameBgm.pause();
    }
  });

  // ── 効果音 & ゲーム状態変数 ─────────────────────────────
  const correctSound = new Audio("correct.mp3");
  const errorSound   = new Audio("error.mp3");
  let sessionDuration   = 60;
  let currentDifficulty = "easy";
  let startTime         = 0;
  let timerHandle;
  let fullRomaji        = "";
  let prevVal           = "";
  let totalErrors       = 0;
  let successCount      = 0;
  let sessionActive     = false;

  // ── フォーカス維持 & Backspace 無効化 ───────────────────
  document.addEventListener("click", () => input.focus());
  document.addEventListener("keydown", () => input.focus());
  input.addEventListener("keydown", e => {
    if (e.key === "Backspace") e.preventDefault();
  });

  // ── スタートボタン押下 ─────────────────────────────────
  startBtn.addEventListener("click", () => {
    // 難易度ごとに時間設定
    currentDifficulty = difficultySel.value;
    sessionDuration = { easy: 120, medium: 240, hard: 380 }[currentDifficulty];

    // 画面切替
    startScreen.style.display = "none";
    gameScreen.style.display  = "flex";

    // BGM 切り替え
    if (bgmOn) {
      bgm.pause();
      gameBgm.currentTime = 0;
      gameBgm.play().catch(()=>{});
    }

    startSession();
  });

  // ── セッション開始 ─────────────────────────────────────
  async function startSession() {
    totalErrors  = 0;
    successCount = 0;
    errorsEl.textContent    = `ミスタイプ数: ${totalErrors}`;
    successesEl.textContent = `タイプ成功数: ${successCount}`;
    input.disabled = false;
    input.value    = "";
    prevVal        = "";

    startTime     = performance.now();
    sessionActive = true;
    updateTimer();
    timerHandle   = setInterval(updateTimer, 100);

    await fetchPhrase();
    input.focus();
  }

  // ── フレーズ取得 ───────────────────────────────────────
  async function fetchPhrase() {
    if (!sessionActive) return;
    const res  = await fetch(`/api/phrase?difficulty=${currentDifficulty}`);
    const data = await res.json();
    display.textContent       = data.text;
    translationEl.textContent = data.translation;
    fullRomaji = data.romaji;
    romajiEl.innerHTML = "";
    for (const ch of fullRomaji) {
      const span = document.createElement("span");
      span.textContent = ch;
      span.classList.add("untyped");
      romajiEl.appendChild(span);
    }
    input.value = "";
    prevVal     = "";
  }

  // ── タイマー更新 ───────────────────────────────────────
  function updateTimer() {
    const elapsed   = (performance.now() - startTime) / 1000;
    const remaining = Math.max(0, sessionDuration - elapsed).toFixed(1);
    timeSpan.textContent = `${remaining}s`;
    if (remaining <= 10) timeSpan.classList.add("warning");
    else timeSpan.classList.remove("warning");
    if (elapsed >= sessionDuration) endSession();
  }

  // ── 入力イベント ───────────────────────────────────────
  input.addEventListener("input", () => {
    if (!sessionActive) return;
    let val = input.value.replace(/[^ -~]/g, "");
    input.value = val;
    if (!fullRomaji.startsWith(val)) {
      errorSound.currentTime = 0;
      errorSound.play();
      totalErrors++;
      errorsEl.textContent = `ミスタイプ数: ${totalErrors}`;
      val = val.slice(0, -1);
      input.value = val;
      prevVal     = val;
      updateSpans(val);
      return;
    }
    if (val.length > prevVal.length) {
      correctSound.currentTime = 0;
      correctSound.play();
      successCount++;
      successesEl.textContent = `タイプ成功数: ${successCount}`;
    }
    updateSpans(val);
    prevVal = val;
    if (val === fullRomaji) fetchPhrase();
  });

  // ── スパン色更新 ───────────────────────────────────────
  function updateSpans(val) {
    romajiEl.querySelectorAll("span").forEach((span, idx) => {
      span.classList.toggle("typed", idx < val.length);
      span.classList.toggle("untyped", idx >= val.length);
    });
  }

  // ── セッション終了 ───────────────────────────────────────
  function endSession() {
    sessionActive = false;
    clearInterval(timerHandle);
    input.disabled = true;
    if (bgmOn) gameBgm.pause();
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const params  = new URLSearchParams({
      difficulty: currentDifficulty,
      time:       elapsed,
      successes:  successCount,
      errors:     totalErrors
    });
    window.location.href = `result.html?${params.toString()}`;
  }

  // ── 初期表示設定 ─────────────────────────────────────────
  gameScreen.style.display = "none";
  input.focus();
});
