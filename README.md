# Amazon_theme3
API for integrating Amazon MCF with third-party platforms, featuring a hive-structured approach to organize data, enabling efficient inventory synchronization, detailed analytics, and streamlined order management.

# MCF Inventory Sync and Analytics API

This project is a **Node.js-based REST API** that integrates **Multi-Channel Fulfillment (MCF)** with third-party platforms to handle inventory synchronization, customer analytics, and platform authentication. It uses **JSON files** as a mock database to store customer details and inventory data.

---

## Features

1. **Authentication**:
   - Register and authenticate e-commerce platforms.
   - Token-based authentication using JSON Web Tokens (JWT).
2. **Inventory Sync**:
   - Automatically update MCF inventory when an order is delivered or returned.
3. **Analytics**:
   - Get analytics for a specific e-commerce platform.
   - Track delivered and returned products for all categories.
4. **Error Handling**:
   - Logs errors and provides structured error responses for better debugging.

---

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or later)
- A package manager like `npm` or `yarn`

---

## Installation

### Step 1: Clone the repository
```bash
git clone <repository-url>
cd <repository-name>
```
### Step 2: Install dependencies
```bash
npm install
```
### Step 3:  Ensure required JSON files are in the directory
-cus_details.json: Stores customer details.
-mcf_inventory.json: Stores MCF inventory data

### Running the API

#### Step 1: Start the server
```bash
node index.js
```

#### Step 2: If port 8000 is already in use, modify the port in index.js:
```bash
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### API Endpoints

#### Authentication

##### Register a Platform
- **Method**: POST
- **Endpoint**: `/api/auth/register`

**Request Body**:
```json
{
    "ecommerce": "your-platform-name",
    "password": "your-password"
}
```
**Response:**
```json
{
    "success": "Ecommerce registered successfully"
}
```
## Inventory Sync

### Sync Inventory

**Method:** POST  
**Endpoint:** `/api/inventory/sync`

**Headers:**
```json
{
    "Authorization": "Bearer <your-JWT-token>"
}
```

**Request Body:**
``json
{
    "id": 123,
    "status": "delivered" // or "returned"
}
```

** Response:**
```json
{
    "success": "Inventory synchronized successfully",
    "updatedInventory": {
        "product": "product-name",
        "ecommerce": "platform-name",
        "stock": 50
    }
}
```
