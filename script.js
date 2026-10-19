"use strict";

/*
 * KTTL QUOTATION & PROFORMA INVOICE (PI) PORTAL
 */

// Webhook for Quotation Submissions
const QUOTATION_WEBHOOK_URL =
  "https://hook.eu1.make.com/lwiadhje99g8lhyb3yttf8xc9a97xirt";

// Webhook for Proforma Invoice (PI) Submissions
// (Configured with Make.com webhook or fallback handler)
const PI_WEBHOOK_URL =
  "https://hook.eu1.make.com/lwiadhje99g8lhyb3yttf8xc9a97xirt"; 

// Optional Webhook to search live Google Sheet rows via Make.com
// Example: "https://hook.eu1.make.com/your-search-webhook"
const SEARCH_QUOTATIONS_WEBHOOK_URL = "";

// Local storage key for caching quotations
const LOCAL_STORAGE_QUOTATIONS_KEY = "kttl_quotations_records_v1";

const PRODUCT_CATALOG = [
  { name: "CLAYTEX", hsn: "591190", gst: 5 },
  { name: "GEOCELL", hsn: "39269080", gst: 18 },
  { name: "GEODRAIN / GEOCOMPOSITE", hsn: "39269099", gst: 18 },
  { name: "GEOSTRIP", hsn: "59119090", gst: 5 },
  { name: "HDPE LINER", hsn: "39201012", gst: 18 },
  { name: "NONWOVEN GEOBAG/GEOCONTAINER", hsn: "59119039", gst: 5 },
  { name: "NONWOVEN GEOTEXTILE 150 GSM & ABOVE", hsn: "56031400", gst: 5 },
  { name: "NONWOVEN GEOTEXTILE BELOW 150 GSM", hsn: "56031300", gst: 5 },
  { name: "PET GEOGRID", hsn: "59119090", gst: 5 },
  { name: "PP GEOGRID", hsn: "39269080", gst: 18 },
  { name: "WOVEN GEOBAG/GEOCONTAINER", hsn: "63059000", gst: 18 },
  { name: "WOVEN GEOTEXTILE", hsn: "54077110", gst: 5 }
];

