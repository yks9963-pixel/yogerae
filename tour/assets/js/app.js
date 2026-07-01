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
      findPlaceholder: "Map & nearby restaurants coming in STEP 3.",
      tabHome: "Home",
      tabScan: "Scan",
      tabFind: "Find",
      scanUploadHint: "Take a photo or choose a photo of a Korean menu.",
      scanChooseImage: "Choose Photo",
      scanLoading: "Reading your menu...",
      scanErrorGeneric: "Something went wrong. Please try again.",
      scanErrorNoText: "We couldn't find any menu text in that photo. Try a clearer, well-lit photo.",
      scanErrorApiFailure: "We couldn't translate this menu right now. Please try again.",
      scanErrorTimeout: "This is taking too long. Please try again.",
      scanErrorInvalidImage: "Please choose a JPEG/PNG/WebP photo under 10MB.",
      retryButton: "Try Again",
      scanDisclaimer: "Menu details are AI-generated — please confirm ingredients and allergies with staff."
    },
    zh: {
      langBadge: "中",
      appName: "YOGERAE Tour",
      title: "YOGERAE Tour",
      subtitle: "为游客提供菜单翻译与美食推荐",
      scanMenu: "扫描菜单",
      findFood: "附近美食",
      findPlaceholder: "地图与附近餐厅功能将在 STEP 3 中提供。",
      tabHome: "首页",
      tabScan: "扫描",
      tabFind: "附近",
      scanUploadHint: "拍照或选择一张韩文菜单照片。",
      scanChooseImage: "选择照片",
      scanLoading: "正在识别菜单…",
      scanErrorGeneric: "出错了，请重试。",
      scanErrorNoText: "未能在照片中识别到菜单文字，请尝试更清晰、光线更好的照片。",
      scanErrorApiFailure: "暂时无法翻译此菜单，请重试。",
      scanErrorTimeout: "处理时间过长，请重试。",
      scanErrorInvalidImage: "请选择小于10MB的JPEG/PNG/WebP照片。",
      retryButton: "重试",
      scanDisclaimer: "菜单信息由AI生成——请与店员确认食材与过敏信息。"
    },
    ja: {
      langBadge: "日",
      appName: "YOGERAE Tour",
      title: "YOGERAE Tour",
      subtitle: "旅行者向けメニュー翻訳とグルメ検索",
      scanMenu: "メニューをスキャン",
      findFood: "近くのグルメを探す",
      findPlaceholder: "地図と周辺レストラン機能はSTEP 3で追加予定です。",
      tabHome: "ホーム",
      tabScan: "スキャン",
      tabFind: "検索",
      scanUploadHint: "韓国語メニューの写真を撮るか選んでください。",
      scanChooseImage: "写真を選ぶ",
      scanLoading: "メニューを読み取っています…",
      scanErrorGeneric: "問題が発生しました。もう一度お試しください。",
      scanErrorNoText: "写真からメニューの文字を検出できませんでした。もっと鮮明で明るい写真をお試しください。",
      scanErrorApiFailure: "現在このメニューを翻訳できません。もう一度お試しください。",
      scanErrorTimeout: "処理に時間がかかっています。もう一度お試しください。",
      scanErrorInvalidImage: "10MB未満のJPEG/PNG/WebP写真を選んでください。",
      retryButton: "再試行",
      scanDisclaimer: "メニュー情報はAIが生成しています——アレルギーや食材については店員にご確認ください。"
    }
  };

  var LANG_STORAGE_KEY = "yogerae_tour_lang";
  var SUPPORTED_LANGS = Object.keys(I18N);
  var DEFAULT_LANG = "en";

  // ---- State ----------------------------------------------------------------
  var state = {
    lang: getInitialLang(),
    view: "landing",
    scan: {
      lastBase64: null
    }
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

  // ---- Scan flow (STEP 2) --------------------------------------------------
  var MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024;
  var RESIZE_MAX_DIMENSION = 1600;
  var RESIZE_JPEG_QUALITY = 0.8;

  var SCAN_ERROR_KEYS = {
    INVALID_IMAGE: "scanErrorInvalidImage",
    NO_TEXT_DETECTED: "scanErrorNoText",
    VISION_API_ERROR: "scanErrorApiFailure",
    TRANSLATION_API_ERROR: "scanErrorApiFailure",
    TRANSLATION_PARSE_ERROR: "scanErrorApiFailure",
    SERVER_MISCONFIGURED: "scanErrorApiFailure",
    TIMEOUT: "scanErrorTimeout"
  };

  function handleFileSelect(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!/^image\//.test(file.type) || file.size > MAX_ORIGINAL_IMAGE_BYTES) {
      showScanError("INVALID_IMAGE");
      return;
    }

    hideScanError();
    clearScanResults();
    showScanPreview(file);

    resizeImageToBase64(file)
      .then(function (base64) {
        state.scan.lastBase64 = base64;
        submitScan(base64);
      })
      .catch(function () {
        showScanError("INVALID_IMAGE");
      });
  }

  function showScanPreview(file) {
    var wrap = document.getElementById("scanPreviewWrap");
    var img = document.getElementById("scanPreviewImg");
    if (!wrap || !img) return;
    img.src = URL.createObjectURL(file);
    wrap.hidden = false;
  }

  function resizeImageToBase64(file) {
    return new Promise(function (resolve, reject) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(objectUrl);

        var scale = Math.min(1, RESIZE_MAX_DIMENSION / Math.max(img.width, img.height));
        var width = Math.round(img.width * scale);
        var height = Math.round(img.height * scale);

        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        var dataUrl = canvas.toDataURL("image/jpeg", RESIZE_JPEG_QUALITY);
        var base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("RESIZE_FAILED"));
          return;
        }
        resolve(base64);
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("IMAGE_LOAD_ERROR"));
      };

      img.src = objectUrl;
    });
  }

  function submitScan(base64) {
    hideScanError();
    clearScanResults();
    setScanLoading(true);

    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, targetLang: state.lang })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            var code = (data && data.error && data.error.code) || "NETWORK";
            var err = new Error(code);
            err.code = code;
            throw err;
          }
          return data;
        });
      })
      .then(function (data) {
        setScanLoading(false);
        renderScanResults((data && data.items) || []);
      })
      .catch(function (err) {
        setScanLoading(false);
        showScanError(err && err.code);
      });
  }

  function setScanLoading(isLoading) {
    var spinner = document.getElementById("scanSpinner");
    var fileInput = document.getElementById("scanFileInput");
    if (spinner) spinner.hidden = !isLoading;
    if (fileInput) fileInput.disabled = isLoading;
  }

  function hideScanError() {
    var errorBox = document.getElementById("scanError");
    if (errorBox) errorBox.hidden = true;
  }

  function showScanError(code) {
    var errorBox = document.getElementById("scanError");
    var errorMessage = document.getElementById("scanErrorMessage");
    if (!errorBox || !errorMessage) return;
    var key = SCAN_ERROR_KEYS[code] || "scanErrorGeneric";
    errorMessage.textContent = t(key);
    errorBox.hidden = false;
  }

  function clearScanResults() {
    var results = document.getElementById("scanResults");
    if (results) results.textContent = "";
  }

  function retrySubmitScan() {
    if (state.scan.lastBase64) {
      submitScan(state.scan.lastBase64);
    }
  }

  function renderScanResults(items) {
    var results = document.getElementById("scanResults");
    if (!results) return;
    results.textContent = "";

    items.forEach(function (item) {
      results.appendChild(buildMenuCard(item));
    });

    if (items.length > 0) {
      var disclaimer = document.createElement("div");
      disclaimer.className = "scan-disclaimer";
      disclaimer.textContent = "⚠️ " + t("scanDisclaimer");
      results.appendChild(disclaimer);
    }
  }

  function buildMenuCard(item) {
    var card = document.createElement("article");
    card.className = "menu-card";

    var head = document.createElement("div");
    head.className = "menu-card-head";

    var emoji = document.createElement("span");
    emoji.className = "menu-card-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = "🍽️";
    head.appendChild(emoji);

    var titleWrap = document.createElement("div");
    var name = document.createElement("h3");
    name.className = "menu-card-name";
    name.textContent = item.translated_name || "";
    var original = document.createElement("p");
    original.className = "menu-card-original";
    var originalParts = [item.original_ko, item.romanization].filter(Boolean);
    original.textContent = originalParts.join(" · ");
    titleWrap.appendChild(name);
    titleWrap.appendChild(original);
    head.appendChild(titleWrap);
    card.appendChild(head);

    var meta = document.createElement("div");
    meta.className = "menu-card-meta";

    var price = document.createElement("span");
    price.className = "menu-card-price";
    price.textContent = typeof item.price_krw === "number" ? "₩" + item.price_krw.toLocaleString() : "—";
    meta.appendChild(price);

    var spice = document.createElement("span");
    spice.className = "menu-card-spice";
    var spiceLevel = typeof item.spice_level === "number" ? item.spice_level : 0;
    spice.textContent = spiceLevel > 0 ? "🔥".repeat(spiceLevel) : "—";
    meta.appendChild(spice);

    card.appendChild(meta);

    if (item.description) {
      var desc = document.createElement("p");
      desc.className = "menu-card-desc";
      desc.textContent = item.description;
      card.appendChild(desc);
    }

    if (Array.isArray(item.main_ingredients) && item.main_ingredients.length > 0) {
      var ingredients = document.createElement("p");
      ingredients.className = "menu-card-ingredients";
      ingredients.textContent = item.main_ingredients.join(", ");
      card.appendChild(ingredients);
    }

    var tags = buildMenuCardTags(item);
    if (tags.length > 0) {
      var tagsWrap = document.createElement("div");
      tagsWrap.className = "menu-card-tags";
      tags.forEach(function (tag) {
        var pill = document.createElement("span");
        pill.className = "tag-pill tag-pill-" + tag.severity;
        pill.textContent = tag.label;
        tagsWrap.appendChild(pill);
      });
      card.appendChild(tagsWrap);
    }

    return card;
  }

  function buildMenuCardTags(item) {
    var tags = [];

    (Array.isArray(item.allergens) ? item.allergens : []).forEach(function (allergen) {
      if (typeof allergen !== "string") return;
      if (/^may_contain/i.test(allergen)) {
        tags.push({ severity: "yellow", label: allergen.replace(/^may_contain:\s*/i, "") });
      } else {
        tags.push({ severity: "red", label: allergen });
      }
    });

    var dietary = item.dietary || {};
    if (dietary.contains_pork) tags.push({ severity: "red", label: "Contains pork" });
    if (dietary.contains_beef) tags.push({ severity: "red", label: "Contains beef" });
    if (dietary.contains_alcohol) tags.push({ severity: "red", label: "Contains alcohol" });
    if (dietary.vegetarian === false) tags.push({ severity: "yellow", label: "Not vegetarian" });
    if (dietary.vegan === false) tags.push({ severity: "yellow", label: "Not vegan" });
    if (dietary.halal_friendly === false) tags.push({ severity: "yellow", label: "Not halal-friendly" });

    return tags;
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

    var scanFileInput = document.getElementById("scanFileInput");
    if (scanFileInput) {
      scanFileInput.addEventListener("change", handleFileSelect);
    }

    var scanRetryBtn = document.getElementById("scanRetryBtn");
    if (scanRetryBtn) {
      scanRetryBtn.addEventListener("click", retrySubmitScan);
    }

    applyTranslations();
    updateLangUI();
    navigate(state.view);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
