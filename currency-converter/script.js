/* ==========================================================================
   Currency Converter — script.js
   No frameworks. No API key required (open.er-api.com is a free, keyless
   exchange-rate API). Falls back to cached rates if offline.
   ========================================================================== */

(() => {
  "use strict";

  /* ---------------- Currency data (code, name, country for flag) ---------------- */
  const CURRENCIES = [
    ["USD","US Dollar","US"],["EUR","Euro","EU"],["GBP","British Pound","GB"],["JPY","Japanese Yen","JP"],
    ["AUD","Australian Dollar","AU"],["CAD","Canadian Dollar","CA"],["CHF","Swiss Franc","CH"],["CNY","Chinese Yuan","CN"],
    ["HKD","Hong Kong Dollar","HK"],["NZD","New Zealand Dollar","NZ"],["SEK","Swedish Krona","SE"],["KRW","South Korean Won","KR"],
    ["SGD","Singapore Dollar","SG"],["NOK","Norwegian Krone","NO"],["MXN","Mexican Peso","MX"],["INR","Indian Rupee","IN"],
    ["RUB","Russian Ruble","RU"],["ZAR","South African Rand","ZA"],["TRY","Turkish Lira","TR"],["BRL","Brazilian Real","BR"],
    ["TWD","New Taiwan Dollar","TW"],["DKK","Danish Krone","DK"],["PLN","Polish Zloty","PL"],["THB","Thai Baht","TH"],
    ["IDR","Indonesian Rupiah","ID"],["HUF","Hungarian Forint","HU"],["CZK","Czech Koruna","CZ"],["ILS","Israeli Shekel","IL"],
    ["CLP","Chilean Peso","CL"],["PHP","Philippine Peso","PH"],["AED","UAE Dirham","AE"],["COP","Colombian Peso","CO"],
    ["SAR","Saudi Riyal","SA"],["MYR","Malaysian Ringgit","MY"],["RON","Romanian Leu","RO"],["PKR","Pakistani Rupee","PK"],
    ["QAR","Qatari Riyal","QA"],["KWD","Kuwaiti Dinar","KW"],["OMR","Omani Rial","OM"],["BHD","Bahraini Dinar","BH"],
    ["NGN","Nigerian Naira","NG"],["EGP","Egyptian Pound","EG"],["VND","Vietnamese Dong","VN"],["UAH","Ukrainian Hryvnia","UA"],
    ["BDT","Bangladeshi Taka","BD"],["PEN","Peruvian Sol","PE"],["KES","Kenyan Shilling","KE"],["ARS","Argentine Peso","AR"],
    ["MAD","Moroccan Dirham","MA"],["DZD","Algerian Dinar","DZ"],["LKR","Sri Lankan Rupee","LK"],["JOD","Jordanian Dinar","JO"],
    ["TND","Tunisian Dinar","TN"],["KZT","Kazakhstani Tenge","KZ"],["ISK","Icelandic Krona","IS"],["HRK","Croatian Kuna","HR"],
    ["BGN","Bulgarian Lev","BG"],["RSD","Serbian Dinar","RS"],["UYU","Uruguayan Peso","UY"],["DOP","Dominican Peso","DO"],
    ["GTQ","Guatemalan Quetzal","GT"],["CRC","Costa Rican Colon","CR"],["BOB","Bolivian Boliviano","BO"],["PYG","Paraguayan Guarani","PY"],
    ["PAB","Panamanian Balboa","PA"],["HNL","Honduran Lempira","HN"],["NIO","Nicaraguan Cordoba","NI"],["JMD","Jamaican Dollar","JM"],
    ["TTD","Trinidad & Tobago Dollar","TT"],["BBD","Barbadian Dollar","BB"],["BSD","Bahamian Dollar","BS"],["BZD","Belize Dollar","BZ"],
    ["XCD","East Caribbean Dollar","AG"],["AWG","Aruban Florin","AW"],["ANG","Netherlands Antillean Guilder","CW"],
    ["GYD","Guyanese Dollar","GY"],["SRD","Surinamese Dollar","SR"],["FJD","Fijian Dollar","FJ"],["PGK","Papua New Guinean Kina","PG"],
    ["WST","Samoan Tala","WS"],["TOP","Tongan Paʻanga","TO"],["SBD","Solomon Islands Dollar","SB"],["VUV","Vanuatu Vatu","VU"],
    ["XPF","CFP Franc","PF"],["NPR","Nepalese Rupee","NP"],["MMK","Myanmar Kyat","MM"],["KHR","Cambodian Riel","KH"],
    ["LAK","Lao Kip","LA"],["MNT","Mongolian Tugrik","MN"],["BND","Brunei Dollar","BN"],["MOP","Macanese Pataca","MO"],
    ["BTN","Bhutanese Ngultrum","BT"],["MVR","Maldivian Rufiyaa","MV"],["AFN","Afghan Afghani","AF"],["AMD","Armenian Dram","AM"],
    ["AZN","Azerbaijani Manat","AZ"],["GEL","Georgian Lari","GE"],["BYN","Belarusian Ruble","BY"],["MDL","Moldovan Leu","MD"],
    ["ALL","Albanian Lek","AL"],["MKD","Macedonian Denar","MK"],["BAM","Bosnia-Herzegovina Mark","BA"],["UZS","Uzbekistani Som","UZ"],
    ["TJS","Tajikistani Somoni","TJ"],["TMT","Turkmenistani Manat","TM"],["KGS","Kyrgyzstani Som","KG"],["IQD","Iraqi Dinar","IQ"],
    ["IRR","Iranian Rial","IR"],["LBP","Lebanese Pound","LB"],["SYP","Syrian Pound","SY"],["YER","Yemeni Rial","YE"],
    ["ILS","Israeli New Shekel","IL"],["ETB","Ethiopian Birr","ET"],["GHS","Ghanaian Cedi","GH"],["TZS","Tanzanian Shilling","TZ"],
    ["UGX","Ugandan Shilling","UG"],["RWF","Rwandan Franc","RW"],["ZMW","Zambian Kwacha","ZM"],["MWK","Malawian Kwacha","MW"],
    ["MZN","Mozambican Metical","MZ"],["BWP","Botswana Pula","BW"],["NAD","Namibian Dollar","NA"],["SZL","Eswatini Lilangeni","SZ"],
    ["LSL","Lesotho Loti","LS"],["MUR","Mauritian Rupee","MU"],["SCR","Seychellois Rupee","SC"],["XOF","West African CFA Franc","SN"],
    ["XAF","Central African CFA Franc","CM"],["CDF","Congolese Franc","CD"],["AOA","Angolan Kwanza","AO"],["SDG","Sudanese Pound","SD"],
    ["SOS","Somali Shilling","SO"],["DJF","Djiboutian Franc","DJ"],["ERN","Eritrean Nakfa","ER"],["LYD","Libyan Dinar","LY"],
    ["MRU","Mauritanian Ouguiya","MR"],["GMD","Gambian Dalasi","GM"],["GNF","Guinean Franc","GN"],["SLL","Sierra Leonean Leone","SL"],
    ["LRD","Liberian Dollar","LR"],["CVE","Cape Verdean Escudo","CV"],["STN","São Tomé & Príncipe Dobra","ST"],["KMF","Comorian Franc","KM"],
    ["BIF","Burundian Franc","BI"],["SSP","South Sudanese Pound","SS"],["FKP","Falkland Islands Pound","FK"],["GIP","Gibraltar Pound","GI"],
    ["SHP","St Helena Pound","SH"],["JEP","Jersey Pound","JE"],["GGP","Guernsey Pound","GG"],["IMP","Isle of Man Pound","IM"],
    ["KYD","Cayman Islands Dollar","KY"],["BMD","Bermudian Dollar","BM"],["XDR","IMF Special Drawing Rights","UN"],
    ["HTG","Haitian Gourde","HT"],["CUP","Cuban Peso","CU"],["VES","Venezuelan Bolivar","VE"],["SVC","Salvadoran Colon","SV"],
    ["CLF","Chilean Unidad de Fomento","CL"],["ZWL","Zimbabwean Dollar","ZW"]
  ];

  const el = (id) => document.getElementById(id);

  const amountInput = el("amountInput");
  const fromBtn = el("fromCurrency");
  const toBtn = el("toCurrency");
  const swapBtn = el("swapBtn");
  const convertBtn = el("convertBtn");
  const copyBtn = el("copyBtn");
  const clearBtn = el("clearBtn");
  const resultValue = el("resultValue");
  const resultCode = el("resultCode");
  const resultRateLine = el("resultRateLine");
  const inverseRate = el("inverseRate");
  const lastUpdated = el("lastUpdated");
  const statusLine = el("statusLine");
  const statusDot = el("statusDot");
  const statusText = el("statusText");
  const offlineMsg = el("offlineMsg");
  const errorMsg = el("errorMsg");
  const themeToggle = el("themeToggle");
  const tickerTrack = el("tickerTrack");
  const popularPairsEl = el("popularPairs");
  const recentPairsEl = el("recentPairs");

  const pickerOverlay = el("pickerOverlay");
  const pickerTitle = el("pickerTitle");
  const pickerSearch = el("pickerSearch");
  const pickerClose = el("pickerClose");
  const allList = el("allList");
  const favList = el("favList");
  const favSection = el("favSection");
  const recentList = el("recentList");
  const recentSection = el("recentSection");

  const state = {
    from: "USD",
    to: "EUR",
    rates: null,
    base: "USD",
    updatedAt: null,
    pickerTarget: null,
    favourites: loadJSON("cc_favourites", []),
    recent: loadJSON("cc_recent", []),
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }

  function currencyByCode(code) {
    return CURRENCIES.find((c) => c[0] === code);
  }
  function flagEmoji(countryCode) {
    if (!countryCode || countryCode === "EU") return "🇪🇺";
    if (countryCode === "UN") return "🏳️";
    return countryCode
      .toUpperCase()
      .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
  }

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const saved = loadJSON("cc_theme", null);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", theme === "dark");
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    saveJSON("cc_theme", theme);
  }
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  /* ---------------- Fetch live rates ---------------- */
  async function fetchRates(base) {
    setStatus("loading", "Fetching live rates…");
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error("Network response was not OK");
      const data = await res.json();
      if (data.result !== "success" || !data.rates) throw new Error("Unexpected API response");
      state.rates = data.rates;
      state.base = base;
      state.updatedAt = new Date();
      saveJSON("cc_cache", { rates: data.rates, base, updatedAt: state.updatedAt.toISOString() });
      offlineMsg.hidden = true;
      errorMsg.hidden = true;
      setStatus("live", "Live rates connected");
      buildTicker();
      return true;
    } catch (err) {
      const cached = loadJSON("cc_cache", null);
      if (cached && cached.base === base) {
        state.rates = cached.rates;
        state.base = cached.base;
        state.updatedAt = new Date(cached.updatedAt);
        offlineMsg.hidden = false;
        setStatus("error", "Offline — using cached rates");
        return true;
      }
      errorMsg.hidden = false;
      errorMsg.textContent = "Unable to load exchange rates. Please check your connection and try again.";
      setStatus("error", "Unable to fetch rates");
      return false;
    }
  }

  function setStatus(kind, text) {
    statusLine.classList.remove("live", "error");
    if (kind === "live") statusLine.classList.add("live");
    if (kind === "error") statusLine.classList.add("error");
    statusText.textContent = text;
  }

  /* ---------------- Conversion ---------------- */
  function getRate(from, to) {
    if (!state.rates) return null;
    if (from === state.base) return state.rates[to] ?? null;
    // convert via base
    const fromRate = state.rates[from];
    const toRate = state.rates[to];
    if (!fromRate || !toRate) return null;
    return toRate / fromRate;
  }

  function formatNumber(num) {
    if (!isFinite(num)) return "0.00";
    const abs = Math.abs(num);
    const decimals = abs !== 0 && abs < 1 ? 6 : 2;
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function runConversion() {
    const amount = parseFloat((amountInput.value || "0").replace(/,/g, ""));
    const from = state.from, to = state.to;
    const rate = getRate(from, to);

    resultCode.textContent = to;

    if (rate === null || isNaN(amount)) {
      resultValue.textContent = "—";
      resultRateLine.textContent = "Rate unavailable";
      inverseRate.textContent = "—";
      return;
    }

    const converted = amount * rate;
    resultValue.textContent = formatNumber(converted);
    resultRateLine.textContent = `1 ${from} = ${formatNumber(rate)} ${to}`;
    inverseRate.textContent = `1 ${to} = ${formatNumber(1 / rate)} ${from}`;
    lastUpdated.textContent = state.updatedAt ? state.updatedAt.toLocaleString() : "—";

    pushRecent(from, to);
  }

  function pushRecent(from, to) {
    const pairKey = `${from}→${to}`;
    state.recent = [pairKey, ...state.recent.filter((p) => p !== pairKey)].slice(0, 6);
    saveJSON("cc_recent", state.recent);
    renderRecentPairs();
  }

  /* ---------------- UI wiring ---------------- */
  function setCurrencyButton(which, code) {
    const c = currencyByCode(code);
    if (!c) return;
    if (which === "from") {
      el("fromFlag").textContent = flagEmoji(c[2]);
      el("fromCode").textContent = c[0];
      state.from = code;
    } else {
      el("toFlag").textContent = flagEmoji(c[2]);
      el("toCode").textContent = c[0];
      state.to = code;
    }
  }

  fromBtn.addEventListener("click", () => openPicker("from"));
  toBtn.addEventListener("click", () => openPicker("to"));

  swapBtn.addEventListener("click", () => {
    const f = state.from, t = state.to;
    setCurrencyButton("from", t);
    setCurrencyButton("to", f);
    runConversion();
  });

  convertBtn.addEventListener("click", runConversion);
  amountInput.addEventListener("input", () => {
    amountInput.value = amountInput.value.replace(/[^0-9.,]/g, "");
    runConversion();
  });

  copyBtn.addEventListener("click", async () => {
    const text = `${resultValue.textContent} ${resultCode.textContent}`;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = original), 1500);
    } catch {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => (copyBtn.textContent = "Copy result"), 1500);
    }
  });

  clearBtn.addEventListener("click", () => {
    amountInput.value = "1";
    setCurrencyButton("from", "USD");
    setCurrencyButton("to", "EUR");
    runConversion();
  });

  /* ---------------- Picker dialog ---------------- */
  function openPicker(target) {
    state.pickerTarget = target;
    pickerTitle.textContent = target === "from" ? "Select source currency" : "Select target currency";
    pickerOverlay.hidden = false;
    pickerSearch.value = "";
    renderPickerLists("");
    pickerSearch.focus();
    document.addEventListener("keydown", onPickerKeydown);
  }
  function closePicker() {
    pickerOverlay.hidden = true;
    document.removeEventListener("keydown", onPickerKeydown);
    (state.pickerTarget === "from" ? fromBtn : toBtn).focus();
  }
  function onPickerKeydown(e) {
    if (e.key === "Escape") closePicker();
  }
  pickerClose.addEventListener("click", closePicker);
  pickerOverlay.addEventListener("click", (e) => { if (e.target === pickerOverlay) closePicker(); });
  pickerSearch.addEventListener("input", () => renderPickerLists(pickerSearch.value.trim().toLowerCase()));

  function renderPickerLists(query) {
    const filtered = CURRENCIES.filter(([code, name]) =>
      code.toLowerCase().includes(query) || name.toLowerCase().includes(query)
    );
    allList.innerHTML = "";
    filtered.forEach(([code, name, country]) => allList.appendChild(pickerItem(code, name, country)));

    favSection.hidden = state.favourites.length === 0;
    favList.innerHTML = "";
    state.favourites.forEach((code) => {
      const c = currencyByCode(code);
      if (c) favList.appendChild(pickerItem(c[0], c[1], c[2]));
    });

    recentSection.hidden = state.recent.length === 0;
    recentList.innerHTML = "";
    const recentCodes = [...new Set(state.recent.flatMap((p) => p.split("→")))];
    recentCodes.slice(0, 6).forEach((code) => {
      const c = currencyByCode(code);
      if (c) recentList.appendChild(pickerItem(c[0], c[1], c[2]));
    });
  }

  function pickerItem(code, name, country) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.innerHTML = `
      <span class="flag" aria-hidden="true">${flagEmoji(country)}</span>
      <span class="code">${code}</span>
      <span class="name">${name}</span>
      <button type="button" class="fav-btn ${state.favourites.includes(code) ? "active" : ""}" aria-label="Toggle favourite ${name}">★</button>
    `;
    li.addEventListener("click", (e) => {
      if (e.target.closest(".fav-btn")) {
        toggleFavourite(code);
        e.stopPropagation();
        return;
      }
      setCurrencyButton(state.pickerTarget, code);
      runConversion();
      closePicker();
    });
    return li;
  }

  function toggleFavourite(code) {
    if (state.favourites.includes(code)) {
      state.favourites = state.favourites.filter((c) => c !== code);
    } else {
      state.favourites = [code, ...state.favourites].slice(0, 8);
    }
    saveJSON("cc_favourites", state.favourites);
    renderPickerLists(pickerSearch.value.trim().toLowerCase());
  }

  /* ---------------- Popular & recent pairs (quick section) ---------------- */
  const POPULAR = [["USD","EUR"],["USD","GBP"],["USD","INR"],["USD","PKR"],["EUR","GBP"],["USD","JPY"],["USD","AED"],["USD","CAD"]];

  function renderPopularPairs() {
    popularPairsEl.innerHTML = "";
    POPULAR.forEach(([from, to]) => {
      const li = document.createElement("li");
      li.className = "chip";
      li.textContent = `${from} → ${to}`;
      li.addEventListener("click", () => {
        setCurrencyButton("from", from);
        setCurrencyButton("to", to);
        runConversion();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      popularPairsEl.appendChild(li);
    });
  }

  function renderRecentPairs() {
    if (state.recent.length === 0) {
      recentPairsEl.innerHTML = '<li class="chip chip-muted">No recent conversions yet</li>';
      return;
    }
    recentPairsEl.innerHTML = "";
    state.recent.forEach((pairKey) => {
      const [from, to] = pairKey.split("→");
      const li = document.createElement("li");
      li.className = "chip";
      li.textContent = `${from} → ${to}`;
      li.addEventListener("click", () => {
        setCurrencyButton("from", from);
        setCurrencyButton("to", to);
        runConversion();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      recentPairsEl.appendChild(li);
    });
  }

  /* ---------------- Ticker ---------------- */
  const TICKER_PAIRS = [["USD","EUR"],["USD","GBP"],["USD","JPY"],["USD","INR"],["USD","AED"],["USD","AUD"],["USD","CAD"],["EUR","GBP"]];
  function buildTicker() {
    if (!state.rates) return;
    const items = TICKER_PAIRS.map(([from, to]) => {
      const rate = getRate(from, to);
      if (rate === null) return "";
      return `<span>${from}/${to} <b>${formatNumber(rate)}</b></span>`;
    }).filter(Boolean);
    tickerTrack.innerHTML = items.concat(items).join(""); // duplicate for seamless loop
  }

  /* ---------------- Init ---------------- */
  async function init() {
    initTheme();
    setCurrencyButton("from", "USD");
    setCurrencyButton("to", "EUR");
    renderPopularPairs();
    renderRecentPairs();
    await fetchRates("USD");
    runConversion();
  }

  init();
})();
