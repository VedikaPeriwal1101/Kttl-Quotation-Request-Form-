/*
  IMPORTANT:
  Replace the URL below with the fresh Custom Webhook URL copied from Make.com.
  In Make, click "Run once" before submitting the form.
*/
const WEBHOOK_URL = "https://hook.eu1.make.com/hhvgiq4gmav9awsrm6sx3l94nmbfsbei";

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
      quantity,
      rate,
      gstRate,
      taxableAmount,
      gstAmount,
      total: taxableAmount + gstAmount
    };
  });
}

function refreshTotals() {
  let subtotal = 0;
  let gstTotal = 0;

  productsContainer.querySelectorAll(".product-card").forEach(card => {
    const quantity = Number(card.querySelector(".quantity").value || 0);
    const rate = Number(card.querySelector(".rate").value || 0);
    const gstRate = Number(card.querySelector(".gst-rate").value || 0);
    const taxableAmount = quantity * rate;
    const gstAmount = taxableAmount * gstRate / 100;
    const total = taxableAmount + gstAmount;

    subtotal += taxableAmount;
    gstTotal += gstAmount;
    card.querySelector(".line-total").textContent = money(total);
  });

  const grandTotal = subtotal + gstTotal;
  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("gstTotal").textContent = money(gstTotal);
  document.getElementById("grandTotal").textContent = money(grandTotal);
  document.getElementById("amountInWords").value = numberToIndianWords(grandTotal);
}

function formToObject() {
  const products = getProducts();
  const subtotal = products.reduce((sum, item) => sum + item.taxableAmount, 0);
  const gstTotal = products.reduce((sum, item) => sum + item.gstAmount, 0);
  const grandTotal = subtotal + gstTotal;

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
      contactPerson: document.getElementById("contactPerson").value.trim(),
      email: document.getElementById("customerEmail").value.trim(),
      whatsappNumber: document.getElementById("whatsappNumber").value.trim()
    },
    products,
    quotationDetails: {
      paymentTerms: document.getElementById("paymentTerms").value,
      pricingTerms: document.getElementById("pricingTerms").value.trim(),
      priceValidity: document.getElementById("priceValidity").value.trim(),
      amountInWords: numberToIndianWords(grandTotal),
      remarks: document.getElementById("remarks").value.trim()
    },
    totals: { subtotal, gstTotal, grandTotal }
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";

  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_YOUR")) {
    message.textContent = "https://hook.eu1.make.com/hhvgiq4gmav9awsrm6sx3l94nmbfsbei";
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
