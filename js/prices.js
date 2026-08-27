// Velan View room prices are now loaded from Supabase.
// Fallback values keep the public site usable if the database is temporarily unavailable.
const ROOM_PRICES = {
    deluxeAC: 2500,
    deluxeNonAC: 1400,
    familySuite: 3500
};

const ROOM_PRICE_MAP = {
    "Deluxe AC": "deluxeAC",
    "Deluxe Non AC": "deluxeNonAC",
    "Family Suite": "familySuite"
};

async function loadRoomPricesFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from("rooms")
            .select("id, room_name, price, active")
            .eq("active", true)
            .order("id");

        if (error) throw error;

        data.forEach(room => {
            const key = ROOM_PRICE_MAP[room.room_name];
            if (key) ROOM_PRICES[key] = Number(room.price);
        });

        // Update homepage room cards after the async database read.
        const ids = {
            deluxeAC: "price-deluxe-ac",
            deluxeNonAC: "price-deluxe-nonac",
            familySuite: "price-family-suite"
        };

        Object.entries(ids).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (el && ROOM_PRICES[key] != null) {
                el.textContent = "₹" + ROOM_PRICES[key].toLocaleString("en-IN") + " / Night";
            }
        });

        window.dispatchEvent(new CustomEvent("velanview:prices-loaded", {
            detail: { prices: { ...ROOM_PRICES }, rooms: data }
        }));
    } catch (error) {
        console.error("Unable to load room prices from Supabase. Using fallback prices.", error);
        window.dispatchEvent(new CustomEvent("velanview:prices-loaded", {
            detail: { prices: { ...ROOM_PRICES }, rooms: [] }
        }));
    }
}

if (window.supabase && typeof supabaseClient !== "undefined") {
    loadRoomPricesFromSupabase();
}
