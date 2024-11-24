const express=require('express');
const fs=require('fs');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const path = require('path'); 
const cusDetails = require('./cus_details.json'); // Customer details
const mcfInventory = require('./mcf_inventory.json'); // MCF inventory
const ecommerceFilePath = path.join(__dirname, './cus_details.json');
const inventoryFilePath = path.join(__dirname, './mcf_inventory.json');
let mockEcommerce = []; // In-memory data for registered ecommerce sites

const app=express();
const PORT=8000;

const SECRET_KEY = 'admin'; 

app.use(morgan('combined'));
app.use(express.urlencoded({extended:false}));
app.use(express.json());

app.use((err, req, res, next) => { // for error handling
  console.error(`Error: ${err.message}`);
  res.status(500).send({ error: "Something went wrong!" });
});
let mockUsers = [
  { id: 1, username: 'testuser', password: '$2a$10$2zYPuOG.IQAK64lwEuM9I.SmY8yzW4v/Np0XYauuZNnXJl7gddTOG' } // password is 'password123'
];


// Register ecommerce
app.post('/api/auth/register', async (req, res) => {
  const { ecommerce, password } = req.body;

  if (!ecommerce || !password) {
    return res.status(400).json({ error: 'Ecommerce name and password are required' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Add new ecommerce to the mockEcommerce array
  const newEcommerce = { id: mockEcommerce.length + 1, ecommerce, password: hashedPassword };
  mockEcommerce.push(newEcommerce);

  res.status(201).json({ success: 'Ecommerce registered successfully' });
});

// Login ecommerce
app.post('/api/auth/login', async (req, res) => {
  const { ecommerce, password } = req.body;

  const site = mockEcommerce.find(e => e.ecommerce === ecommerce);

  if (!site) {
    return res.status(404).json({ error: 'Ecommerce not found' });
  }

  const isMatch = await bcrypt.compare(password, site.password);

  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: site.id, ecommerce: site.ecommerce }, SECRET_KEY, { expiresIn: '1h' });

  res.json({ success: 'Login successful', token });
});

// Middleware to verify JWT token
const authenticateEcommerce = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, SECRET_KEY, (err, ecommerce) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.ecommerce = ecommerce;
    next();
  });
};

app.get("/api/user",(req,res)=>{

    return res.json(users);
});

app.get("/users", (req, res) => {
    const html = `
       <ul>
          ${users.map((user) => `<li>${user.first_name}</li>`).join("")}
       </ul>
    `;
    res.send(html);
 });

 app.post('/api/ecommerce/verify', authenticateEcommerce, (req, res) => {
  const { ecommerce } = req.ecommerce;

  const isRegistered = mcfInventory.some(entry => entry.ecommerce === ecommerce);

  if (!isRegistered) {
    return res.status(404).json({ error: 'Ecommerce not registered with MCF' });
  }

  res.json({ success: 'Ecommerce is a verified customer of MCF' });
});

app.get('/api/inventory', authenticateEcommerce, (req, res) => {
  const inventory = JSON.parse(fs.readFileSync('./mcf_inventory.json'));
  res.json(inventory);
});

// Inventory Sync
app.post('/api/inventory/sync', authenticateEcommerce, (req, res) => {
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: 'Customer ID and status are required' });
  }

  if (!['delivered', 'returned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use "delivered" or "returned"' });
  }

  // Load customer details and inventory
  const customers = JSON.parse(fs.readFileSync('./cus_details.json', 'utf-8'));
  const inventory = JSON.parse(fs.readFileSync('./mcf_inventory.json', 'utf-8'));

  // Find the customer entry
  const customerIndex = customers.findIndex(c => c.id === id);
  if (customerIndex === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const customer = customers[customerIndex];
  const { product, ecommerce, quantity } = customer;

  // Find the corresponding inventory entry
  const inventoryItem = inventory.find(item => item.product === product && item.ecommerce === ecommerce);

  if (!inventoryItem) {
    return res.status(404).json({ error: 'Matching inventory item not found' });
  }

  // Update stock based on status
  if (status === 'delivered') {
    if (inventoryItem.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock to complete delivery' });
    }
    inventoryItem.stock -= quantity;
  } else if (status === 'returned') {
    inventoryItem.stock += quantity;
  }

  // Update the customer status
  customers[customerIndex].status = status;

  // Save the updated inventory back to file
  fs.writeFile('./mcf_inventory.json', JSON.stringify(inventory, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update inventory' });
    }

    // Save the updated customer data back to file
    fs.writeFile('./cus_details.json', JSON.stringify(customers, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update customer data' });
      }

      res.json({
        success: 'Inventory and customer data synchronized successfully',
        updatedInventory: inventoryItem,
        updatedCustomer: customers[customerIndex],
      });
    });
  });
});

//Analytics

app.get('/api/analytics', authenticateEcommerce, (req, res) => {
  // Load customer details and inventory data
  const customers = JSON.parse(fs.readFileSync('./cus_details.json', 'utf-8'));
  const inventory = JSON.parse(fs.readFileSync('./mcf_inventory.json', 'utf-8'));

  // 1. Top Products in Demand
  const demandSummary = customers.reduce((acc, { product, quantity }) => {
    acc[product] = (acc[product] || 0) + quantity;
    return acc;
  }, {});

  const topProducts = Object.entries(demandSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([product, totalQuantity]) => ({ product, totalQuantity }));

  // 2. Low Stock Alerts
  const lowStock = inventory.filter(item => item.stock < 10);

  // 3. Ecommerce Platform Performance
  const platformSummary = customers.reduce((acc, { ecommerce, quantity }) => {
    acc[ecommerce] = (acc[ecommerce] || 0) + quantity;
    return acc;
  }, {});

  const platformPerformance = Object.entries(platformSummary).map(([platform, totalQuantity]) => ({
    platform,
    totalQuantity,
  }));

  // Respond with analytics data
  res.json({
    topProducts,
    lowStock,
    platformPerformance,
  });
});

app.get('/api/analytics/:ecommerce', authenticateEcommerce, (req, res) => {
  const { ecommerce: requestedEcommerce } = req.params;

  // Load customer details
  const customers = JSON.parse(fs.readFileSync('./cus_details.json', 'utf-8'));

  // Filter the data for the requested ecommerce platform
  const ecommerceCustomers = customers.filter(c => c.ecommerce === requestedEcommerce);

  if (ecommerceCustomers.length === 0) {
    return res.status(404).json({ error: `No data found for ecommerce: ${requestedEcommerce}` });
  }

  // Calculate the analytics
  const analytics = ecommerceCustomers.reduce((acc, customer) => {
    const { product, quantity, status } = customer;

    // Initialize analytics for each product
    if (!acc[product]) {
      acc[product] = { delivered: 0, returned: 0 };
    }

    // Update the analytics based on the status
    if (status === 'delivered') {
      acc[product].delivered += quantity;
    } else if (status === 'returned') {
      acc[product].returned += quantity;
    }

    return acc;
  }, {});

  res.json({
    success: `Analytics fetched successfully for ecommerce: ${requestedEcommerce}`,
    analytics,
  });
});


app.listen(PORT,()=>console.log(`Server started at PORT: ${PORT}`));    