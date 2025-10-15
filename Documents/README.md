# Smart Building Platform - IAQ Monitoring System

[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-PostgreSQL-orange)](https://www.timescale.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Smart Building Platform is a comprehensive Indoor Air Quality (IAQ) monitoring system built on TimescaleDB. It provides real-time monitoring, analytics, and AI-powered insights for building management and occupant health.

### Key Features

- **Real-time Monitoring**: Live sensor data collection and processing
- **Time-series Optimization**: TimescaleDB for efficient sensor data storage
- **Multi-zone Support**: Monitor multiple zones across different floors
- **Advanced Analytics**: Historical trends, correlations, and insights
- **Alert System**: Automated threshold-based alerting
- **AI Reports**: Automated analysis and recommendations
- **RESTful API**: Complete API for frontend integration
- **Scalable Architecture**: Production-ready with compression and retention policies

## Architecture

### Database Schema

- **15 Tables Total**: 4 Hypertables + 11 Regular Tables
- **Core Tables**: Buildings, Zones, Sensors, Users
- **Time-series Tables**: Sensor Readings, Occupancy Logs, Alerts, Audit Logs
- **Feature Tables**: AI Reports, Chat System, User Sessions, Settings
- **Optimization**: Continuous aggregates, compression, retention policies

### Sensor Types Supported

| Type        | Unit  | Description                      |
| ----------- | ----- | -------------------------------- |
| PM2.5       | μg/m³ | Fine particulate matter          |
| CO2         | ppm   | Carbon dioxide concentration     |
| TVOC        | mg/m³ | Total volatile organic compounds |
| Temperature | °C    | Air temperature                  |
| Humidity    | %     | Relative humidity                |
| Pressure    | hPa   | Atmospheric pressure             |

## Quick Start

### Prerequisites

- Docker 20.0+
- Docker Compose 2.0+
- 4GB RAM (recommended)
- 10GB disk space

### 1. Clone and Setup

```bash
git clone <repository-url>
cd smart-building-platform

# Option 1: Create .env file (recommended)
cp .env.example .env
# Edit .env with your settings

# Option 2: Use defaults from docker-compose.yml
```

### 2. Start the System

```bash
# Start core services only
./start-system.sh start

# Start with development tools (pgAdmin, Redis Insight)
./start-system.sh start dev

# Start everything (including Grafana monitoring)
./start-system.sh start all
```

### 3. Verify Installation

```bash
# Run comprehensive health check
./database-maintenance.sh health

# Run TimescaleDB diagnostics
./diagnose-timescaledb.sh
```

## Service Endpoints

| Service       | Default Port | Access                                                                      |
| ------------- | ------------ | --------------------------------------------------------------------------- |
| TimescaleDB   | 5432         | `postgres://iaq_admin:SecureIAQPass2024!@localhost:5432/smart_building_iaq` |
| Redis         | 6379         | `redis://localhost:6379` (password protected)                               |
| pgAdmin       | 8080         | http://localhost:8080 (admin@smartbuilding.com / admin123)                  |
| Redis Insight | 8001         | http://localhost:8001                                                       |
| Grafana       | 3001         | http://localhost:3001 (admin / admin123)                                    |

## Database Management

### Health Monitoring

```bash
# Comprehensive health check
./database-maintenance.sh health

# Performance analysis
./database-maintenance.sh performance

# System diagnostics
./diagnose-timescaledb.sh
```

### Backup & Restore

```bash
# Create backup
./database-maintenance.sh backup [backup_name]

# List available backups
ls -la database/backups/

# Restore from backup
./database-maintenance.sh restore database/backups/backup_file.sql.gz
```

### Maintenance Operations

```bash
# Run maintenance (statistics, aggregates, cleanup)
./database-maintenance.sh maintenance

# Clean old data (default: 30 days)
./database-maintenance.sh cleanup [days]
```

## API Reference

### Core Endpoints

The database includes optimized views and functions to support the frontend API requirements:

#### Dashboard API

```sql
-- Get complete building dashboard data
SELECT * FROM api_building_dashboard WHERE building_id = $1;

-- Get current alerts
SELECT * FROM api_building_alerts WHERE building_id = $1;
```

#### Zones API

```sql
-- Get zones with filters
SELECT * FROM api_get_zones($building_id, $floor, $search, $status);

-- Get zone comparison data
SELECT * FROM api_get_zone_comparison($building_id);
```

#### Analytics API

```sql
-- Get historical trends
SELECT * FROM api_get_trends($building_id, $period, $sensor_types, $zone_ids);

-- Get occupancy correlation
SELECT * FROM api_get_occupancy_correlation($building_id, $period);
```

#### Zone Details API

```sql
-- Get comprehensive zone details
SELECT * FROM api_get_zone_details($zone_id, $history_period);
```

### Sample Data Structure

```json
{
  "building": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Smart Tech Headquarters",
    "zones": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Main Lobby",
        "floor": 1,
        "readings": [
          {
            "type": "PM2.5",
            "value": 12.5,
            "unit": "μg/m³",
            "status": "good",
            "timestamp": "2024-01-15T10:30:00Z"
          }
        ],
        "occupancy": 25,
        "maxOccupancy": 100
      }
    ],
    "overallAirQuality": "good"
  }
}
```

## Development

### Database Schema Changes

1. **Add migrations** to `database/init-scripts/`
2. **Update API functions** in `database/init-scripts/03-api-support-views.sql`
3. **Test changes** with `./database-maintenance.sh health`

### Custom Functions

The system includes several utility functions:

```sql
-- Get current zone status
SELECT * FROM get_zone_current_status($zone_id);

-- Generate alerts
SELECT generate_alert($sensor_id, $value, $status);

-- Building overview
SELECT get_building_overview($building_id);
```

### Adding New Sensor Types

```sql
INSERT INTO sensor_types (type_name, unit, good_threshold, moderate_threshold, poor_threshold, critical_threshold, description)
VALUES ('NO2', 'ppb', 20.0, 40.0, 100.0, 200.0, 'Nitrogen dioxide');
```

## Monitoring & Alerting

### Alert Thresholds

Alerts are automatically generated when sensor readings exceed thresholds:

- **Good**: Normal operating conditions
- **Moderate**: Attention recommended
- **Poor**: Action required
- **Critical**: Immediate action required

### Continuous Aggregates

Pre-computed aggregates for fast analytics:

- **Hourly**: `sensor_readings_hourly`
- **Daily**: `zone_daily_summary`
- **Weekly**: `building_weekly_performance`

### Data Retention

- **Sensor Readings**: 2 years
- **Occupancy Logs**: 1 year
- **Alerts**: 6 months (resolved), ongoing (unresolved)
- **Audit Logs**: 1 year

## Production Deployment

### Environment Variables

Key production settings in `.env`:

```bash
# Security
POSTGRES_PASSWORD=your-secure-password
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-jwt-secret-32-chars-minimum

# Performance
POSTGRES_MAX_CONNECTIONS=200
REDIS_MAXMEMORY=1gb

# Monitoring
LOG_LEVEL=warn
METRICS_ENABLED=true
```

### Performance Optimization

1. **Compression**: Automatic compression after 7 days
2. **Retention**: Automatic cleanup of old data
3. **Indexing**: Optimized indexes for common queries
4. **Partitioning**: Time-based partitioning for sensor data

### Security Considerations

- Use strong passwords in production
- Enable SSL/TLS for database connections
- Implement proper authentication/authorization
- Regular security updates
- Network isolation with Docker networks

## Troubleshooting

### Common Issues

**Database Connection Failed**

```bash
# Check container status
docker ps | grep smart-building

# Check logs
docker logs smart-building-timescaledb

# Restart services
./start-system.sh restart
```

**TimescaleDB Extension Missing**

```bash
# Run diagnostics
./diagnose-timescaledb.sh

# Check initialization scripts
docker logs smart-building-timescaledb | grep -i timescale
```

**Low Performance**

```bash
# Check database size
./database-maintenance.sh performance

# Run maintenance
./database-maintenance.sh maintenance

# Check for needed compression
docker exec smart-building-timescaledb psql -U iaq_admin -d smart_building_iaq -c "SELECT * FROM timescaledb_information.hypertables;"
```

### System Commands

```bash
# View all containers
docker ps -a

# Check resource usage
docker stats

# View system logs
./start-system.sh logs

# Stop everything
./start-system.sh stop

# Complete restart
./start-system.sh restart all
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Update documentation
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation**: See `/Documents` folder for detailed specs
- **Issues**: Create GitHub issues for bugs/features
- **Discussions**: Use GitHub discussions for questions

## Changelog

### Version 1.0.0

- Complete TimescaleDB schema implementation
- 15 tables with proper relationships
- 4 hypertables for time-series data
- Continuous aggregates and optimization
- Complete API support functions
- Comprehensive management scripts
- Docker containerization
- Production-ready configuration