const COUNTRY_CODES = `
AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW
AX AI AS AQ AW BM IO VG KY CX CC CK CW FO FK GF PF TF GI GL GP GU GG HK IM JE MQ YT MS NC NU NF MP PN PR RE BL SH MF PM SX GS SJ TC UM VI WF
`
  .trim()
  .split(/\s+/);

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], {
  type: "region"
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// UI Elements - Navigation
const navItems = document.querySelectorAll(".nav-item");
const tabPanes = document.querySelectorAll(".tab-pane");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

// UI Elements - Quotation Form
const quotationForm = document.getElementById("quotationForm");
const productsContainer = document.getElementById("productsContainer");
const productTemplate = document.getElementById("productTemplate");
const addProductBtn = document.getElementById("addProductBtn");
const paymentTerms = document.getElementById("paymentTerms");
const paymentTermsOtherWrap = document.getElementById("paymentTermsOtherWrap");
const paymentTermsOther = document.getElementById("paymentTermsOther");
const messageBox = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const countrySelect = document.getElementById("country");
const countryDialCode = document.getElementById("countryDialCode");
const billingAddressInput = document.getElementById("address");
const sameAsBilling = document.getElementById("sameAsBilling");
const deliveryAddressInput = document.getElementById("deliveryAddress");
const deliveryAddressWrap = document.getElementById("deliveryAddressWrap");

// UI Elements - Proforma Invoice
const piSearchInput = document.getElementById("piSearchInput");
const piSearchClear = document.getElementById("piSearchClear");
const piSearchStatus = document.getElementById("piSearchStatus");
const quotationsListContainer = document.getElementById("quotationsListContainer");
const piFormWrapper = document.getElementById("piFormWrapper");
const piSelectedQuotationBanner = document.getElementById("piSelectedQuotationBanner");
const piProductsTableBody = document.getElementById("piProductsTableBody");
const piSubtotal = document.getElementById("piSubtotal");
const piGstTotal = document.getElementById("piGstTotal");
const piGrandTotal = document.getElementById("piGrandTotal");

const proformaInvoiceForm = document.getElementById("proformaInvoiceForm");
const poNumberInput = document.getElementById("poNumber");
const poDateInput = document.getElementById("poDate");
const piBillingAddress = document.getElementById("piBillingAddress");
const sameAsBillingCheckbox = document.getElementById("sameAsBillingCheckbox");
const piDeliveryAddress = document.getElementById("piDeliveryAddress");
const piSubmitBtn = document.getElementById("piSubmitBtn");
const piMessage = document.getElementById("piMessage");

let productCounter = 0;
let currentSelectedQuotation = null;

// Initial sample records to showcase descending date order & search
const SAMPLE_QUOTATIONS = [
  {
    requestId: "REQ-151026-143022",
    submittedAt: "2026-10-15T14:30:22.000Z",
    displayDate: "15 Oct 2026",
    salesperson: { name: "Swapnil" },
    customer: {
      companyName: "Larsen & Toubro Ltd",
      gstNumber: "27AAACL0012P1ZV",
      address: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      billingAddress: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      deliveryAddress: "NH-48 Highway Project Site, Package 2, Vadodara Expressway, Gujarat 390001",
      state: "Maharashtra",
      country: "India",
      contactPerson: "Rajesh Sharma",
      email: "rajesh.s@larsentoubro.com",
      whatsappNumber: "+919820011223"
    },
    products: [
      {
        productName: "NONWOVEN GEOTEXTILE 150 GSM & ABOVE",
        specification: "250 GSM Polypropylene",
        hsnCode: "56031400",
        unit: "Sq. Mtrs",
        quantity: 15000,
        rate: 34.50,
        gstRate: 5,
        taxableAmount: 517500.00,
        gstAmount: 25875.00,
        total: 543375.00
      },
      {
        productName: "GEODRAIN / GEOCOMPOSITE",
        specification: "Composite drainage mat with single filter",
        hsnCode: "39269099",
        unit: "Sq. Mtrs",
        quantity: 5000,
        rate: 110.00,
        gstRate: 18,
        taxableAmount: 550000.00,
        gstAmount: 99000.00,
        total: 649000.00
      }
    ],
    quotationDetails: {
      paymentTerms: "30 Days",
      pricingTerms: "Ex-factory Surat, freight on actuals",
      priceValidity: "30 days",
      amountInWords: "Rupees Eleven Lakh Ninety-Two Thousand Three Hundred Seventy-Five Only",
      remarks: "Highway drainage project requirement"
    },
    totals: {
      subtotal: 1067500.00,
      gstTotal: 124875.00,
      grandTotal: 1192375
    }
  },
  {
    requestId: "REQ-150326-112000",
    submittedAt: "2026-03-15T11:20:00.000Z",
    displayDate: "15 Mar 2026",
    salesperson: { name: "Anuj" },
    customer: {
      companyName: "Larsen & Toubro Ltd",
      gstNumber: "27AAACL0012P1ZV",
      address: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      billingAddress: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      deliveryAddress: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      state: "Maharashtra",
      country: "India",
      contactPerson: "Rajesh Sharma",
      email: "rajesh.s@larsentoubro.com",
      whatsappNumber: "+919820011223"
    },
    products: [
      {
        productName: "HDPE LINER",
        specification: "1.5 mm thickness, smooth geomembrane",
        hsnCode: "39201012",
        unit: "Sq. Mtrs",
        quantity: 8000,
        rate: 165.00,
        gstRate: 18,
        taxableAmount: 1320000.00,
        gstAmount: 237600.00,
        total: 1557600.00
      }
    ],
    totals: {
      subtotal: 1320000.00,
      gstTotal: 237600.00,
      grandTotal: 1557600
    }
  },
  {
    requestId: "REQ-120126-094510",
    submittedAt: "2026-01-12T09:45:10.000Z",
    displayDate: "12 Jan 2026",
    salesperson: { name: "Vijay" },
    customer: {
      companyName: "Larsen & Toubro Ltd",
      gstNumber: "27AAACL0012P1ZV",
      address: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      billingAddress: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      deliveryAddress: "Gate No. 5, Powai Campus, Saki Vihar Road, Mumbai, Maharashtra 400072",
      state: "Maharashtra",
      country: "India",
      contactPerson: "Amit Verma",
      email: "amit.v@larsentoubro.com",
      whatsappNumber: "+919820011223"
    },
    products: [
      {
        productName: "PET GEOGRID",
        specification: "Biaxial Geogrid 40/40 kN/m",
        hsnCode: "59119090",
        unit: "Sq. Mtrs",
        quantity: 12000,
        rate: 52.00,
        gstRate: 5,
        taxableAmount: 624000.00,
        gstAmount: 31200.00,
        total: 655200.00
      }
    ],
    totals: {
      subtotal: 624000.00,
      gstTotal: 31200.00,
      grandTotal: 655200
    }
  },
  {
    requestId: "REQ-181026-160540",
    submittedAt: "2026-10-18T16:05:40.000Z",
    displayDate: "18 Oct 2026",
    salesperson: { name: "Kongkon" },
    customer: {
      companyName: "Dilip Buildcon Limited",
      gstNumber: "23AABCD1234F1Z8",
      address: "Plot No. 5, Inside Govind Narayan Singh Colony, Chuna Bhatti, Kolar Road, Bhopal 462016",
      billingAddress: "Plot No. 5, Inside Govind Narayan Singh Colony, Chuna Bhatti, Kolar Road, Bhopal 462016",
      deliveryAddress: "EPC Highway Project Site, NH-75, Rewa-Sidhi Road, Madhya Pradesh 486001",
      state: "Madhya Pradesh",
      country: "India",
      contactPerson: "Sunil Patidar",
      email: "sunil.p@dilipbuildcon.com",
      whatsappNumber: "+919876543210"
    },
    products: [
      {
        productName: "GEOCELL",
        specification: "Height 100mm, cell weld spacing 356mm",
        hsnCode: "39269080",
        unit: "Sq. Mtrs",
        quantity: 4500,
        rate: 195.00,
        gstRate: 18,
        taxableAmount: 877500.00,
        gstAmount: 157950.00,
        total: 1035450.00
      }
    ],
    totals: {
      subtotal: 877500.00,
      gstTotal: 157950.00,
      grandTotal: 1035450
    }
  }
];

function getStoredQuotations() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_QUOTATIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_QUOTATIONS_KEY, JSON.stringify(SAMPLE_QUOTATIONS));
      return SAMPLE_QUOTATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_QUOTATIONS;
  } catch (e) {
    return SAMPLE_QUOTATIONS;
  }
}

function saveQuotationRecord(quotation) {
  try {
    const records = getStoredQuotations();
    records.unshift(quotation);
    localStorage.setItem(LOCAL_STORAGE_QUOTATIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Could not persist quotation locally:", e);
  }
}

function money(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function numericValue(input) {
  const cleaned = String(input?.value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function makeRequestId() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `REQ-${day}${month}${year}-${hours}${minutes}${seconds}`;
}

function makePINumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const nextYear = String(now.getFullYear() + 1).slice(-2);
  const randomSeq = Math.floor(1000 + Math.random() * 9000);
  return `KTTL/PI/${year}-${nextYear}/${randomSeq}`;
}

// -------------------------------------------------------------
// NAVIGATION (Side panel tabs)
// -------------------------------------------------------------
function setupNavigation() {
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.dataset.tab;
      
      navItems.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      tabPanes.forEach((pane) => {
        if (pane.id === targetTabId) {
          pane.classList.remove("hidden");
        } else {
          pane.classList.add("hidden");
        }
      });

      // Close mobile drawer if opened
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("open");
    });
  });

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      sidebarBackdrop.classList.toggle("open");
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("open");
    });
  }
}

