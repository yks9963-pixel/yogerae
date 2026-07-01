(function () {
  "use strict";

  // ---- i18n dictionary skeleton (EN / ZH / JA) -----------------------------
  // STEP 1 scope: landing + placeholder strings only.
  // Romanization / traditional-vs-simplified split is out of scope until later STEPs.
  var I18N = {
    en: {
      langBadge: "EN",
      appName: "YOGERAE Tour",
      title: "YOGERAE Tour",
      subtitle: "Menu translation & food finder for travelers",
      scanMenu: "Scan Menu",
      findFood: "Find Food Near Me",
      scanPlaceholder: "Camera / upload flow coming in STEP 2.",
      findPlaceholder: "Map & nearby restaurants coming in STEP 3.",
      tabHome: "Home",
      tabScan: "Scan",
      tabFind: "Find"
    },
    zh: {
      langBadge: "中",
      appName: "YOGERAE Tour",
      title: "YOGERAE Tour",
      subtitle: "为游客提供菜单翻译与美食推荐",
      scanMenu: "扫描菜单",
      findFood: "附近美食",
      scanPlaceholder: "拍照/上传功能将在 STEP 2 中提供。",
      findPlaceholder: "地图与附近餐厅功能将在 STEP 3 中提供。",
      tabHome: "首页",
      tabScan: "扫描",
      tabFind: "附近"
    },
    ja: {
      langBadge: "日",
      appName: "YOGERAE Tour",
      title: "YOGERAE Tour",
      subtitle: "旅行者向けメニュー翻訳とグルメ検索",
      scanMenu: "メニューをスキャン",
      findFood: "近くのグルメを探す",
      scanPlaceholder: "カメラ/アップロード機能はSTEP 2で追加予定です。",
      findPlaceholder: "地図と周辺レストラン機能はSTEP 3で追加予定です。",
      tabHome: "ホーム",
      tabScan: "スキャン",
      tabFind: "検索"
    }
  };

  var LANG_STORAGE_KEY = "yogerae_tour_lang";
  var SUPPORTED_LANGS = Object.keys(I18N);
  var DEFAULT_LANG = "en";

  // ---- State ----------------------------------------------------------------
  var state = {
    lang: getInitialLang(),
    view: "landing"
  };

  function getInitialLang() {
    try {
      var saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) {
        return saved;
      }
    } catch (e) {
      // localStorage unavailable (e.g. privacy mode) — fall back silently.
    }
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) === -1) return;
    state.lang = lang;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      // ignore storage failures
    }
    applyTranslations();
    updateLangUI();
  }

  function t(key) {
    var dict = I18N[state.lang] || I18N[DEFAULT_LANG];
    return dict[key] !== undefined ? dict[key] : I18N[DEFAULT_LANG][key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = state.lang;
    var nodes = document.querySelectorAll("[data-i18n]");
    nodes.forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      node.textContent = t(key);
    });
    document.title = t("appName");
  }

  function updateLangUI() {
    document.querySelectorAll(".lang-chip").forEach(function (chip) {
      chip.classList.toggle("is-active", chip.getAttribute("data-lang") === state.lang);
    });
    var badge = document.getElementById("langBadge");
    if (badge) badge.textContent = t("langBadge");
  }

  // ---- View routing -----------------------------------------------------------
  function navigate(viewName) {
    var views = document.querySelectorAll(".view");
    views.forEach(function (section) {
      section.hidden = section.getAttribute("data-view") !== viewName;
    });

    document.querySelectorAll(".tab-item").forEach(function (tab) {
      tab.classList.toggle("is-active", tab.getAttribute("data-nav") === viewName);
    });

    var backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.hidden = viewName === "landing";

    state.view = viewName;
  }

  // ---- Event wiring -------------------------------------------------------
  function init() {
    document.querySelectorAll(".lang-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        setLang(chip.getAttribute("data-lang"));
      });
    });

    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () {
        navigate(el.getAttribute("data-nav"));
      });
    });

    var backBtn = document.getElementById("backBtn");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        navigate("landing");
      });
    }

    applyTranslations();
    updateLangUI();
    navigate(state.view);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
