# REST Client Usage Guide

## 🚀 Quick Start

### 1. Install REST Client Extension

Install the **REST Client** extension by Huachao Mao in VS Code.

### 2. Open Test Files

- **Full Tests**: `api-tests.http` (comprehensive testing)
- **Quick Tests**: `api-tests-quick.http` (essential endpoints)

### 3. Run Tests

Click the "Send Request" link above each request or use:

- **Ctrl/Cmd + Alt + R**: Send request
- **Ctrl/Cmd + Alt + E**: Send all requests in file

## 📋 Test Files Overview

### `api-tests.http` - Complete Test Suite

**300+ test scenarios covering:**

- ✅ Authentication (all user roles)
- ✅ Buildings API (CRUD operations)
- ✅ Zones API (history, controls, status)
- ✅ Sensor Data (readings, bulk upload)
- ✅ Alerts (management, acknowledgment)
- ✅ Analytics & Reports
- ✅ User Management (admin only)
- ✅ Settings & Configuration
- ✅ Error Scenarios
- ✅ Performance Tests

### `api-tests-quick.http` - Essential Tests

**Quick validation of core functionality:**

- Health check
- Login/logout
- Basic building operations
- Zone access
- Alert listing

## 🔐 Authentication Flow

### Step 1: Login

```http
### Login as Admin
# @name login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@greentech.com",
  "password": "password123"
}
```

### Step 2: Use Token

```http
### Authenticated Request
GET {{baseUrl}}/api/buildings
Authorization: Bearer {{login.response.body.data.token}}
```

## 👥 Test Users

All users have password: **`password123`**

| Email                   | Role    | Permissions               |
| ----------------------- | ------- | ------------------------- |
| `admin@greentech.com`   | admin   | Full access               |
| `manager@greentech.com` | manager | Read/Write (no user mgmt) |
| `viewer@greentech.com`  | viewer  | Read-only                 |

## 🎯 Testing Strategy

### 1. Sequential Testing

Run tests in order:

1. Health check
2. Authentication
3. Core API endpoints
4. Error scenarios

### 2. Role-Based Testing

Test same endpoint with different user roles:

```http
### Admin Access
GET {{baseUrl}}/api/buildings
Authorization: Bearer {{loginAdmin.response.body.data.token}}

### Manager Access
GET {{baseUrl}}/api/buildings
Authorization: Bearer {{loginManager.response.body.data.token}}

### Viewer Access
GET {{baseUrl}}/api/buildings
Authorization: Bearer {{loginViewer.response.body.data.token}}
```

### 3. Error Testing

Validate error handling:

```http
### Missing Auth (Should fail)
GET {{baseUrl}}/api/buildings

### Invalid Token (Should fail)
GET {{baseUrl}}/api/buildings
Authorization: Bearer invalid.token
```

## 📊 Variables & Dynamic Data

### Built-in Variables

- `{{$datetime iso8601}}` - Current timestamp
- `{{$randomString 10}}` - Random string
- `{{$guid}}` - Random GUID

### Response Variables

```http
# @name login
POST {{baseUrl}}/api/auth/login
# ... login request

### Use response in next request
GET {{baseUrl}}/api/auth/me
Authorization: Bearer {{login.response.body.data.token}}
```

### Environment Variables

```http
@baseUrl = http://localhost:3001
@contentType = application/json
```

## 🔧 Troubleshooting

### Common Issues

**1. "Route not found" errors**

- ✅ Check server is running: `npm run dev`
- ✅ Verify URL: `http://localhost:3001`
- ✅ Check endpoint exists in backend

**2. Authentication errors**

- ✅ Login first to get token
- ✅ Check token not expired (24h)
- ✅ Verify Bearer format: `Bearer <token>`

**3. Database connection errors**

- ✅ Check Docker containers: `docker ps`
- ✅ Verify database connection in server logs

**4. CORS errors**

- ✅ Should not occur with same origin
- ✅ Check CORS settings in backend

### Debug Tips

**1. View Response Details**
Click on response to see:

- Status code
- Headers
- Response body
- Response time

**2. Enable Request/Response Logging**
Add to VS Code settings:

```json
{
  "rest-client.enableTelemetry": false,
  "rest-client.showResponseInDifferentTab": true
}
```

**3. Check Server Logs**
Monitor backend server console for errors.

## 🚀 Advanced Usage

### 1. Environment Files

Create `.vscode/settings.json`:

```json
{
  "rest-client.environmentVariables": {
    "development": {
      "baseUrl": "http://localhost:3001",
      "adminEmail": "admin@smarttech.com"
    },
    "production": {
      "baseUrl": "https://api.yourapp.com",
      "adminEmail": "admin@production.com"
    }
  }
}
```

### 2. Custom Headers

```http
### Request with custom headers
GET {{baseUrl}}/api/buildings
Authorization: Bearer {{login.response.body.data.token}}
X-Request-ID: test-{{$guid}}
X-Client-Version: 1.0.0
```

### 3. File Uploads

```http
### Upload file (if endpoint exists)
POST {{baseUrl}}/api/upload
Authorization: Bearer {{login.response.body.data.token}}
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="test.csv"
Content-Type: text/csv

< ./test-data.csv
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

## 📝 Test Results

### Expected Results

**✅ Health Check**: 200 OK

```json
{
  "status": "OK",
  "message": "Air Harmony Insight API is running"
}
```

**✅ Successful Login**: 200 OK

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { ... }
  }
}
```

**✅ Buildings List**: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Smart Tech Headquarters"
    }
  ]
}
```

**❌ Unauthorized**: 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authorization token is required"
  }
}
```

### Performance Benchmarks

- Health check: < 10ms
- Authentication: < 100ms
- Building list: < 200ms
- Zone details: < 500ms

## 📚 Additional Resources

- [REST Client Documentation](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [API Documentation](./Documents/API.md)
- [Backend Repository](./README.md)
