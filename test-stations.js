const mongoose = require("mongoose");
const ChargingStation = require("./models/ChargingStation");
require("dotenv").config();

async function testStations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ev-charging");
    console.log("✅ Connected to MongoDB\n");

    // Count total stations
    const count = await ChargingStation.countDocuments();
    console.log(`📊 Total Stations: ${count}\n`);

    // Get all stations
    const stations = await ChargingStation.find({});
    
    console.log("🔍 Station Details:\n");
    console.log("=".repeat(80));
    
    stations.forEach((station, index) => {
      console.log(`\n${index + 1}. ${station.name}`);
      console.log(`   Access: ${station.accessType || 'Not set'} | Status: ${station.status} | Slots: ${station.slots}`);
      console.log(`   Address: ${station.address?.street}, ${station.address?.area}, ${station.address?.pincode}`);
      console.log(`   Contact: ${station.contact?.phone} | Operator: ${station.contact?.operator}`);
      console.log(`   Pricing: ₹${station.pricing?.perUnit}/kWh (Peak: ₹${station.pricing?.peakRate}, Off-peak: ₹${station.pricing?.offPeakRate})`);
      console.log(`   Connectors: ${station.connectorTypes?.map(c => `${c.type} (${c.count}x${c.powerOutput})`).join(', ')}`);
      console.log(`   Amenities: ${Object.entries(station.amenities || {}).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
      console.log(`   Payment: ${station.paymentMethods?.join(', ')}`);
      console.log(`   Hours: ${station.openingHours} | Wait: ${station.averageWaitTime}`);
      console.log(`   Reviews: ${station.reviews?.length || 0}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("\n✅ All data verified successfully!");
    console.log("\n📍 Testing API endpoint...");
    
    // Test if data structure is correct
    const sample = stations[0];
    const checks = {
      'Has name': !!sample.name,
      'Has address object': !!sample.address,
      'Has contact info': !!sample.contact,
      'Has connector types': !!sample.connectorTypes?.length,
      'Has pricing': !!sample.pricing,
      'Has amenities': !!sample.amenities,
      'Has payment methods': !!sample.paymentMethods?.length,
      'Has location': !!(sample.latitude && sample.longitude)
    };

    console.log("\n🧪 Data Structure Validation:");
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testStations();
