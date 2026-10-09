/*
  IMPORTANT:
  Replace the URL below with the fresh Custom Webhook URL copied from Make.com.
  In Make, click "Run once" before submitting the form.
*/
const WEBHOOK_URL = "https://hook.eu1.make.com/fmk46trwit4ymlryita3gg3lik8wvsuc";

const productsContainer = document.getElementById("productsContainer");
const form = document.getElementById("quotationForm");
const message = document.getElementById("message");
const submitButton = form.querySelector('button[type="submit"]');

let productCounter = 0;

const productOptions = [
  "Geocell",
  "Non Woven Geotextile",
  "Woven Geotextile",
  "Pavement Fabrics",
  "Geodrains",
  "Geocontainers",
  "Other"
];

/* ------------------------------------------------------------------
   UNITS
   Replace / extend once KTTL sends their list.
------------------------------------------------------------------- */
const unitOptions = ["Sq. Mtrs", "Piece", "Running Mtrs", "Kg", "Roll", "Set", "Nos"];

/* ------------------------------------------------------------------
   PRODUCT -> HSN LOOKUP
   TEST VALUES ONLY. Replace with the real table from KTTL.
   "gst" is optional: if present, it fills the GST % automatically.
------------------------------------------------------------------- */
const PRODUCT_HSN = {
  "Geocell":              { hsn: "TEST-1001", gst: 18 },
  "Non Woven Geotextile": { hsn: "TEST-1002", gst: 18 },
  "Woven Geotextile":     { hsn: "TEST-1003", gst: 18 },
  "Pavement Fabrics":     { hsn: "TEST-1004", gst: 18 },
  "Geodrains":            { hsn: "TEST-1005", gst: 18 },
  "Geocontainers":        { hsn: "TEST-1006", gst: 18 }
};

// Dropdown list of all HSN codes (built from the table above)
const hsnOptions = [...new Set(Object.values(PRODUCT_HSN).map(item => item.hsn))];

/* ------------------------------------------------------------------
   EXISTING CUSTOMERS (temporary, manual list)
   When a company name matches, the other fields fill automatically.
   Later this will be replaced by a lookup from the Google Sheet.
   Example entry:
   { companyName: "ABC Infra Pvt Ltd", gstNumber: "27XXXXXXXXXXXXX", address: "Full address",
     state: "Maharashtra", country: "India", contactPerson: "Name",
     email: "name@abc.com", whatsappNumber: "9999999999" }
------------------------------------------------------------------- */
const CUSTOMERS = [];

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function twoDigitWords(number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
    "Seventy", "Eighty", "Ninety"];

  if (number < 20) return ones[number];
  return `${tens[Math.floor(number / 10)]}${number % 10 ? " " + ones[number % 10] : ""}`;
}