// -------------------------------------------------------------
// TAB 1: QUOTATION SUBMISSION LOGIC
// -------------------------------------------------------------
const COUNTRY_DIAL_MAP = {
  IN: "91", AE: "971", SA: "966", QA: "974", OM: "968", KW: "965", BH: "973",
  US: "1", CA: "1", GB: "44", AU: "61", NZ: "64", SG: "65", MY: "60",
  DE: "49", FR: "33", IT: "39", ES: "34", NL: "31", CH: "41", SE: "46",
  NO: "47", DK: "45", FI: "358", BE: "32", AT: "43", IE: "353", PT: "351",
  GR: "30", PL: "48", CZ: "420", RO: "40", HU: "36", TR: "90", RU: "7",
  ZA: "27", KE: "254", NG: "234", EG: "20", TH: "66", ID: "62", PH: "63",
  VN: "84", JP: "81", KR: "82", CN: "86", HK: "852", TW: "886", BR: "55",
  MX: "52", AR: "54", CL: "56", CO: "57", PE: "51", IL: "972", BD: "880",
  NP: "977", LK: "94", BT: "975", AF: "93", AL: "355", DZ: "213", AD: "376",
  AO: "244", AG: "1268", AM: "374", AZ: "994", BS: "1242", BB: "1246", BY: "375",
  BZ: "501", BJ: "229", BO: "591", BA: "387", BW: "267", BN: "673", BG: "359",
  BF: "226", BI: "257", CV: "238", KH: "855", CM: "237", CF: "236", TD: "235",
  KM: "269", CG: "242", CD: "243", CR: "506", CI: "225", HR: "385", CU: "53",
  CY: "357", DJ: "253", DM: "1767", DO: "1809", EC: "593", SV: "503", GQ: "240",
  ER: "291", EE: "372", SZ: "268", ET: "251", FJ: "679", GA: "241", GM: "220",
  GE: "995", GH: "233", GD: "1473", GT: "502", GN: "224", GW: "245", GY: "592",
  HT: "509", HN: "504", IS: "354", IR: "98", IQ: "964", JM: "1876", JO: "962",
  KZ: "7", KI: "686", KP: "850", KG: "996", LA: "856", LV: "371", LB: "961",
  LS: "266", LR: "231", LY: "218", LI: "423", LT: "370", LU: "352", MG: "261",
  MW: "265", MV: "960", ML: "223", MT: "356", MH: "692", MR: "222", MU: "230",
  FM: "691", MD: "373", MC: "377", MN: "976", ME: "382", MA: "212", MZ: "258",
  MM: "95", NA: "264", NR: "674", NI: "505", NE: "227", MK: "389", PK: "92",
  PW: "680", PS: "970", PA: "507", PG: "675", PY: "595", RW: "250", KN: "1869",
  LC: "1758", VC: "1784", WS: "685", SM: "378", ST: "239", SN: "221", RS: "381",
  SC: "248", SL: "232", SK: "421", SI: "386", SB: "677", SO: "252", SS: "211",
  SD: "249", SR: "597", SY: "963", TJ: "992", TZ: "255", TL: "670", TG: "228",
  TO: "676", TT: "1868", TN: "216", TM: "993", TV: "688", UG: "256", UA: "380",
  UY: "598", UZ: "998", VU: "678", VA: "379", VE: "58", YE: "967", ZM: "260",
  ZW: "263"
};

// Priority primary countries for top of list
const PRIMARY_COUNTRY_CODES = [
  "IN", "AE", "SA", "QA", "OM", "KW", "BH", "US", "GB", "SG", "AU", "CA", "DE"
];

function getDialCodeForCountryCode(code) {
  const digits = COUNTRY_DIAL_MAP[(code || "").toUpperCase()];
  return digits ? `+${digits}` : "+91";
}

function setCountrySelectByCode(code) {
  if (!countrySelect || !code) return;
  const upper = code.toUpperCase();
  for (let i = 0; i < countrySelect.options.length; i++) {
    const opt = countrySelect.options[i];
    if (opt.value && opt.dataset.code === upper) {
      countrySelect.selectedIndex = i;
      return;
    }
  }
}

function setDialCodeSelect(dial, code) {
  if (!countryDialCode) return;
  const upperCode = (code || "").toUpperCase();
  // 1. Try exact match by country code
  if (upperCode) {
    for (let i = 0; i < countryDialCode.options.length; i++) {
      if (countryDialCode.options[i].dataset.code === upperCode) {
        countryDialCode.selectedIndex = i;
        return;
      }
    }
  }
  // 2. Match by dial prefix
  for (let i = 0; i < countryDialCode.options.length; i++) {
    if (countryDialCode.options[i].value === dial) {
      countryDialCode.selectedIndex = i;
      return;
    }
  }
}

function detectDialCodeFromInput(rawInput) {
  if (!rawInput) return null;
  let cleaned = rawInput.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Create list of all available entries sorted by dial length descending
  const entries = Object.entries(COUNTRY_DIAL_MAP).map(([code, digits]) => ({
    code,
    dial: `+${digits}`,
    digits
  })).sort((a, b) => b.digits.length - a.digits.length);

  if (cleaned.startsWith("+")) {
    return entries.find(e => cleaned.startsWith(e.dial));
  }

  // If typed without '+', match if digits >= 2 and there are following phone digits
  for (const e of entries) {
    if (e.digits.length >= 2 && cleaned.startsWith(e.digits) && cleaned.length > e.digits.length + 3) {
      return e;
    }
  }
  return null;
}

