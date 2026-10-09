/*
  IMPORTANT:
  Keep the existing Make.com Custom Webhook URL. If you replace the webhook in Make,
  paste the new URL here and run the scenario once before testing.
*/
const WEBHOOK_URL = "https://hook.eu1.make.com/fmk46trwit4ymlryita3gg3lik8wvsuc";

const productsContainer = document.getElementById("productsContainer");
const form = document.getElementById("quotationForm");
const message = document.getElementById("message");
const submitButton = form.querySelector('button[type="submit"]');

let productCounter = 0;

/*
  Product names and HSN/GST mappings supplied for this form.
  Note: the source list showed "5 6031400"; this is entered as 56031400,
  removing the apparent spacing typo. Please verify against KTTL's official list.
*/
const PRODUCT_HSN = {
  "Woven Geotextile": { hsn: "54077110", gst: 5 },
  "Nonwoven Geotextile Below 150 GSM": { hsn: "56031300", gst: 5 },
  "Nonwoven Geotextile 150 GSM & Above": { hsn: "56031400", gst: 5 },
  "PET Geogrid": { hsn: "59119090", gst: 5 },
  "Geostrip": { hsn: "59119090", gst: 5 },
  "Claytex": { hsn: "591190", gst: 5 },
  "Nonwoven Geobag/Geocontainer": { hsn: "59119039", gst: 5 },
  "Woven Geobag/Geocontainer": { hsn: "63059000", gst: 18 },
  "Geodrain / Geocomposite": { hsn: "39269099", gst: 18 },
  "HDPE Liner": { hsn: "39201012", gst: 18 },
  "Geocell": { hsn: "39269080", gst: 18 },
  "PP Geogrid": { hsn: "39269080", gst: 18 }
};

const productOptions = Object.keys(PRODUCT_HSN);
const hsnOptions = [...new Set(Object.values(PRODUCT_HSN).map(item => item.hsn))];

/*
  These are common units relevant to technical-textile/geosynthetic quotations.
  KTTL can refine the list to match its official commercial practice.
*/
const unitOptions = [
  "Sq. Mtrs",
  "Sq. Ft",
  "Running Mtrs",
  "Mtrs",
  "Piece",
  "Nos",
  "Kg",
  "Metric Ton",
  "Roll",
  "Sheet",
  "Panel",
  "Bag",
  "Set",
  "Bundle",
  "Lot"
];

/*
  Customer autofill placeholder. Keep empty until existing customer records
  are available or a Google Sheets lookup is connected.
*/
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
  const value = Math.round((Number(total) + Number.EPSILON) * 100) / 100;
  const rounded = mode === "nearest" ? Math.floor(value + 0.5) : value;
  return {
    rounded,
    roundOff: Math.round((rounded - value + Number.EPSILON) * 100) / 100
  };
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
      <label>Product Name <span class="required">*</span>
        <select class="product-name" required>
          <option value="">Select product</option>
          ${productOptions.map(product => `<option value="${product}">${product}</option>`).join("")}
          <option value="Other">Other (enter details in specification)</option>
        </select>
      </label>
      <label>Specification
        <input class="specification" placeholder="Enter grade, GSM, dimensions, etc.">
      </label>
      <label>HSN Code
        <select class="hsn-code">
          <option value="">Select HSN code</option>
          ${hsnOptions.map(code => `<option value="${code}">${code}</option>`).join("")}
        </select>
      </label>
      <label>Unit <span class="required">*</span>
        <select class="unit" required>
          <option value="">Select unit</option>
          ${unitOptions.map(unit => `<option value="${unit}">${unit}</option>`).join("")}
        </select>
      </label>
      <label>Quantity <span class="required">*</span>
        <input class="quantity" type="number" min="0.000001" step="any" required>
      </label>
      <label>Rate (₹) <span class="required">*</span>
        <input class="rate" type="number" min="0" step="any" required>
      </label>
      <label>GST (%)
        <input class="gst-rate" type="number" min="0" step="any" value="0">
      </label>
    </div>
    <div class="product-total">
      <span>Product Total (incl. GST)</span>
      <span class="line-total">₹0.00</span>
    </div>
  `;

  card.querySelector(".remove-btn").addEventListener("click", () => {
    card.remove();
    refreshProductHeadings();
    refreshTotals();
  });

  card.querySelector(".product-name").addEventListener("change", event => {
    const match = PRODUCT_HSN[event.target.value];
    const hsnSelect = card.querySelector(".hsn-code");
    const gstInput = card.querySelector(".gst-rate");

    if (match) {
      hsnSelect.value = match.hsn;
      gstInput.value = match.gst;
    } else if (event.target.value === "Other") {
      hsnSelect.value = "";
      gstInput.value = 0;
    } else {
      hsnSelect.value = "";
      gstInput.value = 0;
    }
    refreshTotals();
  });

  card.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", refreshTotals);
    input.addEventListener("change", refreshTotals);
  });

  productsContainer.appendChild(card);
  refreshProductHeadings();
  refreshTotals();
}

function refreshProductHeadings() {
  productsContainer.querySelectorAll(".product-card").forEach((card, index) => {
    card.querySelector(".product-top h3").textContent = `Product ${index + 1}`;
  });
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

  const subtotal = products.reduce(
    (sum, item) => sum + item.taxableAmount,
    0
  );

  const gstTotal = products.reduce(
    (sum, item) => sum + item.gstAmount,
    0
  );

  const grandTotalBeforeRounding = subtotal + gstTotal;

  // Round to the nearest rupee:
  // ₹14.40 → ₹14; ₹14.50 → ₹15
  const grandTotal = Math.floor(grandTotalBeforeRounding + 0.5);
  const roundOff = grandTotal - grandTotalBeforeRounding;

  return {
    subtotal,
    gstTotal,
    grandTotalBeforeRounding,
    roundingMode: "nearest",
    roundOff,
    grandTotal
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

/* Payment terms: show custom conditions only when "Others" is selected. */
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

/* Customer autofill placeholder: this will work once the customer list is populated. */
const companyInput = document.getElementById("companyName");
const companyList = document.getElementById("companyList");

companyList.innerHTML = CUSTOMERS
  .map(customer => `<option value="${String(customer.companyName).replace(/"/g, "&quot;")}"></option>`)
  .join("");

companyInput.addEventListener("change", () => {
  const match = CUSTOMERS.find(customer =>
    customer.companyName.toLowerCase() === companyInput.value.trim().toLowerCase()
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
  message.className = "";

  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_YOUR")) {
    message.textContent = "Please add your fresh Make webhook URL in script.js.";
    message.classList.add("error");
    return;
  }

  const payload = formToObject();

  if (payload.products.length === 0) {
    message.textContent = "Please add at least one product.";
    message.classList.add("error");
    return;
  }

  const invalidProduct = payload.products.find(product =>
    !product.productName || !product.unit || !(product.quantity > 0) ||
    product.rate < 0 || !Number.isFinite(product.quantity) || !Number.isFinite(product.rate)
  );
  if (invalidProduct) {
    message.textContent = "Please complete each product's name, unit, quantity and rate.";
    message.classList.add("error");
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
    message.classList.add("success");
    form.reset();
    togglePaymentOther();
    productsContainer.innerHTML = "";
    productCounter = 0;
    document.getElementById("country").value = "India";
    addProduct();
  } catch (error) {
    console.error("Make webhook error:", error);
    message.textContent = "Submission failed. Check the Make webhook URL and scenario.";
    message.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Quotation Request";
  }
});

document.getElementById("addProductBtn").addEventListener("click", addProduct);
addProduct();
