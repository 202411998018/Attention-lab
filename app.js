/* Attention Lab experiment engine
 * Three browser-based attention paradigms with balanced trial generation,
 * response-time capture, trial-level local persistence, and CSV export.
 */
"use strict";

const EXPERIMENTS = {
  posner: {
    id: "posner",
    name: "Posner 空间线索实验",
    english: "POSNER SPATIAL CUEING",
    description: "比较外周闪烁线索与中央方向箭头如何引导空间注意，并考察有效、无效和中性线索及线索—目标间隔的影响。",
    facts: ["外源性 / 内源性线索", "有效 / 无效 / 中性", "反应时与正确率"],
    duration: "约 6–8 分钟"
  },
  change: {
    id: "change",
    name: "面孔变化检测实验",
    english: "FACE FLICKER CHANGE DETECTION",
    description: "通过 A—空屏—B—空屏的闪烁范式，检测注视方向、嘴角、眉毛和鼻子四类较细微的变化。",
    facts: ["4 类面部特征变化", "无变化 Catch Trials", "变化检测与部位判断"],
    duration: "约 5–8 分钟"
  },
  search: {
    id: "search",
    name: "视觉搜索与特征整合实验",
    english: "VISUAL SEARCH / FEATURE INTEGRATION",
    description: "比较单一特征搜索与颜色—形状结合搜索，操纵搜索集合大小和目标有无，检验搜索效率随项目数量的变化。",
    facts: ["Feature Search", "Conjunction Search", "集合大小 8 / 16 / 24"],
    duration: "约 6–8 分钟"
  }
};

const STORAGE_TRIALS = "attentionLabData";
const STORAGE_GAZE = "attentionLabGaze";
const STORAGE_SESSIONS = "attentionLabSessions";
const STORAGE_EVENTS = "attentionLabEvents";
const GAZE_CHUNK_PREFIX = "attentionLabGazeChunk:";
const DB_NAME = "AttentionLabData";
const DB_VERSION = 1;
const DB_STORES = ["sessions", "trials", "gaze", "events"];
const GAZE_CHUNK_SIZE = 50;
const HW2_ENDPOINT = "https://attention-lab-production.up.railway.app/api/hw2/submit";
const HW2_EXPERIMENT_SLUGS = {
  posner: "posner",
  search: "visual_search",
  change: "change_blindness"
};
const HW2_UPLOAD_PROMISES = new Map();
const FACE_BASE = "assets/face-change-stimuli/";
const FACE_PAIRS = [
  { feature: "注视方向", key: "gaze", a: "01_gaze_left.svg", b: "02_gaze_right.svg" },
  { feature: "嘴角", key: "mouth", a: "03_mouth_neutral.svg", b: "04_mouth_smile.svg" },
  { feature: "眉毛", key: "brows", a: "05_brows_flat.svg", b: "06_brows_raised.svg" },
  { feature: "鼻子", key: "nose", a: "07_nose_normal.svg", b: "08_nose_wide.svg" }
];

const $ = (selector) => document.querySelector(selector);
const modal = $("#experiment-modal");
const taskOverlay = $("#task-overlay");
const taskStage = $("#task-stage");
let selected = null;
let participant = "P" + Math.random().toString(36).slice(2, 7).toUpperCase();
let sessionId = "";
let sessionRows = [];
let sessionGaze = [];
let trialList = [];
let trialIndex = 0;
let phase = "practice";
let active = false;
let eyeEnabled = false;
let eyeStarted = false;
let currentTrialContext = null;
let sessionStartIso = "";
let sessionWarnings = [];
let gazePersisted = false;
let sessionEpoch = 0;
let pendingKeyCancel = null;
let pendingActionCancel = null;
let dataDbPromise = null;
let dataDbAvailable = null;
let dbFlushPromise = null;
let pendingDbWrites = { sessions: [], trials: [], gaze: [], events: [] };
let dbFlushTimer = null;
let sessionMeta = null;
let eyeCalibrationContext = null;
let sessionGazeIndex = 0;
let sessionEventIndex = 0;
let gazeFallbackPersistedIndex = 0;
let gazeChunkIndex = 0;

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});
$("#export-all-backup").onclick = () => exportAllLocalBackup(false);
$("#export-incomplete-backup").onclick = () => exportAllLocalBackup(true);
$("#export-trials-csv").onclick = async () => downloadCSV(await getAllLocalRecords("trials"), "attention-lab-trials.csv");
$("#export-gaze-csv").onclick = async () => downloadCSV(await getAllLocalRecords("gaze"), "attention-lab-gaze.csv");
$("#export-events-csv").onclick = async () => downloadCSV(await getAllLocalRecords("events"), "attention-lab-events.csv");
$("#export-sessions-csv").onclick = async () => downloadCSV(await getAllLocalRecords("sessions"), "attention-lab-sessions.csv");
$("#hw2-retry-pending").onclick = retryPendingHw2Uploads;
refreshDataArchive();


function openModal(id) {
  selected = EXPERIMENTS[id];
  if (!selected) return;
  $("#modal-kicker").textContent = selected.english;
  $("#modal-title").textContent = selected.name;
  $("#modal-description").textContent = selected.description;
  $("#modal-facts").innerHTML = selected.facts.map((item) => "<span>" + escapeHtml(item) + "</span>").join("") +
    "<span>" + escapeHtml(selected.duration) + "</span>";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

$(".modal-close").onclick = closeModal;
$("#close-modal").onclick = closeModal;
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
$(".menu-toggle").onclick = () => {
  const nav = $(".main-nav");
  const isOpen = nav.classList.toggle("mobile-open");
  $(".menu-toggle").setAttribute("aria-expanded", String(isOpen));
};
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    $(".main-nav").classList.remove("mobile-open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
  });
});
$("#start-experiment").onclick = () => {
  closeModal();
  showSetup(selected.id);
};
$("#exit-task").onclick = () => {
  if (confirm("确定退出本次实验吗？已完成试次和当前已产生的部分数据都会保留，并将本次 Session 标记为未完成。")) {
    active = false;
    exitTask();
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function panel(title, body, buttons, panelClass) {
  const className = panelClass ? " " + escapeHtml(panelClass) : "";
  taskStage.innerHTML =
    '<div class="task-panel' + className + '"><p class="task-muted">ATTENTION LAB · ' +
    escapeHtml(selected ? selected.english : "EXPERIMENT") +
    '</p><h2>' + title + '</h2>' + body + (buttons || "") + "</div>";
}

function instructionSheetMarkup(config) {
  const steps = config.steps.map((step, index) =>
    '<div class="instruction-step">' +
      '<span class="instruction-step-number">0' + (index + 1) + '</span>' +
      '<div><strong>' + escapeHtml(step.title) + '</strong>' +
      '<p>' + escapeHtml(step.description) + '</p></div>' +
    '</div>'
  ).join("");
  const keys = config.keys.map((item) =>
    '<div class="instruction-key-card"><kbd>' + escapeHtml(item.key) +
    '</kbd><span>' + escapeHtml(item.label) + '</span></div>'
  ).join("");
  const features = config.features && config.features.length
    ? '<div class="instruction-feature-block">' +
        '<strong class="instruction-feature-title">' + escapeHtml(config.featureTitle || "变化部位") + '</strong>' +
        '<div class="instruction-feature-grid">' +
        config.features.map((item) =>
          '<div class="instruction-feature-item"><kbd>' + escapeHtml(item.key) +
          '</kbd><span>' + escapeHtml(item.label) + '</span></div>'
        ).join("") +
        '</div></div>'
    : "";
  return '<div class="instruction-sheet">' +
    '<div class="instruction-notice"><span class="instruction-notice-icon">!</span>' +
      '<div><strong>开始前请先阅读</strong><span>先看清判断规则和按键，再进入练习。</span></div></div>' +
    '<p class="instruction-lead">' + escapeHtml(config.lead) + '</p>' +
    '<div class="instruction-steps">' + steps + '</div>' +
    '<section class="instruction-response"><h3>作答按键</h3>' +
      '<div class="instruction-key-grid">' + keys + '</div></section>' +
    features +
    '<div class="instruction-note"><strong>请特别注意</strong><p>' +
      escapeHtml(config.note) + '</p></div>' +
    '</div>';
}

function showSetup(id) {
  selected = EXPERIMENTS[id];
  if (!selected) return;
  taskOverlay.classList.add("open");
  taskOverlay.setAttribute("aria-hidden", "false");
  $("#task-name").textContent = selected.english;
  $("#task-progress").style.width = "0%";
  panel(
    "实验参与与设备检查",
    '<p>本实验会记录匿名参与者编号、刺激条件、按键反应、正确与否及反应时间。匿名试次数据将在实验结束或主动退出时提交至课程收数平台，同时保留在当前浏览器中作为备份。</p>' +
    '<label class="task-muted" for="participant-id">匿名参与者编号（请勿填写姓名或学号）</label><br>' +
    '<input class="participant-input" id="participant-id" maxlength="24" value="' + escapeHtml(participant) + '">' +
    '<p><label><input type="checkbox" id="consent"> 我已阅读说明，并同意以匿名方式参与实验，且知悉匿名试次数据将提交至课程收数平台。</label></p>' +
    '<div class="eye-status">眼动追踪为可选功能：使用摄像头进行本地注视估计；视频不录制、不上传，原始注视坐标保存在本机。拒绝摄像头权限不影响行为实验。</div>',
    '<div class="task-choice"><button class="task-button" id="setup-next">继续</button><button class="task-button secondary" id="task-cancel">返回</button></div>'
  );
  $("#setup-next").onclick = () => {
    if (!$("#consent").checked) {
      alert("请先确认知情同意。");
      return;
    }
    participant = $("#participant-id").value.trim() || participant;
    startNewSession();
    eyeSetup();
  };
  $("#task-cancel").onclick = exitTask;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function readStoredArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeStoredArray(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
    return true;
  } catch (error) {
    sessionWarnings.push("浏览器本地存储失败：" + String(error && error.message || error));
    return false;
  }
}


function upsertStoredArray(key, row) {
  const rows = readStoredArray(key);
  const index = row.record_id ? rows.findIndex((item) => item.record_id === row.record_id) : -1;
  if (index >= 0) rows[index] = row;
  else rows.push(row);
  return writeStoredArray(key, rows);
}

function openDataDB() {
  if (!("indexedDB" in window)) {
    dataDbAvailable = false;
    return Promise.resolve(null);
  }
  if (dataDbPromise) return dataDbPromise;
  dataDbPromise = new Promise((resolve) => {
    let request;
    let settled = false;
    const finish = (db) => {
      if (settled) return;
      settled = true;
      resolve(db);
    };
    try { request = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (_) { dataDbAvailable = false; finish(null); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      DB_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "record_id" });
      });
    };
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      dataDbAvailable = true;
      finish(request.result);
    };
    request.onerror = () => { dataDbAvailable = false; finish(null); };
    request.onblocked = () => { dataDbAvailable = false; finish(null); };
  });
  return dataDbPromise;
}

