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

document.getElementById("payNow").addEventListener("click", function () {

    calculateBooking();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();

    if (name === "" || phone === "" || email === "") {

        alert("Please fill all guest details.");

        return;

    }

    let amount = parseFloat(
        advance.innerHTML.replace(/[₹,]/g, "")
    );

    var options = {

        key: " rzp_test_TM7PKcxqMxaMnm",

        amount: amount * 100,

        currency: "INR",

        name: "Velan View Hotel",

        description: "Room Booking Advance",

        image: "images/logo.png",

        prefill: {

            name: name,

            email: email,

            contact: phone

        },

        theme: {

            color: "#d4a017"

        },

        handler: function (response) {

            const bookingId =
                "VVH" +
                Math.floor(Math.random() * 900000 + 100000);

            // Save booking locally
            localStorage.setItem("bookingId", bookingId);

            localStorage.setItem("customerName", name);

            localStorage.setItem("customerPhone", phone);

            localStorage.setItem("customerEmail", email);

            localStorage.setItem(
                "paymentId",
                response.razorpay_payment_id
            );

            // WhatsApp Message

            let whatsappMessage =
`Hello Velan View Hotel,

My booking payment was successful.

Booking ID : ${bookingId}

Name : ${name}

Phone : ${phone}

Email : ${email}

Payment ID : ${response.razorpay_payment_id}

Please confirm my booking.

Thank You.`;

            let whatsappURL =
"https://wa.me/+919894288851?text=" +
encodeURIComponent(whatsappMessage);

            window.open(whatsappURL, "_blank");

            // Redirect

            setTimeout(function () {

                window.location.href =
                    "thankyou.html";

            }, 1200);

        }

    };

    var rzp = new Razorpay(options);

    rzp.open();

});
