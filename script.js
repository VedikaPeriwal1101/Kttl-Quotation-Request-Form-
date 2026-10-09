
"use strict";

/*
 * KTTL QUOTATION REQUEST FORM
 *
 * Before deployment:
 * 1. Verify the webhook URL below.
 * 2. Verify the JSON payload keys against your existing Make.com scenario.
 * 3. Confirm the HSN/GST defaults with KTTL's finance team.
 */

const WEBHOOK_URL =
  "https://hook.eu1.make.com/fmk46trwit4ymlryita3gg3lik8wvsuc";

const PRODUCT_CATALOG = [
  {
    name: "CLAYTEX",
    hsn: "591190",
    gst: 5
  },
  {
    name: "GEOCELL",
    hsn: "39269080",
    gst: 18
  },
  {
    name: "GEODRAIN / GEOCOMPOSITE",
    hsn: "39269099",
    gst: 18
  },
  {
    name: "GEOSTRIP",
    hsn: "59119090",
    gst: 5
  },
  {
    name: "HDPE LINER",
    hsn: "39201012",
    gst: 18
  },
  {
    name: "NONWOVEN GEOBAG/GEOCONTAINER",
    hsn: "59119039",
    gst: 5
  },
  {
    name: "NONWOVEN GEOTEXTILE 150 GSM & ABOVE",
    hsn: "56031400",
    gst: 5
  },
  {
    name: "NONWOVEN GEOTEXTILE BELOW 150 GSM",
    hsn: "56031300",
    gst: 5
  },
  {
    name: "PET GEOGRID",
    hsn: "59119090",
    gst: 5
  },
  {
    name: "PP GEOGRID",
    hsn: "39269080",
    gst: 18
  },
  {
    name: "WOVEN GEOBAG/GEOCONTAINER",
    hsn: "63059000",
    gst: 18
  },
  {
    name: "WOVEN GEOTEXTILE",
    hsn: "54077110",
    gst: 5
  }
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

const form = document.getElementById("quotationForm");
const productsContainer = document.getElementById("productsContainer");
const productTemplate = document.getElementById("productTemplate");
const addProductBtn = document.getElementById("addProductBtn");
const paymentTerms = document.getElementById("paymentTerms");
const paymentTermsOtherWrap = document.getElementById("paymentTermsOtherWrap");
const paymentTermsOther = document.getElementById("paymentTermsOther");
const messageBox = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const countrySelect = document.getElementById("country");

let productCounter = 0;

function money(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

function numericValue(input) {
  const cleaned = String(input?.value ?? "").replace(/,/g, "").trim();

  if (!cleaned) {
    return 0;
  }

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
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "KTTL-" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 9).toUpperCase();
}

function populateCountries() {
  const countries = COUNTRY_CODES
    .map((code) => ({
      code,
      name: COUNTRY_NAMES.of(code)
    }))
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
    countrySelect.appendChild(option);
  });

  countrySelect.value = "India";
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

  if (!raw && allowBlank) {
    return 0;
  }

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

  return {
    taxable,
    gstAmount,
    total
  };
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

    if (number > 0) {
      result += " ";
    }
  }

  if (number >= 20) {
    result += tens[Math.floor(number / 10)];
    number %= 10;

    if (number > 0) {
      result += " " + ones[number];
    }
  } else if (number > 0) {
    result += ones[number];
  }

  return result;
}

function integerToIndianWords(number) {
  if (number === 0) {
    return "Zero";
  }

  if (!Number.isSafeInteger(number) || number < 0) {
    return "Amount out of supported range";
  }

  const parts = [];

  const crore = Math.floor(number / 10000000);
  number %= 10000000;

  const lakh = Math.floor(number / 100000);
  number %= 100000;

  const thousand = Math.floor(number / 1000);
  number %= 1000;

  if (crore) {
    parts.push(integerToIndianWords(crore) + " Crore");
  }

  if (lakh) {
    parts.push(numberToWordsUnderThousand(lakh) + " Lakh");
  }

  if (thousand) {
    parts.push(numberToWordsUnderThousand(thousand) + " Thousand");
  }

  if (number) {
    parts.push(numberToWordsUnderThousand(number));
  }

  return parts.join(" ");
}

