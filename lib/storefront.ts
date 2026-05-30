import { BadgeCheck, CalendarRange, HandCoins, MessageSquare, ShieldCheck, Sparkles, UserCog, Wallet } from 'lucide-react'
import type { CartItem } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

export const STORE = {
  name: 'CineVerse',
  shortName: 'CineVerse',
  subBrand: 'Gearkit Online Store',
  tagline: 'Rent production gear from owners across the Philippines — camera, lighting, grip, audio, and more.',
  email: 'hello@cineverse.store',
  location: 'Metro Manila, Philippines',
}

export const FEATURED_CATEGORIES = ['Camera', 'Action Cam', 'Lens', 'Lighting', 'Grip', 'Audio', 'Drone', 'Stabilizer', 'Monitor', 'Power']

// Reservation deposit shown across the UI. Source of truth is DOWNPAYMENT_PCT in cart-store.
export const DOWNPAYMENT_LABEL = '30%'

export const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Verified owners', sub: 'Gear from vetted rental partners' },
  { icon: Wallet, label: 'Secure 30% downpayment', sub: 'Reserve via PayMongo — GCash, Maya, card' },
  { icon: UserCog, label: 'Operators on demand', sub: 'Add a trained operator to any kit' },
  { icon: MessageSquare, label: 'Direct coordination', sub: 'Talk to the owner once you reserve' },
]

export const PRODUCT_HIGHLIGHTS = [
  { icon: CalendarRange, label: 'Flexible duration', value: 'Rent by the day, as long as you need' },
  { icon: UserCog, label: 'Operator option', value: 'Hire someone to run the gear' },
  { icon: BadgeCheck, label: 'Reserve with 30%', value: 'Balance settled with the owner' },
]

// How a rental works — shown on the About page and order/invoice page.
export const RENTAL_FLOW = [
  { key: 'reserved', label: 'Reserved', description: '30% downpayment confirmed by PayMongo.' },
  { key: 'notified', label: 'Owner notified', description: 'The gear owner gets your booking and contact details.' },
  { key: 'coordinate', label: 'Coordinate', description: 'You and the owner align on pickup, handover, and the balance.' },
  { key: 'shoot', label: 'Shoot', description: 'Use the gear (and operator, if booked) on your shoot dates.' },
  { key: 'return', label: 'Return', description: 'Hand the gear back at the end of the rental period.' },
]

const PAYMENT_METHODS = [
  { id: 'paymongo_all', label: 'All methods (recommended)', description: 'Pick GCash, Maya, GrabPay, or card on the secure PayMongo page.' },
  { id: 'gcash', label: 'GCash', description: 'Go straight to GCash e-wallet payment.' },
  { id: 'maya', label: 'Maya', description: 'Go straight to Maya (PayMaya) e-wallet payment.' },
  { id: 'grab_pay', label: 'GrabPay', description: 'Go straight to GrabPay e-wallet payment.' },
  { id: 'card', label: 'Credit / Debit Card', description: 'Pay with Visa or Mastercard on PayMongo secure checkout.' },
] as const

export { PAYMENT_METHODS }