function updatePhonePlaceholder(dial) {
  const phoneInput = document.getElementById("whatsappNumber");
  if (!phoneInput) return;
  if (dial === "+91") {
    phoneInput.placeholder = "98765 43210";
  } else if (dial === "+971") {
    phoneInput.placeholder = "50 123 4567";
  } else if (dial === "+1") {
    phoneInput.placeholder = "202 555 0123";
  } else if (dial === "+44") {
    phoneInput.placeholder = "7911 123456";
  } else {
    phoneInput.placeholder = "Phone number";
  }
}

function populateCountries() {
  const countries = COUNTRY_CODES
    .map((code) => {
      let name = "";
      try {
        name = COUNTRY_NAMES.of(code) || "";
      } catch (e) {
        name = code;
      }
      return { code, name };
    })
    .filter((item) => item.name && item.name !== item.code)
    .sort((a, b) => a.name.localeCompare(b.name));

  countrySelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select country";
  countrySelect.appendChild(placeholder);

  countries.forEach(({ code, name }) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.dataset.code = code;
    countrySelect.appendChild(option);
  });

  // Default to India
  setCountrySelectByCode("IN");

  // Populate Country Dial Code Select
  if (countryDialCode) {
    countryDialCode.replaceChildren();

    // Priority primary countries first
    const primaryEntries = PRIMARY_COUNTRY_CODES
      .map(code => {
        let name = "";
        try { name = COUNTRY_NAMES.of(code) || code; } catch (e) { name = code; }
        return {
          code,
          dial: getDialCodeForCountryCode(code),
          name
        };
      });

    // All other countries sorted alphabetically
    const otherEntries = countries
      .filter(c => !PRIMARY_COUNTRY_CODES.includes(c.code))
      .map(({ code, name }) => ({
        code,
        dial: getDialCodeForCountryCode(code),
        name
      }));

    const allEntries = [...primaryEntries, ...otherEntries];

    allEntries.forEach(({ dial, name, code }) => {
      const opt = document.createElement("option");
      opt.value = dial;
      opt.dataset.code = code;
      opt.textContent = `${dial} (${name})`;
      countryDialCode.appendChild(opt);
    });

    setDialCodeSelect("+91", "IN");
    updatePhonePlaceholder("+91");

    // 1. When Country changes -> Automatically update Dial Code dropdown & placeholder
    countrySelect.addEventListener("change", () => {
      const selectedOpt = countrySelect.selectedOptions[0];
      if (!selectedOpt || !selectedOpt.value) return;
      const code = selectedOpt.dataset.code;
      const dial = getDialCodeForCountryCode(code);
      setDialCodeSelect(dial, code);
      updatePhonePlaceholder(dial);
    });

    // 2. When Dial Code dropdown changes -> Automatically update Country dropdown & placeholder
    countryDialCode.addEventListener("change", () => {
      const opt = countryDialCode.selectedOptions[0];
      if (!opt) return;
      const code = opt.dataset.code;
      const dial = opt.value;
      if (code) {
        setCountrySelectByCode(code);
      }
      updatePhonePlaceholder(dial);
    });

    // 3. Vice versa: When user types or pastes full number with country code -> Auto-detect & sync
    const phoneInput = document.getElementById("whatsappNumber");
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        const raw = phoneInput.value.trim();
        if (!raw) return;
        const matched = detectDialCodeFromInput(raw);
        if (matched) {
          setDialCodeSelect(matched.dial, matched.code);
          setCountrySelectByCode(matched.code);
          updatePhonePlaceholder(matched.dial);
        }
      });
    }
  }
}

function setupAddressSync() {
  if (!sameAsBilling || !deliveryAddressInput || !billingAddressInput) return;

  const syncDelivery = () => {
    if (sameAsBilling.checked) {
      deliveryAddressInput.value = billingAddressInput.value;
      deliveryAddressInput.readOnly = true;
    } else {
      deliveryAddressInput.readOnly = false;
    }
  };

  sameAsBilling.addEventListener("change", () => {
    syncDelivery();
    if (!sameAsBilling.checked) {
      deliveryAddressInput.focus();
    }
  });

  billingAddressInput.addEventListener("input", () => {
    if (sameAsBilling.checked) {
      deliveryAddressInput.value = billingAddressInput.value;
    }
  });

  // Initial sync
  syncDelivery();
}

function populateProductOptions(select) {
  PRODUCT_CATALOG.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.name;
    option.textContent = product.name;
    select.appendChild(option);
  });
}