function scheduleDataFlush() {
  if (dbFlushTimer) return;
  dbFlushTimer = setTimeout(() => {
    dbFlushTimer = null;
    flushPendingData();
  }, 350);
}

function queueDataRecord(store, row) {
  if (!pendingDbWrites[store] || !row || !row.record_id) return;
  pendingDbWrites[store].push(row);
  if (pendingDbWrites[store].length >= GAZE_CHUNK_SIZE) flushPendingData();
  else scheduleDataFlush();
}

async function flushPendingData() {
  if (dbFlushPromise) return dbFlushPromise;
  dbFlushPromise = (async () => {
    const stores = DB_STORES.filter((name) => pendingDbWrites[name].length);
    if (!stores.length) return true;
    const db = await openDataDB();
    if (!db) {
      stores.forEach((name) => { pendingDbWrites[name] = []; });
      return false;
    }
    const batch = {};
    stores.forEach((name) => { batch[name] = pendingDbWrites[name].splice(0); });
    return new Promise((resolve) => {
      let transaction;
      try {
        transaction = db.transaction(stores, "readwrite");
        stores.forEach((name) => batch[name].forEach((row) => transaction.objectStore(name).put(row)));
      } catch (_) {
        stores.forEach((name) => { pendingDbWrites[name] = batch[name].concat(pendingDbWrites[name]); });
        resolve(false);
        return;
      }
      transaction.oncomplete = () => {
        dataDbAvailable = true;
        const currentSessionGaze = (batch.gaze || []).filter((row) => row.session_id === sessionId);
        if (currentSessionGaze.length) {
          const highestSaved = Math.max.apply(null, currentSessionGaze.map((row) => Number(row.sample_index) + 1));
          if (Number.isFinite(highestSaved)) gazeFallbackPersistedIndex = Math.max(gazeFallbackPersistedIndex, highestSaved);
        }
        resolve(true);
      };
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        dataDbAvailable = false;
        stores.forEach((name) => { pendingDbWrites[name] = batch[name].concat(pendingDbWrites[name]); });
        resolve(false);
      };
      transaction.onerror = restore;
      transaction.onabort = restore;
    });
  })();
  try { return await dbFlushPromise; }
  finally {
    dbFlushPromise = null;
    if (DB_STORES.some((name) => pendingDbWrites[name].length)) scheduleDataFlush();
  }
}

async function readDbStore(store) {
  const db = await openDataDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const request = db.transaction(store, "readonly").objectStore(store).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => resolve([]);
    } catch (_) { resolve([]); }
  });
}

function persistGazeFallbackChunk(force) {
  if (!sessionId || (!force && dataDbAvailable !== false)) return;
  while (gazeFallbackPersistedIndex < sessionGaze.length) {
    const chunk = sessionGaze.slice(gazeFallbackPersistedIndex, gazeFallbackPersistedIndex + GAZE_CHUNK_SIZE);
    const key = GAZE_CHUNK_PREFIX + sessionId + ":" + String(gazeChunkIndex++).padStart(5, "0");
    try {
      localStorage.setItem(key, JSON.stringify(chunk));
      gazeFallbackPersistedIndex += chunk.length;
    } catch (error) {
      sessionWarnings.push("眼动分块备份失败：" + String(error && error.message || error));
      break;
    }
  }
}

function collectGazeFallbackRows() {
  const rows = readStoredArray(STORAGE_GAZE);
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(GAZE_CHUNK_PREFIX)) continue;
      const chunk = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(chunk)) rows.push(...chunk);
    }
  } catch (_) {}
  return rows;
}

function mergeRecordSets() {
  const map = new Map();
  let legacyIndex = 0;
  Array.from(arguments).forEach((set) => (set || []).forEach((row) => {
    if (!row) return;
    const key = row.record_id || "legacy:" + legacyIndex++;
    const previous = map.get(key);
    const rowIsNewer = !previous || (
      row.updated_at &&
      (!previous.updated_at || new Date(row.updated_at).getTime() >= new Date(previous.updated_at).getTime())
    );
    if (rowIsNewer || !previous.updated_at) map.set(key, row);
  }));
  return Array.from(map.values());
}

async function getAllLocalRecords(store) {
  await flushPendingData();
  let localRows = [];
  if (store === "sessions") localRows = readStoredArray(STORAGE_SESSIONS);
  if (store === "trials") localRows = readStoredArray(STORAGE_TRIALS);
  if (store === "events") localRows = readStoredArray(STORAGE_EVENTS);
  if (store === "gaze") localRows = collectGazeFallbackRows();
  return mergeRecordSets(localRows, await readDbStore(store));
}

function updateSessionMeta(patch) {
  if (!sessionMeta) return;
  sessionMeta = Object.assign({}, sessionMeta, patch, { updated_at: new Date().toISOString() });
  upsertStoredArray(STORAGE_SESSIONS, sessionMeta);
  queueDataRecord("sessions", sessionMeta);
}

function getHw2ProjectCode() {
  const config = window.ATTENTION_LAB_HW2_CONFIG || {};
  return String(config.projectCode || "").trim().toUpperCase();
}

function getHw2Endpoint() {
  const config = window.ATTENTION_LAB_HW2_CONFIG || {};
  return String(config.endpoint || HW2_ENDPOINT).trim();
}

function isHw2Configured() {
  return /^[A-Z0-9]{6}$/.test(getHw2ProjectCode());
}

function hw2ExperimentName(experimentId) {
  return HW2_EXPERIMENT_SLUGS[experimentId] || String(experimentId || "unknown");
}

function buildHw2Condition(row, experimentId) {
  if (experimentId === "posner") {
    return [
      "cue=" + (row.cue_type || ""),
      "validity=" + (row.cue_validity || row.validity || ""),
      "soa_ms=" + (row.soa_actual_ms || row.soa_requested_ms || ""),
      "target_side=" + (row.target_side || "")
    ].join("; ");
  }
  if (experimentId === "search") {
    return [
      "search_type=" + (row.search_type || ""),
      "set_size=" + (row.set_size === undefined ? "" : row.set_size),
      "target_present=" + (row.target_present === undefined ? "" : row.target_present)
    ].join("; ");
  }
  return [
    "change_present=" + (row.changed === undefined ? "" : row.changed),
    "feature=" + (row.feature || ""),
    "direction=" + (row.direction || "")
  ].join("; ");
}

function normalizeHw2Trial(row, session) {
  const rtValue = row.rt_ms !== undefined && row.rt_ms !== null && row.rt_ms !== ""
    ? Number(row.rt_ms)
    : (row.decision_rt_ms !== undefined && row.decision_rt_ms !== null && row.decision_rt_ms !== ""
      ? Number(row.decision_rt_ms) : null);
  const response = row.response_key || row.response_side || row.decision ||
    (row.response_present === true ? "present" : row.response_present === false ? "absent" : "");
  return Object.assign({}, row, {
    trial_id: row.record_id || "",
    session_id: session.session_id || "",
    participant: session.participant || "",
    experiment: hw2ExperimentName(session.experiment),
    phase: row.phase || "",
    trial_number: row.trial_number === undefined ? "" : row.trial_number,
    trial_status: row.trial_status || "",
    cond: buildHw2Condition(row, session.experiment),
    rt: Number.isFinite(rtValue) ? rtValue : null,
    correct: typeof row.correct === "boolean" ? row.correct : null,
    response: response || "",
    session_status: session.status || "",
    eye_tracking_enabled: !!row.eye_tracking_enabled,
    gaze_samples_in_trial: Number(row.gaze_samples_in_trial || 0),
    gaze_valid_samples_in_trial: Number(row.gaze_valid_samples_in_trial || 0)
  });
}

function updateHw2SessionRecord(targetSessionId, patch) {
  if (sessionMeta && sessionMeta.session_id === targetSessionId) {
    updateSessionMeta(patch);
    return sessionMeta;
  }
  const rows = readStoredArray(STORAGE_SESSIONS);
  const existing = rows.find((row) => row.session_id === targetSessionId) || {
    record_id: targetSessionId, session_id: targetSessionId
  };
  const updated = Object.assign({}, existing, patch, { updated_at: new Date().toISOString() });
  upsertStoredArray(STORAGE_SESSIONS, updated);
  queueDataRecord("sessions", updated);
  return updated;
}

function renderHw2UploadStatus(targetSessionId) {
  const statusElement = $("#hw2-upload-status");
  const retryButton = $("#hw2-upload-retry");
  if (!statusElement) return;
  const stored = readStoredArray(STORAGE_SESSIONS).find((row) => row.session_id === targetSessionId);
  const current = sessionMeta && sessionMeta.session_id === targetSessionId ? sessionMeta : stored;
  const status = current && current.hw2_upload_status || (isHw2Configured() ? "pending" : "not_configured");
  const messages = {
    not_configured: "课程项目编号尚未配置。数据已保存在本机，配置项目编号后即可提交。",
    pending: "数据已保存在本机，等待提交至课程 HW2 收数平台。",
    uploading: "正在提交数据至课程 HW2 收数平台……",
    uploaded: "数据已成功提交至课程 HW2 收数平台。",
    failed: "上传失败，数据仍保存在本机。请检查网络后重试。",
    no_trials: "本次没有产生可提交的试次记录；本地 Session 仍已保留。"
  };
  const detail = status === "failed" && current && current.hw2_upload_error
    ? " 错误信息：" + current.hw2_upload_error
    : "";
  statusElement.textContent = (messages[status] || "数据已保存在本机。") + detail;
  statusElement.dataset.status = status;
  if (retryButton) {
    retryButton.disabled = !isHw2Configured() || status === "uploading" || status === "uploaded" || status === "no_trials";
    retryButton.textContent = status === "failed" ? "重试上传" : "提交 / 重试上传";
  }
}

