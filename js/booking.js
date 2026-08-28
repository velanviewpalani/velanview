(() => {
  const form = document.getElementById('hotelBooking');
  if (!form || typeof supabaseClient === 'undefined') return;

  const roomSelect = document.getElementById('room');
  const roomPriceEl = document.getElementById('roomPrice');
  const nightsEl = document.getElementById('nights');
  const roomTotalEl = document.getElementById('roomTotal');
  const gstEl = document.getElementById('gst');
  const discountEl = document.getElementById('discount');
  const grandTotalEl = document.getElementById('grandTotal');
  const advanceEl = document.getElementById('advance');
  const payButton = document.getElementById('payNow');
  const GST_RATE = 0.12;
  const money = v => '₹' + Math.round(v).toLocaleString('en-IN');
  let rooms = [];
  let selectedRoom = null;

  function calculateNights() {
    const a = document.getElementById('checkin').value;
    const b = document.getElementById('checkout').value;
    if (!a || !b) return 1;
    const diff = Math.ceil((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
    return diff > 0 ? diff : 1;
  }

  function updateSummary() {
    selectedRoom = rooms.find(r => String(r.id) === String(roomSelect.value)) || null;
    const price = selectedRoom ? Number(selectedRoom.price) : 0;
    const nights = calculateNights();
    const total = price * nights;
    const gst = total * GST_RATE;
    const grand = total + gst;
    roomPriceEl.textContent = money(price);
    nightsEl.textContent = String(nights);
    roomTotalEl.textContent = money(total);
    gstEl.textContent = money(gst);
    discountEl.textContent = money(0);
    grandTotalEl.textContent = money(grand);
    advanceEl.textContent = money(Math.min(1000, grand));
  }

  async function loadRooms() {
    roomSelect.innerHTML = '<option value="">Loading rooms...</option>';
    const { data, error } = await supabaseClient
      .from('rooms')
      .select('id, room_name, price, available_rooms, active')
      .eq('active', true)
      .order('id');
    if (error) {
      console.error(error);
      roomSelect.innerHTML = '<option value="">Unable to load rooms</option>';
      return;
    }
    rooms = (data || []).filter(r => Number(r.available_rooms) > 0);
    roomSelect.innerHTML = rooms.length ? '' : '<option value="">No rooms currently available</option>';
    rooms.forEach(r => {
      const o = document.createElement('option');
      o.value = r.id;
      o.textContent = `${r.room_name} — ${money(Number(r.price))} / Night`;
      roomSelect.appendChild(o);
    });
    updateSummary();
  }

  function validateDates() {
    const ci = document.getElementById('checkin');
    const co = document.getElementById('checkout');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    ci.min = todayStr;
    co.min = ci.value || todayStr;
    if (!ci.value || !co.value || co.value <= ci.value) {
      alert('Please select a valid check-in and check-out date.');
      return false;
    }
    return true;
  }

  roomSelect.addEventListener('change', updateSummary);
  document.getElementById('checkin').addEventListener('change', updateSummary);
  document.getElementById('checkout').addEventListener('change', updateSummary);

  payButton.addEventListener('click', async () => {
    if (!form.reportValidity() || !validateDates() || !selectedRoom) return;
    payButton.disabled = true;
    payButton.textContent = 'Preparing Payment...';
    const payload = {
      room_id: Number(selectedRoom.id),
      check_in: document.getElementById('checkin').value,
      check_out: document.getElementById('checkout').value,
    };
    try {
      const response = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to create payment order');

      const options = {
        key: result.key_id,
        amount: result.amount,
        currency: result.currency,
        name: 'Velan View Hotel',
        description: `${result.room.room_name} booking advance`,
        order_id: result.order_id,
        prefill: {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          contact: document.getElementById('phone').value
        },
        theme: { color: '#b8860b' },
        handler: async payment => {
          try {
            const verificationResponse = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...payment,
                room_id: Number(selectedRoom.id),
                guest_name: document.getElementById('name').value,
                guest_phone: document.getElementById('phone').value,
                guest_email: document.getElementById('email').value,
                check_in: document.getElementById('checkin').value,
                check_out: document.getElementById('checkout').value,
                guests: document.getElementById('guests').value === 'Family' ? 1 : Number(document.getElementById('guests').value)
              })
            });
            const verification = await verificationResponse.json();
            if (!verificationResponse.ok || !verification.verified) throw new Error(verification.error || 'Booking verification failed');
            const params = new URLSearchParams({
              payment_id: verification.payment_id,
              order_id: verification.order_id,
              booking_id: verification.booking_id || '',
              room: verification.room || selectedRoom.room_name,
              name: document.getElementById('name').value,
              checkin: document.getElementById('checkin').value,
              checkout: document.getElementById('checkout').value
            });
            window.location.href = `thankyou.html?${params.toString()}`;
          } catch (e) {
            console.error(e);
            alert(e.message || 'Payment was received, but the booking could not be completed. Please contact Velan View with your payment ID.');
            payButton.disabled = false;
            payButton.textContent = 'Pay Advance & Book';
          }
        },
        modal: { ondismiss: () => { payButton.disabled = false; payButton.textContent = 'Pay Advance & Book'; } }
      };
      const rp = new Razorpay(options);
      rp.on('payment.failed', r => { alert(r.error?.description || 'Payment failed. Please try again.'); payButton.disabled = false; payButton.textContent = 'Pay Advance & Book'; });
      rp.open();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Unable to start payment. Please try again.');
      payButton.disabled = false;
      payButton.textContent = 'Pay Advance & Book';
    }
  });

  loadRooms();
})();
