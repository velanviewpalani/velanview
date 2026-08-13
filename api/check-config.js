module.exports = function handler(req, res) {
    return res.status(200).json({
        key_id_exists: Boolean(process.env.RAZORPAY_KEY_ID),
        key_secret_exists: Boolean(process.env.RAZORPAY_KEY_SECRET),
        key_id_prefix: process.env.RAZORPAY_KEY_ID
            ? process.env.RAZORPAY_KEY_ID.substring(0, 8)
            : null
    });
};
