/* =========================================================
   UNIT CONVERTER — APPLICATION LOGIC
   Vanilla JS. No frameworks, no build step, no external APIs.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. CONVERSION DATA
     Every "linear" category stores a factor that converts the
     unit to one shared base unit (e.g. meters for length).
     result = (value * fromFactor) / toFactor
     Special categories (temperature, fuel economy, shoe size)
     use their own conversion functions further below.
     --------------------------------------------------------- */
  const CATEGORIES = [
    {
      id: "length", label: "Length", icon: "📏", type: "linear", base: "meter",
      units: [
        { id: "mm", label: "Millimeter (mm)", factor: 0.001 },
        { id: "cm", label: "Centimeter (cm)", factor: 0.01 },
        { id: "m", label: "Meter (m)", factor: 1 },
        { id: "km", label: "Kilometer (km)", factor: 1000 },
        { id: "in", label: "Inch (in)", factor: 0.0254 },
        { id: "ft", label: "Foot (ft)", factor: 0.3048 },
        { id: "yd", label: "Yard (yd)", factor: 0.9144 },
        { id: "mi", label: "Mile (mi)", factor: 1609.344 },
        { id: "nmi", label: "Nautical mile (nmi)", factor: 1852 },
        { id: "um", label: "Micrometer (µm)", factor: 0.000001 },
        { id: "ly", label: "Light-year (ly)", factor: 9.4607e15 }
      ],
      examples: [
        { from: "mi", to: "km", value: 1 },
        { from: "in", to: "cm", value: 12 },
        { from: "m", to: "ft", value: 100 }
      ]
    },
    {
      id: "weight", label: "Weight / Mass", icon: "⚖️", type: "linear", base: "kilogram",
      units: [
        { id: "mg", label: "Milligram (mg)", factor: 0.000001 },
        { id: "g", label: "Gram (g)", factor: 0.001 },
        { id: "kg", label: "Kilogram (kg)", factor: 1 },
        { id: "t", label: "Metric ton (t)", factor: 1000 },
        { id: "oz", label: "Ounce (oz)", factor: 0.0283495 },
        { id: "lb", label: "Pound (lb)", factor: 0.453592 },
        { id: "st", label: "Stone (st)", factor: 6.35029 },
        { id: "ustons", label: "US ton (short)", factor: 907.185 },
        { id: "uktons", label: "Imperial ton (long)", factor: 1016.05 }
      ],
      examples: [
        { from: "lb", to: "kg", value: 1 },
        { from: "kg", to: "lb", value: 70 },
        { from: "oz", to: "g", value: 8 }
      ]
    },
    {
      id: "temperature", label: "Temperature", icon: "🌡️", type: "temperature",
      units: [
        { id: "C", label: "Celsius (°C)" },
        { id: "F", label: "Fahrenheit (°F)" },
        { id: "K", label: "Kelvin (K)" }
      ],
      examples: [
        { from: "C", to: "F", value: 100 },
        { from: "F", to: "C", value: 98.6 },
        { from: "C", to: "K", value: 0 }
      ]
    },
    {
      id: "area", label: "Area", icon: "📐", type: "linear", base: "square meter",
      units: [
        { id: "mm2", label: "Square millimeter (mm²)", factor: 0.000001 },
        { id: "cm2", label: "Square centimeter (cm²)", factor: 0.0001 },
        { id: "m2", label: "Square meter (m²)", factor: 1 },
        { id: "ha", label: "Hectare (ha)", factor: 10000 },
        { id: "km2", label: "Square kilometer (km²)", factor: 1000000 },
        { id: "in2", label: "Square inch (in²)", factor: 0.00064516 },
        { id: "ft2", label: "Square foot (ft²)", factor: 0.092903 },
        { id: "yd2", label: "Square yard (yd²)", factor: 0.836127 },
        { id: "ac", label: "Acre", factor: 4046.86 },
        { id: "mi2", label: "Square mile (mi²)", factor: 2589988.11 }
      ],
      examples: [
        { from: "ac", to: "m2", value: 1 },
        { from: "ft2", to: "m2", value: 1000 },
        { from: "ha", to: "ac", value: 1 }
      ]
    },
    {
      id: "volume", label: "Volume", icon: "🧪", type: "linear", base: "liter",
      units: [
        { id: "ml", label: "Milliliter (mL)", factor: 0.001 },
        { id: "l", label: "Liter (L)", factor: 1 },
        { id: "m3", label: "Cubic meter (m³)", factor: 1000 },
        { id: "tsp", label: "Teaspoon (US)", factor: 0.00492892 },
        { id: "tbsp", label: "Tablespoon (US)", factor: 0.0147868 },
        { id: "cup", label: "Cup (US)", factor: 0.24 },
        { id: "floz", label: "Fluid ounce (US)", factor: 0.0295735 },
        { id: "pt", label: "Pint (US)", factor: 0.473176 },
        { id: "qt", label: "Quart (US)", factor: 0.946353 },
        { id: "gal", label: "Gallon (US)", factor: 3.78541 },
        { id: "galuk", label: "Gallon (Imperial)", factor: 4.54609 },
        { id: "ft3", label: "Cubic foot (ft³)", factor: 28.3168 },
        { id: "in3", label: "Cubic inch (in³)", factor: 0.0163871 }
      ],
      examples: [
        { from: "gal", to: "l", value: 1 },
        { from: "cup", to: "ml", value: 1 },
        { from: "l", to: "floz", value: 1 }
      ]
    },
    {
      id: "time", label: "Time", icon: "⏱️", type: "linear", base: "second",
      units: [
        { id: "ms", label: "Millisecond (ms)", factor: 0.001 },
        { id: "s", label: "Second (s)", factor: 1 },
        { id: "min", label: "Minute (min)", factor: 60 },
        { id: "hr", label: "Hour (hr)", factor: 3600 },
        { id: "day", label: "Day", factor: 86400 },
        { id: "week", label: "Week", factor: 604800 },
        { id: "month", label: "Month (avg.)", factor: 2629800 },
        { id: "year", label: "Year (avg.)", factor: 31557600 },
        { id: "decade", label: "Decade", factor: 315576000 }
      ],
      examples: [
        { from: "hr", to: "min", value: 2 },
        { from: "day", to: "hr", value: 1 },
        { from: "year", to: "day", value: 1 }
      ]
    },
    {
      id: "speed", label: "Speed", icon: "🚀", type: "linear", base: "m/s",
      units: [
        { id: "mps", label: "Meter/second (m/s)", factor: 1 },
        { id: "kmh", label: "Kilometer/hour (km/h)", factor: 0.277778 },
        { id: "mph", label: "Mile/hour (mph)", factor: 0.44704 },
        { id: "kn", label: "Knot (kn)", factor: 0.514444 },
        { id: "fps", label: "Foot/second (ft/s)", factor: 0.3048 },
        { id: "mach", label: "Mach (at sea level)", factor: 343 }
      ],
      examples: [
        { from: "kmh", to: "mph", value: 100 },
        { from: "mph", to: "kmh", value: 60 },
        { from: "kn", to: "kmh", value: 20 }
      ]
    },
    {
      id: "pressure", label: "Pressure", icon: "🧯", type: "linear", base: "pascal",
      units: [
        { id: "pa", label: "Pascal (Pa)", factor: 1 },
        { id: "kpa", label: "Kilopascal (kPa)", factor: 1000 },
        { id: "bar", label: "Bar", factor: 100000 },
        { id: "psi", label: "PSI", factor: 6894.76 },
        { id: "atm", label: "Atmosphere (atm)", factor: 101325 },
        { id: "torr", label: "Torr / mmHg", factor: 133.322 }
      ],
      examples: [
        { from: "psi", to: "bar", value: 32 },
        { from: "atm", to: "kpa", value: 1 },
        { from: "bar", to: "psi", value: 1 }
      ]
    },
    {
      id: "energy", label: "Energy", icon: "⚡", type: "linear", base: "joule",
      units: [
        { id: "j", label: "Joule (J)", factor: 1 },
        { id: "kj", label: "Kilojoule (kJ)", factor: 1000 },
        { id: "cal", label: "Calorie (cal)", factor: 4.184 },
        { id: "kcal", label: "Kilocalorie (kcal)", factor: 4184 },
        { id: "wh", label: "Watt-hour (Wh)", factor: 3600 },
        { id: "kwh", label: "Kilowatt-hour (kWh)", factor: 3600000 },
        { id: "ev", label: "Electronvolt (eV)", factor: 1.60218e-19 },
        { id: "btu", label: "BTU", factor: 1055.06 }
      ],
      examples: [
        { from: "kcal", to: "kj", value: 100 },
        { from: "kwh", to: "kj", value: 1 },
        { from: "btu", to: "j", value: 1 }
      ]
    },
    {
      id: "power", label: "Power", icon: "🔋", type: "linear", base: "watt",
      units: [
        { id: "w", label: "Watt (W)", factor: 1 },
        { id: "kw", label: "Kilowatt (kW)", factor: 1000 },
        { id: "mw", label: "Megawatt (MW)", factor: 1000000 },
        { id: "hp", label: "Horsepower (hp)", factor: 745.7 },
        { id: "btuh", label: "BTU/hour", factor: 0.293071 },
        { id: "ftlbmin", label: "Foot-pound/minute", factor: 0.0225970 }
      ],
      examples: [
        { from: "hp", to: "kw", value: 1 },
        { from: "kw", to: "hp", value: 100 },
        { from: "w", to: "hp", value: 750 }
      ]
    },
    {
      id: "force", label: "Force", icon: "🧲", type: "linear", base: "newton",
      units: [
        { id: "n", label: "Newton (N)", factor: 1 },
        { id: "kn", label: "Kilonewton (kN)", factor: 1000 },
        { id: "lbf", label: "Pound-force (lbf)", factor: 4.44822 },
        { id: "dyn", label: "Dyne", factor: 0.00001 },
        { id: "kgf", label: "Kilogram-force (kgf)", factor: 9.80665 }
      ],
      examples: [
        { from: "lbf", to: "n", value: 1 },
        { from: "n", to: "kgf", value: 100 },
        { from: "kn", to: "lbf", value: 1 }
      ]
    },
    {
      id: "fuel", label: "Fuel Economy", icon: "⛽", type: "fuel",
      units: [
        { id: "mpgus", label: "Miles per gallon (US)" },
        { id: "mpguk", label: "Miles per gallon (UK)" },
        { id: "kml", label: "Kilometers per liter" },
        { id: "l100km", label: "Liters per 100 km" }
      ],
      examples: [
        { from: "mpgus", to: "l100km", value: 30 },
        { from: "l100km", to: "mpgus", value: 8 },
        { from: "kml", to: "mpgus", value: 10 }
      ]
    },
    {
      id: "data", label: "Data Storage", icon: "💾", type: "linear", base: "byte",
      units: [
        { id: "bit", label: "Bit", factor: 0.125 },
        { id: "byte", label: "Byte (B)", factor: 1 },
        { id: "kb", label: "Kilobyte (KB)", factor: 1000 },
        { id: "mb", label: "Megabyte (MB)", factor: 1000000 },
        { id: "gb", label: "Gigabyte (GB)", factor: 1e9 },
        { id: "tb", label: "Terabyte (TB)", factor: 1e12 },
        { id: "kib", label: "Kibibyte (KiB)", factor: 1024 },
        { id: "mib", label: "Mebibyte (MiB)", factor: 1048576 },
        { id: "gib", label: "Gibibyte (GiB)", factor: 1073741824 },
        { id: "tib", label: "Tebibyte (TiB)", factor: 1099511627776 }
      ],
      examples: [
        { from: "gb", to: "mb", value: 1 },
        { from: "gib", to: "gb", value: 1 },
        { from: "tb", to: "gb", value: 1 }
      ]
    },
    {
      id: "datarate", label: "Data Transfer Rate", icon: "📶", type: "linear", base: "bit/s",
      units: [
        { id: "bps", label: "Bits per second (bps)", factor: 1 },
        { id: "kbps", label: "Kilobits/sec (Kbps)", factor: 1000 },
        { id: "mbps", label: "Megabits/sec (Mbps)", factor: 1000000 },
        { id: "gbps", label: "Gigabits/sec (Gbps)", factor: 1e9 },
        { id: "Bps", label: "Bytes/sec (B/s)", factor: 8 },
        { id: "KBps", label: "Kilobytes/sec (KB/s)", factor: 8000 },
        { id: "MBps", label: "Megabytes/sec (MB/s)", factor: 8e6 },
        { id: "GBps", label: "Gigabytes/sec (GB/s)", factor: 8e9 }
      ],
      examples: [
        { from: "mbps", to: "MBps", value: 100 },
        { from: "gbps", to: "mbps", value: 1 },
        { from: "KBps", to: "kbps", value: 500 }
      ]
    },
    {
      id: "frequency", label: "Frequency", icon: "📻", type: "linear", base: "hertz",
      units: [
        { id: "hz", label: "Hertz (Hz)", factor: 1 },
        { id: "khz", label: "Kilohertz (kHz)", factor: 1000 },
        { id: "mhz", label: "Megahertz (MHz)", factor: 1000000 },
        { id: "ghz", label: "Gigahertz (GHz)", factor: 1e9 },
        { id: "rpm", label: "RPM (rev/min)", factor: 0.0166667 }
      ],
      examples: [
        { from: "ghz", to: "mhz", value: 3.5 },
        { from: "hz", to: "rpm", value: 50 },
        { from: "khz", to: "hz", value: 1 }
      ]
    },
    {
      id: "angle", label: "Angle", icon: "📐", type: "linear", base: "degree",
      units: [
        { id: "deg", label: "Degree (°)", factor: 1 },
        { id: "rad", label: "Radian (rad)", factor: 57.29578 },
        { id: "grad", label: "Gradian (grad)", factor: 0.9 },
        { id: "arcmin", label: "Arcminute (′)", factor: 0.0166667 },
        { id: "arcsec", label: "Arcsecond (″)", factor: 0.000277778 },
        { id: "turn", label: "Full turn", factor: 360 }
      ],
      examples: [
        { from: "deg", to: "rad", value: 180 },
        { from: "rad", to: "deg", value: 1 },
        { from: "turn", to: "deg", value: 1 }
      ]
    },
    {
      id: "currency", label: "Currency", icon: "💱", type: "linear", base: "USD",
      note: "Fixed demo exchange rates — not live market data.",
      units: [
        { id: "usd", label: "US Dollar (USD)", factor: 1 },
        { id: "eur", label: "Euro (EUR)", factor: 0.92 },
        { id: "gbp", label: "British Pound (GBP)", factor: 0.78 },
        { id: "jpy", label: "Japanese Yen (JPY)", factor: 156.5 },
        { id: "inr", label: "Indian Rupee (INR)", factor: 83.4 },
        { id: "aud", label: "Australian Dollar (AUD)", factor: 1.51 },
        { id: "cad", label: "Canadian Dollar (CAD)", factor: 1.36 },
        { id: "cny", label: "Chinese Yuan (CNY)", factor: 7.24 },
        { id: "chf", label: "Swiss Franc (CHF)", factor: 0.88 }
      ],
      examples: [
        { from: "usd", to: "eur", value: 100 },
        { from: "eur", to: "usd", value: 100 },
        { from: "usd", to: "jpy", value: 50 }
      ]
    },
    {
      id: "cooking", label: "Cooking Units", icon: "🍳", type: "linear", base: "ml",
      units: [
        { id: "ctsp", label: "Teaspoon (tsp)", factor: 4.92892 },
        { id: "ctbsp", label: "Tablespoon (tbsp)", factor: 14.7868 },
        { id: "ccup", label: "Cup", factor: 240 },
        { id: "cfloz", label: "Fluid ounce (fl oz)", factor: 29.5735 },
        { id: "cpt", label: "Pint", factor: 473.176 },
        { id: "cqt", label: "Quart", factor: 946.353 },
        { id: "cgal", label: "Gallon", factor: 3785.41 },
        { id: "cml", label: "Milliliter (mL)", factor: 1 },
        { id: "cl", label: "Liter (L)", factor: 1000 },
        { id: "cstick", label: "Stick of butter", factor: 118.29 }
      ],
      examples: [
        { from: "ccup", to: "cml", value: 1 },
        { from: "ctbsp", to: "ctsp", value: 1 },
        { from: "cstick", to: "ccup", value: 1 }
      ]
    },
    {
      id: "typography", label: "Typography", icon: "🔤", type: "linear", base: "px",
      note: "Assumes a 16px root font size and 96 DPI screen.",
      units: [
        { id: "px", label: "Pixel (px)", factor: 1 },
        { id: "pt", label: "Point (pt)", factor: 1.333333 },
        { id: "pc", label: "Pica (pc)", factor: 16 },
        { id: "in", label: "Inch (in)", factor: 96 },
        { id: "cm", label: "Centimeter (cm)", factor: 37.7953 },
        { id: "mm", label: "Millimeter (mm)", factor: 3.77953 },
        { id: "em", label: "Em (16px base)", factor: 16 },
        { id: "rem", label: "Rem (16px root)", factor: 16 }
      ],
      examples: [
        { from: "px", to: "pt", value: 16 },
        { from: "rem", to: "px", value: 1 },
        { from: "pt", to: "px", value: 12 }
      ]
    },
    {
      id: "shoe", label: "Shoe Size", icon: "👟", type: "shoe",
      note: "Approximate, based on standard men's sizing charts.",
      units: [
        { id: "us", label: "US size" },
        { id: "uk", label: "UK size" },
        { id: "eu", label: "EU size" }
      ],
      examples: [
        { from: "us", to: "eu", value: 9 },
        { from: "uk", to: "us", value: 8 },
        { from: "eu", to: "us", value: 42 }
      ]
    }
  ];

  // Parallel sizing tables for shoe-size interpolation (men's standard).
  const SHOE_TABLE = {
    us: [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14],
    uk: [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12.5, 13.5],
    eu: [36, 37, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 48]
  };

  /* ---------------------------------------------------------
     2. STATE
     --------------------------------------------------------- */
  const state = {
    category: CATEGORIES[0],
    precision: 4,
    scientific: false,
    favorites: loadJSON("uc_favorites", []),
    history: loadJSON("uc_history", []),
    recent: loadJSON("uc_recent", [])
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------------------------------------------------------
     3. DOM REFERENCES
     --------------------------------------------------------- */
  const el = {
    categorySearch: document.getElementById("categorySearch"),
    categoryRail: document.getElementById("categoryRail"),
    fromValue: document.getElementById("fromValue"),
    toValue: document.getElementById("toValue"),
    fromUnit: document.getElementById("fromUnit"),
    toUnit: document.getElementById("toUnit"),
    swapBtn: document.getElementById("swapBtn"),
    inputError: document.getElementById("inputError"),
    precisionRange: document.getElementById("precisionRange"),
    precisionValue: document.getElementById("precisionValue"),
    scientificToggle: document.getElementById("scientificToggle"),
    favBtn: document.getElementById("favBtn"),
    formulaText: document.getElementById("formulaText"),
    copyBtn: document.getElementById("copyBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    printBtn: document.getElementById("printBtn"),
    clearBtn: document.getElementById("clearBtn"),
    examplesList: document.getElementById("examplesList"),
    relatedList: document.getElementById("relatedList"),
    recentList: document.getElementById("recentList"),
    favList: document.getElementById("favList"),
    historyList: document.getElementById("historyList"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    toast: document.getElementById("toast"),
    themeToggle: document.getElementById("themeToggle"),
    navToggle: document.getElementById("navToggle"),
    navMenu: document.getElementById("navMenu")
  };

  /* ---------------------------------------------------------
     4. CONVERSION ENGINE
     --------------------------------------------------------- */
  function findUnit(category, unitId) {
    return category.units.find(function (u) { return u.id === unitId; });
  }

  function convert(category, fromId, toId, value) {
    if (category.type === "temperature") return convertTemperature(fromId, toId, value);
    if (category.type === "fuel") return convertFuel(fromId, toId, value);
    if (category.type === "shoe") return convertShoe(fromId, toId, value);
    // linear
    const fromUnit = findUnit(category, fromId);
    const toUnit = findUnit(category, toId);
    const base = value * fromUnit.factor;
    const result = base / toUnit.factor;
    const ratio = fromUnit.factor / toUnit.factor;
    const formula = "result = value \u00D7 (" + trimNum(fromUnit.factor) + " / " + trimNum(toUnit.factor) + ") = value \u00D7 " + trimNum(ratio);
    return { result: result, formula: formula };
  }

  function convertTemperature(fromId, toId, v) {
    const toC = { C: function (x) { return x; }, F: function (x) { return (x - 32) * 5 / 9; }, K: function (x) { return x - 273.15; } };
    const fromC = { C: function (x) { return x; }, F: function (x) { return x * 9 / 5 + 32; }, K: function (x) { return x + 273.15; } };
    const c = toC[fromId](v);
    const result = fromC[toId](c);
    const formulas = {
      "C-F": "°F = (°C \u00D7 9/5) + 32", "F-C": "°C = (°F − 32) \u00D7 5/9",
      "C-K": "K = °C + 273.15", "K-C": "°C = K − 273.15",
      "F-K": "K = (°F − 32) \u00D7 5/9 + 273.15", "K-F": "°F = (K − 273.15) \u00D7 9/5 + 32",
      "C-C": "no conversion needed", "F-F": "no conversion needed", "K-K": "no conversion needed"
    };
    return { result: result, formula: formulas[fromId + "-" + toId] || "" };
  }

  function convertFuel(fromId, toId, v) {
    const toKml = {
      mpgus: function (x) { return x * 0.425144; },
      mpguk: function (x) { return x * 0.354006; },
      kml: function (x) { return x; },
      l100km: function (x) { return x === 0 ? Infinity : 100 / x; }
    };
    const fromKml = {
      mpgus: function (x) { return x / 0.425144; },
      mpguk: function (x) { return x / 0.354006; },
      kml: function (x) { return x; },
      l100km: function (x) { return x === 0 ? Infinity : 100 / x; }
    };
    const kml = toKml[fromId](v);
    const result = fromKml[toId](kml);
    return { result: result, formula: "Converted via km/L (fuel-economy units are inversely related, not linear)." };
  }

  function convertShoe(fromId, toId, v) {
    if (fromId === toId) return { result: v, formula: "Same sizing system." };
    const fromArr = SHOE_TABLE[fromId], toArr = SHOE_TABLE[toId];
    const result = interpolate(fromArr, toArr, v);
    return { result: result, formula: "Matched against standard men's sizing charts (US / UK / EU)." };
  }

  function interpolate(fromArr, toArr, value) {
    const n = fromArr.length;
    if (value <= fromArr[0]) {
      const slope = (toArr[1] - toArr[0]) / (fromArr[1] - fromArr[0]);
      return toArr[0] + (value - fromArr[0]) * slope;
    }
    if (value >= fromArr[n - 1]) {
      const slope = (toArr[n - 1] - toArr[n - 2]) / (fromArr[n - 1] - fromArr[n - 2]);
      return toArr[n - 1] + (value - fromArr[n - 1]) * slope;
    }
    for (let i = 0; i < n - 1; i++) {
      if (value >= fromArr[i] && value <= fromArr[i + 1]) {
        const t = (value - fromArr[i]) / (fromArr[i + 1] - fromArr[i]);
        return toArr[i] + t * (toArr[i + 1] - toArr[i]);
      }
    }
    return NaN;
  }

  function trimNum(n) {
    if (!isFinite(n)) return String(n);
    const s = Number(n.toPrecision(8)).toString();
    return s;
  }

  /* ---------------------------------------------------------
     5. FORMATTING
     --------------------------------------------------------- */
  function formatResult(n) {
    if (n === null || n === undefined || isNaN(n)) return "";
    if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
    if (state.scientific) return n.toExponential(state.precision);
    // avoid -0
    const fixed = n.toFixed(state.precision);
    return (Object.is(parseFloat(fixed), -0) ? (0).toFixed(state.precision) : fixed);
  }

  /* ---------------------------------------------------------
     6. RENDERING
     --------------------------------------------------------- */
  function renderCategoryRail(filter) {
    const q = (filter || "").trim().toLowerCase();
    el.categoryRail.innerHTML = "";
    CATEGORIES.forEach(function (cat) {
      const match = !q || cat.label.toLowerCase().indexOf(q) !== -1;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-chip" + (match ? "" : " hidden");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat.id === state.category.id ? "true" : "false");
      btn.dataset.id = cat.id;
      btn.innerHTML = '<span aria-hidden="true">' + cat.icon + "</span> " + cat.label;
      btn.addEventListener("click", function () { setCategory(cat.id); });
      el.categoryRail.appendChild(btn);
    });
  }

  function populateUnitSelects() {
    const cat = state.category;
    [el.fromUnit, el.toUnit].forEach(function (select) {
      select.innerHTML = "";
      cat.units.forEach(function (u) {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.label;
        select.appendChild(opt);
      });
    });
    el.fromUnit.selectedIndex = 0;
    el.toUnit.selectedIndex = cat.units.length > 1 ? 1 : 0;
  }

  function renderExamples() {
    const cat = state.category;
    el.examplesList.innerHTML = "";
    (cat.examples || []).forEach(function (ex) {
      const fromU = findUnit(cat, ex.from), toU = findUnit(cat, ex.to);
      const out = convert(cat, ex.from, ex.to, ex.value);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "link-item";
      const fromLabel = fromU ? fromU.label : ex.from;
      const toLabel = toU ? toU.label : ex.to;
      btn.innerHTML = "<span>" + ex.value + " " + fromLabel.split(" (")[0] + "</span><span>" + formatValue(out.result) + " " + toLabel.split(" (")[0] + "</span>";
      btn.addEventListener("click", function () {
        el.fromUnit.value = ex.from; el.toUnit.value = ex.to; el.fromValue.value = ex.value;
        runConversion();
      });
      li.appendChild(btn);
      el.examplesList.appendChild(li);
    });
  }

  function formatValue(n) {
    if (!isFinite(n)) return String(n);
    const s = Number(n.toPrecision(6)).toString();
    return s;
  }

  function renderRelated() {
    el.relatedList.innerHTML = "";
    CATEGORIES.filter(function (c) { return c.id !== state.category.id; })
      .slice(0, 6)
      .forEach(function (c) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = c.icon + " " + c.label;
        btn.addEventListener("click", function () { setCategory(c.id); });
        el.relatedList.appendChild(btn);
      });
  }

  function renderRecent() {
    renderSimpleList(el.recentList, state.recent, "Nothing converted yet.");
  }
  function renderFavorites() {
    renderSimpleList(el.favList, state.favorites, "No favorites saved.", true);
  }
  function renderHistory() {
    renderSimpleList(el.historyList, state.history.slice(0, 12), "Your last conversions appear here.");
  }

  function renderSimpleList(container, items, emptyText, removable) {
    container.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = emptyText;
      container.appendChild(li);
      return;
    }
    items.forEach(function (item, idx) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "link-item";
      btn.innerHTML = "<span>" + item.text + "</span>" + (removable ? '<span aria-hidden="true">✕</span>' : "<span>↺</span>");
      btn.addEventListener("click", function () {
        if (removable) {
          state.favorites.splice(idx, 1);
          saveJSON("uc_favorites", state.favorites);
          renderFavorites();
        } else {
          applyRecord(item);
        }
      });
      li.appendChild(btn);
      container.appendChild(li);
    });
  }

  function applyRecord(item) {
    setCategory(item.categoryId, true);
    el.fromUnit.value = item.from;
    el.toUnit.value = item.to;
    el.fromValue.value = item.value;
    runConversion();
  }

  /* ---------------------------------------------------------
     7. CORE ACTIONS
     --------------------------------------------------------- */
  function setCategory(id, skipRailRefresh) {
    const cat = CATEGORIES.find(function (c) { return c.id === id; });
    if (!cat) return;
    state.category = cat;
    populateUnitSelects();
    if (!skipRailRefresh) {
      Array.prototype.forEach.call(el.categoryRail.children, function (chip) {
        chip.setAttribute("aria-selected", chip.dataset.id === id ? "true" : "false");
      });
    } else {
      renderCategoryRail(el.categorySearch.value);
    }
    renderExamples();
    renderRelated();
    el.fromValue.value = "1";
    runConversion();
  }

  function validateInput(raw) {
    if (raw.trim() === "") return { valid: false, message: "" };
    const n = Number(raw);
    if (isNaN(n)) return { valid: false, message: "Please enter a valid number." };
    return { valid: true, value: n };
  }

  function runConversion(recordHistory) {
    const validation = validateInput(el.fromValue.value);
    if (!validation.valid) {
      el.toValue.value = "";
      el.formulaText.textContent = "—";
      el.inputError.textContent = validation.message;
      return;
    }
    el.inputError.textContent = "";
    const cat = state.category;
    const fromId = el.fromUnit.value, toId = el.toUnit.value;
    const out = convert(cat, fromId, toId, validation.value);
    el.toValue.value = formatResult(out.result);
    el.formulaText.textContent = out.formula + (cat.note ? "  ·  " + cat.note : "");

    updateFavButtonState();

    // recent (per category)
    const label = cat.icon + " " + cat.label;
    state.recent = [{ text: label, categoryId: cat.id, from: fromId, to: toId, value: validation.value }]
      .concat(state.recent.filter(function (r) { return r.categoryId !== cat.id; }))
      .slice(0, 5);
    saveJSON("uc_recent", state.recent);
    renderRecent();

    if (recordHistory) {
      const fromU = findUnit(cat, fromId), toU = findUnit(cat, toId);
      const text = validation.value + " " + (fromU ? fromU.label.split(" (")[0] : fromId) + " = " + formatResult(out.result) + " " + (toU ? toU.label.split(" (")[0] : toId);
      state.history = [{ text: text, categoryId: cat.id, from: fromId, to: toId, value: validation.value }].concat(state.history).slice(0, 30);
      saveJSON("uc_history", state.history);
      renderHistory();
    }
  }

  function currentFavoriteKey() {
    return state.category.id + ":" + el.fromUnit.value + ":" + el.toUnit.value;
  }

  function updateFavButtonState() {
    const key = currentFavoriteKey();
    const exists = state.favorites.some(function (f) { return f.key === key; });
    el.favBtn.setAttribute("aria-pressed", exists ? "true" : "false");
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.toast.classList.remove("show"); }, 2200);
  }

  /* ---------------------------------------------------------
     8. EVENT WIRING
     --------------------------------------------------------- */
  el.categorySearch.addEventListener("input", function () { renderCategoryRail(el.categorySearch.value); });
  el.fromValue.addEventListener("input", function () { runConversion(); });
  el.fromUnit.addEventListener("change", function () { runConversion(true); });
  el.toUnit.addEventListener("change", function () { runConversion(true); });

  el.swapBtn.addEventListener("click", function () {
    const f = el.fromUnit.value, t = el.toUnit.value;
    el.fromUnit.value = t; el.toUnit.value = f;
    runConversion(true);
  });

  el.precisionRange.addEventListener("input", function () {
    state.precision = parseInt(el.precisionRange.value, 10);
    el.precisionValue.textContent = state.precision;
    runConversion();
  });

  el.scientificToggle.addEventListener("change", function () {
    state.scientific = el.scientificToggle.checked;
    runConversion();
  });

  el.favBtn.addEventListener("click", function () {
    const key = currentFavoriteKey();
    const idx = state.favorites.findIndex(function (f) { return f.key === key; });
    if (idx > -1) {
      state.favorites.splice(idx, 1);
      showToast("Removed from favorites");
    } else {
      const cat = state.category;
      const text = cat.icon + " " + cat.label + ": " + findUnit(cat, el.fromUnit.value).label.split(" (")[0] + " → " + findUnit(cat, el.toUnit.value).label.split(" (")[0];
      state.favorites.unshift({ key: key, text: text, categoryId: cat.id, from: el.fromUnit.value, to: el.toUnit.value, value: el.fromValue.value || 1 });
      showToast("Saved to favorites");
    }
    saveJSON("uc_favorites", state.favorites);
    renderFavorites();
    updateFavButtonState();
  });

  el.copyBtn.addEventListener("click", function () {
    const text = el.fromValue.value + " → " + el.toValue.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast("Result copied"); });
    } else {
      showToast("Copy not supported in this browser");
    }
  });

  el.downloadBtn.addEventListener("click", function () {
    const cat = state.category;
    const content = "Unit Converter Result\n" +
      "Category: " + cat.label + "\n" +
      el.fromValue.value + " " + findUnit(cat, el.fromUnit.value).label + " = " + el.toValue.value + " " + findUnit(cat, el.toUnit.value).label + "\n" +
      "Formula: " + el.formulaText.textContent + "\n";
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "conversion-result.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Downloaded conversion-result.txt");
  });

  el.printBtn.addEventListener("click", function () { window.print(); });

  el.clearBtn.addEventListener("click", function () {
    el.fromValue.value = "";
    el.toValue.value = "";
    el.formulaText.textContent = "—";
    el.inputError.textContent = "";
    el.fromValue.focus();
  });

  el.clearHistoryBtn.addEventListener("click", function () {
    state.history = [];
    saveJSON("uc_history", state.history);
    renderHistory();
    showToast("History cleared");
  });

  // record a history entry when the value input loses focus (a "completed" conversion)
  el.fromValue.addEventListener("change", function () { runConversion(true); });

  el.themeToggle.addEventListener("click", function () {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    setTheme(isLight ? "dark" : "light");
  });

  el.navToggle.addEventListener("click", function () {
    const open = el.navMenu.classList.toggle("open");
    el.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("uc_theme", theme);
    document.getElementById("iconSun").style.display = theme === "light" ? "none" : "block";
    document.getElementById("iconMoon").style.display = theme === "light" ? "block" : "none";
    el.themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    el.themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  }

  /* ---------------------------------------------------------
     9. INIT
     --------------------------------------------------------- */
  function init() {
    const savedTheme = localStorage.getItem("uc_theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(savedTheme);

    renderCategoryRail("");
    populateUnitSelects();
    el.fromValue.value = "1";
    renderExamples();
    renderRelated();
    renderRecent();
    renderFavorites();
    renderHistory();
    runConversion();

    document.getElementById("year").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