async function submitSessionToHw2(targetSessionId) {
  if (!targetSessionId) return false;
  if (HW2_UPLOAD_PROMISES.has(targetSessionId)) return HW2_UPLOAD_PROMISES.get(targetSessionId);
  const task = (async () => {
    if (!isHw2Configured()) {
      updateHw2SessionRecord(targetSessionId, {
        hw2_upload_status: "not_configured",
        hw2_upload_message: "请在 hw2-config.js 中配置六位项目编号。"
      });
      renderHw2UploadStatus(targetSessionId);
      await refreshDataArchive();
      return false;
    }
    const [sessions, trials] = await Promise.all([
      getAllLocalRecords("sessions"), getAllLocalRecords("trials")
    ]);
    const session = sessions.find((row) => row.session_id === targetSessionId);
    if (!session) return false;
    if (session.hw2_upload_status === "uploaded") {
      renderHw2UploadStatus(targetSessionId);
      return true;
    }
    if (session.status === "in_progress") return false;
    const sessionTrials = trials
      .filter((row) => row.session_id === targetSessionId)
      .sort((a, b) => {
        const ta = Date.parse(a.trial_started_at || "") || 0;
        const tb = Date.parse(b.trial_started_at || "") || 0;
        return ta - tb || Number(a.trial_number || 0) - Number(b.trial_number || 0);
      });
    if (!sessionTrials.length) {
      updateHw2SessionRecord(targetSessionId, {
        hw2_upload_status: "no_trials",
        hw2_upload_message: "没有可提交的试次记录。"
      });
      renderHw2UploadStatus(targetSessionId);
      await refreshDataArchive();
      return false;
    }
    updateHw2SessionRecord(targetSessionId, {
      hw2_upload_status: "uploading",
      hw2_upload_started_at: new Date().toISOString(),
      hw2_upload_error: ""
    });
    renderHw2UploadStatus(targetSessionId);
    const payload = {
      project: getHw2ProjectCode(),
      experiment: hw2ExperimentName(session.experiment),
      participant: session.participant || "P-ANON",
      condition: "",
      trials: sessionTrials.map((row) => normalizeHw2Trial(row, session))
    };
    try {
      const response = await fetch(getHw2Endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
        cache: "no-store",
        credentials: "omit"
      });
      const responseText = await response.text();
      let responseData = null;
      try { responseData = responseText ? JSON.parse(responseText) : null; } catch (_) {}
      if (!response.ok) {
        throw new Error("HTTP " + response.status + (responseText ? "：" + responseText.slice(0, 240) : ""));
      }
      if (responseData && (responseData.ok === false || responseData.success === false)) {
        throw new Error(responseData.message || responseData.error || "收数接口返回失败状态");
      }
      updateHw2SessionRecord(targetSessionId, {
        hw2_upload_status: "uploaded",
        hw2_uploaded_at: new Date().toISOString(),
        hw2_uploaded_trial_count: payload.trials.length,
        hw2_upload_error: "",
        hw2_response: responseText.slice(0, 500)
      });
      renderHw2UploadStatus(targetSessionId);
      await refreshDataArchive();
      return true;
    } catch (error) {
      updateHw2SessionRecord(targetSessionId, {
        hw2_upload_status: "failed",
        hw2_upload_failed_at: new Date().toISOString(),
        hw2_upload_error: String(error && error.message || error)
      });
      renderHw2UploadStatus(targetSessionId);
      await refreshDataArchive();
      return false;
    }
  })();
  HW2_UPLOAD_PROMISES.set(targetSessionId, task);
  try { return await task; }
  finally { HW2_UPLOAD_PROMISES.delete(targetSessionId); }
}

async function retryPendingHw2Uploads() {
  if (!isHw2Configured()) {
    alert("请先在 hw2-config.js 中填写课程项目编号。");
    return;
  }
  const sessions = await getAllLocalRecords("sessions");
  const terminal = new Set(["completed", "abandoned", "interrupted"]);
  const candidates = sessions.filter((row) =>
    terminal.has(row.status) &&
    !["uploaded", "uploading", "no_trials"].includes(row.hw2_upload_status)
  );
  if (!candidates.length) {
    alert("当前没有待提交或上传失败的 Session。");
    return;
  }
  for (const row of candidates) await submitSessionToHw2(row.session_id);
  await refreshDataArchive();
}

function recordEvent(eventName, details) {
  if (!sessionId) return null;
  const now = performance.now();
  const context = currentTrialContext || eyeCalibrationContext;
  const row = Object.assign({
    record_id: sessionId + ":event:" + sessionEventIndex,
    event_index: sessionEventIndex++,
    session_id: sessionId,
    participant,
    experiment: selected ? selected.id : "",
    phase: context ? context.phase : phase,
    trial_number: context && context.trial_number !== undefined ? context.trial_number : "",
    event_name: eventName,
    timestamp_utc: new Date().toISOString(),
    performance_ms: Number(now.toFixed(3)),
    elapsed_trial_ms: context ? Number((now - context.started_perf).toFixed(3)) : ""
  }, details || {});
  upsertStoredArray(STORAGE_EVENTS, row);
  queueDataRecord("events", row);
  return row;
}

function persistTrialRow(row) {
  const index = sessionRows.findIndex((item) => item.record_id === row.record_id);
  if (index >= 0) sessionRows[index] = row;
  else sessionRows.push(row);
  upsertStoredArray(STORAGE_TRIALS, row);
  queueDataRecord("trials", row);
}

function updateCurrentTrial(data) {
  if (!currentTrialContext) return null;
  const context = currentTrialContext;
  const row = Object.assign({}, context.row, data || {}, {
    record_id: context.row.record_id,
    gaze_samples_in_trial: context.gaze_samples || 0,
    gaze_valid_samples_in_trial: context.gaze_valid_samples || 0,
    updated_at: new Date().toISOString()
  });
  context.row = row;
  persistTrialRow(row);
  return row;
}

function makeTrialContext(trial) {
  const startedPerf = performance.now();
  const trialNumber = trialIndex + 1;
  const context = { trial_number: trialNumber, phase, started_perf: startedPerf, gaze_samples: 0, gaze_valid_samples: 0, row: null };
  const row = Object.assign({
    record_id: sessionId + ":trial:" + phase + ":" + trialNumber,
    session_id: sessionId,
    participant,
    experiment: selected.id,
    phase,
    trial_number: trialNumber,
    trial_status: "in_progress",
    trial_started_at: new Date().toISOString(),
    eye_tracking_enabled: eyeEnabled,
    gaze_samples_in_trial: 0,
    gaze_valid_samples_in_trial: 0
  }, trial || {});
  context.row = row;
  currentTrialContext = context;
  persistTrialRow(row);
  recordEvent("trial_start", trial || {});
  return context;
}

function appendTrial(data) {
  if (!currentTrialContext) return null;
  const row = updateCurrentTrial(Object.assign({}, data || {}, {
    trial_status: "completed",
    trial_completed_at: new Date().toISOString()
  }));
  recordEvent("trial_complete", {
    response_status: row && row.response_status || "",
    correct: row && typeof row.correct === "boolean" ? row.correct : ""
  });
  return row;
}

function recordGazeSample(data, webgazerElapsedTime) {
  if (!sessionId || !eyeEnabled) return;
  const context = currentTrialContext || eyeCalibrationContext;
  if (!context) return;
  const now = performance.now();
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const valid = !!data && typeof data.x === "number" && Number.isFinite(data.x) &&
    typeof data.y === "number" && Number.isFinite(data.y);
  const x = valid ? Number(data.x) : null;
  const y = valid ? Number(data.y) : null;
  const sample = {
    record_id: sessionId + ":gaze:" + sessionGazeIndex,
    sample_index: sessionGazeIndex++,
    session_id: sessionId,
    participant,
    experiment: selected ? selected.id : "",
    phase: context.phase,
    trial_number: context.trial_number === undefined ? "" : context.trial_number,
    timestamp_utc: new Date().toISOString(),
    performance_ms: Number(now.toFixed(3)),
    elapsed_trial_ms: Number((now - context.started_perf).toFixed(3)),
    webgazer_elapsed_ms: typeof webgazerElapsedTime === "number" && Number.isFinite(webgazerElapsedTime) ? webgazerElapsedTime : "",
    x_px: x === null ? "" : x,
    y_px: y === null ? "" : y,
    x_norm: x === null || !width ? "" : Number((x / width).toFixed(6)),
    y_norm: y === null || !height ? "" : Number((y / height).toFixed(6)),
    viewport_width: width,
    viewport_height: height,
    device_pixel_ratio: window.devicePixelRatio || 1,
    gaze_valid: valid,
    validation_point: context.validation_point || "",
    validation_target_x_px: context.validation_point ? Number(context.target_x_px.toFixed(1)) : "",
    validation_target_y_px: context.validation_point ? Number(context.target_y_px.toFixed(1)) : ""
  };
  sessionGaze.push(sample);
  queueDataRecord("gaze", sample);
  if (Array.isArray(context.samples) &&
      (!Number.isFinite(context.validation_collect_after_ms) ||
       now - context.started_perf >= context.validation_collect_after_ms)) {
    context.samples.push(sample);
  }
  if (context === currentTrialContext) {
    context.gaze_samples += 1;
    if (valid) context.gaze_valid_samples += 1;
    if (context.gaze_samples % 25 === 0) updateCurrentTrial({});
  }
}

function interruptCurrentTrial(reason) {
  if (!currentTrialContext) return;
  const context = currentTrialContext;
  updateCurrentTrial({
    trial_status: "interrupted",
    response_status: context.row.response_status || "interrupted",
    interruption_reason: reason,
    interrupted_at: new Date().toISOString()
  });
  recordEvent("trial_interrupted", { interruption_reason: reason });
  currentTrialContext = null;
}

async function exportAllLocalBackup(incompleteOnly) {
  const [sessions, trials, gaze, events] = await Promise.all([
    getAllLocalRecords("sessions"), getAllLocalRecords("trials"),
    getAllLocalRecords("gaze"), getAllLocalRecords("events")
  ]);
  const chosenSessions = incompleteOnly ? sessions.filter((row) => row.status !== "completed") : sessions;
  if (incompleteOnly && !chosenSessions.length) {
    alert("当前浏览器没有未完成或中断的 Session。");
    return;
  }
  const ids = new Set(chosenSessions.map((row) => row.session_id));
  const includeSessionRow = (row) => !incompleteOnly || ids.has(row.session_id);
  downloadJSON({
    schema_version: 2,
    exported_at: new Date().toISOString(),
    storage_scope: "This browser and device only; not uploaded to a server.",
    filter: incompleteOnly ? "incomplete_sessions" : "all_local_records",
    sessions: chosenSessions,
    trials: trials.filter(includeSessionRow),
    gaze: gaze.filter(includeSessionRow),
    events: events.filter(includeSessionRow)
  }, incompleteOnly ? "attention-lab-incomplete-sessions.json" : "attention-lab-full-backup.json");
}

async function refreshDataArchive() {
  const summary = $("#archive-summary");
  if (!summary) return;
  const [sessions, trials, gaze, events] = await Promise.all([
    getAllLocalRecords("sessions"), getAllLocalRecords("trials"),
    getAllLocalRecords("gaze"), getAllLocalRecords("events")
  ]);
  const incomplete = sessions.filter((row) => row.status !== "completed").length;
  const uploaded = sessions.filter((row) => row.hw2_upload_status === "uploaded").length;
  const pending = sessions.filter((row) =>
    ["completed", "abandoned", "interrupted"].includes(row.status) &&
    !["uploaded", "no_trials"].includes(row.hw2_upload_status)
  ).length;
  summary.textContent = "本机记录：" + sessions.length + " 个 Session · " + trials.length +
    " 条试次 · " + gaze.length + " 条眼动样本 · " + events.length +
    " 条事件；未完成/中断 " + incomplete + " 个。";
  const uploadSummary = $("#hw2-archive-status");
  if (uploadSummary) {
    uploadSummary.textContent = isHw2Configured()
      ? "课程项目 " + getHw2ProjectCode() + " · 已上传 " + uploaded + " 个 Session · 待提交/失败 " + pending + " 个。"
      : "尚未配置课程项目编号。当前数据仍会保存在本机；配置编号后即可提交。";
  }
  const retryButton = $("#hw2-retry-pending");
  if (retryButton) retryButton.disabled = !isHw2Configured() || pending === 0;
}