function getProductDefaults(productName) {
  return PRODUCT_CATALOG.find((product) => product.name === productName);
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "message " + type;
  messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

function parseAndValidateNumericField(input, label, allowBlank = false) {
  const raw = input.value.trim();
  if (!raw && allowBlank) return 0;
  const value = numericValue(input);
  if (raw === "" || !Number.isFinite(value) || value < 0) {
    input.setCustomValidity(label + " must be a valid non-negative number.");
    input.reportValidity();
    input.setCustomValidity("");
    input.focus();
    throw new Error(label + " must be a valid non-negative number.");
  }
  return value;
}

function updateProductCard(card) {
  const quantityInput = card.querySelector(".product-quantity");
  const rateInput = card.querySelector(".product-rate");
  const gstInput = card.querySelector(".product-gst");

  const quantity = numericValue(quantityInput);
  const rate = numericValue(rateInput);
  const gstRate = numericValue(gstInput);

  const taxable = Number.isFinite(quantity) && Number.isFinite(rate)
    ? quantity * rate
    : 0;

  const gstAmount = Number.isFinite(gstRate)
    ? taxable * gstRate / 100
    : 0;

  const total = taxable + gstAmount;

  card.querySelector(".product-taxable").textContent = money(taxable);
  card.querySelector(".product-gst-amount").textContent = money(gstAmount);
  card.querySelector(".product-total").textContent = money(total);

  return { taxable, gstAmount, total };
}

function numberToWordsUnderThousand(number) {
  const ones = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six",
    "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  let result = "";
  if (number >= 100) {
    result += ones[Math.floor(number / 100)] + " Hundred";
    number %= 100;
    if (number > 0) result += " ";
  }

  if (number >= 20) {
    result += tens[Math.floor(number / 10)];
    number %= 10;
    if (number > 0) result += " " + ones[number];
  } else if (number > 0) {
    result += ones[number];
  }

  return result;
}

function integerToIndianWords(number) {
  if (number === 0) return "Zero";
  if (!Number.isSafeInteger(number) || number < 0) return "Amount out of supported range";

  const parts = [];
  const crore = Math.floor(number / 10000000);
  number %= 10000000;
  const lakh = Math.floor(number / 100000);
  number %= 100000;
  const thousand = Math.floor(number / 1000);
  number %= 1000;

  if (crore) parts.push(integerToIndianWords(crore) + " Crore");
  if (lakh) parts.push(numberToWordsUnderThousand(lakh) + " Lakh");
  if (thousand) parts.push(numberToWordsUnderThousand(thousand) + " Thousand");
  if (number) parts.push(numberToWordsUnderThousand(number));

  return parts.join(" ");
}

function amountInWords(amount) {
  const rounded = Math.round(amount);
  if (rounded < 0 || !Number.isSafeInteger(rounded)) return "Amount out of supported range";
  return "Rupees " + integerToIndianWords(rounded) + " Only";
}

function calculateTotals() {
  let subtotal = 0;
  let gstTotal = 0;

  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    const amounts = updateProductCard(card);
    subtotal += amounts.taxable;
    gstTotal += amounts.gstAmount;
  });

  const exactGrandTotal = subtotal + gstTotal;
  const roundedGrandTotal = Math.round(exactGrandTotal);

  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("gstTotal").textContent = money(gstTotal);
  document.getElementById("grandTotal").textContent =
    money(roundedGrandTotal).replace(/\.00$/, "");

  document.getElementById("amountInWords").textContent =
    amountInWords(roundedGrandTotal);

  return {
    subtotal,
    gstTotal,
    exactGrandTotal,
    roundOff: roundedGrandTotal - exactGrandTotal,
    grandTotal: roundedGrandTotal
  };
}

function addProduct() {
  productCounter += 1;
  const fragment = productTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  card.dataset.productIndex = String(productCounter);

  const productSelect = card.querySelector(".product-name");
  populateProductOptions(productSelect);

  productSelect.addEventListener("change", () => {
    const defaults = getProductDefaults(productSelect.value);
    if (defaults) {
      card.querySelector(".product-hsn").value = defaults.hsn;
      card.querySelector(".product-gst").value = String(defaults.gst);
    }
    calculateTotals();
  });

  card.querySelectorAll(".numeric-input").forEach((input) => {
    input.addEventListener("input", () => {
      clearMessage();
      calculateTotals();
    });

    input.addEventListener("blur", () => {
      const raw = input.value.trim();
      if (raw !== "") {
        const value = numericValue(input);
        if (Number.isFinite(value) && value >= 0) {
          input.value = String(value);
        }
      }
      calculateTotals();
    });
  });

  card.querySelector(".remove-product").addEventListener("click", () => {
    const cards = productsContainer.querySelectorAll(".product-card");
    if (cards.length <= 1) {
      showMessage("At least one product must remain in the request.", "error");
      return;
    }
    card.remove();
    updateProductHeadings();
    calculateTotals();
  });

  productsContainer.appendChild(fragment);
  updateProductHeadings();
  calculateTotals();
}

function updateProductHeadings() {
  productsContainer.querySelectorAll(".product-card").forEach((card, index) => {
    card.querySelector(".product-top h3").textContent = "Product " + (index + 1);
  });
}

function getProductPayload(card, index) {
  const productName = card.querySelector(".product-name").value.trim();
  const specification = card.querySelector(".product-specification").value.trim();
  const hsnCode = card.querySelector(".product-hsn").value.trim();
  const unit = card.querySelector(".product-unit").value.trim();

  if (!productName) throw new Error("Please select a product for Product " + (index + 1) + ".");
  if (!hsnCode) throw new Error("Please enter the HSN code for Product " + (index + 1) + ".");
  if (!unit) throw new Error("Please select a unit for Product " + (index + 1) + ".");

  const quantity = parseAndValidateNumericField(
    card.querySelector(".product-quantity"),
    "Quantity for Product " + (index + 1)
  );
  const rate = parseAndValidateNumericField(
    card.querySelector(".product-rate"),
    "Rate for Product " + (index + 1)
  );
  const gstRate = parseAndValidateNumericField(
    card.querySelector(".product-gst"),
    "GST for Product " + (index + 1)
  );

  if (gstRate > 100) {
    throw new Error("GST cannot exceed 100% for Product " + (index + 1) + ".");
  }

  const taxableAmount = quantity * rate;
  const gstAmount = taxableAmount * gstRate / 100;
  const lineTotal = taxableAmount + gstAmount;

  return {
    productName,
    specification,
    hsnCode,
    unit,
    quantity,
    rate,
    gstRate,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    total: Number(lineTotal.toFixed(2))
  };
}

