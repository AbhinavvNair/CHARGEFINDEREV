// Test API endpoint
fetch('http://localhost:5000/api/stations')
  .then(res => res.json())
  .then(data => {
    console.log(`\n✅ API Response received: ${data.length} stations\n`);
    console.log('📦 Sample station data:\n');
    const sample = data[0];
    console.log(JSON.stringify(sample, null, 2));
    
    console.log('\n🔍 Available fields:');
    console.log(Object.keys(sample).join(', '));
    
    console.log(`\n📊 Response size: ${JSON.stringify(data).length} bytes`);
  })
  .catch(err => console.error('❌ Error:', err.message));
