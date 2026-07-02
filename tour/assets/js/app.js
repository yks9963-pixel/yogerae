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
      scanDisclaimer: "Menu details are AI-generated — please confirm ingredients and allergies with staff.",
      findFilterNotSpicy: "Not spicy",
      findFilterVegetarian: "Vegetarian",
      findFilterHalal: "Halal-friendly",
      findLocationDenied: "Location access was denied — showing distances relative to central Jeonju.",
      findMapUnavailable: "Map unavailable — missing API key.",
      findNoResults: "No restaurants match these filters.",
      scanErrorForbiddenOrigin: "This app can only be used from its own site. Please reload the page.",
      scanErrorRateLimited: "Too many scans — please wait a minute and try again."
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
      scanDisclaimer: "菜单信息由AI生成——请与店员确认食材与过敏信息。",
      findFilterNotSpicy: "不辣",
      findFilterVegetarian: "素食",
      findFilterHalal: "清真友好",
      findLocationDenied: "位置访问被拒绝——将以全州市中心为基准显示距离。",
      findMapUnavailable: "地图不可用（缺少API密钥）。",
      findNoResults: "没有符合筛选条件的餐厅。",
      scanErrorForbiddenOrigin: "此应用只能在官方网站上使用，请重新加载页面。",
      scanErrorRateLimited: "扫描次数过多，请稍等一分钟后再试。"
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
      scanDisclaimer: "メニュー情報はAIが生成しています——アレルギーや食材については店員にご確認ください。",
      findFilterNotSpicy: "辛くない",
      findFilterVegetarian: "ベジタリアン",
      findFilterHalal: "ハラール対応",
      findLocationDenied: "位置情報へのアクセスが拒否されました——全州市中心を基準に距離を表示します。",
      findMapUnavailable: "地図を利用できません（APIキーが未設定です）。",
      findNoResults: "この条件に一致するお店はありません。",
      scanErrorForbiddenOrigin: "このアプリは公式サイトからのみご利用いただけます。ページを再読み込みしてください。",
      scanErrorRateLimited: "スキャン回数が多すぎます。1分ほど待ってからもう一度お試しください。"
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
    },
    find: {
      initialized: false,
      userLocation: null,
      activeFilters: [],
      subview: "list",
      selectedRestaurantId: null,
      map: null,
      userMarker: null,
      markers: {}
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
    if (state.find.initialized) {
      renderRestaurantList();
    }
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

    if (viewName === "find") {
      initFindView();
    }
  }

  // ---- Scan flow (STEP 2) --------------------------------------------------
  var MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024;
  var RESIZE_MAX_DIMENSION = 1600;
  var RESIZE_JPEG_QUALITY = 0.8;

  var SCAN_ERROR_KEYS = {
    INVALID_IMAGE: "scanErrorInvalidImage",
    NO_TEXT_DETECTED: "scanErrorNoText",
    GEMINI_API_ERROR: "scanErrorApiFailure",
    GEMINI_PARSE_ERROR: "scanErrorApiFailure",
    SERVER_MISCONFIGURED: "scanErrorApiFailure",
    TIMEOUT: "scanErrorTimeout",
    FORBIDDEN_ORIGIN: "scanErrorForbiddenOrigin",
    RATE_LIMITED: "scanErrorRateLimited"
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

    var decodedByteLength = Math.ceil((base64.length * 3) / 4);
    console.log(
      "[scan] sending image: base64 length=" + base64.length + " chars (~" + decodedByteLength + " bytes decoded), " +
        "JSON body length=" + JSON.stringify({ image: base64, targetLang: state.lang }).length + " chars"
    );

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

  // ---- Find flow (STEP 3) ---------------------------------------------------
  var DEFAULT_CENTER = { lat: 35.8242, lng: 127.148 }; // Jeonju City Hall — fallback when geolocation is denied/unavailable
  var GOOGLE_MAPS_CALLBACK_NAME = "__tourGoogleMapsReady";

  function initFindView() {
    if (state.find.initialized) return;
    state.find.initialized = true;

    renderRestaurantList();
    loadGoogleMaps();

    requestUserLocation().then(function (location) {
      state.find.userLocation = location;

      var notice = document.getElementById("findLocationNotice");
      if (notice) notice.hidden = !!location;

      renderRestaurantList();

      if (state.find.map) {
        state.find.map.setCenter(location || DEFAULT_CENTER);
        addUserMarker();
      }
    });
  }

  function requestUserLocation() {
    return new Promise(function (resolve) {
      if (!("geolocation" in navigator)) {
        resolve(null);
        return;
      }

      var settled = false;
      var settle = function (result) {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      // Belt-and-suspenders timeout: some browsers leave getCurrentPosition
      // pending indefinitely while a permission prompt is unanswered, rather
      // than honoring the PositionOptions.timeout below. This guarantees the
      // fallback still kicks in instead of leaving distances/notice stuck.
      setTimeout(function () {
        settle(null);
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        function (position) {
          settle({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        function () {
          settle(null);
        },
        { timeout: 8000 }
      );
    });
  }

  function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    var earthRadiusKm = 6371;
    var dLat = toRadians(lat2 - lat1);
    var dLng = toRadians(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function formatDistanceForRestaurant(restaurant) {
    var loc = state.find.userLocation;
    if (!loc) return "—";
    var km = haversineDistanceKm(loc.lat, loc.lng, restaurant.lat, restaurant.lng);
    return km < 1 ? Math.round(km * 1000) + "m" : km.toFixed(1) + "km";
  }

  function getAllRestaurants() {
    return Array.isArray(window.TOUR_RESTAURANTS) ? window.TOUR_RESTAURANTS : [];
  }

  function getFilteredRestaurants() {
    var all = getAllRestaurants();
    if (state.find.activeFilters.length === 0) return all;
    return all.filter(function (restaurant) {
      return state.find.activeFilters.every(function (filterKey) {
        return restaurant.tags.indexOf(filterKey) !== -1;
      });
    });
  }

  function toggleFilter(filterKey) {
    var index = state.find.activeFilters.indexOf(filterKey);
    if (index === -1) {
      state.find.activeFilters.push(filterKey);
    } else {
      state.find.activeFilters.splice(index, 1);
    }

    document.querySelectorAll(".filter-chip").forEach(function (chip) {
      var isActive = state.find.activeFilters.indexOf(chip.getAttribute("data-filter")) !== -1;
      chip.classList.toggle("is-active", isActive);
    });

    renderRestaurantList();
    updateMarkerVisibility();
  }

  function renderRestaurantList() {
    var list = document.getElementById("findRestaurantList");
    if (!list) return;
    list.textContent = "";

    var restaurants = getFilteredRestaurants();

    if (restaurants.length === 0) {
      var empty = document.createElement("p");
      empty.className = "find-empty-state";
      empty.textContent = t("findNoResults");
      list.appendChild(empty);
      return;
    }

    restaurants.forEach(function (restaurant) {
      list.appendChild(buildRestaurantCard(restaurant));
    });
  }

  function buildRestaurantCard(restaurant) {
    var card = document.createElement("article");
    card.className = "restaurant-card";
    card.dataset.restaurantId = restaurant.id;

    var head = document.createElement("div");
    head.className = "restaurant-card-head";

    var emoji = document.createElement("span");
    emoji.className = "restaurant-card-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = "🍴";
    head.appendChild(emoji);

    var titleWrap = document.createElement("div");
    var name = document.createElement("h3");
    name.className = "restaurant-card-name";
    name.textContent = restaurant.name;
    var category = document.createElement("p");
    category.className = "restaurant-card-category";
    category.textContent = restaurant.category;
    titleWrap.appendChild(name);
    titleWrap.appendChild(category);
    head.appendChild(titleWrap);
    card.appendChild(head);

    var meta = document.createElement("div");
    meta.className = "restaurant-card-meta";

    var distance = document.createElement("span");
    distance.textContent = formatDistanceForRestaurant(restaurant);
    meta.appendChild(distance);

    var rating = document.createElement("span");
    rating.textContent = "★" + restaurant.rating.toFixed(1);
    meta.appendChild(rating);

    card.appendChild(meta);

    var dish = document.createElement("p");
    dish.className = "restaurant-card-dish";
    dish.textContent = restaurant.signature_dish;
    card.appendChild(dish);

    card.addEventListener("click", function () {
      showRestaurantDetail(restaurant.id);
    });

    return card;
  }

  function highlightRestaurantCard(id) {
    var card = document.querySelector('.restaurant-card[data-restaurant-id="' + id + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("is-highlighted");
    setTimeout(function () {
      card.classList.remove("is-highlighted");
    }, 1600);
  }

  function showRestaurantDetail(id) {
    var restaurant = getAllRestaurants().find(function (r) {
      return r.id === id;
    });
    if (!restaurant) return;

    state.find.selectedRestaurantId = id;

    var header = document.getElementById("findDetailHeader");
    if (header) {
      header.textContent = "";
      var name = document.createElement("h2");
      name.textContent = restaurant.name;
      var meta = document.createElement("p");
      meta.textContent = restaurant.category + " · ★" + restaurant.rating.toFixed(1);
      header.appendChild(name);
      header.appendChild(meta);
    }

    var menuWrap = document.getElementById("findDetailMenu");
    if (menuWrap) {
      menuWrap.textContent = "";
      restaurant.menu.forEach(function (item) {
        menuWrap.appendChild(buildMenuCard(item));
      });
      if (restaurant.menu.length > 0) {
        var disclaimer = document.createElement("div");
        disclaimer.className = "scan-disclaimer";
        disclaimer.textContent = "⚠️ " + t("scanDisclaimer");
        menuWrap.appendChild(disclaimer);
      }
    }

    showFindSubview("detail");
  }

  function showFindSubview(subview) {
    state.find.subview = subview;
    var listSubview = document.getElementById("findListSubview");
    var detailSubview = document.getElementById("findDetailSubview");
    if (listSubview) listSubview.hidden = subview !== "list";
    if (detailSubview) detailSubview.hidden = subview !== "detail";
  }

  function loadGoogleMaps() {
    var apiKey = window.TOUR_CONFIG && window.TOUR_CONFIG.GOOGLE_MAPS_API_KEY;
    var unavailableNotice = document.getElementById("findMapUnavailable");

    if (!apiKey) {
      if (unavailableNotice) unavailableNotice.hidden = false;
      return;
    }

    if (window.google && window.google.maps) {
      onGoogleMapsReady();
      return;
    }

    window[GOOGLE_MAPS_CALLBACK_NAME] = onGoogleMapsReady;

    var script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&loading=async&callback=" +
      GOOGLE_MAPS_CALLBACK_NAME;
    script.onerror = function () {
      if (unavailableNotice) unavailableNotice.hidden = false;
    };
    document.head.appendChild(script);
  }

  function onGoogleMapsReady() {
    var mapEl = document.getElementById("findMap");
    if (!mapEl) return;

    state.find.map = new google.maps.Map(mapEl, {
      center: state.find.userLocation || DEFAULT_CENTER,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true
    });

    addUserMarker();

    state.find.markers = {};
    getAllRestaurants().forEach(function (restaurant) {
      var marker = new google.maps.Marker({
        position: { lat: restaurant.lat, lng: restaurant.lng },
        map: state.find.map,
        title: restaurant.name
      });
      marker.addListener("click", function () {
        highlightRestaurantCard(restaurant.id);
      });
      state.find.markers[restaurant.id] = marker;
    });

    updateMarkerVisibility();
  }

  function addUserMarker() {
    if (!state.find.userLocation || !state.find.map) return;

    if (state.find.userMarker) {
      state.find.userMarker.setPosition(state.find.userLocation);
      return;
    }

    state.find.userMarker = new google.maps.Marker({
      position: state.find.userLocation,
      map: state.find.map,
      title: "You",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
      }
    });
  }

  function updateMarkerVisibility() {
    var visibleIds = getFilteredRestaurants().map(function (r) {
      return r.id;
    });
    Object.keys(state.find.markers).forEach(function (id) {
      state.find.markers[id].setMap(visibleIds.indexOf(id) !== -1 ? state.find.map : null);
    });
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
        if (state.view === "find" && state.find.subview === "detail") {
          showFindSubview("list");
          return;
        }
        navigate("landing");
      });
    }

    document.querySelectorAll(".filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        toggleFilter(chip.getAttribute("data-filter"));
      });
    });

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