function numberToIndianWords(value) {
  let number = Math.round(Number(value || 0));
  if (number === 0) return "Zero Rupees Only";

  const parts = [];
  const crore = Math.floor(number / 10000000); number %= 10000000;
  const lakh = Math.floor(number / 100000); number %= 100000;
  const thousand = Math.floor(number / 1000); number %= 1000;
  const hundred = Math.floor(number / 100); number %= 100;

  if (crore) parts.push(`${twoDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred) parts.push(`${twoDigitWords(hundred)} Hundred`);
  if (number) parts.push(twoDigitWords(number));

  return `${parts.join(" ")} Rupees Only`;
}

function applyRounding(total, mode) {
  const value = Math.round(total * 100) / 100; // avoids floating point glitches
  let rounded = value;
  if (mode === "nearest") rounded = Math.round(value);
  if (mode === "up") rounded = Math.ceil(value);
  if (mode === "down") rounded = Math.floor(value);
  return { rounded, roundOff: Math.round((rounded - value) * 100) / 100 };
}

function addProduct() {
  productCounter++;

  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.productId = String(productCounter);

  card.innerHTML = `
    <div class="product-top">
      <h3>Product ${productCounter}</h3>
      <button type="button" class="remove-btn">Remove</button>
    </div>
    <div class="grid two">
      <label>Product Name <span>*</span>
        <select class="product-name" required>
          <option value="">Select product</option>
          ${productOptions.map(product => `<option value="${product}">${product}</option>`).join("")}
        </select>
      </label>
      <label>Specification
        <input class="specification" placeholder="Enter specification">
      </label>
      <label>HSN Code
        <select class="hsn-code">
          <option value="">Select HSN code</option>
          ${hsnOptions.map(code => `<option value="${code}">${code}</option>`).join("")}
        </select>
      </label>
      <label>Unit <span>*</span>
        <select class="unit" required>
          <option value="">Select unit</option>
          ${unitOptions.map(unit => `<option value="${unit}">${unit}</option>`).join("")}
        </select>
      </label>
      <label>Quantity <span>*</span>
        <input class="quantity" type="number" min="0" step="any" required>
      </label>
      <label>Rate (₹) <span>*</span>
        <input class="rate" type="number" min="0" step="any" required>
      </label>
      <label>GST (%)
        <input class="gst-rate" type="number" min="0" step="any" value="18">
      </label>
    </div>
    <div class="product-total">
      <span>Product Total</span>
      <span class="line-total">₹0.00</span>
    </div>
  `;

  card.querySelector(".remove-btn").addEventListener("click", () => {
    card.remove();
    refreshTotals();
  });

  // Auto-fill HSN (and GST %) when a product is selected
  card.querySelector(".product-name").addEventListener("change", event => {
    const match = PRODUCT_HSN[event.target.value];
    if (match) {
      card.querySelector(".hsn-code").value = match.hsn;
      if (match.gst !== undefined) card.querySelector(".gst-rate").value = match.gst;
    } else {
      card.querySelector(".hsn-code").value = "";
    }
    refreshTotals();
  });

  card.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", refreshTotals);
    input.addEventListener("change", refreshTotals);
  });

  productsContainer.appendChild(card);
  refreshTotals();
}

function getProducts() {
  return [...productsContainer.querySelectorAll(".product-card")].map(card => {
    const quantity = Number(card.querySelector(".quantity").value || 0);
    const rate = Number(card.querySelector(".rate").value || 0);
    const gstRate = Number(card.querySelector(".gst-rate").value || 0);
    const taxableAmount = quantity * rate;
    const gstAmount = taxableAmount * gstRate / 100;

    return {
      productName: card.querySelector(".product-name").value,
      specification: card.querySelector(".specification").value.trim(),
      hsnCode: card.querySelector(".hsn-code").value,
      unit: card.querySelector(".unit").value,
      quantity,
      rate,
      gstRate,
      taxableAmount,
      gstAmount,
      total: taxableAmount + gstAmount
    };
  });
}

function calculateTotals() {
  const products = getProducts();
  const subtotal = products.reduce((sum, item) => sum + item.taxableAmount, 0);
  const gstTotal = products.reduce((sum, item) => sum + item.gstAmount, 0);
  const grandTotalBeforeRounding = subtotal + gstTotal;
  const roundingMode = document.getElementById("roundingMode").value;
  const { rounded, roundOff } = applyRounding(grandTotalBeforeRounding, roundingMode);

  return {
    subtotal,
    gstTotal,
    grandTotalBeforeRounding,
    roundingMode,
    roundOff,
    grandTotal: rounded
  };
}

function refreshTotals() {
  productsContainer.querySelectorAll(".product-card").forEach(card => {
    const quantity = Number(card.querySelector(".quantity").value || 0);
    const rate = Number(card.querySelector(".rate").value || 0);
    const gstRate = Number(card.querySelector(".gst-rate").value || 0);
    const taxableAmount = quantity * rate;
    const total = taxableAmount + taxableAmount * gstRate / 100;
    card.querySelector(".line-total").textContent = money(total);
  });

  const totals = calculateTotals();
  document.getElementById("subtotal").textContent = money(totals.subtotal);
  document.getElementById("gstTotal").textContent = money(totals.gstTotal);
  document.getElementById("roundOff").textContent = money(totals.roundOff);
  document.getElementById("grandTotal").textContent = money(totals.grandTotal);
  document.getElementById("amountInWords").value = numberToIndianWords(totals.grandTotal);
}

/* ---------- Payment terms: "Others" ---------- */
const paymentTermsSelect = document.getElementById("paymentTerms");
const paymentTermsOtherWrap = document.getElementById("paymentTermsOtherWrap");
const paymentTermsOther = document.getElementById("paymentTermsOther");

function togglePaymentOther() {
  const isOther = paymentTermsSelect.value === "Others";
  paymentTermsOtherWrap.classList.toggle("hidden", !isOther);
  paymentTermsOther.required = isOther;
  if (!isOther) paymentTermsOther.value = "";
}
paymentTermsSelect.addEventListener("change", togglePaymentOther);

/* ---------- Customer auto-fill ---------- */
const companyInput = document.getElementById("companyName");
const companyList = document.getElementById("companyList");

companyList.innerHTML = CUSTOMERS
  .map(customer => `<option value="${customer.companyName}"></option>`)
  .join("");

companyInput.addEventListener("change", () => {
  const match = CUSTOMERS.find(
    customer => customer.companyName.toLowerCase() === companyInput.value.trim().toLowerCase()
  );
  if (!match) return;

  document.getElementById("gstNumber").value = match.gstNumber || "";
  document.getElementById("address").value = match.address || "";
  document.getElementById("state").value = match.state || "";
  document.getElementById("country").value = match.country || "India";
  document.getElementById("contactPerson").value = match.contactPerson || "";
  document.getElementById("customerEmail").value = match.email || "";
  document.getElementById("whatsappNumber").value = match.whatsappNumber || "";
});

document.getElementById("roundingMode").addEventListener("change", refreshTotals);

function formToObject() {
  const products = getProducts();
  const totals = calculateTotals();
  const paymentTerms = paymentTermsSelect.value === "Others"
    ? paymentTermsOther.value.trim()
    : paymentTermsSelect.value;

  return {
    requestId: `REQ-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    approvalStatus: "PENDING",
    salesperson: {
      name: document.getElementById("salespersonName").value
    },
    customer: {
      companyName: document.getElementById("companyName").value.trim(),
      gstNumber: document.getElementById("gstNumber").value.trim(),
      address: document.getElementById("address").value.trim(),
      state: document.getElementById("state").value.trim(),
      country: document.getElementById("country").value.trim(),
      contactPerson: document.getElementById("contactPerson").value.trim(),
      email: document.getElementById("customerEmail").value.trim(),
      whatsappNumber: document.getElementById("whatsappNumber").value.trim()
    },
    products,
    quotationDetails: {
      paymentTerms,
      pricingTerms: document.getElementById("pricingTerms").value.trim(),
      priceValidity: document.getElementById("priceValidity").value.trim(),
      amountInWords: numberToIndianWords(totals.grandTotal),
      remarks: document.getElementById("remarks").value.trim()
    },
    totals
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";

  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_YOUR")) {
    message.textContent = "Please add your fresh Make webhook URL in script.js.";
    return;
  }

  const payload = formToObject();

  if (payload.products.length === 0) {
    message.textContent = "Please add at least one product.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${responseText}`);
    }

    message.textContent = "Quotation request submitted successfully.";
    form.reset();
    togglePaymentOther();
    productsContainer.innerHTML = "";
    productCounter = 0;
    addProduct();
  } catch (error) {
    console.error("Make webhook error:", error);
    message.textContent = "Submission failed. Check the Make webhook URL and scenario.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Quotation Request";
  }
});

document.getElementById("addProductBtn").addEventListener("click", addProduct);
addProduct();
