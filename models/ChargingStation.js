const mongoose = require("mongoose");

const ChargingStationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, required: true },
  slots: { type: Number, required: true },
  accessType: { type: String, enum: ["Public", "Private", "Semi-Public"], default: "Public" },
  
  // Location Details
  address: {
    street: { type: String },
    area: { type: String },
    city: { type: String, default: "Jaipur" },
    state: { type: String, default: "Rajasthan" },
    pincode: { type: String }
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  
  // Contact Information
  contact: {
    phone: { type: String },
    email: { type: String },
    operator: { type: String }
  },
  
  // Technical Specifications
  connectorTypes: [
    {
      type: { type: String }, // "Type 2", "CCS", "CHAdeMO", "Bharat AC", "Bharat DC"
      count: { type: Number },
      powerOutput: { type: String } // "7.4kW", "22kW", "50kW", "150kW"
    }
  ],
  chargingSpeed: { type: String, required: true }, // "Fast", "Ultra Fast", "Moderate"
  
  // Pricing
  pricing: {
    perUnit: { type: Number }, // ₹/kWh
    peakRate: { type: Number }, // Peak hours rate
    offPeakRate: { type: Number }, // Off-peak rate
    bookingFee: { type: Number, default: 0 },
    idleFee: { type: Number, default: 0 }, // ₹/minute after full charge
    currency: { type: String, default: "INR" }
  },
  
  // Amenities
  amenities: {
    restroom: { type: Boolean, default: false },
    cafe: { type: Boolean, default: false },
    waitingArea: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    parking: { type: Boolean, default: true },
    coveredParking: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false }
  },
  
  // Payment Methods
  paymentMethods: [{ type: String }], // "Cash", "Card", "UPI", "Wallet", "App"
  
  // Operational Details
  openingHours: { type: String, required: true },
  repairTime: { type: String },
  averageWaitTime: { type: String }, // "5-10 mins", "15-20 mins"
  busiestHours: { type: String }, // "6-9 AM, 6-9 PM"
  specialInstructions: { type: String },
  
  // Media
  photos: [{ type: String }], // Array of image URLs
  
  // Reviews
  reviews: [
    {
      user: { type: String, required: true },
      text: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ChargingStation", ChargingStationSchema);
