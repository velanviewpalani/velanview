const Razorpay = require('razorpay');
const { getSupabaseAdmin } = require('./supabase-admin');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: 'Server configuration is missing' });
  }

  try {
    const { room_id: roomId, check_in: checkIn, check_out: checkOut } = req.body || {};
    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, error: 'Room and stay dates are required' });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
    }

    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);
    const nights = Math.ceil((end - start) / 86400000);
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) {
      return res.status(400).json({ success: false, error: 'Invalid stay dates' });
    }

    const supabase = getSupabaseAdmin();
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, room_name, price, available_rooms, active')
      .eq('id', roomId)
      .eq('active', true)
      .single();

    if (roomError || !room) return res.status(400).json({ success: false, error: 'Room is not available' });
    if (Number(room.available_rooms) < 1) return res.status(409).json({ success: false, error: 'This room is currently sold out' });

    const roomTotal = Number(room.price) * nights;
    const gst = roomTotal * 0.12;
    const grandTotal = roomTotal + gst;
    const advance = Math.min(1000, grandTotal);
    const amountPaise = Math.round(advance * 100);

    const receipt = `VVH_${Date.now()}_${room.id}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: { room_id: String(room.id), check_in: checkIn, check_out: checkOut },
    });

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      room: { id: room.id, room_name: room.room_name, price: Number(room.price) },
      nights,
      room_total: roomTotal,
      gst,
      grand_total: grandTotal,
      advance,
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return res.status(500).json({ success: false, error: 'Unable to create Razorpay order' });
  }
};
