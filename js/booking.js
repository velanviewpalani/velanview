(() => {
    const form = document.getElementById("hotelBooking");
    if (!form) return;

    const roomSelect = document.getElementById("room");
    const roomPriceEl = document.getElementById("roomPrice");
    const nightsEl = document.getElementById("nights");
    const roomTotalEl = document.getElementById("roomTotal");
    const gstEl = document.getElementById("gst");
    const discountEl = document.getElementById("discount");
    const grandTotalEl = document.getElementById("grandTotal");
    const advanceEl = document.getElementById("advance");
    const payButton = document.getElementById("payNow");

    let rooms = [];
    let selectedRoom = null;
    const GST_RATE = 0.12;
    const ADVANCE_AMOUNT = 1000;

    const money = value => "₹" + Math.round(value).toLocaleString("en-IN");

    function calculateNights() {
        const checkin = document.getElementById("checkin").value;
        const checkout = document.getElementById("checkout").value;
        if (!checkin || !checkout) return 1;
        const start = new Date(checkin + "T00:00:00");
        const end = new Date(checkout + "T00:00:00");
        const diff = Math.ceil((end - start) / 86400000);
        return diff > 0 ? diff : 1;
    }

    function updateSummary() {
        selectedRoom = rooms.find(r => String(r.id) === String(roomSelect.value)) || null;
        const price = selectedRoom ? Number(selectedRoom.price) : 0;
        const nights = calculateNights();
        const roomTotal = price * nights;
        const gst = roomTotal * GST_RATE;
        const discount = 0;
        const grandTotal = roomTotal + gst - discount;

        roomPriceEl.textContent = money(price);
        nightsEl.textContent = String(nights);
        roomTotalEl.textContent = money(roomTotal);
        gstEl.textContent = money(gst);
        discountEl.textContent = money(discount);
        grandTotalEl.textContent = money(grandTotal);
        advanceEl.textContent = money(Math.min(ADVANCE_AMOUNT, grandTotal));
    }

    async function loadRooms() {
        roomSelect.innerHTML = '<option value="">Loading rooms...</option>';
        const { data, error } = await supabaseClient
            .from("rooms")
            .select("id, room_name, price, available_rooms, active")
            .eq("active", true)
            .order("id");

        if (error) {
            console.error(error);
            roomSelect.innerHTML = '<option value="">Unable to load rooms</option>';
            updateSummary();
            return;
        }

        rooms = (data || []).filter(room => Number(room.available_rooms) > 0);
        roomSelect.innerHTML = "";

        if (!rooms.length) {
            roomSelect.innerHTML = '<option value="">No rooms currently available</option>';
            updateSummary();
            return;
        }

        rooms.forEach(room => {
            const option = document.createElement("option");
            option.value = room.id;
            option.textContent = `${room.room_name} — ${money(room.price)} / Night`;
            roomSelect.appendChild(option);
        });

        updateSummary();
    }

    function validateDates() {
        const checkinEl = document.getElementById("checkin");
        const checkoutEl = document.getElementById("checkout");
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        checkinEl.min = todayStr;
        checkoutEl.min = todayStr;

        if (checkinEl.value && checkoutEl.value && checkoutEl.value <= checkinEl.value) {
            alert("Check-out date must be after check-in date.");
            return false;
        }
        return true;
    }

    roomSelect.addEventListener("change", updateSummary);
    document.getElementById("checkin").addEventListener("change", () => {
        const checkout = document.getElementById("checkout");
        checkout.min = document.getElementById("checkin").value || checkout.min;
        updateSummary();
    });
    document.getElementById("checkout").addEventListener("change", updateSummary);

    payButton.addEventListener("click", async () => {
        if (!form.reportValidity()) return;
        if (!validateDates() || !selectedRoom) return;

        const grandTotal = Number(grandTotalEl.textContent.replace(/[^0-9]/g, ""));
        const advance = Math.min(ADVANCE_AMOUNT, grandTotal);
        if (advance < 100) {
            alert("The booking amount is too low for online payment.");
            return;
        }

        payButton.disabled = true;
        payButton.textContent = "Preparing Payment...";

        try {
            const response = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Math.round(advance * 100),
                    currency: "INR",
                    receipt: `VVH_${Date.now()}`
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Unable to create payment order");

            const options = {
                key: result.key_id,
                amount: result.amount,
                currency: result.currency,
                name: "Velan View Hotel",
                description: `${selectedRoom.room_name} booking advance`,
                order_id: result.order_id,
                prefill: {
                    name: document.getElementById("name").value,
                    email: document.getElementById("email").value,
                    contact: document.getElementById("phone").value
                },
                theme: { color: "#b8860b" },
                handler: async function (payment) {
                    try {
                        const verifyResponse = await fetch("/api/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payment)
                        });
                        const verification = await verifyResponse.json();
                        if (!verifyResponse.ok || !verification.verified) throw new Error(verification.error || "Payment verification failed");

                        const params = new URLSearchParams({
                            payment_id: verification.payment_id,
                            order_id: verification.order_id,
                            room: selectedRoom.room_name,
                            name: document.getElementById("name").value,
                            checkin: document.getElementById("checkin").value,
                            checkout: document.getElementById("checkout").value
                        });
                        window.location.href = `thankyou.html?${params.toString()}`;
                    } catch (error) {
                        console.error(error);
                        alert("Payment was received, but verification could not be completed. Please contact Velan View with your payment ID.");
                    }
                },
                modal: {
                    ondismiss: () => {
                        payButton.disabled = false;
                        payButton.textContent = "Pay Advance & Book";
                    }
                }
            };

            const razorpay = new Razorpay(options);
            razorpay.on("payment.failed", function (response) {
                console.error(response.error);
                alert(response.error && response.error.description ? response.error.description : "Payment failed. Please try again.");
                payButton.disabled = false;
                payButton.textContent = "Pay Advance & Book";
            });
            razorpay.open();
        } catch (error) {
            console.error(error);
            alert(error.message || "Unable to start payment. Please try again.");
            payButton.disabled = false;
            payButton.textContent = "Pay Advance & Book";
        }
    });

    loadRooms();
})();