function startNewSession() {
  sessionEpoch += 1;
  sessionId = makeId();
  sessionRows = [];
  sessionGaze = [];
  sessionWarnings = [];
  gazePersisted = false;
  eyeEnabled = false;
  eyeStarted = false;
  eyeCalibrationContext = null;
  sessionGazeIndex = 0;
  sessionEventIndex = 0;
  gazeFallbackPersistedIndex = 0;
  gazeChunkIndex = 0;
  sessionStartIso = new Date().toISOString();
  sessionMeta = {
    record_id: sessionId, session_id: sessionId, participant,
    experiment: selected.id, started_at: sessionStartIso,
    status: "in_progress", phase: "setup",
    hw2_upload_status: isHw2Configured() ? "pending" : "not_configured",
    eye_consent: null, eye_tracking_status: "not_started",
    user_agent: navigator.userAgent || "", language: navigator.language || "",
    screen_width: window.screen ? window.screen.width : "",
    screen_height: window.screen ? window.screen.height : "",
    viewport_width: window.innerWidth, viewport_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio || 1
  };
  upsertStoredArray(STORAGE_SESSIONS, sessionMeta);
  queueDataRecord("sessions", sessionMeta);
  recordEvent("session_start", { screen_width: sessionMeta.screen_width, screen_height: sessionMeta.screen_height });
  refreshDataArchive();
}

function eyeSetup() {
  const available = !!(window.webgazer && typeof window.webgazer.begin === "function");
  if (!available) {
    updateSessionMeta({
      eye_consent: false,
      eye_tracking_status: "unavailable",
      eye_error: "WebGazer 3.5.3 未加载；请检查网络连接或浏览器脚本拦截。"
    });
    recordEvent("eye_tracking_unavailable");
    panel(
      "眼动模块暂不可用",
      '<p>眼动组件未能加载。请检查网络连接、浏览器扩展或 CDN 访问情况。你仍然可以跳过眼动，正常完成三个行为实验。</p>' +
      '<div class="eye-status">眼动状态：未启用；行为试次仍会正常记录并提交。</div>',
      '<button class="task-button" id="eye-skip">跳过眼动，进入实验说明</button>'
    );
    $("#eye-skip").onclick = beginInstructions;
    return;
  }
  panel(
    "是否启用摄像头眼动追踪？",
    '<p>启用后，浏览器会请求摄像头权限，并在本机实时估计注视位置。摄像头视频不会录制或上传；原始注视坐标保存在当前浏览器，不随 HW2 提交。你可以随时跳过眼动，继续行为实验。</p>' +
    '<div class="eye-status">建议使用 HTTPS、正对屏幕、保持头部相对稳定，并确保面部光照充足。眼动估计仅用于探索性分析。</div>',
    '<div class="task-choice"><button class="task-button" id="eye-enable">同意并开始校准</button><button class="task-button secondary" id="eye-skip">不同意，跳过眼动</button></div>'
  );
  $("#eye-enable").onclick = () => {
    updateSessionMeta({
      eye_consent: true,
      eye_tracking_status: "consented",
      eye_tracking_library: "WebGazer 3.5.3",
      eye_raw_data_storage: "local_only",
      eye_video_recording: false
    });
    recordEvent("eye_consent_granted");
    startEyeCalibration();
  };
  $("#eye-skip").onclick = () => {
    updateSessionMeta({ eye_consent: false, eye_tracking_status: "declined" });
    recordEvent("eye_consent_declined");
    beginInstructions();
  };
}

async function startEyeCalibration() {
  const webgazer = window.webgazer;
  try {
    if (window.isSecureContext === false && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error("摄像头访问需要 HTTPS 安全连接，请通过 GitHub Pages 的 https:// 地址打开实验。");
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      throw new Error("当前浏览器不支持摄像头访问，请使用新版 Chrome、Edge 或 Firefox。");
    }
    if (typeof webgazer.saveDataAcrossSessions === "function") webgazer.saveDataAcrossSessions(false);
    if (webgazer.params) {
      webgazer.params.faceMeshSolutionPath = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
    }
    if (typeof webgazer.setGazeListener === "function") {
      webgazer.setGazeListener((data, elapsedTime) => recordGazeSample(data, elapsedTime));
    }
    await webgazer.begin();
    eyeEnabled = true;
    eyeStarted = true;
    try {
      if (typeof webgazer.showVideoPreview === "function") webgazer.showVideoPreview(true);
      if (typeof webgazer.showPredictionPoints === "function") webgazer.showPredictionPoints(false);
      if (typeof webgazer.applyKalmanFilter === "function") webgazer.applyKalmanFilter(true);
    } catch (_) {}
    eyeCalibrationContext = {
      phase: "camera_check",
      trial_number: "",
      started_perf: performance.now()
    };
    updateSessionMeta({
      eye_tracking_status: "camera_check",
      eye_started_at: new Date().toISOString(),
      eye_tracking_library: "WebGazer 3.5.3",
      eye_face_mesh_assets: "@mediapipe/face_mesh 0.4.1633559619",
      eye_save_data_across_sessions: false
    });
    recordEvent("eye_tracking_started", {
      library: "WebGazer 3.5.3",
      face_mesh_assets: "@mediapipe/face_mesh 0.4.1633559619"
    });
    await sleep(700);
    showEyeCameraCheck();
  } catch (error) {
    try {
      if (webgazer && typeof webgazer.pause === "function") webgazer.pause();
      if (webgazer && typeof webgazer.end === "function") webgazer.end();
    } catch (_) {}
    eyeEnabled = false;
    eyeStarted = false;
    eyeCalibrationContext = null;
    const message = String(error && error.message || error);
    updateSessionMeta({
      eye_tracking_status: "failed",
      eye_error: message,
      eye_failed_at: new Date().toISOString()
    });
    recordEvent("eye_tracking_failed", { error: message });
    panel(
      "眼动初始化失败",
      '<p>摄像头权限或眼动模块初始化失败。请检查浏览器地址栏中的摄像头权限，并确认没有其他程序独占摄像头。</p>' +
      '<div class="eye-status">错误信息：' + escapeHtml(message) + '</div>',
      '<button class="task-button" id="eye-failed-continue">跳过眼动，继续行为实验</button>'
    );
    $("#eye-failed-continue").onclick = beginInstructions;
  }
}

function showEyeCameraCheck() {
  panel(
    "摄像头画面检查",
    '<p class="eye-calibration-intro">请确认右下角的小画面能够看到你的面部。尽量正对屏幕，保持眼睛清晰可见，并避免强烈背光。确认位置合适后，再开始九点校准。</p>' +
    '<div class="eye-camera-check-note">摄像头画面仅用于本机实时估计，不会录制或上传。进入校准后，预览画面会自动隐藏，以免遮挡校准点。</div>',
    '<div class="task-choice"><button class="task-button" id="eye-camera-ready">位置合适，开始校准</button><button class="task-button secondary" id="eye-camera-skip">跳过眼动，继续行为实验</button></div>',
    "eye-camera-panel"
  );
  $("#eye-camera-ready").onclick = () => {
    try { if (typeof window.webgazer.showVideoPreview === "function") window.webgazer.showVideoPreview(false); } catch (_) {}
    eyeCalibrationContext = {
      phase: "calibration",
      trial_number: "",
      started_perf: performance.now()
    };
    runNinePointEyeCalibration();
  };
  $("#eye-camera-skip").onclick = () => {
    eyeEnabled = false;
    eyeCalibrationContext = null;
    stopEyeTracking();
    updateSessionMeta({ eye_tracking_status: "skipped_after_camera_check" });
    recordEvent("eye_tracking_skipped_after_camera_check");
    beginInstructions();
  };
}

function runNinePointEyeCalibration() {
  const positions = [
    { x: 8, y: 10 }, { x: 50, y: 10 }, { x: 92, y: 10 },
    { x: 8, y: 50 }, { x: 50, y: 50 }, { x: 92, y: 50 },
    { x: 8, y: 90 }, { x: 50, y: 90 }, { x: 92, y: 90 }
  ];
  const clicksRequired = 5;
  let completedPoints = 0;
  updateSessionMeta({
    eye_tracking_status: "calibrating",
    calibration_attempts: Number(sessionMeta && sessionMeta.calibration_attempts || 0) + 1,
    calibration_points_required: 9,
    calibration_clicks_per_point: clicksRequired
  });
  const dots = positions.map((point, index) =>
    '<button class="eye-dot" data-eye-dot="' + index + '" data-clicks="0" ' +
    'style="left:' + point.x + '%;top:' + point.y + '%" aria-label="校准点 ' + (index + 1) + '，需要点击五次">0/5</button>'
  ).join("");
  panel(
    "九点眼动校准",
    '<p class="eye-calibration-intro">请依次注视每个圆点，并在保持注视的同时点击该点五次。每个圆点完成五次点击后会变为绿色。请尽量保持头部稳定。</p>' +
    '<div class="eye-calibration-area">' + dots + '</div>' +
    '<div class="eye-status" id="eye-count">已完成 0 / 9 个点；每个点需要点击 5 次。</div>',
    '<button class="task-button secondary" id="eye-calibration-skip">跳过眼动，继续行为实验</button>',
    "eye-calibration-panel"
  );
  document.querySelectorAll("[data-eye-dot]").forEach((dot, index) => {
    dot.onclick = () => {
      if (dot.disabled) return;
      const rect = dot.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      const clicks = Number(dot.dataset.clicks || 0) + 1;
      dot.dataset.clicks = String(clicks);
      try {
        if (window.webgazer && typeof window.webgazer.recordScreenPosition === "function") {
          window.webgazer.recordScreenPosition(targetX, targetY, "click");
        }
      } catch (_) {}
      recordEvent("calibration_click", {
        calibration_point: index + 1,
        click_in_point: clicks,
        target_x_px: Number(targetX.toFixed(1)),
        target_y_px: Number(targetY.toFixed(1))
      });
      dot.textContent = clicks + "/" + clicksRequired;
      dot.style.opacity = String(0.45 + 0.11 * clicks);
      if (clicks >= clicksRequired) {
        dot.disabled = true;
        dot.classList.add("is-calibrated");
        completedPoints += 1;
      }
      $("#eye-count").textContent = "已完成 " + completedPoints + " / 9 个点；当前点点击 " +
        (clicks >= clicksRequired ? clicksRequired : clicks) + " / " + clicksRequired + " 次。";
      if (completedPoints === 9) {
        recordEvent("eye_calibration_completed", {
          calibration_points_completed: completedPoints,
          calibration_clicks_per_point: clicksRequired
        });
        updateSessionMeta({
          eye_tracking_status: "calibration_completed",
          calibration_points_completed: completedPoints,
          calibration_completed_at: new Date().toISOString()
        });
        $("#eye-count").textContent = "九点校准完成，正在准备独立验证……";
        document.querySelectorAll("[data-eye-dot]").forEach((item) => { item.disabled = true; });
        setTimeout(() => {
          runEyeValidation().catch((error) => {
            const message = String(error && error.message || error);
            updateSessionMeta({ eye_tracking_status: "validation_failed", eye_validation_error: message });
            recordEvent("eye_validation_failed", { error: message });
            panel(
              "校准验证未能完成",
              '<p>九点校准已经完成，但独立验证遇到问题。你可以继续行为实验；本次眼动数据需要谨慎解释。</p>' +
              '<div class="eye-status">' + escapeHtml(message) + '</div>',
              '<div class="task-choice"><button class="task-button" id="eye-validation-continue">继续实验</button><button class="task-button secondary" id="eye-validation-skip">关闭眼动并继续</button></div>'
            );
            $("#eye-validation-continue").onclick = () => {
              try { if (typeof window.webgazer.showVideoPreview === "function") window.webgazer.showVideoPreview(false); } catch (_) {}
              eyeCalibrationContext = null;
              updateSessionMeta({ eye_tracking_status: "ready_unvalidated" });
              beginInstructions();
            };
            $("#eye-validation-skip").onclick = () => {
              eyeEnabled = false;
              eyeCalibrationContext = null;
              stopEyeTracking();
              updateSessionMeta({ eye_tracking_status: "validation_failed_skipped" });
              beginInstructions();
            };
          });
        }, 450);
      }
    };
  });
  $("#eye-calibration-skip").onclick = () => {
    eyeEnabled = false;
    eyeCalibrationContext = null;
    stopEyeTracking();
    updateSessionMeta({ eye_tracking_status: "skipped_during_calibration" });
    recordEvent("eye_tracking_skipped_during_calibration");
    beginInstructions();
  };
}

