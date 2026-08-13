// ============================================
// Velan View Hotel
// booking.js
// ============================================

// Elements

const room = document.getElementById("room");

const checkin = document.getElementById("checkin");

const checkout = document.getElementById("checkout");

const coupon = document.getElementById("coupon");

const roomPrice = document.getElementById("roomPrice");

const nights = document.getElementById("nights");

const roomTotal = document.getElementById("roomTotal");

const gst = document.getElementById("gst");

const discount = document.getElementById("discount");

const grandTotal = document.getElementById("grandTotal");

const advance = document.getElementById("advance");



// ============================================
// Calculate Booking
// ============================================

function calculateBooking(){

let price = parseInt(room.value);

let nightCount = 1;


// Calculate Nights

if(checkin.value !== "" && checkout.value !== ""){

let start = new Date(checkin.value);

let end = new Date(checkout.value);

let diff = (end-start)/(1000*60*60*24);

if(diff>0){

nightCount = diff;

}

}


// Room Total

let total = price * nightCount;


// GST

let gstAmount = total * 0.12;


// Discount

let discountAmount = 0;


// Coupons

if(coupon.value.toUpperCase()=="VELAN10"){

discountAmount = total * 0.10;

}

if(coupon.value.toUpperCase()=="PALANI500"){

discountAmount = 500;

}


// Final

let finalAmount = total + gstAmount - discountAmount;


// Advance

let advanceAmount = Math.round(finalAmount * 0.40);


// Update UI

roomPrice.innerHTML = "₹"+price;

nights.innerHTML = nightCount;

roomTotal.innerHTML = "₹"+total;

gst.innerHTML = "₹"+gstAmount.toFixed(0);

discount.innerHTML = "- ₹"+discountAmount.toFixed(0);

grandTotal.innerHTML = "₹"+finalAmount.toFixed(0);

advance.innerHTML = "₹"+advanceAmount;

}



// Events

room.addEventListener("change",calculateBooking);

checkin.addEventListener("change",calculateBooking);

checkout.addEventListener("change",calculateBooking);

coupon.addEventListener("keyup",calculateBooking);


// Initial

calculateBooking();
// ============================================
// PAY NOW
// ============================================

const CREATE_ORDER_URL = "https://velan-view-api.vercel.app/api/create-order";
const VERIFY_PAYMENT_URL = "https://velan-view-api.vercel.app/api/verify-payment";

const payNowButton = document.getElementById("payNow");
const bookingForm = document.getElementById("hotelBooking");

payNowButton.addEventListener("click", async function () {

    calculateBooking();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const termsAccepted = bookingForm.querySelector('input[type="checkbox"]').checked;

    if (name === "" || phone === "" || email === "") {
        alert("Please fill all guest details.");
        return;
    }

    if (!termsAccepted) {
        alert("Please agree to the Terms & Conditions.");
        return;
    }

    const amount = parseFloat(
        advance.innerHTML.replace(/[₹,]/g, "")
    );

    const amountPaise = Math.round(amount * 100);

    if (!Number.isInteger(amountPaise) || amountPaise < 100) {
        alert("Invalid payment amount. Please check your booking details.");
        return;
    }

    payNowButton.disabled = true;
    payNowButton.textContent = "Opening Payment...";

    try {
        // Create the Razorpay order on the secure backend.
        const orderResponse = await fetch(CREATE_ORDER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amountPaise,
                currency: "INR",
                receipt: `VVH_${Date.now()}`
            })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok || !orderData.success) {
            throw new Error(orderData.error || "Unable to create payment order.");
        }

        const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Velan View Hotel",
            description: "Room Booking Advance",
            image: "images/logo.jpeg",
            order_id: orderData.order_id,

            prefill: {
                name: name,
                email: email,
                contact: phone
            },

            theme: {
                color: "#d4a017"
            },

            handler: async function (response) {
                await verifyPayment(response, {
                    name,
                    phone,
                    email
                });
            },

            modal: {
                ondismiss: function () {
                    payNowButton.disabled = false;
                    payNowButton.textContent = "Pay Advance & Book";
                }
            }
        };

        const rzp = new Razorpay(options);

        rzp.on("payment.failed", function (response) {
            console.error("Razorpay payment failed:", response.error);

            alert(
                response.error?.description ||
                "Payment failed. Please try again."
            );

            payNowButton.disabled = false;
            payNowButton.textContent = "Pay Advance & Book";
        });

        rzp.open();

    } catch (error) {
        console.error("Payment initialization error:", error);

        alert(
            error.message ||
            "Unable to start payment. Please try again."
        );

        payNowButton.disabled = false;
        payNowButton.textContent = "Pay Advance & Book";
    }
});


// ============================================
// VERIFY PAYMENT
// ============================================

async function verifyPayment(response, customer) {

    try {
        const verificationResponse = await fetch(VERIFY_PAYMENT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
            })
        });

        const result = await verificationResponse.json();

        if (!verificationResponse.ok || !result.success || !result.verified) {
            throw new Error(
                result.error ||
                "Payment verification failed."
            );
        }

        const bookingId =
            "VVH" +
            Math.floor(Math.random() * 900000 + 100000);

        localStorage.setItem("bookingId", bookingId);
        localStorage.setItem("customerName", customer.name);
        localStorage.setItem("customerPhone", customer.phone);
        localStorage.setItem("customerEmail", customer.email);
        localStorage.setItem("paymentId", response.razorpay_payment_id);
        localStorage.setItem("razorpayOrderId", response.razorpay_order_id);

        const whatsappMessage =
`Hello Velan View Hotel,

My booking payment was successful.

Booking ID : ${bookingId}

Name : ${customer.name}

Phone : ${customer.phone}

Email : ${customer.email}

Payment ID : ${response.razorpay_payment_id}

Please confirm my booking.

Thank You.`;

        const whatsappURL =
            "https://wa.me/919894288851?text=" +
            encodeURIComponent(whatsappMessage);

        window.open(whatsappURL, "_blank");

        window.location.href = "thankyou.html";

    } catch (error) {
        console.error("Payment verification error:", error);

        alert(
            error.message ||
            "Payment verification failed. Please contact Velan View Hotel before making another payment."
        );

        payNowButton.disabled = false;
        payNowButton.textContent = "Pay Advance & Book";
    }
}
