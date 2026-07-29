/* =========================================================
   Percentage Calculator
   18 self-contained calculation modes sharing one dynamic
   form renderer, one result panel, and one ratio meter.
   No external requests — everything computes in the browser.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */
  function fmt(n, decimals) {
    if (typeof decimals === "undefined") decimals = 2;
    if (!isFinite(n)) return "—";
    var factor = Math.pow(10, decimals);
    var rounded = Math.round((n + Number.EPSILON) * factor) / factor;
    var s = rounded.toFixed(decimals);
    if (decimals > 0) s = s.replace(/\.?0+$/, "");
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function gradeLetter(pct) {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    if (pct >= 40) return "E";
    return "F";
  }

  /* ---------------------------------------------------------
     CALCULATOR METADATA
  --------------------------------------------------------- */
  var META = {
    "percent-of": { title: "What is X% of Y?", desc: "Find the value of a percentage of any number." },
    "is-what-percent": { title: "X is What Percent of Y?", desc: "Find what percentage one number represents of another." },
    "percentage-increase": { title: "Percentage Increase Calculator", desc: "Increase a value by a percentage to find the new amount." },
    "percentage-decrease": { title: "Percentage Decrease Calculator", desc: "Decrease a value by a percentage to find the new amount." },
    "percentage-difference": { title: "Percentage Difference Calculator", desc: "Compare two values with no fixed starting point." },
    "percentage-change": { title: "Percentage Change Calculator", desc: "Find the percent change between an old and a new value." },
    "discount": { title: "Discount Calculator", desc: "Calculate the final price and amount saved on a sale." },
    "sales-tax": { title: "Sales Tax Calculator", desc: "Add sales tax to a price to find the total." },
    "tip": { title: "Tip Calculator", desc: "Calculate a tip and split the bill between people." },
    "profit-margin": { title: "Profit Margin Calculator", desc: "Find profit margin based on cost and selling price." },
    "markup": { title: "Markup Calculator", desc: "Find the selling price from cost and a markup percentage." },
    "vat": { title: "VAT Calculator", desc: "Add VAT to a net amount, or remove it from a gross amount." },
    "grade-percentage": { title: "Grade Percentage Calculator", desc: "Convert marks obtained into a percentage and letter grade." },
    "exam-score": { title: "Exam Score Calculator", desc: "Calculate exam score percentage, with optional negative marking." },
    "commission": { title: "Commission Calculator", desc: "Calculate commission earned on a sales amount." },
    "reverse-percentage": { title: "Reverse Percentage Calculator", desc: "Find the original value before a percentage was applied." },
    "simple-interest": { title: "Simple Interest Calculator", desc: "Calculate interest earned on a principal amount over time." },
    "percentage-of-total": { title: "Percentage of a Total", desc: "Find what percent each part contributes to a total." }
  };

  /* ---------------------------------------------------------
     FORM FIELD DEFINITIONS
  --------------------------------------------------------- */
  var FIELDS = {
    "percent-of": [
      { id: "percent", label: "Percentage", suffix: "%", placeholder: "20" },
      { id: "base", label: "Of Number", placeholder: "500" }
    ],
    "is-what-percent": [
      { id: "part", label: "Part", placeholder: "15" },
      { id: "whole", label: "Whole", placeholder: "60" }
    ],
    "percentage-increase": [
      { id: "original", label: "Original Value", placeholder: "50" },
      { id: "percent", label: "Increase By", suffix: "%", placeholder: "20" }
    ],
    "percentage-decrease": [
      { id: "original", label: "Original Value", placeholder: "50" },
      { id: "percent", label: "Decrease By", suffix: "%", placeholder: "20" }
    ],
    "percentage-difference": [
      { id: "a", label: "Value A", placeholder: "40" },
      { id: "b", label: "Value B", placeholder: "60" }
    ],
    "percentage-change": [
      { id: "oldValue", label: "Old Value", placeholder: "50" },
      { id: "newValue", label: "New Value", placeholder: "65" }
    ],
    "discount": [
      { id: "price", label: "Original Price", prefix: "$", placeholder: "80" },
      { id: "percent", label: "Discount", suffix: "%", placeholder: "30" }
    ],
    "sales-tax": [
      { id: "price", label: "Price", prefix: "$", placeholder: "100" },
      { id: "percent", label: "Tax Rate", suffix: "%", placeholder: "8" }
    ],
    "tip": [
      { id: "bill", label: "Bill Amount", prefix: "$", placeholder: "60" },
      { id: "percent", label: "Tip", suffix: "%", placeholder: "18" },
      { id: "people", label: "Split Between", placeholder: "1" }
    ],
    "profit-margin": [
      { id: "cost", label: "Cost Price", prefix: "$", placeholder: "50" },
      { id: "selling", label: "Selling Price", prefix: "$", placeholder: "75" }
    ],
    "markup": [
      { id: "cost", label: "Cost Price", prefix: "$", placeholder: "50" },
      { id: "percent", label: "Markup", suffix: "%", placeholder: "50" }
    ],
    "vat": [
      { id: "amount", label: "Amount", prefix: "$", placeholder: "100" },
      { id: "percent", label: "VAT Rate", suffix: "%", placeholder: "20" },
      { id: "mode", label: "Direction", type: "select", options: [
        { value: "add", label: "Add VAT (net → gross)" },
        { value: "remove", label: "Remove VAT (gross → net)" }
      ] }
    ],
    "grade-percentage": [
      { id: "obtained", label: "Marks Obtained", placeholder: "78" },
      { id: "total", label: "Total Marks", placeholder: "100" }
    ],
    "exam-score": [
      { id: "correct", label: "Correct Answers", placeholder: "42" },
      { id: "total", label: "Total Questions", placeholder: "50" },
      { id: "negative", label: "Negative Marking (per wrong)", placeholder: "0" }
    ],
    "commission": [
      { id: "sales", label: "Sales Amount", prefix: "$", placeholder: "5000" },
      { id: "percent", label: "Commission Rate", suffix: "%", placeholder: "10" }
    ],
    "reverse-percentage": [
      { id: "finalValue", label: "Final Value", placeholder: "80" },
      { id: "percent", label: "Percentage Applied", suffix: "%", placeholder: "20" },
      { id: "direction", label: "Direction", type: "select", options: [
        { value: "decrease", label: "Value was decreased" },
        { value: "increase", label: "Value was increased" }
      ] }
    ],
    "simple-interest": [
      { id: "principal", label: "Principal", prefix: "$", placeholder: "1000" },
      { id: "rate", label: "Annual Rate", suffix: "%", placeholder: "5" },
      { id: "time", label: "Time (Years)", placeholder: "2" }
    ],
    "percentage-of-total": [
      { id: "total", label: "Total", placeholder: "500" },
      { id: "parts", label: "Parts (comma-separated)", type: "text", placeholder: "150, 100, 90" }
    ]
  };

  /* ---------------------------------------------------------
     FORMULA TEXT, EXAMPLES, PRACTICAL USES
  --------------------------------------------------------- */
  var FORMULA = {
    "percent-of": "Result = (Percent ÷ 100) × Number",
    "is-what-percent": "Percent = (Part ÷ Whole) × 100",
    "percentage-increase": "New Value = Original × (1 + Percent ÷ 100)",
    "percentage-decrease": "New Value = Original × (1 − Percent ÷ 100)",
    "percentage-difference": "Difference % = |A − B| ÷ ((A + B) ÷ 2) × 100",
    "percentage-change": "Change % = ((New − Old) ÷ Old) × 100",
    "discount": "Final Price = Price − (Price × Discount% ÷ 100)",
    "sales-tax": "Total = Price + (Price × Tax% ÷ 100)",
    "tip": "Total = Bill + (Bill × Tip% ÷ 100); Per Person = Total ÷ People",
    "profit-margin": "Margin % = ((Selling − Cost) ÷ Selling) × 100",
    "markup": "Selling Price = Cost × (1 + Markup% ÷ 100)",
    "vat": "Add VAT: Gross = Net × (1 + VAT% ÷ 100) · Remove VAT: Net = Gross ÷ (1 + VAT% ÷ 100)",
    "grade-percentage": "Percentage = (Marks Obtained ÷ Total Marks) × 100",
    "exam-score": "Score % = ((Correct − Wrong × Negative Marking) ÷ Total) × 100",
    "commission": "Commission = Sales × Rate% ÷ 100",
    "reverse-percentage": "Original = Final ÷ (1 ± Percent ÷ 100)",
    "simple-interest": "Interest = Principal × Rate% × Time ÷ 100",
    "percentage-of-total": "Part % = (Part ÷ Total) × 100, calculated for each part"
  };

  var CONTENT = {
    "percent-of": { example: "20% of 150 = 0.20 × 150 = 30.", uses: ["Calculating tips and discounts", "Sizing a slice of a shared budget", "Scaling a recipe ingredient"] },
    "is-what-percent": { example: "15 is what percent of 60? (15 ÷ 60) × 100 = 25%.", uses: ["Checking quiz or survey results", "Comparing a sample to a total population", "Reporting completion rates"] },
    "percentage-increase": { example: "A $50 item increased by 20% becomes $50 × 1.20 = $60.", uses: ["Projecting a salary raise", "Estimating price hikes", "Forecasting growth targets"] },
    "percentage-decrease": { example: "A $50 item decreased by 20% becomes $50 × 0.80 = $40.", uses: ["Estimating a markdown before checkout", "Modeling depreciation", "Tracking a shrinking budget"] },
    "percentage-difference": { example: "Comparing 40 and 60: |40−60| ÷ ((40+60)÷2) × 100 = 40%.", uses: ["Comparing two suppliers' prices", "Comparing survey results with no clear baseline", "Scientific measurement comparisons"] },
    "percentage-change": { example: "From 50 to 65: ((65−50) ÷ 50) × 100 = +30%.", uses: ["Tracking investment performance", "Reporting month-over-month growth", "Measuring traffic or sales trends"] },
    "discount": { example: "A $80 jacket at 30% off saves $24, for a final price of $56.", uses: ["Comparing sale prices while shopping", "Applying coupon codes at checkout", "Planning seasonal sale pricing"] },
    "sales-tax": { example: "A $100 purchase with 8% tax costs $108 total.", uses: ["Estimating your total before checkout", "Budgeting for large purchases", "Verifying a receipt"] },
    "tip": { example: "An $60 bill with an 18% tip, split three ways, is $23.60 per person.", uses: ["Splitting a restaurant bill fairly", "Calculating delivery driver tips", "Budgeting for service gratuities"] },
    "profit-margin": { example: "Cost $50, sold for $75: profit $25, margin 33.3%.", uses: ["Setting product prices", "Evaluating business profitability", "Comparing profitability across products"] },
    "markup": { example: "A $50 cost with a 50% markup sells for $75.", uses: ["Pricing new inventory from cost", "Setting wholesale-to-retail pricing", "Quoting service rates"] },
    "vat": { example: "$100 net with 20% VAT added becomes $120 gross.", uses: ["Pricing goods for VAT-inclusive markets", "Extracting VAT from a receipt", "Preparing invoices"] },
    "grade-percentage": { example: "78 out of 100 marks is a 78% grade.", uses: ["Converting raw test marks to a percentage", "Comparing scores across different tests", "Tracking academic progress"] },
    "exam-score": { example: "42 correct out of 50, no negative marking, is an 84% score.", uses: ["Scoring competitive exams with negative marking", "Self-checking practice tests", "Reviewing quiz performance"] },
    "commission": { example: "A $5,000 sale at 10% commission earns $500.", uses: ["Calculating sales team payouts", "Estimating freelance referral fees", "Real estate commission planning"] },
    "reverse-percentage": { example: "A price of $80 after a 20% discount had an original price of $100.", uses: ["Finding the pre-discount price of a purchase", "Reconstructing a pre-tax amount", "Auditing a reported percentage change"] },
    "simple-interest": { example: "$1,000 at 5% for 2 years earns $100 in interest.", uses: ["Estimating savings account growth", "Comparing loan interest costs", "Quick financial planning estimates"] },
    "percentage-of-total": { example: "Parts 150, 100, and 90 out of a total of 500 are 30%, 20%, and 18%.", uses: ["Breaking down a budget by category", "Analyzing vote or survey shares", "Visualizing a portfolio's allocation"] }
  };

  /* ---------------------------------------------------------
     COMPUTE FUNCTIONS
     Each returns { calcLine, answer, answerSub, steps[], meterPercent, meterLabel, segments? }
     or { error: "message" }.
  --------------------------------------------------------- */
  var COMPUTE = {
    "percent-of": function (v) {
      var percent = v.percent, base = v.base;
      var decimal = percent / 100;
      var result = decimal * base;
      return {
        calcLine: percent + "% of " + fmt(base),
        answer: fmt(result),
        answerSub: "",
        steps: [
          "Convert " + fmt(percent) + "% to a decimal: " + fmt(percent) + " ÷ 100 = " + fmt(decimal, 4),
          "Multiply by " + fmt(base) + ": " + fmt(decimal, 4) + " × " + fmt(base) + " = " + fmt(result)
        ],
        meterPercent: clamp(percent, 0, 100),
        meterLabel: fmt(percent) + "%"
      };
    },
    "is-what-percent": function (v) {
      if (v.whole === 0) return { error: "The whole cannot be zero." };
      var percent = (v.part / v.whole) * 100;
      return {
        calcLine: fmt(v.part) + " as a percent of " + fmt(v.whole),
        answer: fmt(percent) + "%",
        answerSub: "",
        steps: [
          "Divide the part by the whole: " + fmt(v.part) + " ÷ " + fmt(v.whole) + " = " + fmt(v.part / v.whole, 4),
          "Multiply by 100: " + fmt(v.part / v.whole, 4) + " × 100 = " + fmt(percent) + "%"
        ],
        meterPercent: clamp(percent, 0, 100),
        meterLabel: fmt(percent) + "%"
      };
    },
    "percentage-increase": function (v) {
      var newValue = v.original * (1 + v.percent / 100);
      var amount = newValue - v.original;
      return {
        calcLine: fmt(v.original) + " increased by " + fmt(v.percent) + "%",
        answer: fmt(newValue),
        answerSub: "+" + fmt(amount) + " increase",
        steps: [
          "Convert the percent to a growth factor: 1 + (" + fmt(v.percent) + " ÷ 100) = " + fmt(1 + v.percent / 100, 4),
          "Multiply by the original value: " + fmt(1 + v.percent / 100, 4) + " × " + fmt(v.original) + " = " + fmt(newValue)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "percentage-decrease": function (v) {
      var newValue = v.original * (1 - v.percent / 100);
      var amount = v.original - newValue;
      return {
        calcLine: fmt(v.original) + " decreased by " + fmt(v.percent) + "%",
        answer: fmt(newValue),
        answerSub: "−" + fmt(amount) + " decrease",
        steps: [
          "Convert the percent to a shrink factor: 1 − (" + fmt(v.percent) + " ÷ 100) = " + fmt(1 - v.percent / 100, 4),
          "Multiply by the original value: " + fmt(1 - v.percent / 100, 4) + " × " + fmt(v.original) + " = " + fmt(newValue)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "percentage-difference": function (v) {
      var sum = v.a + v.b;
      if (sum === 0) return { error: "Values A and B cannot both be zero." };
      var diff = Math.abs(v.a - v.b) / (sum / 2) * 100;
      return {
        calcLine: "Comparing " + fmt(v.a) + " and " + fmt(v.b),
        answer: fmt(diff) + "%",
        answerSub: "",
        steps: [
          "Find the absolute difference: |" + fmt(v.a) + " − " + fmt(v.b) + "| = " + fmt(Math.abs(v.a - v.b)),
          "Find the average of the two values: (" + fmt(v.a) + " + " + fmt(v.b) + ") ÷ 2 = " + fmt(sum / 2),
          "Divide the difference by the average and multiply by 100: " + fmt(diff) + "%"
        ],
        meterPercent: clamp(diff, 0, 100),
        meterLabel: fmt(diff) + "%"
      };
    },
    "percentage-change": function (v) {
      if (v.oldValue === 0) return { error: "Old value cannot be zero." };
      var change = (v.newValue - v.oldValue) / v.oldValue * 100;
      return {
        calcLine: fmt(v.oldValue) + " → " + fmt(v.newValue),
        answer: (change >= 0 ? "+" : "") + fmt(change) + "%",
        answerSub: change >= 0 ? "Increase" : "Decrease",
        steps: [
          "Find the change: " + fmt(v.newValue) + " − " + fmt(v.oldValue) + " = " + fmt(v.newValue - v.oldValue),
          "Divide by the old value and multiply by 100: (" + fmt(v.newValue - v.oldValue) + " ÷ " + fmt(v.oldValue) + ") × 100 = " + fmt(change) + "%"
        ],
        meterPercent: clamp(Math.abs(change), 0, 100),
        meterLabel: fmt(change) + "%"
      };
    },
    "discount": function (v) {
      var saved = v.price * v.percent / 100;
      var final = v.price - saved;
      return {
        calcLine: fmt(v.percent) + "% off " + fmt(v.price),
        answer: fmt(final),
        answerSub: "You save " + fmt(saved),
        steps: [
          "Find the discount amount: " + fmt(v.price) + " × (" + fmt(v.percent) + " ÷ 100) = " + fmt(saved),
          "Subtract from the original price: " + fmt(v.price) + " − " + fmt(saved) + " = " + fmt(final)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "sales-tax": function (v) {
      var taxAmt = v.price * v.percent / 100;
      var total = v.price + taxAmt;
      return {
        calcLine: fmt(v.percent) + "% tax on " + fmt(v.price),
        answer: fmt(total),
        answerSub: "+" + fmt(taxAmt) + " tax",
        steps: [
          "Find the tax amount: " + fmt(v.price) + " × (" + fmt(v.percent) + " ÷ 100) = " + fmt(taxAmt),
          "Add to the price: " + fmt(v.price) + " + " + fmt(taxAmt) + " = " + fmt(total)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "tip": function (v) {
      var people = v.people && v.people >= 1 ? v.people : 1;
      var tipAmt = v.bill * v.percent / 100;
      var total = v.bill + tipAmt;
      var perPerson = total / people;
      return {
        calcLine: fmt(v.percent) + "% tip on " + fmt(v.bill) + (people > 1 ? ", split " + people + " ways" : ""),
        answer: fmt(perPerson) + (people > 1 ? " / person" : ""),
        answerSub: "Tip: " + fmt(tipAmt) + " · Total: " + fmt(total),
        steps: [
          "Find the tip amount: " + fmt(v.bill) + " × (" + fmt(v.percent) + " ÷ 100) = " + fmt(tipAmt),
          "Add to the bill: " + fmt(v.bill) + " + " + fmt(tipAmt) + " = " + fmt(total),
          people > 1 ? "Divide by " + people + " people: " + fmt(total) + " ÷ " + people + " = " + fmt(perPerson) : "No split applied (1 person)."
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "profit-margin": function (v) {
      if (v.selling === 0) return { error: "Selling price cannot be zero." };
      var profit = v.selling - v.cost;
      var margin = profit / v.selling * 100;
      return {
        calcLine: "Cost " + fmt(v.cost) + " · Sold " + fmt(v.selling),
        answer: fmt(margin) + "%",
        answerSub: "Profit: " + fmt(profit),
        steps: [
          "Find the profit: " + fmt(v.selling) + " − " + fmt(v.cost) + " = " + fmt(profit),
          "Divide by the selling price and multiply by 100: (" + fmt(profit) + " ÷ " + fmt(v.selling) + ") × 100 = " + fmt(margin) + "%"
        ],
        meterPercent: clamp(margin, 0, 100),
        meterLabel: fmt(margin) + "%"
      };
    },
    "markup": function (v) {
      var selling = v.cost * (1 + v.percent / 100);
      var profit = selling - v.cost;
      return {
        calcLine: fmt(v.percent) + "% markup on cost " + fmt(v.cost),
        answer: fmt(selling),
        answerSub: "Profit: " + fmt(profit),
        steps: [
          "Convert markup to a factor: 1 + (" + fmt(v.percent) + " ÷ 100) = " + fmt(1 + v.percent / 100, 4),
          "Multiply by the cost: " + fmt(1 + v.percent / 100, 4) + " × " + fmt(v.cost) + " = " + fmt(selling)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "vat": function (v) {
      if (v.mode === "remove") {
        var gross = v.amount;
        var net = gross / (1 + v.percent / 100);
        var vatAmt = gross - net;
        return {
          calcLine: "Removing " + fmt(v.percent) + "% VAT from " + fmt(gross),
          answer: fmt(net),
          answerSub: "VAT removed: " + fmt(vatAmt),
          steps: [
            "Divide the gross amount by the VAT factor: " + fmt(gross) + " ÷ (1 + " + fmt(v.percent) + " ÷ 100) = " + fmt(net),
            "Subtract to find the VAT amount: " + fmt(gross) + " − " + fmt(net) + " = " + fmt(vatAmt)
          ],
          meterPercent: clamp(v.percent, 0, 100),
          meterLabel: fmt(v.percent) + "%"
        };
      }
      var vatAmount = v.amount * v.percent / 100;
      var grossOut = v.amount + vatAmount;
      return {
        calcLine: "Adding " + fmt(v.percent) + "% VAT to " + fmt(v.amount),
        answer: fmt(grossOut),
        answerSub: "VAT: " + fmt(vatAmount),
        steps: [
          "Find the VAT amount: " + fmt(v.amount) + " × (" + fmt(v.percent) + " ÷ 100) = " + fmt(vatAmount),
          "Add to the net amount: " + fmt(v.amount) + " + " + fmt(vatAmount) + " = " + fmt(grossOut)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "grade-percentage": function (v) {
      if (v.total === 0) return { error: "Total marks cannot be zero." };
      var percent = v.obtained / v.total * 100;
      return {
        calcLine: fmt(v.obtained) + " out of " + fmt(v.total),
        answer: fmt(percent) + "%",
        answerSub: "Approx. grade: " + gradeLetter(percent) + " (scale varies by institution)",
        steps: [
          "Divide marks obtained by total marks: " + fmt(v.obtained) + " ÷ " + fmt(v.total) + " = " + fmt(v.obtained / v.total, 4),
          "Multiply by 100: " + fmt(v.obtained / v.total, 4) + " × 100 = " + fmt(percent) + "%"
        ],
        meterPercent: clamp(percent, 0, 100),
        meterLabel: fmt(percent) + "%"
      };
    },
    "exam-score": function (v) {
      if (v.total === 0) return { error: "Total questions cannot be zero." };
      if (v.correct > v.total) return { error: "Correct answers cannot exceed total questions." };
      var wrong = v.total - v.correct;
      var raw = v.correct - wrong * (v.negative || 0);
      var percent = raw / v.total * 100;
      return {
        calcLine: fmt(v.correct) + " correct, " + fmt(wrong) + " wrong, out of " + fmt(v.total),
        answer: fmt(percent) + "%",
        answerSub: "Raw score: " + fmt(raw) + " / " + fmt(v.total),
        steps: [
          "Find wrong answers: " + fmt(v.total) + " − " + fmt(v.correct) + " = " + fmt(wrong),
          "Apply negative marking: " + fmt(v.correct) + " − (" + fmt(wrong) + " × " + fmt(v.negative || 0) + ") = " + fmt(raw),
          "Divide by total and multiply by 100: (" + fmt(raw) + " ÷ " + fmt(v.total) + ") × 100 = " + fmt(percent) + "%"
        ],
        meterPercent: clamp(percent, 0, 100),
        meterLabel: fmt(percent) + "%"
      };
    },
    "commission": function (v) {
      var commission = v.sales * v.percent / 100;
      return {
        calcLine: fmt(v.percent) + "% commission on " + fmt(v.sales),
        answer: fmt(commission),
        answerSub: "",
        steps: [
          "Multiply sales by the commission rate: " + fmt(v.sales) + " × (" + fmt(v.percent) + " ÷ 100) = " + fmt(commission)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "reverse-percentage": function (v) {
      var factor = v.direction === "increase" ? (1 + v.percent / 100) : (1 - v.percent / 100);
      if (factor === 0) return { error: "This percentage makes the calculation undefined (100% decrease)." };
      var original = v.finalValue / factor;
      return {
        calcLine: fmt(v.finalValue) + " after a " + fmt(v.percent) + "% " + (v.direction === "increase" ? "increase" : "decrease"),
        answer: fmt(original),
        answerSub: v.direction === "increase" ? "Value before the increase" : "Value before the decrease",
        steps: [
          "Convert the percent to a factor: " + (v.direction === "increase" ? "1 + " : "1 − ") + "(" + fmt(v.percent) + " ÷ 100) = " + fmt(factor, 4),
          "Divide the final value by the factor: " + fmt(v.finalValue) + " ÷ " + fmt(factor, 4) + " = " + fmt(original)
        ],
        meterPercent: clamp(v.percent, 0, 100),
        meterLabel: fmt(v.percent) + "%"
      };
    },
    "simple-interest": function (v) {
      var interest = v.principal * v.rate * v.time / 100;
      var total = v.principal + interest;
      return {
        calcLine: fmt(v.principal) + " at " + fmt(v.rate) + "% for " + fmt(v.time) + " year(s)",
        answer: fmt(total),
        answerSub: "Interest: " + fmt(interest),
        steps: [
          "Multiply principal × rate × time: " + fmt(v.principal) + " × " + fmt(v.rate) + " × " + fmt(v.time) + " = " + fmt(v.principal * v.rate * v.time),
          "Divide by 100: " + fmt(v.principal * v.rate * v.time) + " ÷ 100 = " + fmt(interest),
          "Add to the principal: " + fmt(v.principal) + " + " + fmt(interest) + " = " + fmt(total)
        ],
        meterPercent: clamp(v.rate, 0, 100),
        meterLabel: fmt(v.rate) + "%"
      };
    },
    "percentage-of-total": function (v) {
      if (v.total === 0) return { error: "Total cannot be zero." };
      var parts = String(v.parts || "").split(",")
        .map(function (s) { return parseFloat(s.trim()); })
        .filter(function (n) { return isFinite(n); });
      if (parts.length === 0) return { error: "Enter at least one number in the Parts field." };

      var sum = parts.reduce(function (a, b) { return a + b; }, 0);
      var percentages = parts.map(function (p) { return p / v.total * 100; });
      var remainder = v.total - sum;

      var steps = parts.map(function (p, i) {
        return "Part " + fmt(p) + " ÷ Total " + fmt(v.total) + " × 100 = " + fmt(percentages[i]) + "%";
      });

      return {
        calcLine: parts.map(function (p, i) { return fmt(p) + " → " + fmt(percentages[i]) + "%"; }).join(" · "),
        answer: fmt(sum / v.total * 100) + "% of total",
        answerSub: parts.length + " part(s) · remainder " + fmt(remainder),
        steps: steps,
        segments: percentages.map(function (p) { return clamp(p, 0, 100); }),
        meterLabel: fmt(sum / v.total * 100) + "% accounted for"
      };
    }
  };

  /* ===========================================================
     UI CONTROLLER
  =========================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    var switcherForm = document.getElementById("calc-switcher");
    var calcTitle = document.getElementById("calc-title");
    var calcDesc = document.getElementById("calc-desc");
    var calcFieldsWrap = document.getElementById("calc-fields");
    var calcError = document.getElementById("calc-error");
    var clearBtn = document.getElementById("clear-btn");

    var ratioMeter = document.getElementById("ratio-meter");
    var ratioFill = document.getElementById("ratio-fill");
    var ratioSegments = document.getElementById("ratio-segments");
    var ratioLabel = document.getElementById("ratio-label");

    var resultSection = document.getElementById("result-section");
    var answerValue = document.getElementById("answer-value");
    var answerSub = document.getElementById("answer-sub");
    var calcLineEl = document.getElementById("calc-line");
    var formulaText = document.getElementById("formula-text");
    var stepsList = document.getElementById("steps-list");
    var exampleText = document.getElementById("example-text");
    var usesList = document.getElementById("uses-list");

    var copyBtn = document.getElementById("copy-btn");
    var downloadBtn = document.getElementById("download-btn");
    var printBtn = document.getElementById("print-btn");
    var shareBtn = document.getElementById("share-btn");

    var themeToggle = document.getElementById("theme-toggle");

    var currentCalc = "percent-of";
    var lastResultText = "";
    var SEGMENT_COLORS = ["#7c5cff", "#22d3ee", "#fbbf24", "#34d399", "#fb7185", "#a78bfa", "#38bdf8", "#f472b6"];

    /* ---------- Build a field's markup ---------- */
    function buildField(field) {
      var wrap = document.createElement("div");
      wrap.className = "field";

      var label = document.createElement("label");
      label.setAttribute("for", "f-" + field.id);
      label.textContent = field.label;
      wrap.appendChild(label);

      var inputWrap = document.createElement("div");
      inputWrap.className = "field-input";

      if (field.prefix) {
        var pre = document.createElement("span");
        pre.className = "field-suffix";
        pre.textContent = field.prefix;
        pre.setAttribute("aria-hidden", "true");
        inputWrap.appendChild(pre);
      }

      var control;
      if (field.type === "select") {
        control = document.createElement("select");
        field.options.forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt.value;
          o.textContent = opt.label;
          control.appendChild(o);
        });
      } else {
        control = document.createElement("input");
        control.type = field.type === "text" ? "text" : "number";
        if (field.type !== "text") {
          control.setAttribute("inputmode", "decimal");
          control.setAttribute("step", "any");
        }
        if (field.placeholder) control.setAttribute("placeholder", field.placeholder);
      }
      control.id = "f-" + field.id;
      control.name = field.id;
      control.setAttribute("aria-label", field.label);
      inputWrap.appendChild(control);

      if (field.suffix) {
        var suf = document.createElement("span");
        suf.className = "field-suffix";
        suf.textContent = field.suffix;
        suf.setAttribute("aria-hidden", "true");
        inputWrap.appendChild(suf);
      }

      wrap.appendChild(inputWrap);
      return wrap;
    }

    /* ---------- Render the fields for a calculator ---------- */
    function renderCalculator(id) {
      currentCalc = id;
      var meta = META[id];
      calcTitle.textContent = meta.title;
      calcDesc.textContent = meta.desc;

      calcFieldsWrap.innerHTML = "";
      FIELDS[id].forEach(function (field) {
        calcFieldsWrap.appendChild(buildField(field));
      });

      calcError.textContent = "";
      resultSection.hidden = true;
      ratioMeter.hidden = true;
      lastResultText = "";

      // Focus the first field for keyboard users switching calculators.
      var firstControl = calcFieldsWrap.querySelector("input, select");
      if (firstControl) firstControl.focus({ preventScroll: true });
    }

    /* ---------- Read current field values ---------- */
    function readValues(id) {
      var values = {};
      var missing = [];
      FIELDS[id].forEach(function (field) {
        var el = document.getElementById("f-" + field.id);
        if (!el) return;
        if (field.type === "select") {
          values[field.id] = el.value;
        } else if (field.type === "text") {
          values[field.id] = el.value;
        } else {
          var raw = el.value.trim();
          if (raw === "") {
            missing.push(field.label);
            values[field.id] = NaN;
          } else {
            values[field.id] = parseFloat(raw);
          }
        }
      });
      return { values: values, missing: missing };
    }

    /* ---------- Render the ratio meter ---------- */
    function renderMeter(result) {
      ratioSegments.innerHTML = "";
      if (result.segments && result.segments.length) {
        ratioFill.style.width = "0%";
        result.segments.forEach(function (pct, i) {
          var seg = document.createElement("div");
          seg.className = "seg";
          seg.style.width = pct + "%";
          seg.style.background = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          ratioSegments.appendChild(seg);
        });
      } else if (typeof result.meterPercent === "number") {
        ratioFill.style.width = clamp(result.meterPercent, 0, 100) + "%";
      } else {
        ratioMeter.hidden = true;
        return;
      }
      ratioLabel.textContent = result.meterLabel || "";
      ratioMeter.hidden = false;
    }

    /* ---------- Run the current calculator ---------- */
    function runCalculation() {
      var id = currentCalc;
      var read = readValues(id);
      calcError.textContent = "";

      if (read.missing.length > 0) {
        resultSection.hidden = true;
        ratioMeter.hidden = true;
        return;
      }

      var fn = COMPUTE[id];
      var result = fn(read.values);

      if (result.error) {
        calcError.textContent = result.error;
        resultSection.hidden = true;
        ratioMeter.hidden = true;
        return;
      }

      answerValue.textContent = result.answer;
      answerSub.textContent = result.answerSub || "";
      calcLineEl.textContent = result.calcLine;
      formulaText.textContent = FORMULA[id];

      stepsList.innerHTML = "";
      result.steps.forEach(function (step) {
        var li = document.createElement("li");
        li.textContent = step;
        stepsList.appendChild(li);
      });

      var content = CONTENT[id];
      exampleText.textContent = content.example;
      usesList.innerHTML = "";
      content.uses.forEach(function (use) {
        var li = document.createElement("li");
        li.textContent = use;
        usesList.appendChild(li);
      });

      renderMeter(result);
      resultSection.hidden = false;

      lastResultText =
        META[id].title + "\n" +
        result.calcLine + "\n" +
        "Answer: " + result.answer + (result.answerSub ? " (" + result.answerSub + ")" : "") + "\n" +
        "Formula: " + FORMULA[id];
    }

    /* ---------- Switcher events ---------- */
    switcherForm.addEventListener("change", function (e) {
      if (e.target.name === "calc") {
        renderCalculator(e.target.value);
      }
    });

    /* ---------- Live recompute on any field input ---------- */
    calcFieldsWrap = document.getElementById("calc-fields");
    document.getElementById("calc-form").addEventListener("input", runCalculation);
    document.getElementById("calc-form").addEventListener("change", runCalculation);

    /* ---------- Clear ---------- */
    clearBtn.addEventListener("click", function () {
      renderCalculator(currentCalc);
    });

    /* ---------- Copy ---------- */
    copyBtn.addEventListener("click", function () {
      if (!lastResultText) return;
      navigator.clipboard.writeText(lastResultText).then(function () {
        var original = copyBtn.innerHTML;
        copyBtn.textContent = "Copied!";
        window.setTimeout(function () { copyBtn.innerHTML = original; }, 1600);
      }).catch(function () {
        calcError.textContent = "Could not copy automatically — please select and copy the result manually.";
      });
    });

    /* ---------- Download ---------- */
    downloadBtn.addEventListener("click", function () {
      if (!lastResultText) return;
      var blob = new Blob([lastResultText], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "percentage-result.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    /* ---------- Print ---------- */
    printBtn.addEventListener("click", function () { window.print(); });

    /* ---------- Share ---------- */
    shareBtn.addEventListener("click", function () {
      if (!lastResultText) return;
      if (navigator.share) {
        navigator.share({ title: META[currentCalc].title, text: lastResultText }).catch(function () { /* user cancelled */ });
      } else {
        navigator.clipboard.writeText(lastResultText).then(function () {
          var original = shareBtn.innerHTML;
          shareBtn.textContent = "Copied to share!";
          window.setTimeout(function () { shareBtn.innerHTML = original; }, 1600);
        }).catch(function () {
          calcError.textContent = "Sharing isn't supported here — please copy the result manually.";
        });
      }
    });

    /* ---------- Theme toggle ---------- */
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
      try { localStorage.setItem("pc-theme", theme); } catch (e) { /* storage unavailable */ }
    }

    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      applyTheme(current === "light" ? "dark" : "light");
    });

    (function initTheme() {
      var saved = null;
      try { saved = localStorage.getItem("pc-theme"); } catch (e) { /* storage unavailable */ }
      if (saved === "light" || saved === "dark") {
        applyTheme(saved);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        applyTheme("light");
      } else {
        applyTheme("dark");
      }
    })();

    /* ---------- Init ---------- */
    renderCalculator("percent-of");
  });
})();