function medianEyeValue(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function runEyeValidation() {
  const points = [
    { x: 10, y: 12 }, { x: 90, y: 12 }, { x: 50, y: 50 },
    { x: 10, y: 88 }, { x: 90, y: 88 }
  ];
  const settleMs = 300;
  const measureMs = 1200;
  const minimumSamplesPerPoint = 5;
  panel(
    "五点独立校准验证",
    '<p class="eye-calibration-intro">接下来会依次出现五个验证点。请只注视圆点，不要点击。系统会在短暂稳定后记录注视估计；这些验证点不会用于训练校准模型。</p>' +
    '<div class="eye-validation-area"><div class="eye-validation-dot" id="eye-validation-dot"></div></div>' +
    '<div class="eye-status" id="eye-validation-status">准备验证……</div>',
    "",
    "eye-validation-panel"
  );
  const dot = $("#eye-validation-dot");
  const status = $("#eye-validation-status");
  const results = [];
  let totalSamples = 0;
  let validSamples = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    dot.style.left = point.x + "%";
    dot.style.top = point.y + "%";
    status.textContent = "验证点 " + (index + 1) + " / " + points.length + "：请注视圆点";
    await sleep(100);
    const rect = dot.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const context = {
      phase: "validation",
      trial_number: "",
      validation_point: index + 1,
      target_x_px: targetX,
      target_y_px: targetY,
      validation_collect_after_ms: settleMs,
      started_perf: performance.now(),
      samples: []
    };
    eyeCalibrationContext = context;
    recordEvent("validation_point_onset", {
      validation_point: index + 1,
      target_x_px: Number(targetX.toFixed(1)),
      target_y_px: Number(targetY.toFixed(1))
    });
    await sleep(settleMs + measureMs);
    eyeCalibrationContext = null;
    const pointSamples = context.samples;
    const pointValid = pointSamples.filter((sample) => sample.gaze_valid);
    totalSamples += pointSamples.length;
    validSamples += pointValid.length;
    const medianX = medianEyeValue(pointValid.map((sample) => Number(sample.x_px)));
    const medianY = medianEyeValue(pointValid.map((sample) => Number(sample.y_px)));
    const errorPx = pointValid.length >= minimumSamplesPerPoint && medianX !== null && medianY !== null
      ? Math.hypot(medianX - targetX, medianY - targetY)
      : null;
    results.push({
      point: index + 1,
      samples: pointSamples.length,
      valid_samples: pointValid.length,
      median_gaze_x_px: medianX,
      median_gaze_y_px: medianY,
      target_x_px: Number(targetX.toFixed(1)),
      target_y_px: Number(targetY.toFixed(1)),
      error_px: errorPx === null ? null : Number(errorPx.toFixed(2))
    });
    recordEvent("validation_point_complete", {
      validation_point: index + 1,
      samples: pointSamples.length,
      valid_samples: pointValid.length,
      error_px: errorPx === null ? "" : Number(errorPx.toFixed(2))
    });
    status.textContent = "已完成验证点 " + (index + 1) + " / " + points.length;
  }
  const errors = results.map((result) => result.error_px).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const meanError = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null;
  const medianError = medianEyeValue(errors);
  const p90Index = errors.length ? Math.min(errors.length - 1, Math.ceil(errors.length * 0.9) - 1) : -1;
  const p90Error = p90Index >= 0 ? errors[p90Index] : null;
  const summary = {
    validation_points: points.length,
    measurement_ms_per_point: measureMs,
    settling_ms_per_point: settleMs,
    minimum_valid_samples_per_point: minimumSamplesPerPoint,
    total_samples: totalSamples,
    valid_samples: validSamples,
    valid_sample_ratio: totalSamples ? Number((validSamples / totalSamples).toFixed(4)) : 0,
    samples_per_second: Number((totalSamples / (points.length * measureMs / 1000)).toFixed(2)),
    points_with_estimable_error: errors.length,
    mean_point_error_px: meanError === null ? null : Number(meanError.toFixed(2)),
    median_point_error_px: medianError === null ? null : Number(medianError.toFixed(2)),
    p90_point_error_px: p90Error === null ? null : Number(p90Error.toFixed(2)),
    point_results: results
  };
  const statusValue = errors.length >= 3 ? "validated" : "validation_incomplete";
  updateSessionMeta({
    eye_tracking_status: statusValue,
    eye_validation_summary: summary,
    eye_validation_completed_at: new Date().toISOString()
  });
  recordEvent("eye_validation_completed", summary);
  const formatPx = (value) => Number.isFinite(value) ? value.toFixed(1) + " px" : "有效样本不足";
  const pointRows = results.map((result) =>
    '<div class="eye-validation-row"><span>验证点 ' + result.point + '（有效样本 ' + result.valid_samples + '）</span><b>' +
    formatPx(result.error_px) + '</b></div>'
  ).join("");
  panel(
    "眼动校准报告",
    '<div class="eye-validation-summary">' +
    '<div class="eye-validation-metric"><span>平均点位误差</span><b>' + formatPx(summary.mean_point_error_px) + '</b></div>' +
    '<div class="eye-validation-metric"><span>中位点位误差</span><b>' + formatPx(summary.median_point_error_px) + '</b></div>' +
    '<div class="eye-validation-metric"><span>有效样本比例</span><b>' + (summary.valid_sample_ratio * 100).toFixed(1) + '%</b></div>' +
    '<div class="eye-validation-metric"><span>估计采样频率</span><b>' + summary.samples_per_second.toFixed(1) + ' Hz</b></div>' +
    '</div>' + pointRows +
    '<p class="eye-validation-note">以上是本次设备与环境下的探索性质量指标，不代表专业眼动仪精度，也不自动判定校准合格。建议先通过小规模 pilot 确定质量控制标准。</p>',
    '<div class="task-choice"><button class="task-button" id="eye-validation-continue">继续实验</button><button class="task-button secondary" id="eye-recalibrate">重新校准</button><button class="task-button secondary" id="eye-validation-skip">关闭眼动并继续</button></div>',
    "eye-validation-panel"
  );
  $("#eye-validation-continue").onclick = () => {
    try { if (typeof window.webgazer.showVideoPreview === "function") window.webgazer.showVideoPreview(false); } catch (_) {}
    eyeCalibrationContext = null;
    updateSessionMeta({ eye_tracking_status: "ready", eye_ready_at: new Date().toISOString() });
    recordEvent("eye_tracking_ready", { validation_points_with_error: errors.length });
    beginInstructions();
  };
  $("#eye-recalibrate").onclick = () => {
    try { if (typeof window.webgazer.clearData === "function") window.webgazer.clearData(); } catch (_) {}
    eyeCalibrationContext = { phase: "calibration", trial_number: "", started_perf: performance.now() };
    recordEvent("eye_recalibration_requested");
    runNinePointEyeCalibration();
  };
  $("#eye-validation-skip").onclick = () => {
    eyeEnabled = false;
    eyeCalibrationContext = null;
    stopEyeTracking();
    updateSessionMeta({ eye_tracking_status: "validation_skipped" });
    recordEvent("eye_tracking_disabled_after_validation");
    beginInstructions();
  };
}

function stopEyeTracking() {
  if (eyeStarted && window.webgazer) {
    try {
      if (typeof window.webgazer.clearGazeListener === "function") window.webgazer.clearGazeListener();
      if (typeof window.webgazer.pause === "function") window.webgazer.pause();
      if (typeof window.webgazer.end === "function") window.webgazer.end();
    } catch (_) {}
  }
  eyeStarted = false;
}

