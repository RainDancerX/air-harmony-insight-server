const { Pool } = require('pg');

// Database configuration
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'smart_building_iaq',
    user: process.env.DB_USER || 'iaq_admin',
    password: process.env.DB_PASSWORD || 'SecureIAQPass2024!',
  },
};

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function seedRecentData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting fresh data seeding...');

    // Get all active sensors
    const sensors = await client.query(
      'SELECT s.id, st.type_name FROM sensors s JOIN sensor_types st ON s.sensor_type_id = st.id WHERE s.is_active = true'
    );

    console.log(`📊 Found ${sensors.rows.length} active sensors`);

    // Generate data for the last 48 hours (every 10 minutes)
    const now = new Date();
    const readings = [];

    // 48 hours * 6 readings per hour = 288 time points
    for (let i = 0; i < 288; i++) {
      const timestamp = new Date(now.getTime() - i * 10 * 60 * 1000); // 10 minutes intervals

      sensors.rows.forEach((sensor) => {
        const value = generateRealisticValue(sensor.type_name);
        const status = getStatus(sensor.type_name, value);
        readings.push([
          timestamp.toISOString(),
          sensor.id,
          value,
          status,
          value, // raw_value
          100, // quality_score
        ]);
      });
    }

    console.log(`📝 Generated ${readings.length} sensor readings to insert`);

    // Batch insert all readings
    const insertQuery = `
      INSERT INTO sensor_readings (time, sensor_id, value, status, raw_value, quality_score) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    let insertedCount = 0;
    for (const reading of readings) {
      try {
        await client.query(insertQuery, reading);
        insertedCount++;

        // Progress indicator
        if (insertedCount % 100 === 0) {
          console.log(
            `✅ Inserted ${insertedCount}/${readings.length} readings...`
          );
        }
      } catch (error) {
        console.error(`❌ Error inserting reading:`, error.message);
      }
    }

    console.log(
      `🎉 Successfully inserted ${insertedCount} fresh sensor readings!`
    );
    console.log(
      `📅 Data range: ${new Date(
        now.getTime() - 287 * 10 * 60 * 1000
      ).toISOString()} to ${now.toISOString()}`
    );

    // Verify the data was inserted
    const verifyQuery = `
      SELECT COUNT(*) as count, MIN(time) as earliest, MAX(time) as latest 
      FROM sensor_readings 
      WHERE time > NOW() - INTERVAL '48 hours'
    `;
    const verification = await client.query(verifyQuery);
    console.log(`🔍 Verification - Recent readings:`, verification.rows[0]);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

function generateRealisticValue(sensorType) {
  const ranges = {
    'PM2.5': [5, 50], // μg/m³
    CO2: [300, 1200], // ppm
    TVOC: [0.1, 1.5], // mg/m³
    Temperature: [18, 26], // °C
    Humidity: [30, 70], // %
    Pressure: [950, 1050], // hPa
  };

  const [min, max] = ranges[sensorType] || [0, 100];

  // Add some realistic variation and trends
  const baseValue = Math.random() * (max - min) + min;
  const variation = (Math.random() - 0.5) * 0.2 * baseValue; // ±10% variation

  return Math.max(0, Number((baseValue + variation).toFixed(3)));
}

function getStatus(sensorType, value) {
  const thresholds = {
    'PM2.5': { good: 12, moderate: 35.4, poor: 55.4 },
    CO2: { good: 800, moderate: 1000, poor: 1500 },
    TVOC: { good: 0.25, moderate: 0.5, poor: 1.0 },
    Temperature: { good: 22, moderate: 24, poor: 27 },
    Humidity: { good: 40, moderate: 30, poor: 20 },
    Pressure: { good: 1000, moderate: 980, poor: 960 },
  };

  const t = thresholds[sensorType];
  if (!t) return 'good';

  // For humidity, lower values are worse (reverse logic)
  if (sensorType === 'Humidity') {
    if (value >= t.good) return 'good';
    if (value >= t.moderate) return 'moderate';
    if (value >= t.poor) return 'poor';
    return 'critical';
  }

  // For other sensors, higher values are worse
  if (value <= t.good) return 'good';
  if (value <= t.moderate) return 'moderate';
  if (value <= t.poor) return 'poor';
  return 'critical';
}

// Run the seeding function
console.log('🌱 Air Harmony Insight - Fresh Data Seeder');
console.log('==========================================');
seedRecentData().catch(console.error);