function validateForm() {
  if (!quotationForm.reportValidity()) return false;

  const companyName = document.getElementById("companyName").value.trim();
  const phone = document.getElementById("whatsappNumber").value.trim();
  const billing = document.getElementById("address").value.trim();

  if (!companyName) {
    showMessage("Please enter the customer or company name.", "error");
    return false;
  }
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length < 5) {
    showMessage("Please enter a valid customer phone or WhatsApp number.", "error");
    document.getElementById("whatsappNumber").focus();
    return false;
  }

  if (!billing) {
    showMessage("Please enter the billing address.", "error");
    document.getElementById("address").focus();
    return false;
  }

  const isSame = sameAsBilling ? sameAsBilling.checked : true;
  const delivery = document.getElementById("deliveryAddress") ? document.getElementById("deliveryAddress").value.trim() : "";
  if (!isSame && !delivery) {
    showMessage("Please enter the delivery address or check 'Delivery Address is same as Billing Address'.", "error");
    document.getElementById("deliveryAddress").focus();
    return false;
  }

  if (paymentTerms.value === "Others" && !paymentTermsOther.value.trim()) {
    paymentTermsOther.setCustomValidity("Please enter the custom payment conditions.");
    paymentTermsOther.reportValidity();
    paymentTermsOther.setCustomValidity("");
    return false;
  }

  return true;
}

function buildPayload() {
  const rawWhatsApp = document.getElementById("whatsappNumber").value.trim();
  const dialCode = countryDialCode ? countryDialCode.value.trim() : "+91";
  const cleanDigits = rawWhatsApp.replace(/\D/g, "");
  const dialDigits = dialCode.replace(/\D/g, "");
  let subscriber = rawWhatsApp;
  if (cleanDigits.startsWith(dialDigits) && cleanDigits.length > dialDigits.length) {
    subscriber = cleanDigits.slice(dialDigits.length).trim();
  } else {
    subscriber = cleanDigits;
  }
  const fullWhatsAppNumber = `${dialCode} ${subscriber}`.trim();

  const billingAddress = document.getElementById("address").value.trim();
  const isSameAddress = sameAsBilling ? sameAsBilling.checked : true;
  const deliveryAddressVal = document.getElementById("deliveryAddress") ? document.getElementById("deliveryAddress").value.trim() : "";
  const deliveryAddress = isSameAddress ? billingAddress : (deliveryAddressVal || billingAddress);

  const salesperson = document.getElementById("salespersonName").value.trim();
  const customer = {
    companyName: document.getElementById("companyName").value.trim(),
    gstNumber: document.getElementById("gstNumber").value.trim(),
    address: billingAddress,
    billingAddress: billingAddress,
    deliveryAddress: deliveryAddress,
    sameAsBilling: isSameAddress,
    state: document.getElementById("state").value.trim(),
    country: countrySelect.value,
    contactPerson: document.getElementById("contactPerson").value.trim(),
    email: document.getElementById("customerEmail").value.trim(),
    whatsappNumber: fullWhatsAppNumber
  };

  const products = Array.from(
    productsContainer.querySelectorAll(".product-card")
  ).map((card, index) => getProductPayload(card, index));

  const totals = calculateTotals();
  const chosenPaymentTerms = paymentTerms.value === "Others"
    ? paymentTermsOther.value.trim()
    : paymentTerms.value;

  const reqId = makeRequestId();
  const now = new Date();

  return {
    requestId: reqId,
    submittedAt: now.toISOString(),
    displayDate: formatDate(now),
    approvalStatus: "Pending",
    salesperson: { name: salesperson },
    customer,
    products,
    quotationDetails: {
      paymentTerms: chosenPaymentTerms,
      pricingTerms: document.getElementById("pricingTerms").value.trim(),
      priceValidity: document.getElementById("priceValidity").value.trim(),
      amountInWords: amountInWords(totals.grandTotal),
      remarks: document.getElementById("remarks").value.trim()
    },
    totals: {
      subtotal: Number(totals.subtotal.toFixed(2)),
      gstTotal: Number(totals.gstTotal.toFixed(2)),
      grandTotalBeforeRounding: Number(totals.exactGrandTotal.toFixed(2)),
      roundingMode: "nearest",
      roundOff: Number(totals.roundOff.toFixed(2)),
      grandTotal: totals.grandTotal
    }
  };
}

