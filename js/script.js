// ======================================
// Velan View Hotel
// script.js
// ======================================

// Wait for page to load
window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    if (loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
        }, 1200);
    }

});

// ======================================
// Sticky Navbar
// ======================================

window.addEventListener("scroll", function () {

    const header = document.querySelector("header");

    if (!header) return;

    if (window.scrollY > 80) {

        header.style.background = "#ffffff";
        header.style.boxShadow = "0 10px 25px rgba(0,0,0,.08)";
        header.style.transition = ".3s";

    } else {

        header.style.background = "rgba(255,255,255,.95)";
        header.style.boxShadow = "none";

    }

});


// ======================================
// Back To Top Button
// ======================================

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", function () {

    if (!topBtn) return;

    if (window.scrollY > 500) {

        topBtn.style.display = "flex";

    } else {

        topBtn.style.display = "none";

    }

});

if (topBtn) {

    topBtn.addEventListener("click", function () {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

}


// ======================================
// Smooth Scroll
// ======================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({

            behavior: "smooth"

        });

    });

});


// ======================================
// Mobile Menu
// ======================================

const menuBtn = document.querySelector(".mobile-menu");

const nav = document.querySelector(".nav-links");

if (menuBtn && nav) {

    menuBtn.addEventListener("click", function () {

        nav.classList.toggle("active");

    });

}


// ======================================
// Room Card Hover Animation
// ======================================

const cards = document.querySelectorAll(".room-card");

cards.forEach(card => {

    card.addEventListener("mouseenter", function () {

        card.style.transform = "translateY(-12px)";

    });

    card.addEventListener("mouseleave", function () {

        card.style.transform = "translateY(0px)";

    });

});


// ======================================
// Booking Form Validation
// ======================================

const bookingForm = document.querySelector(".booking-card form");

if (bookingForm) {

    bookingForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const inputs = bookingForm.querySelectorAll("input, select");

        let valid = true;

        inputs.forEach(input => {

            if (input.value === "") {

                valid = false;

            }

        });

        if (!valid) {

            alert("Please fill all booking details.");

            return;

        }

        window.location.href = "booking.html";

    });

}


// ======================================
// Gallery Hover Effect
// ======================================

document.querySelectorAll(".gallery-item img").forEach(img => {

    img.addEventListener("click", function () {

        this.classList.toggle("zoom");

    });

});


// ======================================
// Animated Counter
// ======================================

const counters = document.querySelectorAll(".stat-box h2");

counters.forEach(counter => {

    const original = counter.innerText;

    const number = parseInt(original.replace(/\D/g, ""));

    if (isNaN(number)) return;

    let current = 0;

    const increment = Math.ceil(number / 60);

    const update = () => {

        current += increment;

        if (current >= number) {

            counter.innerText = original;

            return;

        }

        counter.innerText = current + "+";

        requestAnimationFrame(update);

    };

    update();

});


// ======================================
// Footer Year
// ======================================

const year = new Date().getFullYear();

const copy = document.querySelector(".copyright");

if (copy) {

    copy.innerHTML =
        "© " + year + " Velan View Hotel. All Rights Reserved.";

}


// ======================================
// Console
// ======================================

console.log("Velan View Hotel Loaded Successfully");