function beginInstructions() {
  active = true;
  currentTrialContext = null;
  let title = "";
  let config = null;

  if (selected.id === "posner") {
    title = "Posner 空间线索任务";
    config = {
      lead: "目标圆点出现后，请判断它实际出现在左侧还是右侧。每轮都以目标的位置为准。",
      steps: [
        { title: "保持注视中央", description: "尽量一直看着屏幕中央的“+”，不要跟随线索移动视线。" },
        { title: "判断目标位置", description: "左右方框中出现圆点后，立即判断圆点在左边还是右边。" }
      ],
      keys: [
        { key: "A", label: "目标在左侧" },
        { key: "L", label: "目标在右侧" }
      ],
      note: "每轮可能出现外围方框闪烁或中央箭头。线索可能有效，也可能无效；不要根据线索猜答案，只报告目标圆点真正出现的位置。"
    };
  } else if (selected.id === "search") {
    title = "视觉搜索任务";
    config = {
      lead: "请在随机分布的字母中寻找红色 T，并判断这一轮是否出现了它。",
      steps: [
        { title: "搜索整个字母区域", description: "目标始终是红色 T。字母可能分散在不同位置，布局和项目数量会变化。" },
        { title: "判断目标是否存在", description: "看到至少一个红色 T，选择“存在”；没有看到红色 T，选择“不存在”。" }
      ],
      keys: [
        { key: "F", label: "存在红色 T" },
        { key: "J", label: "不存在红色 T" }
      ],
      note: "请根据当前屏幕中的字母作答，不要根据上一轮的位置或答案推测。尽量兼顾速度与准确性。"
    };
  } else {
    title = "面孔变化检测任务";
    config = {
      lead: "请比较交替出现的两张面孔，判断它们之间是否发生了变化。部分试次两张面孔完全相同。",
      steps: [
        { title: "先判断有没有变化", description: "只要发现两次呈现的面孔有差异，就按 F；如果没有发现差异，就按 J。" },
        { title: "发现变化后选部位", description: "按 F 后，页面会继续询问你认为哪个面部特征发生了变化，请再按数字键选择。" }
      ],
      keys: [
        { key: "F", label: "发现变化" },
        { key: "J", label: "没有变化" }
      ],
      featureTitle: "按 F 后，继续选择变化部位",
      features: [
        { key: "1", label: "注视方向" },
        { key: "2", label: "嘴角" },
        { key: "3", label: "眉毛" },
        { key: "4", label: "鼻子" }
      ],
      note: "如果按 J（没有变化），本轮直接结束，不需要再选择面部部位。"
    };
  }

  panel(
    title,
    instructionSheetMarkup(config),
    '<button class="task-button instruction-start" id="instructions-next">我已了解，开始练习 <span aria-hidden="true">→</span></button>',
    "instruction-panel"
  );
  $("#instructions-next").onclick = beginPractice;
}

function shuffle(array) {
  const copy = array.slice();
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makePosnerTrials(repetitions) {
  const trials = [];
  const soas = [200, 600];
  ["外周线索", "中央箭头"].forEach((cueType) => {
    ["有效", "无效", "中性"].forEach((validity) => {
      soas.forEach((soa) => {
        for (let repeat = 0; repeat < repetitions; repeat++) {
          const targetSide = repeat % 2 === 0 ? "左" : "右";
          const cueSide = validity === "中性" ? "中性" : (validity === "有效" ? targetSide : (targetSide === "左" ? "右" : "左"));
          trials.push({
            cue_type: cueType,
            validity,
            soa_ms: soa,
            target_side: targetSide,
            cue_side: cueSide
          });
        }
      });
    });
  });
  return shuffle(trials);
}

function makeSearchTrials(repetitions) {
  const trials = [];
  ["特征搜索", "结合搜索"].forEach((searchType) => {
    [8, 16, 24].forEach((setSize) => {
      [true, false].forEach((targetPresent) => {
        for (let repeat = 0; repeat < repetitions; repeat++) {
          trials.push({ search_type: searchType, set_size: setSize, target_present: targetPresent });
        }
      });
    });
  });
  return shuffle(trials);
}

function makeFaceTrials(repetitions) {
  const trials = [];
  FACE_PAIRS.forEach((pair) => {
    for (let repeat = 0; repeat < repetitions; repeat++) {
      const reverse = repeat % 2 === 1;
      trials.push({
        changed: true,
        feature: pair.feature,
        file_a: reverse ? pair.b : pair.a,
        file_b: reverse ? pair.a : pair.b,
        direction: reverse ? "B_to_A" : "A_to_B"
      });
    }
  });
  for (let index = 0; index < repetitions + 1; index++) {
    const sameFile = FACE_PAIRS[index % FACE_PAIRS.length].a;
    trials.push({
      changed: false,
      feature: "",
      file_a: sameFile,
      file_b: sameFile,
      direction: "no_change"
    });
  }
  return shuffle(trials);
}

function makePosnerPracticeTrials() {
  const trials = [];
  ["外周线索", "中央箭头"].forEach((cueType, cueIndex) => {
    ["有效", "无效", "中性"].forEach((validity, index) => {
      const targetSide = (cueIndex + index) % 2 === 0 ? "左" : "右";
      trials.push({
        cue_type: cueType, validity,
        soa_ms: (cueIndex + index) % 2 === 0 ? 200 : 600,
        target_side: targetSide,
        cue_side: validity === "中性" ? "中性" :
          (validity === "有效" ? targetSide : (targetSide === "左" ? "右" : "左"))
      });
    });
  });
  return shuffle(trials);
}

function makeSearchPracticeTrials() {
  const examples = [
    { set_size: 8, target_present: true },
    { set_size: 16, target_present: false },
    { set_size: 24, target_present: true },
    { set_size: 16, target_present: false }
  ];
  return shuffle(["特征搜索", "结合搜索"].flatMap((searchType) =>
    examples.map((example) => Object.assign({ search_type: searchType }, example))
  ));
}

function makeTrials(id, isPractice) {
  if (!isPractice) {
    if (id === "posner") return makePosnerTrials(4);
    if (id === "search") return makeSearchTrials(4);
    return makeFaceTrials(4);
  }
  if (id === "posner") return makePosnerPracticeTrials();
  if (id === "search") return makeSearchPracticeTrials();
  return makeFaceTrials(1);
}

function beginPractice() {
  phase = "practice";
  updateSessionMeta({ phase: "practice" });
  recordEvent("phase_started", { phase: "practice" });
  trialList = makeTrials(selected.id, true);
  trialIndex = 0;
  runNext();
}

function beginFormal() {
  phase = "formal";
  updateSessionMeta({ phase: "formal" });
  recordEvent("phase_started", { phase: "formal" });
  trialList = makeTrials(selected.id, false);
  trialIndex = 0;
  runNext();
}

async function runNext() {
  const epoch = sessionEpoch;
  if (!active) return;
  if (trialIndex >= trialList.length) {
    if (phase === "practice") {
      panel(
        "练习完成",
        '<p>你已经完成练习。接下来进入正式实验。正式试次的数据会与练习试次分开标记。</p>',
        '<button class="task-button" id="formal-start">开始正式实验</button>'
      );
      $("#formal-start").onclick = beginFormal;
    } else {
      finishTask();
    }
    return;
  }
  const progress = (trialIndex / trialList.length) * 100;
  $("#task-progress").style.width = progress + "%";
  const trial = trialList[trialIndex];
  if (selected.id === "posner") await runPosnerTrial(trial, epoch);
  else if (selected.id === "search") await runSearchTrial(trial, epoch);
  else await runFaceTrial(trial, epoch);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForKey(keys, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const start = performance.now();
    const finish = (key, status) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      clearTimeout(timeout);
      if (pendingKeyCancel === cancel) pendingKeyCancel = null;
      resolve({
        key,
        status,
        rt_ms: key ? performance.now() - start : null
      });
    };
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      if (!keys.includes(key)) return;
      event.preventDefault();
      finish(key, "responded");
    };
    const cancel = () => finish(null, "cancelled");
    pendingKeyCancel = cancel;
    window.addEventListener("keydown", onKey);
    const timeout = setTimeout(() => finish(null, "timeout"), timeoutMs);
  });
}

function waitForTaskAction(register) {
  return new Promise((resolve) => {
    let cleanup = null;
    const finish = () => {
      if (typeof cleanup === "function") cleanup();
      if (pendingActionCancel === finish) pendingActionCancel = null;
      resolve();
    };
    pendingActionCancel = finish;
    cleanup = register(finish);
  });
}

function cancelPendingTaskActions() {
  if (pendingKeyCancel) pendingKeyCancel();
  if (pendingActionCancel) pendingActionCancel();
}

async function runPosnerTrial(trial, epoch) {
  const context = makeTrialContext(trial);
  currentTrialContext = context;
  const isPractice = phase === "practice";
  taskStage.innerHTML =
    '<div class="task-panel"><p class="task-muted">請注視中央十字</p>' +
    '<div class="cue-display"><div class="cue-box" id="posner-left"></div>' +
    '<div class="cue-center" id="posner-center">+</div><div class="cue-box" id="posner-right"></div></div>' +
    '<p class="task-muted">目标出现后按 A（左）或 L（右）</p></div>';
  const left = $("#posner-left");
  const right = $("#posner-right");
  const center = $("#posner-center");
  await sleep(500);
  if (!active || epoch !== sessionEpoch) return;
  recordEvent("fixation_onset");

  const cueOnset = performance.now();
  if (trial.cue_type === "外周线索") {
    if (trial.cue_side === "左" || trial.cue_side === "中性") left.classList.add("is-cued");
    if (trial.cue_side === "右" || trial.cue_side === "中性") right.classList.add("is-cued");
  } else {
    center.textContent = trial.cue_side === "中性" ? "↔" : (trial.cue_side === "左" ? "←" : "→");
    center.classList.add("cue-arrow");
  }
  recordEvent("cue_onset", { cue_type: trial.cue_type, cue_side: trial.cue_side, cue_validity: trial.validity, soa_requested_ms: trial.soa_ms });
  await sleep(100);
  if (!active || epoch !== sessionEpoch) return;
  left.classList.remove("is-cued");
  right.classList.remove("is-cued");
  center.textContent = "+";
  center.classList.remove("cue-arrow");
  recordEvent("cue_offset");
  const remaining = Math.max(0, trial.soa_ms - (performance.now() - cueOnset));
  await sleep(remaining);
  if (!active || epoch !== sessionEpoch) return;

  const target = trial.target_side === "左" ? left : right;
  target.classList.add("is-target");
  target.textContent = "●";
  const targetOnset = performance.now();
  const targetOnsetIso = new Date().toISOString();
  recordEvent("target_onset", { target_side: trial.target_side });
  const response = await waitForKey(["a", "l"], phase === "practice" ? 1500 : 1800);
  recordEvent("response", { response_key: response.key || "", response_status: response.status, rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms) });
  if (!active || epoch !== sessionEpoch) return;
  const responseSide = response.key === "a" ? "左" : response.key === "l" ? "右" : "";
  const correct = response.status === "responded" && responseSide === trial.target_side;
  appendTrial({
    cue_type: trial.cue_type,
    cue_validity: trial.validity,
    cue_side: trial.cue_side,
    target_side: trial.target_side,
    soa_requested_ms: trial.soa_ms,
    cue_onset_time: new Date(Date.now() - Math.round(targetOnset - cueOnset)).toISOString(),
    target_onset_time: targetOnsetIso,
    soa_actual_ms: Math.round(targetOnset - cueOnset),
    response_key: response.key || "",
    response_side: responseSide,
    response_status: response.status,
    correct,
    rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms)
  });
  currentTrialContext = null;
  trialIndex++;
  if (isPractice) await showPracticeFeedback(correct);
  else await sleep(300);
  runNext();
}