async function submitQuotationRequest(event) {
  event.preventDefault();
  clearMessage();

  if (!validateForm()) return;

  let payload;
  try {
    payload = buildPayload();
  } catch (error) {
    showMessage(error.message || "Please check the form fields.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch(QUOTATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("The webhook returned HTTP " + response.status + ".");
    }

    // Save record to local store so it is immediately searchable in PI tab!
    saveQuotationRecord(payload);

    quotationForm.reset();
    setCountrySelectByCode("IN");
    if (countryDialCode) setDialCodeSelect("+91", "IN");
    updatePhonePlaceholder("+91");
    if (sameAsBilling) sameAsBilling.checked = true;
    if (deliveryAddressInput) {
      deliveryAddressInput.value = "";
      deliveryAddressInput.readOnly = true;
    }
    document.getElementById("requestDate").value = formatDate();
    paymentTermsOtherWrap.classList.add("hidden");
    paymentTermsOther.required = false;

    productsContainer.replaceChildren();
    addProduct();
    calculateTotals();

    showMessage(
      `Quotation request ${payload.requestId} submitted successfully! It is now also available in the Proforma Invoice search.`,
      "success"
    );
  } catch (error) {
    console.error("KTTL quotation submission error:", error);
    // Still save locally so sales rep doesn't lose work
    saveQuotationRecord(payload);

    showMessage(
      "The request could not be reached on Make.com, but has been saved locally for offline reference. Please check your network.",
      "error"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Quotation Request";
  }
}

function handlePaymentTermsChange() {
  const isOther = paymentTerms.value === "Others";
  paymentTermsOtherWrap.classList.toggle("hidden", !isOther);
  paymentTermsOther.required = isOther;
  if (!isOther) paymentTermsOther.value = "";
}

function resetForm() {
  window.setTimeout(() => {
    clearMessage();
    setCountrySelectByCode("IN");
    if (countryDialCode) setDialCodeSelect("+91", "IN");
    updatePhonePlaceholder("+91");
    const phoneInput = document.getElementById("whatsappNumber");
    if (phoneInput) {
      phoneInput.value = "";
    }
    if (sameAsBilling) {
      sameAsBilling.checked = true;
    }
    if (deliveryAddressInput) {
      deliveryAddressInput.value = "";
      deliveryAddressInput.readOnly = true;
    }
    document.getElementById("requestDate").value = formatDate();
    paymentTermsOtherWrap.classList.add("hidden");
    paymentTermsOther.required = false;
    productsContainer.replaceChildren();
    addProduct();
    calculateTotals();
  }, 0);
}

// -------------------------------------------------------------
// TAB 2: PROFORMA INVOICE (PI) GENERATION LOGIC
// -------------------------------------------------------------
function setupPISearch() {
  piSearchInput.addEventListener("input", () => {
    const query = piSearchInput.value.trim().toLowerCase();
    piSearchClear.classList.toggle("hidden", query.length === 0);
    
    if (query.length < 2) {
      quotationsListContainer.classList.add("hidden");
      quotationsListContainer.innerHTML = "";
      piSearchStatus.classList.add("hidden");
      return;
    }

    performQuotationSearch(query);
  });

  piSearchClear.addEventListener("click", () => {
    piSearchInput.value = "";
    piSearchClear.classList.add("hidden");
    quotationsListContainer.classList.add("hidden");
    quotationsListContainer.innerHTML = "";
    piSearchStatus.classList.add("hidden");
    piSearchInput.focus();
  });

  // Handle Delivery Address toggle
  sameAsBillingCheckbox.addEventListener("change", () => {
    if (sameAsBillingCheckbox.checked) {
      piDeliveryAddress.value = piBillingAddress.value;
      piDeliveryAddress.readOnly = true;
    } else {
      piDeliveryAddress.readOnly = false;
    }
  });

  piBillingAddress.addEventListener("input", () => {
    if (sameAsBillingCheckbox.checked) {
      piDeliveryAddress.value = piBillingAddress.value;
    }
  });

  proformaInvoiceForm.addEventListener("submit", submitProformaInvoice);
}

async function performQuotationSearch(query) {
  let allQuotations = getStoredQuotations();

  // If a live search webhook URL is provided, try querying it
  if (SEARCH_QUOTATIONS_WEBHOOK_URL) {
    try {
      piSearchStatus.textContent = "Searching records...";
      piSearchStatus.className = "message info";
      piSearchStatus.classList.remove("hidden");

      const res = await fetch(`${SEARCH_QUOTATIONS_WEBHOOK_URL}?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const liveResults = await res.json();
        if (Array.isArray(liveResults)) {
          // Merge live results with stored quotations, deduplicating by requestId
          const idMap = new Map();
          liveResults.forEach(item => idMap.set(item.requestId, item));
          allQuotations.forEach(item => {
            if (!idMap.has(item.requestId)) idMap.set(item.requestId, item);
          });
          allQuotations = Array.from(idMap.values());
        }
      }
    } catch (e) {
      console.warn("Live search webhook unavailable, falling back to local records:", e);
    }
  }

  // Filter by Company Name OR Quotation ID
  const matches = allQuotations.filter((q) => {
    const compName = (q.customer?.companyName || "").toLowerCase();
    const reqId = (q.requestId || "").toLowerCase();
    return compName.includes(query) || reqId.includes(query);
  });

  // Sort descending by date (latest first)
  matches.sort((a, b) => {
    const dateA = new Date(a.submittedAt || a.displayDate || 0);
    const dateB = new Date(b.submittedAt || b.displayDate || 0);
    return dateB - dateA;
  });

  if (matches.length === 0) {
    quotationsListContainer.classList.add("hidden");
    piSearchStatus.textContent = `No quotations found matching "${query}". Try searching by Company Name (e.g. Larsen) or Quotation # (REQ-...).`;
    piSearchStatus.className = "message info";
    piSearchStatus.classList.remove("hidden");
    return;
  }

  piSearchStatus.textContent = `Found ${matches.length} quotation${matches.length > 1 ? "s" : ""} (ordered by most recent first):`;
  piSearchStatus.className = "message info";
  piSearchStatus.classList.remove("hidden");

  renderQuotationsList(matches);
}

function renderQuotationsList(quotations) {
  quotationsListContainer.innerHTML = "";
  quotationsListContainer.classList.remove("hidden");

  quotations.forEach((q) => {
    const card = document.createElement("div");
    card.className = "quotation-card";
    if (currentSelectedQuotation?.requestId === q.requestId) {
      card.classList.add("selected");
    }

    const productsCount = q.products?.length || 0;
    const firstProduct = q.products?.[0]?.productName || "Product";
    const productPreview = productsCount > 1 
      ? `${firstProduct} +${productsCount - 1} more`
      : firstProduct;

    const formattedDate = q.displayDate || formatDate(new Date(q.submittedAt));

    card.innerHTML = `
      <div class="q-meta">
        <div class="q-top">
          <span class="q-number">${q.requestId}</span>
          <span class="q-date">${formattedDate}</span>
        </div>
        <div class="q-company">${q.customer?.companyName || "N/A"}</div>
        <div class="q-products-preview">${productPreview} &bull; Sales: ${q.salesperson?.name || "N/A"}</div>
      </div>
      <div class="q-right">
        <div class="q-total">${money(q.totals?.grandTotal || 0)}</div>
        <span class="q-select-badge">Select Quotation &rarr;</span>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".quotation-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectQuotationForPI(q);
    });

    quotationsListContainer.appendChild(card);
  });
}

function selectQuotationForPI(quotation) {
  currentSelectedQuotation = quotation;
  piFormWrapper.classList.remove("hidden");

  // Populate Quotation banner
  const dateStr = quotation.displayDate || formatDate(new Date(quotation.submittedAt));
  piSelectedQuotationBanner.innerHTML = `
    <div class="detail-item">
      <span>Quotation Number</span>
      <strong>${quotation.requestId}</strong>
    </div>
    <div class="detail-item">
      <span>Quotation Date</span>
      <strong>${dateStr}</strong>
    </div>
    <div class="detail-item">
      <span>Customer / Company</span>
      <strong>${quotation.customer?.companyName || "N/A"}</strong>
    </div>
    <div class="detail-item">
      <span>GST Number</span>
      <strong>${quotation.customer?.gstNumber || "N/A"}</strong>
    </div>
    <div class="detail-item">
      <span>Contact Person</span>
      <strong>${quotation.customer?.contactPerson || "N/A"} (${quotation.customer?.whatsappNumber || "N/A"})</strong>
    </div>
    <div class="detail-item">
      <span>Payment Terms</span>
      <strong>${quotation.quotationDetails?.paymentTerms || "Standard"}</strong>
    </div>
  `;

  // Populate Products Table
  piProductsTableBody.innerHTML = "";
  if (Array.isArray(quotation.products)) {
    quotation.products.forEach((prod, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <strong>${prod.productName}</strong>
          ${prod.specification ? `<div style="font-size: 11px; color: var(--muted);">${prod.specification}</div>` : ""}
        </td>
        <td>${prod.hsnCode}</td>
        <td>${prod.unit}</td>
        <td>${prod.quantity.toLocaleString("en-IN")}</td>
        <td>${money(prod.rate)}</td>
        <td>${prod.gstRate}%</td>
        <td><strong>${money(prod.total)}</strong></td>
      `;
      piProductsTableBody.appendChild(tr);
    });
  }

  // Populate Totals
  piSubtotal.textContent = money(quotation.totals?.subtotal || 0);
  piGstTotal.textContent = money(quotation.totals?.gstTotal || 0);
  piGrandTotal.textContent = money(quotation.totals?.grandTotal || 0);

  // Pre-fill PO & PI fields
  poNumberInput.value = "";
  const billingAddr = quotation.customer?.billingAddress || quotation.customer?.address || "";
  const deliveryAddr = quotation.customer?.deliveryAddress || quotation.customer?.address || billingAddr;
  piBillingAddress.value = billingAddr;
  piDeliveryAddress.value = deliveryAddr;
  if (deliveryAddr && billingAddr && deliveryAddr !== billingAddr) {
    sameAsBillingCheckbox.checked = false;
    piDeliveryAddress.readOnly = false;
  } else {
    sameAsBillingCheckbox.checked = true;
    piDeliveryAddress.readOnly = true;
  }

  // Clear message
  piMessage.textContent = "";
  piMessage.className = "message";

  // Scroll smoothly down to the PO form
  piFormWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitProformaInvoice(event) {
  event.preventDefault();
  if (!currentSelectedQuotation) {
    alert("Please search and select a quotation first.");
    return;
  }

  if (!proformaInvoiceForm.reportValidity()) return;

  const poNumber = poNumberInput.value.trim();
  const poDate = poDateInput.value;
  const billingAddress = piBillingAddress.value.trim();
  const deliveryAddress = piDeliveryAddress.value.trim();

  const bankDetails = {
    beneficiaryName: document.getElementById("bankBeneficiary").value.trim(),
    bankName: document.getElementById("bankName").value.trim(),
    accountNumber: document.getElementById("bankAccountNumber").value.trim(),
    ifscCode: document.getElementById("bankIfsc").value.trim(),
    branch: document.getElementById("bankBranch").value.trim()
  };

  const piNumber = makePINumber();
  const piPayload = {
    piNumber: piNumber,
    generatedAt: new Date().toISOString(),
    quotationId: currentSelectedQuotation.requestId,
    quotationDate: currentSelectedQuotation.submittedAt,
    customer: {
      ...currentSelectedQuotation.customer,
      billingAddress: billingAddress,
      deliveryAddress: deliveryAddress
    },
    poDetails: {
      poNumber: poNumber,
      poDate: poDate
    },
    products: currentSelectedQuotation.products,
    totals: currentSelectedQuotation.totals,
    bankDetails: bankDetails,
    terms: currentSelectedQuotation.quotationDetails
  };

  piSubmitBtn.disabled = true;
  piSubmitBtn.textContent = "Saving Proforma Invoice...";

  try {
    const response = await fetch(PI_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(piPayload)
    });

    piMessage.textContent = `Proforma Invoice ${piNumber} has been generated and synced with PO #${poNumber}!`;
    piMessage.className = "message success";
    piMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    console.error("PI generation sync error:", err);
    // Fallback success for sales team workflow
    piMessage.textContent = `Proforma Invoice ${piNumber} generated locally for PO #${poNumber}. (Check webhook connection if Make.com sync failed).`;
    piMessage.className = "message info";
    piMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    piSubmitBtn.disabled = false;
    piSubmitBtn.textContent = "Generate & Save Proforma Invoice";
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
function init() {
  setupNavigation();
  populateCountries();
  setupAddressSync();

  document.getElementById("requestDate").value = formatDate();

  addProductBtn.addEventListener("click", addProduct);
  paymentTerms.addEventListener("change", handlePaymentTermsChange);
  quotationForm.addEventListener("submit", submitQuotationRequest);
  quotationForm.addEventListener("reset", resetForm);

  addProduct();
  calculateTotals();

  setupPISearch();
}

document.addEventListener("DOMContentLoaded", init);