function amountInWords(amount) {
  const rounded = Math.round(amount);

  if (rounded < 0 || !Number.isSafeInteger(rounded)) {
    return "Amount out of supported range";
  }

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

  // Standard nearest-rupee rounding:
  // 14.50 becomes 15; 14.40 becomes 14.
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
    card.querySelector(".product-top h3").textContent =
      "Product " + (index + 1);
  });
}

function getProductPayload(card, index) {
  const productName = card.querySelector(".product-name").value.trim();
  const specification = card.querySelector(".product-specification").value.trim();
  const hsnCode = card.querySelector(".product-hsn").value.trim();
  const unit = card.querySelector(".product-unit").value.trim();

  if (!productName) {
    throw new Error("Please select a product for Product " + (index + 1) + ".");
  }

  if (!hsnCode) {
    throw new Error("Please enter the HSN code for Product " + (index + 1) + ".");
  }

  if (!unit) {
    throw new Error("Please select a unit for Product " + (index + 1) + ".");
  }

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
  if (!form.reportValidity()) {
    return false;
  }

  const companyName = document.getElementById("companyName").value.trim();
  const phone = document.getElementById("whatsappNumber").value.trim();

  if (!companyName) {
    showMessage("Please enter the customer or company name.", "error");
    return false;
  }

  if (!phone) {
    showMessage("Please enter the customer's WhatsApp number or phone number.", "error");
    return false;
  }

  if (
    paymentTerms.value === "Others" &&
    !paymentTermsOther.value.trim()
  ) {
    paymentTermsOther.setCustomValidity(
      "Please enter the custom payment conditions."
    );
    paymentTermsOther.reportValidity();
    paymentTermsOther.setCustomValidity("");
    return false;
  }

  return true;
}

function buildPayload() {
  const salesperson = document.getElementById("salespersonName").value.trim();
  const customer = {
    companyName: document.getElementById("companyName").value.trim(),
    gstNumber: document.getElementById("gstNumber").value.trim(),
    address: document.getElementById("address").value.trim(),
    state: document.getElementById("state").value.trim(),
    country: countrySelect.value,
    contactPerson: document.getElementById("contactPerson").value.trim(),
    email: document.getElementById("customerEmail").value.trim(),
    whatsappNumber: document.getElementById("whatsappNumber").value.trim()
  };

  const products = Array.from(
    productsContainer.querySelectorAll(".product-card")
  ).map((card, index) => getProductPayload(card, index));

  const totals = calculateTotals();

  const chosenPaymentTerms = paymentTerms.value === "Others"
    ? paymentTermsOther.value.trim()
    : paymentTerms.value;

  return {
    requestId: makeRequestId(),
    submittedAt: new Date().toISOString(),
    approvalStatus: "Pending",
    salesperson: {
      name: salesperson
    },
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

async function submitRequest(event) {
  event.preventDefault();
  clearMessage();

  if (!validateForm()) {
    return;
  }

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
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("The webhook returned HTTP " + response.status + ".");
    }

    form.reset();
    countrySelect.value = "India";
    document.getElementById("requestDate").value = formatDate();
    paymentTermsOtherWrap.classList.add("hidden");
    paymentTermsOther.required = false;

    productsContainer.replaceChildren();
    addProduct();
    calculateTotals();

    showMessage(
      "Your quotation request has been submitted. Keep the request details available if the sales or admin team needs to follow up.",
      "success"
    );
  } catch (error) {
    console.error("KTTL quotation submission failed:", error);

    showMessage(
      "The request could not be confirmed as submitted. Please check your internet connection and Make.com webhook configuration before trying again. If a request may already have reached Make.com, check the scenario history first to avoid a duplicate.",
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

  if (!isOther) {
    paymentTermsOther.value = "";
  }
}

function resetForm() {
  window.setTimeout(() => {
    clearMessage();
    countrySelect.value = "India";
    document.getElementById("requestDate").value = formatDate();

    paymentTermsOtherWrap.classList.add("hidden");
    paymentTermsOther.required = false;

    productsContainer.replaceChildren();
    addProduct();
    calculateTotals();
  }, 0);
}

function init() {
  populateCountries();

  document.getElementById("requestDate").value = formatDate();

  addProductBtn.addEventListener("click", addProduct);
  paymentTerms.addEventListener("change", handlePaymentTermsChange);
  form.addEventListener("submit", submitRequest);
  form.addEventListener("reset", resetForm);

  addProduct();
  calculateTotals();
}

document.addEventListener("DOMContentLoaded", init);
