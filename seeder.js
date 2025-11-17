const mongoose = require("mongoose");
const dotenv = require("dotenv");
require("dotenv").config();
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const ChargingStation = require("./models/ChargingStation");

const users = [
  {
    name: "John Doe",
    email: "john@example.com",
    password: "123456", // Hashing needed in real implementation
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "abcdef", // Hashing needed in real implementation
  },
];


const stations = [
  {
    name: "World Trade Park EV Hub",
    status: "Available",
    slots: 8,
    accessType: "Public",
    address: {
      street: "Jawahar Lal Nehru Marg",
      area: "Malviya Nagar",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302017"
    },
    latitude: 26.8518,
    longitude: 75.8029,
    contact: {
      phone: "+91-141-4567890",
      email: "wtpev@example.com",
      operator: "Tata Power"
    },
    connectorTypes: [
      { type: "CCS", count: 4, powerOutput: "60kW" },
      { type: "Type 2", count: 4, powerOutput: "22kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 12,
      peakRate: 15,
      offPeakRate: 9,
      bookingFee: 10,
      idleFee: 5,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["Card", "UPI", "Wallet", "App"],
    openingHours: "24/7",
    repairTime: "N/A",
    averageWaitTime: "5-10 mins",
    busiestHours: "6-9 PM",
    specialInstructions: "Located in basement parking B2. Follow EV charging signs.",
    photos: [],
    reviews: [
      { user: "Rahul K", text: "Excellent location inside mall. Can shop while charging!", rating: 5, createdAt: new Date("2025-10-15") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Jaipur Airport Charging Station",
    status: "Available",
    slots: 6,
    accessType: "Public",
    address: {
      street: "Sanganer Airport",
      area: "Sanganer",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302029"
    },
    latitude: 26.8242,
    longitude: 75.8122,
    contact: {
      phone: "+91-141-2722100",
      email: "airportev@example.com",
      operator: "Statiq"
    },
    connectorTypes: [
      { type: "CCS", count: 3, powerOutput: "50kW" },
      { type: "Type 2", count: 3, powerOutput: "7.4kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 14,
      peakRate: 16,
      offPeakRate: 11,
      bookingFee: 0,
      idleFee: 10,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: false,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["Card", "UPI", "App"],
    openingHours: "24/7",
    repairTime: "N/A",
    averageWaitTime: "10-15 mins",
    busiestHours: "5-7 AM, 8-10 PM",
    specialInstructions: "Located near Terminal 1 parking area. Show booking confirmation at entry.",
    photos: [],
    reviews: [
      { user: "Priya S", text: "Very convenient for airport pickup/drop. Fast charging!", rating: 5, createdAt: new Date("2025-10-20") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Manipal University Charging Hub",
    status: "Available",
    slots: 5,
    accessType: "Semi-Public",
    address: {
      street: "Dehmi Kalan",
      area: "VPO Bhankrota",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "303007"
    },
    latitude: 26.8430,
    longitude: 75.5640,
    contact: {
      phone: "+91-141-3999100",
      email: "evcharging@manipal.edu",
      operator: "ChargeZone"
    },
    connectorTypes: [
      { type: "Type 2", count: 4, powerOutput: "22kW" },
      { type: "Bharat AC", count: 1, powerOutput: "3.3kW" }
    ],
    chargingSpeed: "Moderate",
    pricing: {
      perUnit: 8,
      peakRate: 10,
      offPeakRate: 7,
      bookingFee: 0,
      idleFee: 2,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: false,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["UPI", "Card", "App"],
    openingHours: "6 AM - 10 PM",
    repairTime: "N/A",
    averageWaitTime: "5 mins",
    busiestHours: "8-10 AM, 5-7 PM",
    specialInstructions: "Student discount available. Show ID at payment.",
    photos: [],
    reviews: [
      { user: "Student", text: "Affordable rates for students. Great initiative!", rating: 5, createdAt: new Date("2025-11-01") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "JLN Marg Highway Station",
    status: "Available",
    slots: 10,
    accessType: "Public",
    address: {
      street: "Jawahar Lal Nehru Marg",
      area: "Near Jagatpura Flyover",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302025"
    },
    latitude: 26.8780,
    longitude: 75.7220,
    contact: {
      phone: "+91-141-4001234",
      email: "jlnev@example.com",
      operator: "Fortum"
    },
    connectorTypes: [
      { type: "CCS", count: 6, powerOutput: "150kW" },
      { type: "CHAdeMO", count: 2, powerOutput: "50kW" },
      { type: "Type 2", count: 2, powerOutput: "22kW" }
    ],
    chargingSpeed: "Ultra Fast",
    pricing: {
      perUnit: 15,
      peakRate: 18,
      offPeakRate: 12,
      bookingFee: 20,
      idleFee: 15,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: false
    },
    paymentMethods: ["Card", "UPI", "Wallet", "App", "Cash"],
    openingHours: "24/7",
    repairTime: "N/A",
    averageWaitTime: "0-5 mins",
    busiestHours: "7-9 AM, 7-9 PM",
    specialInstructions: "Highway location - ideal for long distance travelers. Food court available.",
    photos: [],
    reviews: [
      { user: "Amit T", text: "Ultra fast charging! Perfect for highway stops.", rating: 5, createdAt: new Date("2025-11-05") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Pink Square Mall Charger",
    status: "Available",
    slots: 4,
    accessType: "Public",
    address: {
      street: "Govind Marg",
      area: "Raja Park",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302004"
    },
    latitude: 26.9124,
    longitude: 75.7873,
    contact: {
      phone: "+91-141-5123456",
      email: "pinksquareev@example.com",
      operator: "Ather Energy"
    },
    connectorTypes: [
      { type: "Type 2", count: 3, powerOutput: "7.4kW" },
      { type: "Bharat AC", count: 1, powerOutput: "3.3kW" }
    ],
    chargingSpeed: "Moderate",
    pricing: {
      perUnit: 10,
      peakRate: 12,
      offPeakRate: 8,
      bookingFee: 0,
      idleFee: 3,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["UPI", "Card", "Wallet"],
    openingHours: "10 AM - 10 PM",
    repairTime: "N/A",
    averageWaitTime: "10-15 mins",
    busiestHours: "6-9 PM",
    specialInstructions: "Level 2 parking. Free for first 2 hours with mall purchase.",
    photos: [],
    reviews: [
      { user: "Neha M", text: "Convenient mall location. Good for weekend charging.", rating: 4, createdAt: new Date("2025-11-08") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Sindhi Camp Fast Charge",
    status: "Busy",
    slots: 3,
    accessType: "Public",
    address: {
      street: "Station Road",
      area: "Sindhi Camp",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001"
    },
    latitude: 26.9260,
    longitude: 75.7850,
    contact: {
      phone: "+91-141-2370000",
      email: "sindhicamp@example.com",
      operator: "Tata Power"
    },
    connectorTypes: [
      { type: "CCS", count: 2, powerOutput: "30kW" },
      { type: "Bharat DC", count: 1, powerOutput: "15kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 11,
      peakRate: 13,
      offPeakRate: 9,
      bookingFee: 5,
      idleFee: 5,
      currency: "INR"
    },
    amenities: {
      restroom: false,
      cafe: false,
      waitingArea: true,
      wifi: false,
      parking: true,
      coveredParking: false,
      security: false,
      wheelchairAccessible: false
    },
    paymentMethods: ["UPI", "Card", "Cash"],
    openingHours: "6 AM - 11 PM",
    repairTime: "N/A",
    averageWaitTime: "15-25 mins",
    busiestHours: "8-10 AM, 6-8 PM",
    specialInstructions: "High traffic area. Book in advance during peak hours.",
    photos: [],
    reviews: [
      { user: "Vikram R", text: "Always crowded but reliable. Could use more slots.", rating: 3, createdAt: new Date("2025-11-10") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Vaishali Nagar Charging Point",
    status: "Available",
    slots: 5,
    accessType: "Public",
    address: {
      street: "Main Gopalpura Road",
      area: "Vaishali Nagar",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302021"
    },
    latitude: 26.8949,
    longitude: 75.7441,
    contact: {
      phone: "+91-141-4112233",
      email: "vaishalicharge@example.com",
      operator: "ChargeZone"
    },
    connectorTypes: [
      { type: "Type 2", count: 4, powerOutput: "22kW" },
      { type: "CCS", count: 1, powerOutput: "50kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 9,
      peakRate: 11,
      offPeakRate: 8,
      bookingFee: 0,
      idleFee: 4,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: false,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: false,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["UPI", "Card", "App"],
    openingHours: "24/7",
    repairTime: "N/A",
    averageWaitTime: "5-8 mins",
    busiestHours: "7-9 PM",
    specialInstructions: "Residential area charging hub. Quiet and safe.",
    photos: [],
    reviews: [
      { user: "Local Resident", text: "Great for neighborhood charging. Well maintained.", rating: 5, createdAt: new Date("2025-11-12") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Ajmer Road Service Center",
    status: "Available",
    slots: 7,
    accessType: "Public",
    address: {
      street: "Ajmer Road",
      area: "Near Sodala",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302006"
    },
    latitude: 26.9320,
    longitude: 75.7950,
    contact: {
      phone: "+91-141-2721000",
      email: "ajmerroad@example.com",
      operator: "Statiq"
    },
    connectorTypes: [
      { type: "CCS", count: 4, powerOutput: "60kW" },
      { type: "Type 2", count: 3, powerOutput: "22kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 13,
      peakRate: 15,
      offPeakRate: 10,
      bookingFee: 10,
      idleFee: 8,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: false,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: false
    },
    paymentMethods: ["Card", "UPI", "App"],
    openingHours: "6 AM - 11 PM",
    repairTime: "N/A",
    averageWaitTime: "8-12 mins",
    busiestHours: "7-9 AM, 6-8 PM",
    specialInstructions: "Service center with car wash available. EV maintenance services.",
    photos: [],
    reviews: [
      { user: "Sandeep P", text: "Good service center combo. Can get car checked while charging.", rating: 4, createdAt: new Date("2025-11-13") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "C-Scheme Business Hub",
    status: "Available",
    slots: 4,
    accessType: "Semi-Public",
    address: {
      street: "Sawai Ram Singh Road",
      area: "C-Scheme",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001"
    },
    latitude: 26.9089,
    longitude: 75.7881,
    contact: {
      phone: "+91-141-2360101",
      email: "cscheme@example.com",
      operator: "Ather Energy"
    },
    connectorTypes: [
      { type: "Type 2", count: 4, powerOutput: "7.4kW" }
    ],
    chargingSpeed: "Moderate",
    pricing: {
      perUnit: 10,
      peakRate: 12,
      offPeakRate: 9,
      bookingFee: 0,
      idleFee: 5,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["UPI", "Card", "Wallet", "App"],
    openingHours: "7 AM - 9 PM",
    repairTime: "N/A",
    averageWaitTime: "10 mins",
    busiestHours: "9 AM - 12 PM, 5-7 PM",
    specialInstructions: "Business district location. Ideal for working professionals.",
    photos: [],
    reviews: [
      { user: "Business User", text: "Perfect for office goers. Charge while at work!", rating: 5, createdAt: new Date("2025-11-14") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Mansarovar Metro Station Charger",
    status: "Available",
    slots: 6,
    accessType: "Public",
    address: {
      street: "Mansarovar Metro Station",
      area: "Mansarovar",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302020"
    },
    latitude: 26.8623,
    longitude: 75.7547,
    contact: {
      phone: "+91-141-2988000",
      email: "mansarovar@example.com",
      operator: "Fortum"
    },
    connectorTypes: [
      { type: "CCS", count: 3, powerOutput: "50kW" },
      { type: "Type 2", count: 3, powerOutput: "22kW" }
    ],
    chargingSpeed: "Fast",
    pricing: {
      perUnit: 11,
      peakRate: 13,
      offPeakRate: 9,
      bookingFee: 5,
      idleFee: 6,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: false,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: false,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["Card", "UPI", "App"],
    openingHours: "5 AM - 12 AM",
    repairTime: "N/A",
    averageWaitTime: "5-10 mins",
    busiestHours: "7-9 AM, 6-8 PM",
    specialInstructions: "Metro commuter parking area. Easy access from station.",
    photos: [],
    reviews: [
      { user: "Metro User", text: "Convenient for daily commuters. Well located!", rating: 4, createdAt: new Date("2025-11-15") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Tonk Road Express Charging",
    status: "Available",
    slots: 8,
    accessType: "Public",
    address: {
      street: "Tonk Road",
      area: "Near Sitapura",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302022"
    },
    latitude: 26.8173,
    longitude: 75.8088,
    contact: {
      phone: "+91-141-2770900",
      email: "tonkroad@example.com",
      operator: "Tata Power"
    },
    connectorTypes: [
      { type: "CCS", count: 5, powerOutput: "120kW" },
      { type: "Type 2", count: 3, powerOutput: "22kW" }
    ],
    chargingSpeed: "Ultra Fast",
    pricing: {
      perUnit: 14,
      peakRate: 17,
      offPeakRate: 11,
      bookingFee: 15,
      idleFee: 10,
      currency: "INR"
    },
    amenities: {
      restroom: true,
      cafe: true,
      waitingArea: true,
      wifi: true,
      parking: true,
      coveredParking: true,
      security: true,
      wheelchairAccessible: true
    },
    paymentMethods: ["Card", "UPI", "Wallet", "App", "Cash"],
    openingHours: "24/7",
    repairTime: "N/A",
    averageWaitTime: "0-5 mins",
    busiestHours: "8-10 AM, 7-9 PM",
    specialInstructions: "Industrial area hub. Large vehicle parking available.",
    photos: [],
    reviews: [
      { user: "Fleet Owner", text: "Great for commercial vehicles. Fast and reliable!", rating: 5, createdAt: new Date("2025-11-16") }
    ],
    lastUpdated: new Date()
  },
  {
    name: "Bani Park Eco Charge",
    status: "Available",
    slots: 3,
    accessType: "Private",
    address: {
      street: "Motilal Nehru Road",
      area: "Bani Park",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302016"
    },
    latitude: 26.9196,
    longitude: 75.7869,
    contact: {
      phone: "+91-141-2201122",
      email: "banipark@example.com",
      operator: "Green Charge"
    },
    connectorTypes: [
      { type: "Type 2", count: 2, powerOutput: "7.4kW" },
      { type: "Bharat AC", count: 1, powerOutput: "3.3kW" }
    ],
    chargingSpeed: "Moderate",
    pricing: {
      perUnit: 8,
      peakRate: 10,
      offPeakRate: 7,
      bookingFee: 0,
      idleFee: 2,
      currency: "INR"
    },
    amenities: {
      restroom: false,
      cafe: false,
      waitingArea: true,
      wifi: false,
      parking: true,
      coveredParking: false,
      security: false,
      wheelchairAccessible: false
    },
    paymentMethods: ["UPI", "Cash"],
    openingHours: "7 AM - 10 PM",
    repairTime: "N/A",
    averageWaitTime: "12-15 mins",
    busiestHours: "6-8 PM",
    specialInstructions: "Eco-friendly solar powered charging. Green energy initiative.",
    photos: [],
    reviews: [
      { user: "Eco Warrior", text: "Love the solar power setup. Great for environment!", rating: 5, createdAt: new Date("2025-11-17") }
    ],
    lastUpdated: new Date()
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    await ChargingStation.deleteMany(); // Clear existing data
    await ChargingStation.insertMany(stations);
    await User.deleteMany();
    await User.insertMany(users);
    console.log("✅ Data inserted successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error inserting data:", error);
    process.exit(1);
  }
};

seedDatabase();