function createSearchArray(trial) {
  const items = [];
  const targetIndex = trial.target_present ? Math.floor(Math.random() * trial.set_size) : -1;
  for (let index = 0; index < trial.set_size; index++) {
    if (index === targetIndex) {
      items.push({ letter: "T", color: "red", is_target: true });
    } else if (trial.search_type === "特征搜索") {
      items.push({ letter: "T", color: "green", is_target: false });
    } else {
      const distractorType = index % 2 === 0 ? "redL" : "greenT";
      items.push(distractorType === "redL"
        ? { letter: "L", color: "red", is_target: false }
        : { letter: "T", color: "green", is_target: false });
    }
  }
  const shuffledItems = shuffle(items);
  return { items: shuffledItems, target_index: shuffledItems.findIndex((item) => item.is_target) };
}

function generateScatterPositions(count, container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const firstItem = container.querySelector(".search-item");
  const itemWidth = firstItem ? firstItem.offsetWidth : 34;
  const itemHeight = firstItem ? firstItem.offsetHeight : 40;
  const marginX = itemWidth / 2 + 8;
  const marginY = itemHeight / 2 + 8;
  let gap = Math.max(3, itemWidth * 0.16);
  let positions = [];

  // Rejection sampling gives each item an independent, irregular position.
  // The rectangular clearance check prevents glyph boxes from overlapping.
  for (let relaxation = 0; relaxation < 7; relaxation++) {
    positions = [];
    let attempts = 0;
    const maxAttempts = count * 1600;
    while (positions.length < count && attempts < maxAttempts) {
      attempts += 1;
      const x = marginX + Math.random() * Math.max(1, width - marginX * 2);
      const y = marginY + Math.random() * Math.max(1, height - marginY * 2);
      const separated = positions.every((point) =>
        Math.abs(point.x - x) >= itemWidth + gap ||
        Math.abs(point.y - y) >= itemHeight + gap
      );
      if (separated) positions.push({ x, y });
    }
    if (positions.length === count) break;
    gap *= 0.78;
  }

  // Fallback for unusually small screens: jittered positions remain separated as much as possible.
  if (positions.length < count) {
    const columns = Math.ceil(Math.sqrt(count * width / Math.max(1, height)));
    const rows = Math.ceil(count / columns);
    const cellWidth = (width - marginX * 2) / columns;
    const cellHeight = (height - marginY * 2) / rows;
    const slots = shuffle(Array.from({ length: columns * rows }, (_, index) => index));
    positions = slots.slice(0, count).map((slot) => {
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      return {
        x: marginX + (column + 0.5) * cellWidth + (Math.random() - 0.5) * cellWidth * 0.16,
        y: marginY + (row + 0.5) * cellHeight + (Math.random() - 0.5) * cellHeight * 0.16
      };
    });
  }

  return { positions, width, height };
}

async function runSearchTrial(trial, epoch) {
  const context = makeTrialContext(trial);
  currentTrialContext = context;
  const generated = createSearchArray(trial);
  const layout = generated.items.map((item, index) => ({
    index,
    letter: item.letter,
    color: item.color,
    is_target: item.is_target
  }));
  taskStage.innerHTML =
    '<div class="task-panel"><p class="task-muted">' + escapeHtml(trial.search_type) +
    ' · SET SIZE ' + trial.set_size + '</p>' +
    '<p>寻找<strong>红色 T</strong>。按 F = 存在，按 J = 不存在。</p>' +
    '<div class="search-scatter" id="search-scatter">' +
    generated.items.map((item, index) =>
      '<span class="search-item ' + (item.color === "red" ? "search-red" : "search-green") +
      '" data-search-item="' + index + '">' + item.letter + '</span>'
    ).join("") + '</div><p class="task-muted">项目位置每轮随机变化，请尽快且准确地判断</p></div>';

  const scatter = $("#search-scatter");
  const placement = generateScatterPositions(generated.items.length, scatter);
  placement.positions.forEach((point, index) => {
    const element = scatter.querySelector('[data-search-item="' + index + '"]');
    element.style.left = point.x + "px";
    element.style.top = point.y + "px";
    layout[index].x_px = Math.round(point.x);
    layout[index].y_px = Math.round(point.y);
    layout[index].x_percent = Number((point.x / placement.width * 100).toFixed(2));
    layout[index].y_percent = Number((point.y / placement.height * 100).toFixed(2));
  });

  updateCurrentTrial({
    target_position: generated.target_index,
    stimulus_area_width_px: placement.width,
    stimulus_area_height_px: placement.height,
    stimulus_layout: JSON.stringify(layout)
  });
  const targetOnset = performance.now();
  const targetOnsetIso = new Date().toISOString();
  recordEvent("search_array_onset", {
    target_present: trial.target_present, search_type: trial.search_type,
    set_size: trial.set_size, stimulus_area_width_px: placement.width,
    stimulus_area_height_px: placement.height
  });
  const response = await waitForKey(["f", "j"], phase === "practice" ? 3500 : 5000);
  recordEvent("response", { response_key: response.key || "", response_status: response.status, rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms) });
  if (!active || epoch !== sessionEpoch) return;
  const responsePresent = response.key === "f" ? true : response.key === "j" ? false : null;
  const correct = responsePresent !== null && responsePresent === trial.target_present;
  appendTrial({
    search_type: trial.search_type,
    set_size: trial.set_size,
    target_present: trial.target_present,
    target_onset_time: targetOnsetIso,
    target_position: generated.target_index,
    stimulus_area_width_px: placement.width,
    stimulus_area_height_px: placement.height,
    stimulus_layout: JSON.stringify(layout),
    response_key: response.key || "",
    response_present: responsePresent === null ? "" : responsePresent,
    response_status: response.status,
    correct,
    rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms)
  });
  currentTrialContext = null;
  trialIndex++;
  if (phase === "practice") await showPracticeFeedback(correct);
  else await sleep(300);
  runNext();
}

async function preloadFaceStimuli() {
  const files = FACE_PAIRS.flatMap((pair) => [pair.a, pair.b]);
  await Promise.all(files.map((file) => new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = FACE_BASE + file;
  })));
}

function faceStimulusMarkup() {
  return '<div class="face-flicker-wrap"><div id="face-flicker-frame" class="face-flicker-frame">' +
    '<img id="face-flicker-image" alt="面孔刺激" draggable="false"></div>' +
    '<div class="face-response-buttons">' +
    '<span class="task-button response-key-hint"><kbd>F</kbd> 发现变化</span>' +
    '<span class="task-button secondary response-key-hint"><kbd>J</kbd> 没有变化</span>' +
    '</div><p class="task-muted">请使用键盘作答：F = 发现变化，J = 没有变化。每轮最长 12 秒。</p></div>';
}

async function runFaceTrial(trial, epoch) {
  await preloadFaceStimuli();
  if (!active || epoch !== sessionEpoch) return;
  const context = makeTrialContext(trial);
  currentTrialContext = context;
  taskStage.innerHTML = '<div class="task-panel"><p class="task-muted">FACE FLICKER · ' +
    (trial.changed ? "CHANGE TRIAL" : "NO-CHANGE TRIAL") + '</p>' + faceStimulusMarkup() + '</div>';
  const image = $("#face-flicker-image");
  let decision = null;
  let decisionTime = null;
  let resolveDecision;
  const decisionSignal = new Promise((resolve) => { resolveDecision = resolve; });
  const waitForDecisionOr = (milliseconds) => Promise.race([
    sleep(milliseconds),
    decisionSignal
  ]);
  let flickerCount = 0;
  const trialStart = performance.now();
  const trialStartIso = new Date().toISOString();
  const deadline = trialStart + (phase === "practice" ? 8000 : 12000);
  const fileA = FACE_BASE + trial.file_a;
  const fileB = FACE_BASE + trial.file_b;

  const setVisible = (src, frameLabel) => {
    image.src = src;
    image.style.visibility = "visible";
    recordEvent(frameLabel === "A" ? "face_A_onset" : "face_B_onset", {
      stimulus_file: frameLabel === "A" ? trial.file_a : trial.file_b,
      flicker_presentation: flickerCount
    });
  };
  const setBlank = () => {
    image.style.visibility = "hidden";
    recordEvent("face_blank_onset", { flicker_presentation: flickerCount });
  };
  const stop = (value) => {
    if (decision) return;
    decision = value;
    decisionTime = performance.now();
    const partialRt = Math.round(decisionTime - trialStart);
    recordEvent("response", { decision: value, rt_ms: partialRt });
    updateCurrentTrial({
      decision: value, decision_rt_ms: partialRt,
      response_status: "responded_partial", flicker_presentations: flickerCount
    });
    resolveDecision();
  };
  const keyboard = (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === "f") {
      event.preventDefault();
      stop("found");
    } else if (key === "j") {
      event.preventDefault();
      stop("no_change");
    }
  };
  window.addEventListener("keydown", keyboard);

  let showA = true;
  while (active && !decision && performance.now() < deadline) {
    flickerCount++;
    setVisible(showA ? fileA : fileB, showA ? "A" : "B");
    await waitForDecisionOr(250);
    if (!active || decision) break;
    setBlank();
    await waitForDecisionOr(80);
    if (decision) break;
    showA = !showA;
  }
  window.removeEventListener("keydown", keyboard);
  if (!active || epoch !== sessionEpoch) return;
  if (!decision) {
    decision = "timeout";
    decisionTime = performance.now();
    recordEvent("response", { decision: "timeout", response_status: "timeout" });
  }
  const decisionRt = decision === "timeout" ? "" : Math.round(decisionTime - trialStart);
  const hit = trial.changed && decision === "found";
  const falseAlarm = !trial.changed && decision === "found";
  const miss = trial.changed && decision === "no_change";
  const correctRejection = !trial.changed && decision === "no_change";
  updateCurrentTrial({
    decision,
    outcome: hit ? "hit" : miss ? "miss" : correctRejection ? "correct_rejection" : falseAlarm ? "false_alarm" : "timeout",
    change_detected: decision === "found",
    decision_rt_ms: decisionRt,
    response_status: decision === "timeout" ? "timeout" : "responded_partial",
    flicker_presentations: flickerCount
  });

  if (decision === "found") {
    taskStage.innerHTML =
      '<div class="task-panel"><p class="task-muted">CHANGE DETECTED</p><h2>你发现了变化</h2>' +
      '<p>请选择你认为发生变化的面部部位。</p>' +
      '<p>按数字键 1–4 选择，也可以使用 Tab + Enter。</p>' +
      '<div class="task-choice face-feature-choices">' +
      FACE_PAIRS.map((pair, index) => '<button class="task-button secondary face-feature-choice" data-feature-index="' +
        (index + 1) + '" data-feature="' + escapeHtml(pair.feature) + '">' +
        (index + 1) + " · " + escapeHtml(pair.feature) + '</button>').join("") +
      '</div></div>';
    let chosenFeature = "";
    const choiceStart = performance.now();
    await waitForTaskAction((resolve) => {
      const onFeatureKey = (event) => {
        if (event.repeat || !/^[1-4]$/.test(event.key)) return;
        const button = taskStage.querySelector('[data-feature-index="' + event.key + '"]');
        if (!button) return;
        event.preventDefault();
        button.click();
      };
      window.addEventListener("keydown", onFeatureKey);
      document.querySelectorAll("[data-feature]").forEach((button) => {
        button.onclick = () => {
          chosenFeature = button.dataset.feature;
          updateCurrentTrial({
            feature_choice: chosenFeature,
            feature_choice_rt_ms: Math.round(performance.now() - choiceStart)
          });
          recordEvent("feature_choice", { feature_choice: chosenFeature });
          resolve();
        };
      });
      return () => window.removeEventListener("keydown", onFeatureKey);
    });
    if (!active || epoch !== sessionEpoch) return;
    const featureChoiceRt = Math.round(performance.now() - choiceStart);
    updateCurrentTrial({ feature_choice: chosenFeature, feature_choice_rt_ms: featureChoiceRt });
    appendTrial({
      correct: hit || correctRejection,
      stimulus_onset_time: trialStartIso,
      change_present: trial.changed,
      change_feature: trial.feature,
      file_a: trial.file_a,
      file_b: trial.file_b,
      change_direction: trial.direction,
      decision: "found",
      outcome: hit ? "hit" : "false_alarm",
      change_detected: true,
      feature_choice: chosenFeature,
      feature_choice_correct: trial.changed ? chosenFeature === trial.feature : false,
      feature_choice_rt_ms: featureChoiceRt,
      decision_rt_ms: decisionRt,
      rt_ms: decisionRt === "" ? "" : Number(decisionRt),
      response_status: "responded",
      flicker_presentations: flickerCount
    });
  } else {
    appendTrial({
      correct: hit || correctRejection,
      stimulus_onset_time: trialStartIso,
      change_present: trial.changed,
      change_feature: trial.feature,
      file_a: trial.file_a,
      file_b: trial.file_b,
      change_direction: trial.direction,
      decision: decision,
      outcome: hit ? "hit" : miss ? "miss" : correctRejection ? "correct_rejection" : falseAlarm ? "false_alarm" : "timeout",
      change_detected: false,
      feature_choice: "",
      feature_choice_correct: "",
      feature_choice_rt_ms: "",
      decision_rt_ms: decisionRt,
      rt_ms: decisionRt === "" ? "" : Number(decisionRt),
      response_status: decision === "timeout" ? "timeout" : "responded",
      flicker_presentations: flickerCount
    });
  }
  currentTrialContext = null;
  trialIndex++;
  if (phase === "practice") {
    const correct = (trial.changed && decision === "found") || (!trial.changed && decision === "no_change");
    await showPracticeFeedback(correct);
  } else {
    await sleep(300);
  }
  runNext();
}