// --- Demo catalog ------------------------------------------------------------
// Comprehensive sample library of production gear from several independent owners
// (CineVerse holds no inventory). Shown until real owner listings are added.

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80`

const O = {
  cinegear: { owner_name: 'Cinegear Manila', owner_email: 'rentals@cinegearmanila.ph', owner_phone: '09171234567' },
  actioncam: { owner_name: 'ActionCam Rentals PH', owner_email: 'book@actioncamph.ph', owner_phone: '09171112233' },
  lensworks: { owner_name: 'LensWorks PH', owner_email: 'hello@lensworks.ph', owner_phone: '09175556677' },
  framemotion: { owner_name: 'FrameMotion', owner_email: 'book@framemotion.ph', owner_phone: '09181234567' },
  liwanag: { owner_name: 'Liwanag Lights', owner_email: 'hello@liwanaglights.ph', owner_phone: '09191234567' },
  griphaus: { owner_name: 'GripHaus PH', owner_email: 'rent@griphaus.ph', owner_phone: '09201234567' },
  soundmnl: { owner_name: 'SoundMNL', owner_email: 'book@soundmnl.ph', owner_phone: '09211234567' },
  skyhigh: { owner_name: 'SkyHigh Aerials', owner_email: 'fly@skyhighaerials.ph', owner_phone: '09181239999' },
  videovillage: { owner_name: 'VideoVillage PH', owner_email: 'hi@videovillage.ph', owner_phone: '09225557788' },
  powergrid: { owner_name: 'PowerGrid Rentals', owner_email: 'hi@powergrid.ph', owner_phone: '09221234567' },
}

const base = { is_active: true, for_rent: true, for_sale: false, created_at: '2026-05-20T00:00:00.000Z' }

// Subset of demo listings that are also available to BUY (retail-ish prices).
const SALE_PRICES: Record<string, number> = {
  'gopro-hero12-black': 24990,
  'gopro-hero11-black': 18990,
  'gopro-max-360-camera': 31990,
  'dji-osmo-action-4': 17990,
  'dji-osmo-pocket-3-creator-combo': 39990,
  'insta360-x4-360-camera': 32990,
  'dji-mic-2-wireless-kit': 18990,
  'amaran-200x-bi-color-led': 22990,
  'aputure-ls-600x-pro-led': 64990,
  'atomos-ninja-v-recorder-monitor': 39990,
  'v-mount-battery-kit-6-charger': 34990,
  'ecoflow-delta-2-power-station': 64990,
  'dji-mini-4-pro': 64990,
  'dji-air-3s': 62990,
}

const RAW_LISTINGS: Product[] = [
  // ---- Cameras ----
  { id: 'sony-fx6', name: 'Sony FX6 Cinema Camera Kit', slug: 'sony-fx6-cinema-camera-kit', description: 'Full-frame 4K cinema camera with dual base ISO and fast AF. Cage, batteries, and media included.', price: 4500, image_url: img('photo-1521405924368-64c5b84bec60'), stock: 3, category: 'Camera', tags: ['camera', 'cinema', 'sony', '4k', 'fullframe'], badge: 'Most booked', operator_available: true, operator_day_rate: 3500, ...O.cinegear, ...base },
  { id: 'sony-fx3', name: 'Sony FX3 Full-Frame Cinema Camera', slug: 'sony-fx3-full-frame-cinema-camera', description: 'Compact full-frame cinema camera, gimbal-friendly, with active cooling and S-Cinetone.', price: 3500, image_url: img('photo-1520870121499-7dddb6ccbcde'), stock: 3, category: 'Camera', tags: ['camera', 'cinema', 'sony', 'compact'], badge: 'Compact', operator_available: true, operator_day_rate: 3000, ...O.cinegear, ...base },
  { id: 'sony-a7siii', name: 'Sony A7S III Mirrorless Kit', slug: 'sony-a7s-iii-mirrorless-kit', description: 'Low-light king for run-and-gun and docu. 4K120, two lenses, and spare batteries.', price: 2800, image_url: img('photo-1521405924368-64c5b84bec60'), stock: 4, category: 'Camera', tags: ['camera', 'mirrorless', 'sony', 'lowlight'], badge: 'Low-light', operator_available: true, operator_day_rate: 2500, ...O.cinegear, ...base },
  { id: 'red-komodo-6k', name: 'RED Komodo 6K Camera Kit', slug: 'red-komodo-6k-camera-kit', description: 'Compact 6K global-shutter cinema camera with REDCODE RAW and RF mount.', price: 6000, image_url: img('photo-1520870121499-7dddb6ccbcde'), stock: 2, category: 'Camera', tags: ['camera', 'cinema', 'red', '6k', 'raw'], badge: 'Premium', operator_available: true, operator_day_rate: 4000, ...O.cinegear, ...base },
  { id: 'red-vraptor-8k', name: 'RED V-Raptor 8K VV Kit', slug: 'red-v-raptor-8k-vv-kit', description: 'Flagship 8K large-format cinema camera with massive dynamic range for high-end production.', price: 14000, image_url: img('photo-1521405924368-64c5b84bec60'), stock: 1, category: 'Camera', tags: ['camera', 'cinema', 'red', '8k', 'flagship'], badge: 'Flagship', operator_available: true, operator_day_rate: 6000, ...O.cinegear, ...base },
  { id: 'canon-c70', name: 'Canon EOS C70 Cinema Camera', slug: 'canon-eos-c70-cinema-camera', description: 'Super 35 RF-mount cinema camera with Dual Gain Output and built-in ND. Great for docu and corporate.', price: 4000, image_url: img('photo-1520870121499-7dddb6ccbcde'), stock: 3, category: 'Camera', tags: ['camera', 'cinema', 'canon', 'super35'], badge: 'Run-and-gun', operator_available: true, operator_day_rate: 3000, ...O.cinegear, ...base },
  { id: 'canon-c300-iii', name: 'Canon EOS C300 Mark III', slug: 'canon-eos-c300-mark-iii', description: 'Broadcast-grade Super 35 cinema camera with Dual Gain Output sensor and Cinema RAW Light.', price: 6500, image_url: img('photo-1521405924368-64c5b84bec60'), stock: 2, category: 'Camera', tags: ['camera', 'cinema', 'canon', 'broadcast'], badge: 'Broadcast', operator_available: true, operator_day_rate: 4000, ...O.cinegear, ...base },
  { id: 'bmpcc-ursa-12k', name: 'Blackmagic URSA Mini Pro 12K', slug: 'blackmagic-ursa-mini-pro-12k', description: '12K Super 35 sensor with BRAW, built-in ND, and PL/EF mounts for ultra-detailed capture.', price: 5500, image_url: img('photo-1520870121499-7dddb6ccbcde'), stock: 2, category: 'Camera', tags: ['camera', 'cinema', 'blackmagic', 'raw', '12k'], badge: 'RAW', operator_available: true, operator_day_rate: 3500, ...O.cinegear, ...base },
  { id: 'arri-alexa-mini-lf', name: 'ARRI ALEXA Mini LF', slug: 'arri-alexa-mini-lf', description: 'Large-format cinema flagship with the legendary ARRI color science. The choice for feature work.', price: 18000, image_url: img('photo-1521405924368-64c5b84bec60'), stock: 1, category: 'Camera', tags: ['camera', 'cinema', 'arri', 'flagship', 'largeformat'], badge: 'Cinema flagship', operator_available: true, operator_day_rate: 8000, ...O.cinegear, ...base },

  // ---- Action cams ----
  { id: 'gopro-hero12', name: 'GoPro HERO12 Black', slug: 'gopro-hero12-black', description: '5.3K60 action cam with HDR, HyperSmooth 6.0 stabilization, and accessory mounts.', price: 800, image_url: img('photo-1508614589041-895b88991e3e'), stock: 6, category: 'Action Cam', tags: ['action', 'gopro', '5k', 'pov', 'add-on'], badge: 'Best seller', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },
  { id: 'gopro-hero11', name: 'GoPro HERO11 Black', slug: 'gopro-hero11-black', description: 'Large 8:7 sensor action cam with 5.3K capture and rock-solid stabilization.', price: 650, image_url: img('photo-1764266022094-57cd1379c07c'), stock: 5, category: 'Action Cam', tags: ['action', 'gopro', '5k', 'pov', 'add-on'], badge: 'Value', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },
  { id: 'gopro-max', name: 'GoPro MAX 360 Camera', slug: 'gopro-max-360-camera', description: '360 capture, reframing, and stitched stabilization for immersive and creative shots.', price: 900, image_url: img('photo-1508614589041-895b88991e3e'), stock: 3, category: 'Action Cam', tags: ['action', 'gopro', '360', 'creative'], badge: '360', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },
  { id: 'dji-osmo-action-4', name: 'DJI Osmo Action 4', slug: 'dji-osmo-action-4', description: '1/1.3" sensor action cam with great low-light, dual touchscreens, and magnetic mounts.', price: 750, image_url: img('photo-1764266022094-57cd1379c07c'), stock: 5, category: 'Action Cam', tags: ['action', 'dji', 'pov', 'add-on'], badge: 'Action', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },
  { id: 'dji-osmo-pocket-3', name: 'DJI Osmo Pocket 3 Creator Combo', slug: 'dji-osmo-pocket-3-creator-combo', description: '1" sensor pocket gimbal camera with 4K120, face tracking, and the creator combo kit.', price: 1100, image_url: img('photo-1508614589041-895b88991e3e'), stock: 4, category: 'Action Cam', tags: ['action', 'dji', 'gimbal', 'vlog', 'creator'], badge: 'Vlog', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },
  { id: 'insta360-x4', name: 'Insta360 X4 360 Camera', slug: 'insta360-x4-360-camera', description: '8K 360 camera with invisible selfie stick effect — perfect for reframed action and BTS.', price: 1000, image_url: img('photo-1764266022094-57cd1379c07c'), stock: 4, category: 'Action Cam', tags: ['action', 'insta360', '360', '8k'], badge: '360', operator_available: false, operator_day_rate: null, ...O.actioncam, ...base },

  // ---- Lenses ----
  { id: 'canon-cn-e-set', name: 'Canon CN-E Prime Lens Set', slug: 'canon-cn-e-prime-lens-set', description: 'Five-lens cinema prime set (24, 35, 50, 85, 135mm) with matched color. EF mount, PL adapter available.', price: 3000, image_url: img('photo-1772144919581-bf9378bda1e0'), stock: 2, category: 'Lens', tags: ['lens', 'prime', 'cinema', 'canon', 'set'], badge: 'Glass', operator_available: false, operator_day_rate: null, ...O.lensworks, ...base },
  { id: 'sony-gm-zoom-trio', name: 'Sony G Master Zoom Trio', slug: 'sony-g-master-zoom-trio', description: 'The holy trinity — 16-35, 24-70, 70-200mm f/2.8 G Master zooms for E-mount bodies.', price: 3500, image_url: img('photo-1772144919581-bf9378bda1e0'), stock: 2, category: 'Lens', tags: ['lens', 'zoom', 'sony', 'set'], badge: 'Zoom set', operator_available: false, operator_day_rate: null, ...O.lensworks, ...base },
  { id: 'sigma-cine-prime-set', name: 'Sigma Cine FF High-Speed Prime Set', slug: 'sigma-cine-ff-high-speed-prime-set', description: 'Full-frame T1.5 cinema prime set with consistent gearing and stunning sharpness.', price: 4500, image_url: img('photo-1772144919581-bf9378bda1e0'), stock: 1, category: 'Lens', tags: ['lens', 'prime', 'cinema', 'sigma', 'set'], badge: 'Cine primes', operator_available: false, operator_day_rate: null, ...O.lensworks, ...base },
  { id: 'dzofilm-vespid-set', name: 'DZOFilm Vespid Prime Set', slug: 'dzofilm-vespid-prime-set', description: 'Affordable full-frame T2.1 cinema primes with a clean, modern look. PL/EF mounts.', price: 2800, image_url: img('photo-1772144919581-bf9378bda1e0'), stock: 2, category: 'Lens', tags: ['lens', 'prime', 'cinema', 'value', 'set'], badge: 'Value primes', operator_available: false, operator_day_rate: null, ...O.lensworks, ...base },

  // ---- Stabilizers / movement ----
  { id: 'dji-ronin-4d', name: 'DJI Ronin 4D 6K Gimbal Camera', slug: 'dji-ronin-4d-6k-gimbal-camera', description: '4-axis stabilized cinema system with LiDAR focus, full-frame sensor, and wireless video.', price: 3500, image_url: img('photo-1744306423919-830b9f4b11e8'), stock: 2, category: 'Stabilizer', tags: ['gimbal', 'movement', 'dji', 'camera'], badge: 'Movement', operator_available: true, operator_day_rate: 3000, ...O.framemotion, ...base },
  { id: 'dji-rs4-pro', name: 'DJI RS 4 Pro Gimbal', slug: 'dji-rs-4-pro-gimbal', description: 'Pro 3-axis gimbal rated for heavy cine setups, with focus motor and image transmission ready.', price: 1200, image_url: img('photo-1744306423919-830b9f4b11e8'), stock: 4, category: 'Stabilizer', tags: ['gimbal', 'movement', 'dji'], badge: 'Gimbal', operator_available: true, operator_day_rate: 2000, ...O.framemotion, ...base },
  { id: 'dji-ronin-2', name: 'DJI Ronin 2 Professional', slug: 'dji-ronin-2-professional', description: 'Heavy-payload gimbal for full cinema rigs — car mounts, cranes, and Steadicam work.', price: 2500, image_url: img('photo-1744306423919-830b9f4b11e8'), stock: 2, category: 'Stabilizer', tags: ['gimbal', 'movement', 'dji', 'heavy'], badge: 'Heavy payload', operator_available: true, operator_day_rate: 3000, ...O.framemotion, ...base },

  // ---- Lighting ----
  { id: 'aputure-600x', name: 'Aputure LS 600x Pro LED', slug: 'aputure-ls-600x-pro-led', description: 'Bi-color 600W point-source LED with Bowens mount and a softbox + stand kit.', price: 1800, image_url: img('photo-1473968512647-3e447244af8f'), stock: 4, category: 'Lighting', tags: ['light', 'led', 'aputure', 'bicolor', 'key'], badge: 'Best seller', operator_available: true, operator_day_rate: 2500, ...O.liwanag, ...base },
  { id: 'aputure-1200d', name: 'Aputure LS 1200d Pro', slug: 'aputure-ls-1200d-pro', description: 'Powerful 1200W daylight LED for big sources, bounce, and night exteriors.', price: 2800, image_url: img('photo-1529611934128-376c7bb1c88a'), stock: 3, category: 'Lighting', tags: ['light', 'led', 'aputure', 'daylight', 'key'], badge: 'Big output', operator_available: true, operator_day_rate: 2500, ...O.liwanag, ...base },
  { id: 'amaran-200x', name: 'Amaran 200x Bi-Color LED', slug: 'amaran-200x-bi-color-led', description: 'Compact, budget-friendly 200W bi-color LED — a great fill or interview light.', price: 900, image_url: img('photo-1473968512647-3e447244af8f'), stock: 6, category: 'Lighting', tags: ['light', 'led', 'amaran', 'bicolor', 'add-on'], badge: 'Budget key', operator_available: false, operator_day_rate: null, ...O.liwanag, ...base },
  { id: 'astera-titan-kit', name: 'Astera Titan Tube Kit (8)', slug: 'astera-titan-tube-kit-8', description: 'Eight wireless RGB+mint LED tubes with case, charger, and CRMX control.', price: 2200, image_url: img('photo-1529611934128-376c7bb1c88a'), stock: 3, category: 'Lighting', tags: ['light', 'rgb', 'tube', 'astera', 'wireless'], badge: 'Color', operator_available: false, operator_day_rate: null, ...O.liwanag, ...base },
  { id: 'quasar-rgbx-set', name: 'Quasar Science RGBX Tube Set (6)', slug: 'quasar-science-rgbx-tube-set-6', description: 'Six linear RGBX LED tubes for practicals, accents, and hidden sources.', price: 1600, image_url: img('photo-1473968512647-3e447244af8f'), stock: 3, category: 'Lighting', tags: ['light', 'rgb', 'tube', 'quasar', 'practical'], badge: 'Practical', operator_available: false, operator_day_rate: null, ...O.liwanag, ...base },

  // ---- Grip ----
  { id: 'cstand-set', name: 'Matthews C-Stand Combo Set (6)', slug: 'matthews-c-stand-combo-set-6', description: 'Six heavy-duty C-stands with grip heads, arms, and sandbags.', price: 900, image_url: img('photo-1509762774605-f07235a08f1f'), stock: 5, category: 'Grip', tags: ['grip', 'cstand', 'support', 'set'], badge: 'Essential', operator_available: false, operator_day_rate: null, ...O.griphaus, ...base },
  { id: 'sachtler-flowtech', name: 'Sachtler Flowtech 75 + Fluid Head', slug: 'sachtler-flowtech-75-fluid-head', description: 'Fast-deploy carbon tripod with a pro fluid head for smooth pans and tilts.', price: 1200, image_url: img('photo-1527977966376-1c8408f9f108'), stock: 4, category: 'Grip', tags: ['grip', 'tripod', 'support', 'fluidhead'], badge: 'Pro support', operator_available: false, operator_day_rate: null, ...O.griphaus, ...base },
  { id: 'dana-dolly-kit', name: 'Dana Dolly Kit + Track', slug: 'dana-dolly-kit-track', description: 'Portable dolly system with rails and risers for smooth slider and tracking moves.', price: 1400, image_url: img('photo-1509762774605-f07235a08f1f'), stock: 2, category: 'Grip', tags: ['grip', 'dolly', 'movement', 'slider'], badge: 'Movement', operator_available: false, operator_day_rate: null, ...O.griphaus, ...base },

  // ---- Audio ----
  { id: 'mkh-416-kit', name: 'Sennheiser MKH-416 Boom Kit', slug: 'sennheiser-mkh-416-boom-kit', description: 'Industry-standard shotgun mic with boom pole, blimp, windshield, and cables.', price: 1200, image_url: img('photo-1541617434114-48c3a51d0ab2'), stock: 3, category: 'Audio', tags: ['audio', 'boom', 'shotgun', 'sennheiser', 'dialogue'], badge: 'Sound', operator_available: true, operator_day_rate: 3000, ...O.soundmnl, ...base },
  { id: 'zoom-f8n-pro', name: 'Zoom F8n Pro Recorder + Lavs', slug: 'zoom-f8n-pro-recorder-lavs', description: '8-channel field recorder with timecode plus three wireless lav sets.', price: 1500, image_url: img('photo-1764266022094-57cd1379c07c'), stock: 2, category: 'Audio', tags: ['audio', 'recorder', 'lav', 'wireless', 'multitrack'], badge: 'Multitrack', operator_available: false, operator_day_rate: null, ...O.soundmnl, ...base },
  { id: 'mixpre-6-ii', name: 'Sound Devices MixPre-6 II', slug: 'sound-devices-mixpre-6-ii', description: 'Pro-grade recorder/mixer with 32-bit float, timecode, and pristine preamps.', price: 1800, image_url: img('photo-1541617434114-48c3a51d0ab2'), stock: 2, category: 'Audio', tags: ['audio', 'recorder', 'mixer', '32bit'], badge: 'Pro recorder', operator_available: true, operator_day_rate: 3000, ...O.soundmnl, ...base },
  { id: 'dji-mic-2', name: 'DJI Mic 2 Wireless Kit', slug: 'dji-mic-2-wireless-kit', description: 'Two-person wireless lav kit with onboard recording and noise cancellation. Run-and-gun ready.', price: 700, image_url: img('photo-1764266022094-57cd1379c07c'), stock: 5, category: 'Audio', tags: ['audio', 'wireless', 'lav', 'dji', 'add-on'], badge: 'Wireless', operator_available: false, operator_day_rate: null, ...O.soundmnl, ...base },

  // ---- Drones ----
  { id: 'dji-inspire-3', name: 'DJI Inspire 3 Cinema Drone', slug: 'dji-inspire-3-cinema-drone', description: 'Full-frame 8K aerial cinema platform with dual operator control. Requires a licensed pilot — add one as operator.', price: 8000, image_url: img('photo-1507582020474-9a35b7d455d9'), stock: 1, category: 'Drone', tags: ['drone', 'aerial', '8k', 'dji', 'cinema'], badge: 'Pilot required', operator_available: true, operator_day_rate: 5000, ...O.skyhigh, ...base },
  { id: 'dji-mavic-3-pro-cine', name: 'DJI Mavic 3 Pro Cine', slug: 'dji-mavic-3-pro-cine', description: 'Triple-camera Hasselblad aerial system with Apple ProRes for compact pro aerials.', price: 3500, image_url: img('photo-1507582020474-9a35b7d455d9'), stock: 2, category: 'Drone', tags: ['drone', 'aerial', 'dji', 'prores'], badge: 'Aerial', operator_available: true, operator_day_rate: 4000, ...O.skyhigh, ...base },
  { id: 'dji-air-3s', name: 'DJI Air 3S', slug: 'dji-air-3s', description: 'Dual-camera prosumer drone with great range and obstacle sensing — versatile B-roll aerials.', price: 2000, image_url: img('photo-1507582020474-9a35b7d455d9'), stock: 3, category: 'Drone', tags: ['drone', 'aerial', 'dji', 'broll'], badge: 'Compact aerial', operator_available: true, operator_day_rate: 3000, ...O.skyhigh, ...base },
  { id: 'dji-avata-2', name: 'DJI Avata 2 FPV Kit', slug: 'dji-avata-2-fpv-kit', description: 'Cinematic FPV drone with goggles and motion controller for dynamic fly-through shots.', price: 1800, image_url: img('photo-1507582020474-9a35b7d455d9'), stock: 2, category: 'Drone', tags: ['drone', 'fpv', 'dji', 'cinematic'], badge: 'FPV', operator_available: true, operator_day_rate: 3500, ...O.skyhigh, ...base },
  { id: 'dji-mini-4-pro', name: 'DJI Mini 4 Pro', slug: 'dji-mini-4-pro', description: 'Sub-250g drone with 4K HDR and omnidirectional sensing — easy permits, big results.', price: 1200, image_url: img('photo-1507582020474-9a35b7d455d9'), stock: 4, category: 'Drone', tags: ['drone', 'aerial', 'dji', 'lightweight'], badge: 'Sub-250g', operator_available: true, operator_day_rate: 2500, ...O.skyhigh, ...base },

  // ---- Monitors / wireless video ----
  { id: 'smallhd-17', name: 'SmallHD 17" Production Monitor', slug: 'smallhd-17-production-monitor', description: 'Bright 17-inch director/client monitor with SDI/HDMI, scopes, and a stand.', price: 1400, image_url: img('photo-1508614589041-895b88991e3e'), stock: 2, category: 'Monitor', tags: ['monitor', 'director', 'sdi', 'video-village', 'add-on'], badge: 'Director', operator_available: false, operator_day_rate: null, ...O.videovillage, ...base },
  { id: 'atomos-ninja-v', name: 'Atomos Ninja V Recorder/Monitor', slug: 'atomos-ninja-v-recorder-monitor', description: '5-inch HDR monitor/recorder for ProRes and RAW over HDMI. On-camera reference and capture.', price: 900, image_url: img('photo-1508614589041-895b88991e3e'), stock: 4, category: 'Monitor', tags: ['monitor', 'recorder', 'prores', 'add-on'], badge: 'ProRes', operator_available: false, operator_day_rate: null, ...O.videovillage, ...base },
  { id: 'teradek-bolt-6-lt', name: 'Teradek Bolt 6 LT Wireless Kit', slug: 'teradek-bolt-6-lt-wireless-kit', description: 'Zero-delay wireless video TX/RX for monitoring on set without cables.', price: 2000, image_url: img('photo-1508614589041-895b88991e3e'), stock: 2, category: 'Monitor', tags: ['monitor', 'wireless', 'teradek', 'video'], badge: 'Wireless video', operator_available: false, operator_day_rate: null, ...O.videovillage, ...base },

  // ---- Power ----
  { id: 'vmount-kit', name: 'V-Mount Battery Kit (6 + charger)', slug: 'v-mount-battery-kit-6-charger', description: 'Six high-capacity V-mount batteries with a dual charger and D-tap cables.', price: 800, image_url: img('photo-1541617434114-48c3a51d0ab2'), stock: 5, category: 'Power', tags: ['power', 'battery', 'vmount', 'add-on'], badge: 'Power', operator_available: false, operator_day_rate: null, ...O.powergrid, ...base },
  { id: 'ecoflow-delta-2', name: 'EcoFlow Delta 2 Power Station', slug: 'ecoflow-delta-2-power-station', description: '1kWh portable power station for location shoots — run lights, chargers, and monitors off-grid.', price: 1200, image_url: img('photo-1508614589041-895b88991e3e'), stock: 3, category: 'Power', tags: ['power', 'station', 'location', 'add-on'], badge: 'Location power', operator_available: false, operator_day_rate: null, ...O.powergrid, ...base },
]

export const DEMO_PRODUCTS: Product[] = RAW_LISTINGS.map((p) =>
  SALE_PRICES[p.slug] ? { ...p, for_sale: true, sale_price: SALE_PRICES[p.slug] } : p
)

export function formatMoney(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export function formatDayRate(value: number) {
  return `${formatMoney(value)}/day`
}

export function getCategoryCount(products: Product[], category: string) {
  return products.filter((product) => product.category === category).length
}

function tagScore(a: string[] | null | undefined, b: string[] | null | undefined) {
  if (!a?.length || !b?.length) return 0
  const bTags = new Set(b)
  return a.reduce((score, tag) => score + (bTags.has(tag) ? 2 : 0), 0)
}

// Smart pairings for a shoot: complementary gear gets a boost (camera → lens/light/grip/audio).
const COMPLEMENTS: Record<string, string[]> = {
  Camera: ['Lens', 'Lighting', 'Grip', 'Audio', 'Power', 'Monitor', 'Stabilizer'],
  'Action Cam': ['Power', 'Grip', 'Audio'],
  Lens: ['Camera', 'Grip'],
  Stabilizer: ['Camera', 'Lens', 'Monitor'],
  Lighting: ['Grip', 'Power'],
  Grip: ['Camera', 'Lighting'],
  Audio: ['Camera'],
  Drone: ['Power', 'Monitor'],
  Monitor: ['Camera', 'Power'],
  Power: ['Lighting', 'Camera', 'Monitor'],
}

function complementScore(base: string | undefined, candidate: string | undefined) {
  if (!base || !candidate) return 0
  return COMPLEMENTS[base]?.includes(candidate) ? 4 : 0
}

export function getProductRecommendations(product: Product, products: Product[], limit = 4) {
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.stock > 0)
    .map((candidate) => ({
      candidate,
      score:
        complementScore(product.category, candidate.category) +
        tagScore(product.tags, candidate.tags) +
        (candidate.badge?.toLowerCase().includes('add') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.candidate.price - b.candidate.price)
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}

export function getCartRecommendations(items: CartItem[], products: Product[], limit = 3) {
  const itemIds = new Set(items.map((item) => item.id))
  const cartTags = items.flatMap((item) => item.tags ?? [])
  const cartCategories = items.map((item) => item.category)

  return products
    .filter((product) => product.stock > 0 && !itemIds.has(product.id))
    .map((product) => ({
      product,
      score:
        cartCategories.reduce((s, c) => s + complementScore(c, product.category), 0) +
        tagScore(cartTags, product.tags) +
        (product.badge?.toLowerCase().includes('add') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, limit)
    .map(({ product }) => product)
}

export const ORDER_STATUS_STEPS = [
  { icon: HandCoins, label: 'Downpayment', sub: 'PayMongo confirms your 30% reservation.' },
  { icon: MessageSquare, label: 'Owner notified', sub: 'The owner receives your booking and contacts.' },
  { icon: CalendarRange, label: 'Coordinate', sub: 'Agree on pickup, handover, and the balance.' },
  { icon: Sparkles, label: 'Shoot', sub: 'Use the gear and operator on your dates.' },
]
