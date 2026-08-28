const crypto = require('crypto');
const { getSupabaseAdmin } = require('./supabase-admin');

const allowedOrigins = new Set([
  'https://velanview.in',
  'https://www.velanview.in',
  'https://velanview.vercel.app',
]);

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!process.env.RAZORPAY_KEY_SECRET || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Server configuration is missing' });
  }

  try {
    const body = req.body || {};
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
    const { room_id: roomId, guest_name: guestName, guest_phone: guestPhone, guest_email: guestEmail, check_in: checkIn, check_out: checkOut, guests } = body;

    if (!orderId || !paymentId || !signature || !roomId || !guestName || !guestPhone || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, verified: false, error: 'Missing booking or payment details' });
    }

    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    const receivedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const valid = expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    if (!valid) return res.status(400).json({ success: false, verified: false, error: 'Payment signature mismatch' });

    const supabase = getSupabaseAdmin();

    // Idempotency: Razorpay retries/webhooks must not create a second booking.
    const { data: existing } = await supabase
      .from('bookings')
      .select('booking_id, room_name')
      .eq('razorpay_payment_id', paymentId)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ success: true, verified: true, booking_id: existing.booking_id, room: existing.room_name, payment_id: paymentId, order_id: orderId, already_booked: true });
    }

    const { data: result, error: bookingError } = await supabase.rpc('complete_room_booking', {
      p_room_id: Number(roomId),
      p_guest_name: String(guestName).trim(),
      p_guest_phone: String(guestPhone).trim(),
      p_guest_email: guestEmail ? String(guestEmail).trim() : null,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: Number.isInteger(Number(guests)) ? Number(guests) : 1,
      p_payment_id: paymentId,
      p_order_id: orderId,
      p_amount: null,
    });

    if (bookingError) {
      console.error('Booking RPC error:', bookingError);
      return res.status(409).json({ success: false, verified: true, error: bookingError.message || 'Payment verified, but room could not be booked. Please contact Velan View.' });
    }

    const booking = Array.isArray(result) ? result[0] : result;
    return res.status(200).json({
      success: true,
      verified: true,
      booking_id: booking.booking_id,
      room: booking.room_name,
      remaining_rooms: booking.remaining_rooms,
      payment_id: paymentId,
      order_id: orderId,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ success: false, verified: false, error: 'Unable to complete booking' });
  }
};