async function showPracticeFeedback(correct) {
  const epoch = sessionEpoch;
  if (!active) return;
  panel(
    correct ? "判断正确" : "再留意一下",
    '<p>' + (correct ? "很好，继续保持。" : "练习阶段可以继续熟悉刺激和按键方式。") + '</p>' +
    '<p class="task-muted">按空格或点击下方按钮进入下一题。</p>',
    '<button class="task-button" id="practice-continue">继续</button>'
  );
  await waitForTaskAction((resolve) => {
    $("#practice-continue").onclick = resolve;
    const onSpace = (event) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      resolve();
    };
    window.addEventListener("keydown", onSpace);
    return () => window.removeEventListener("keydown", onSpace);
  });
  return active && epoch === sessionEpoch;
}

function finishTask() {
  active = false;
  currentTrialContext = null;
  stopEyeTracking();
  $("#task-progress").style.width = "100%";
  const formalRows = sessionRows.filter((row) => row.phase === "formal");
  const responded = formalRows.filter((row) => row.response_status === "responded");
  const scored = formalRows.filter((row) => typeof row.correct === "boolean");
  const accuracy = scored.length
    ? scored.filter((row) => row.correct).length / scored.length * 100
    : 0;
  const correctRts = formalRows
    .filter((row) => row.correct === true && typeof row.rt_ms === "number")
    .map((row) => row.rt_ms)
    .sort((a, b) => a - b);
  const median = correctRts.length ? correctRts[Math.floor(correctRts.length / 2)] : null;
  updateSessionMeta({
    status: "completed",
    completed_at: new Date().toISOString(),
    completed_phase: phase,
    eye_tracking_status: eyeEnabled ? "completed" : (sessionMeta && sessionMeta.eye_tracking_status) || "not_enabled",
    trials_saved: sessionRows.length,
    gaze_samples_saved: sessionGazeIndex
  });
  recordEvent("session_completed", { trials_saved: sessionRows.length, gaze_samples_saved: sessionGazeIndex });
  persistSessionGaze();
  flushPendingData();
  const storageWarningHtml = sessionWarnings.length
    ? '<p class="task-muted">注意：本地存储出现问题，建议立即下载本次 CSV 备份。详情：' + escapeHtml(sessionWarnings.join("；")) + '</p>'
    : "";
  const extraSummary = selected.id === "change"
    ? '<div class="result-line"><span>命中 / 漏报 / 虚报 / 正确拒绝</span><b>' +
      ["hit", "miss", "false_alarm", "correct_rejection"].map((outcome) =>
        formalRows.filter((row) => row.outcome === outcome).length
      ).join(" / ") + '</b></div>'
    : "";
  panel(
    "实验完成",
    '<p>感谢参与。以下为本次正式试次的描述性结果。所有练习与正式试次均已逐条保存在当前浏览器。</p>' +
    '<div class="result-box">' +
    '<div class="result-line"><span>参与者编号</span><b>' + escapeHtml(participant) + '</b></div>' +
    '<div class="result-line"><span>Session ID</span><b>' + escapeHtml(sessionId.slice(0, 12)) + '</b></div>' +
    '<div class="result-line"><span>正式试次数</span><b>' + formalRows.length + '</b></div>' +
    '<div class="result-line"><span>已作答试次</span><b>' + responded.length + '</b></div>' +
    '<div class="result-line"><span>正确率</span><b>' + accuracy.toFixed(1) + '%</b></div>' +
    '<div class="result-line"><span>正确试次中位反应时</span><b>' + (median === null ? "—" : Math.round(median) + " ms") + '</b></div>' +
    extraSummary +
    '<div class="result-line"><span>眼动追踪</span><b>' + (eyeEnabled ? "已启用（探索性）" : "未启用") + '</b></div>' +
    '<div class="result-line"><span>本次眼动样本</span><b>' + sessionGaze.length + '</b></div>' +
    '</div>' +
    '<div class="hw2-upload-status" id="hw2-upload-status" role="status" aria-live="polite">正在准备提交至课程收数平台……</div>' +
    '<p class="task-muted">完整试次记录将提交至课程 HW2 收数平台；眼动原始样本和完整事件日志仍保留在本机备份中。请勿清除浏览器数据，直到确认上传成功。</p>' + storageWarningHtml,
    '<div class="task-choice"><button class="task-button" id="download-session">下载本次试次 CSV</button>' +
    '<button class="task-button secondary" id="download-gaze">下载本次眼动 CSV</button>' +
    '<button class="task-button secondary" id="download-all">下载本机累计数据 CSV</button>' +
    '<button class="task-button secondary" id="hw2-upload-retry">提交 / 重试上传</button>' +
    '<button class="task-button secondary" id="finish-close">返回网站</button></div>'
  );
  $("#download-session").onclick = () => downloadCSV(sessionRows, selected.id + "-" + participant + "-trials.csv");
  $("#download-gaze").onclick = () => {
    if (!sessionGaze.length) {
      alert("本次没有记录到眼动样本。请确认已安装并启用 WebGazer。");
      return;
    }
    downloadCSV(sessionGaze, selected.id + "-" + participant + "-gaze.csv");
  };
  $("#download-all").onclick = downloadAllLocalData;
  $("#hw2-upload-retry").onclick = () => submitSessionToHw2(sessionId);
  $("#finish-close").onclick = exitTask;
  persistSessionGaze();
  renderHw2UploadStatus(sessionId);
  submitSessionToHw2(sessionId);
  refreshDataArchive();
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" :
    (typeof value === "object" ? JSON.stringify(value) : String(value));
  return '"' + text.replace(/"/g, '""') + '"';
}

function persistSessionGaze() {
  persistGazeFallbackChunk(true);
  gazePersisted = true;
  flushPendingData();
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCSV(data, filename) {
  if (!data || !data.length) {
    alert("当前没有可导出的数据。");
    return;
  }
  const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  const csv = [keys.map(csvCell).join(","), ...data.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadAllLocalData() {
  const allTrials = readStoredArray(STORAGE_TRIALS);
  if (!allTrials.length) {
    alert("当前浏览器尚无累计试次数据。");
    return;
  }
  downloadCSV(allTrials, "attention-lab-all-trials.csv");
}

function exitTask() {
  const wasActiveSession = !!(sessionMeta && sessionMeta.status === "in_progress");
  if (wasActiveSession) {
    interruptCurrentTrial("user_exit");
    updateSessionMeta({
      status: "abandoned",
      ended_at: new Date().toISOString(),
      end_reason: "user_exit",
      eye_tracking_status: eyeStarted ? "stopped_early" : sessionMeta.eye_tracking_status
    });
    recordEvent("session_abandoned", { end_reason: "user_exit" });
  }
  cancelPendingTaskActions();
  sessionEpoch += 1;
  persistSessionGaze();
  active = false;
  eyeCalibrationContext = null;
  currentTrialContext = null;
  stopEyeTracking();
  eyeEnabled = false;
  flushPendingData();
  if (wasActiveSession && sessionMeta && ["abandoned", "interrupted"].includes(sessionMeta.status)) {
    submitSessionToHw2(sessionMeta.session_id);
  }
  taskOverlay.classList.remove("open");
  taskOverlay.setAttribute("aria-hidden", "true");
  $("#task-progress").style.width = "0%";
  refreshDataArchive();
}

function handlePageHide() {
  if (sessionMeta && sessionMeta.status === "in_progress") {
    interruptCurrentTrial("pagehide");
    updateSessionMeta({
      status: "interrupted",
      interrupted_at: new Date().toISOString(),
      end_reason: "pagehide",
      hw2_upload_status: isHw2Configured() ? "pending" : "not_configured",
      eye_tracking_status: eyeStarted ? "interrupted" : sessionMeta.eye_tracking_status
    });
    recordEvent("session_interrupted", { end_reason: "pagehide" });
  }
  active = false;
  sessionEpoch += 1;
  cancelPendingTaskActions();
  currentTrialContext = null;
  eyeCalibrationContext = null;
  persistSessionGaze();
  stopEyeTracking();
  flushPendingData();
}

window.addEventListener("pagehide", handlePageHide);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistGazeFallbackChunk();
    flushPendingData();
  }
});
setInterval(() => {
  persistGazeFallbackChunk();
  flushPendingData();
}, 1000);


