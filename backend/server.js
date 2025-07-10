const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const { OAuth2Client } = require('google-auth-library')
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5005

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://trafficking.barkleydatacloud.com' // You can hardcode it as a fallback
];

const corsOptions = {
  origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
          const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
      }
      return callback(null, true);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable preflight requests for all routes
app.options('*', cors(corsOptions));

// Then use the CORS middleware for all other requests
app.use(cors(corsOptions));

// Original middleware continues below...
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Database connection for PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack)
  } else {
    console.log('Connected to database successfully')
    release()
  }
})

// Google OAuth client
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
})

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const authToken = authHeader && authHeader.split(' ')[1]

  if (!authToken) {
    return res.status(401).json({ message: 'Access token required' })
  }

  jwt.verify(authToken, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

// AdOps Authorization Middleware
const authorizeAdOps = (req, res, next) => {
  if (req.user && req.user.role === 'adops') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }
};

const MONGO_URI = process.env.MONGO_URI;
let mongoClient;
let mongoDb; // This will hold the db instance

async function connectToMongo() {
  if (mongoDb) {
    try {
      if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected()) {
        return mongoDb;
      }
    } catch (e) {
      console.warn("Error checking MongoDB connection status, will try to reconnect:", e.message);
    }
  }

  if (!MONGO_URI) {
    console.error('MONGO_URI is not defined in your environment variables.');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();

    const dbNameFromUri = mongoClient.options?.dbName;

    if (!dbNameFromUri && !process.env.MONGO_DB_NAME_FALLBACK) {
        console.error("MongoDB database name not found in MONGO_URI and MONGO_DB_NAME_FALLBACK is not set.");
        await mongoClient.close();
        process.exit(1);
    }

    mongoDb = mongoClient.db(dbNameFromUri || process.env.MONGO_DB_NAME_FALLBACK);
    console.log(`Connected to MongoDB successfully. Database: ${mongoDb.databaseName}`);
    return mongoDb;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    if (mongoClient) {
        try { await mongoClient.close(); } catch (e) { console.error("Error closing mongoClient after connection failure:", e); }
    }
    process.exit(1);
  }
}

connectToMongo().catch(err => {
    console.error("MongoDB initial connection failed on startup:", err);
});

// Utility functions
const generateId = () => {
  return require('crypto').randomUUID()
}

// Helper function for PostgreSQL queries
const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'connected' 
  })
})

// GOOGLE OAUTH ROUTES
app.get('/api/auth/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const authorizationUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
    })

    res.json({ url: authorizationUrl })
  } catch (error) {
    console.error('Google OAuth URL generation error:', error)
    res.status(500).json({ message: 'Failed to generate OAuth URL' })
  }
})

app.post('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' })
    }

    const { tokens } = await googleClient.getToken(code)
    googleClient.setCredentials(tokens)

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const googleId = payload.sub
    const email = payload.email
    const firstName = payload.given_name
    const lastName = payload.family_name
    const avatarUrl = payload.picture

    const existingUsers = await query(
      'SELECT * FROM wb_users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    )

    let user

    if (existingUsers.rows.length > 0) {
      user = existingUsers.rows[0]
      const updateResult = await query(`
        UPDATE wb_users 
        SET google_id = $1, email = $2, first_name = $3, last_name = $4, avatar_url = $5
        WHERE id = $6
        RETURNING *
      `, [googleId, email, firstName, lastName, avatarUrl, user.id])
      user = updateResult.rows[0]
    } else {
      const userId = generateId()
      const createResult = await query(`
        INSERT INTO wb_users (id, email, first_name, last_name, google_id, avatar_url, role)
        VALUES ($1, $2, $3, $4, $5, $6, 'buyer')
        RETURNING *
      `, [userId, email, firstName, lastName, googleId, avatarUrl])
      user = createResult.rows[0]
    }

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url
      }
    })

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    res.status(500).json({ message: 'OAuth authentication failed' })
  }
})

// REGULAR AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    const result = await query('SELECT * FROM wb_users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const user = result.rows[0]
    if (!user.password_hash) {
      return res.status(401).json({ message: 'Please sign in with Google' })
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const authToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.json({
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ===================================
// CLIENT ROUTES - with authorization
// ===================================
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM wb_clients 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/clients', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { name, placement_name_template, utm_structure, cm360_instance_id } = req.body
    if (!name) {
      return res.status(400).json({ message: 'Client name is required' })
    }
    const id = generateId()
    const now = new Date()
    const result = await query(`
      INSERT INTO wb_clients (id, name, placement_name_template, utm_structure, cm360_instance_id, dt_created, created_by, dt_updated, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, name, 
        typeof placement_name_template === 'object' ? JSON.stringify(placement_name_template) : placement_name_template,
        typeof utm_structure === 'object' ? JSON.stringify(utm_structure) : utm_structure, 
        cm360_instance_id, now, req.user.userId, now, req.user.userId])
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.put('/api/clients/:clientId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { clientId } = req.params
    const { name, placement_name_template, utm_structure, cm360_instance_id } = req.body
    if (!name) return res.status(400).json({ message: 'Client name is required' })
    const now = new Date()
    const result = await query(`
      UPDATE wb_clients 
      SET name = $1, placement_name_template = $2, utm_structure = $3, cm360_instance_id = $4, dt_updated = $5, updated_by = $6
      WHERE id = $7
      RETURNING *
    `, [name, 
        typeof placement_name_template === 'object' ? JSON.stringify(placement_name_template) : placement_name_template,
        typeof utm_structure === 'object' ? JSON.stringify(utm_structure) : utm_structure,
        cm360_instance_id, now, req.user.userId, clientId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.delete('/api/clients/:clientId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { clientId } = req.params
    const campaignCheck = await query('SELECT COUNT(*) as count FROM wb_campaigns WHERE client_id = $1', [clientId])
    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete client with existing campaigns.' })
    }
    const result = await query(`
      DELETE FROM wb_clients 
      WHERE id = $1
      RETURNING *
    `, [clientId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }
    res.json({ message: 'Client deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ===================================
// CAMPAIGN ROUTES - with authorization
// ===================================
app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const { client_id } = req.query
    if (!client_id) return res.status(400).json({ message: 'client_id is required' })
    const result = await query(`
      SELECT c.*, cl.name as client_name 
      FROM wb_campaigns c
      JOIN wb_clients cl ON c.client_id = cl.id
      WHERE c.client_id = $1
      ORDER BY c.name
    `, [client_id])
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.post('/api/campaigns', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { client_id, name, start_date, end_date, status = 'active' } = req.body
    if (!client_id || !name) return res.status(400).json({ message: 'client_id and name are required' })
    const id = generateId()
    const now = new Date()
    const result = await query(`
      INSERT INTO wb_campaigns (id, client_id, name, start_date, end_date, status, owner, dt_created, created_by, dt_updated, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [id, client_id, name, start_date, end_date, status, req.user.userId, now, req.user.userId, now, req.user.userId])
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.put('/api/campaigns/:campaignId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { campaignId } = req.params
    const { client_id, name, start_date, end_date, status } = req.body
    if (!client_id || !name) return res.status(400).json({ message: 'client_id and name are required' })
    const now = new Date()
    const result = await query(`
      UPDATE wb_campaigns 
      SET client_id = $1, name = $2, start_date = $3, end_date = $4, status = $5, dt_updated = $6, updated_by = $7
      WHERE id = $8
      RETURNING *
    `, [client_id, name, start_date, end_date, status, now, req.user.userId, campaignId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.delete('/api/campaigns/:campaignId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { campaignId } = req.params
    const placementCheck = await query('SELECT COUNT(*) as count FROM wb_placements WHERE campaign_id = $1', [campaignId])
    if (parseInt(placementCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete campaign with existing placements.' })
    }
    const result = await query(`
      DELETE FROM wb_campaigns 
      WHERE id = $1
      RETURNING *
    `, [campaignId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' })
    }
    res.json({ message: 'Campaign deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// PLACEMENT ROUTES
app.get('/api/placements', authenticateToken, async (req, res) => {
  try {
    const { client_id, campaign_id, search } = req.query;
    let queryText = `
      SELECT p.*, c.name as campaign_name, cl.name as client_name
      FROM wb_placements p
      JOIN wb_campaigns c ON p.campaign_id = c.id
      JOIN wb_clients cl ON p.client_id = cl.id
    `;
    const params = [];
    const whereClauses = [];
    let paramIndex = 1;

    if (client_id) {
      whereClauses.push(`p.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    if (campaign_id) {
      whereClauses.push(`p.campaign_id = $${paramIndex++}`);
      params.push(campaign_id);
    }
    if (search) {
      const p1 = paramIndex++;
      const p2 = paramIndex++;
      const p3 = paramIndex++;
      whereClauses.push(`(p.name ILIKE $${p1} OR cl.name ILIKE $${p2} OR c.name ILIKE $${p3})`);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    queryText += ' ORDER BY p.dt_created DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/placements', authenticateToken, async (req, res) => {
  try {
    const { placements, client_id, campaign_id } = req.body;
    if (!placements || !Array.isArray(placements) || placements.length === 0 || !client_id || !campaign_id) {
      return res.status(400).json({ message: 'placements (array), client_id, and campaign_id are required' });
    }
    const createdPlacements = [];
    for (const placementData of placements) {
      const id = generateId();
      const now = new Date();
      const { name, ...otherFields } = placementData; 
      const result = await query(`
        INSERT INTO wb_placements (id, client_id, campaign_id, name, status, owner, dt_created, created_by, dt_updated, updated_by, placement_data)
        VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [id, client_id, campaign_id, name, req.user.userId, now, req.user.userId, now, req.user.userId, JSON.stringify(otherFields)]); 
      createdPlacements.push(result.rows[0]);
    }
    res.status(201).json(createdPlacements);
  } catch (error) {
    console.error('Create placements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/placements/:placementId', authenticateToken, async (req, res) => {
  try {
    const { placementId } = req.params;
    const { name, client_id, campaign_id, status, ...otherPlacementData } = req.body;

    if (!name || !client_id || !campaign_id) { 
      return res.status(400).json({ message: 'Name, client_id, and campaign_id are required.' });
    }
    const now = new Date();
    const result = await query(`
      UPDATE wb_placements
      SET name = $1, client_id = $2, campaign_id = $3, status = $4, 
          placement_data = $5, 
          dt_updated = $6, updated_by = $7
      WHERE id = $8
      RETURNING *
    `, [
      name, client_id, campaign_id, status || 'draft', 
      JSON.stringify(otherPlacementData), 
      now, req.user.userId, 
      placementId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Placement not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/placements/:placementId', authenticateToken, async (req, res) => {
  try {
    const { placementId } = req.params;
    const result = await query(`
      DELETE FROM wb_placements
      WHERE id = $1
      RETURNING id 
    `, [placementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Placement not found.' });
    }
    res.json({ message: 'Placement deleted successfully.' });
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ===================================
// TEMPLATE ROUTES - with authorization
// ===================================
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { client_id, type } = req.query;
    let queryText = `
      SELECT t.id, t.display_name, t.client, t.type, t.description, t.fields as template_structure, 
             t.owner, t.access, t.dt_created, t.created_by, t.dt_updated, t.updated_by, t.is_global,
             c.name as client_name 
      FROM wb_naming_templates t
      LEFT JOIN wb_clients c ON t.client = c.id
      WHERE (t.owner = $1 OR t.is_global = true OR (t.access ? $2 AND t.access->>$2 LIKE '%use%'))`;
    const params = [req.user.userId, req.user.userId];
    let paramIndex = 3;
    if (client_id) {
      queryText += ` AND (t.client = $${paramIndex++} OR t.is_global = true) `;
      params.push(client_id);
    }
    if (type) {
      queryText += ` AND t.type = $${paramIndex++}`;
      params.push(type);
    }
    queryText += ' ORDER BY t.is_global DESC, t.display_name ASC, t.dt_created DESC';
    const result = await query(queryText, params);
    res.json(result.rows.map(row => ({...row, name: row.display_name}))); 
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/templates', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { name: displayName, type, client_id, description, template_structure, is_global = false } = req.body;
    if (!displayName || !type || !template_structure) {
      return res.status(400).json({ message: 'Display name, type, and template structure are required' });
    }
    const id = generateId();
    const now = new Date();
    const ownerId = req.user.userId;
    const finalClientId = is_global ? null : (client_id || null);

    const result = await query(`
      INSERT INTO wb_naming_templates (id, display_name, type, client, description, fields, is_global, owner, dt_created, created_by, dt_updated, updated_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *, display_name as name 
    `, [id, displayName, type, finalClientId, description || null, JSON.stringify(template_structure), is_global, ownerId, now, ownerId, now, ownerId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Template name conflict.' });
    console.error("Error creating template:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/templates/:templateId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name: displayName, type, client_id, description, template_structure, is_global } = req.body;
    if (!displayName || !type || !template_structure) {
      return res.status(400).json({ message: 'Display name, type, and template structure are required' });
    }
    const now = new Date();
    const updaterId = req.user.userId;
    const finalClientId = (typeof is_global === 'boolean' && is_global) ? null : (client_id || null);
    const finalIsGlobal = typeof is_global === 'boolean' ? is_global : (finalClientId === null);

    const result = await query(`
      UPDATE wb_naming_templates
      SET display_name = $1, type = $2, client = $3, description = $4, fields = $5, is_global = $6, dt_updated = $7, updated_by = $8
      WHERE id = $9
      RETURNING *, display_name as name
    `, [displayName, type, finalClientId, description || null, JSON.stringify(template_structure), finalIsGlobal, now, updaterId, templateId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Template name conflict.' });
    console.error("Error updating template:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/templates/:templateId', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { templateId } = req.params;
    const result = await query(`
      DELETE FROM wb_naming_templates
      WHERE id = $1
      RETURNING id
    `, [templateId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found.' });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// TRAFFICKING REQUEST ROUTES  
app.get('/api/trafficking-requests', authenticateToken, async (req, res) => {
  try {
    const mongoDbInstance = await connectToMongo();
    const collection = mongoDbInstance.collection('InitialRequests');

    const filter = {};
    if (req.user.role === 'buyer') {
      filter.submitedBy = req.user.email;
    } 

    const requestsFromMongo = await collection.find(filter)
      .sort({ '_new_system_data.submitted_at_iso': -1 })
      .toArray();

    const formattedRequests = requestsFromMongo.map(doc => {
      const pg_id = doc._new_system_data?.pg_id || doc._id.toString();
      return {
        id: pg_id,
        client_id: doc._new_system_data?.client_id || null,
        campaign_id: doc._new_system_data?.campaign_id || null,
        client_name: doc.client,
        campaign_name: doc.campaign || 'N/A',
        status: doc.status || 'pending',
        notes: doc.notes || doc._new_system_data?.notes_new || null,
        submitted_at: doc._new_system_data?.submitted_at_iso || doc.submitDate,
        due_date: doc.dueDate,
        submitted_by_email: doc.submitedBy,
        request_details: {
          mongo_doc_id: doc._id.toString(),
          traffic: doc.traffic || []
        }
      };
    });

    res.json(formattedRequests);
  } catch (error) {
    console.error("Error fetching trafficking requests from MongoDB:", error);
    res.status(500).json({ message: 'Internal server error while fetching trafficking requests.' });
  }
});
app.post('/api/trafficking-requests', authenticateToken, async (req, res) => {
  let pgClient;
  try {
    const { client_id, campaign_id, notes, dueDate, trafficData } = req.body;

    if (!client_id) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    if (!trafficData || !Array.isArray(trafficData) || trafficData.length === 0) {
        return res.status(400).json({ message: 'Traffic data is required and must be a non-empty array.' });
    }

    const generatedPgId = generateId();
    const mongoObjectId = new ObjectId();
    const now = new Date();
    const ownerId = req.user.userId;
    const userEmail = req.user.email;

    const mongoDbInstance = await connectToMongo();
    pgClient = await pool.connect();

    let clientName = client_id;
    try {
        const clientResult = await pgClient.query('SELECT name FROM wb_clients WHERE id = $1', [client_id]);
        if (clientResult.rows.length > 0) clientName = clientResult.rows[0].name;
    } catch (dbError) {
        console.warn(`Warning: Could not fetch client name for ID ${client_id}: ${dbError.message}`);
    }

    let campaignNameForMongo = null;
    if (campaign_id) {
        try {
            const campaignResult = await pgClient.query('SELECT name FROM wb_campaigns WHERE id = $1', [campaign_id]);
            if (campaignResult.rows.length > 0) campaignNameForMongo = campaignResult.rows[0].name;
        } catch (dbError) {
            console.warn(`Warning: Could not fetch campaign name for ID ${campaign_id}: ${dbError.message}`);
        }
    }

    const mongoPayloadForInitialRequests = {
      _id: mongoObjectId,
      client: clientName,
      trackingCreatives: [],
      traffic: trafficData.map(placement => ({
        placementName: placement.placementName,
        noIas: placement.creativeAssignments[0]?.noIas !== undefined ? String(placement.creativeAssignments[0].noIas) : "false",
        creativeAssignments: placement.creativeAssignments.map(creative => ({
          creativeName: creative.creativeName,
          landingPage: creative.landingPage,
          startDate: creative.startDate,
          endDate: creative.endDate,
        })),
      })),
      submitedBy: userEmail,
      dueDate: dueDate ? dueDate.split('T')[0] : null,
      submitDate: now.toISOString().split('T')[0],
      _new_system_data: {
          pg_id: generatedPgId,
          client_id: client_id,
          campaign_id: campaign_id || null,
          submitted_at_iso: now,
          notes_new: notes || null,
          status_new: 'pending',
          owner_new: ownerId,
      }
    };

    const requestDetailsForPgJsonb = {
      mongo_doc_id: mongoObjectId.toString(),
      submitDate: mongoPayloadForInitialRequests.submitDate,
      client_id: client_id,
      campaign_id: campaign_id || null,
      traffic: trafficData,
      submitedBy: userEmail,
      dueDate: dueDate || null,
      notes: notes || null,
      status: 'pending',
      owner: ownerId
    };

    await pgClient.query('BEGIN');

    const pgInsertQuery = `
      INSERT INTO wb_trafficking_requests
        (id, client_id, campaign_id, status, notes, submitted_at, owner, submitted_by, due_date, request_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`;
    const pgInsertParams = [
      generatedPgId, client_id, campaign_id || null, 'pending', notes || null, now, ownerId, ownerId,
      dueDate ? new Date(dueDate) : null, JSON.stringify(requestDetailsForPgJsonb)
    ];
    const pgResult = await pgClient.query(pgInsertQuery, pgInsertParams);

    const mongoCollection = mongoDbInstance.collection('InitialRequests');
    await mongoCollection.insertOne(mongoPayloadForInitialRequests);
    console.log(`MongoDB: Inserted into "InitialRequests" with _id: ${mongoPayloadForInitialRequests._id}`);

    await pgClient.query('COMMIT');

    res.status(201).json({
      message: 'Trafficking request created successfully.',
      postgresRecord: pgResult.rows[0],
      mongoRecordId: mongoPayloadForInitialRequests._id.toString()
    });

  } catch (error) {
    if (pgClient) await pgClient.query('ROLLBACK');
    console.error("Error creating trafficking request:", error);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  } finally {
    if (pgClient) pgClient.release();
  }
});

app.patch('/api/trafficking-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, assigned_to } = req.body;

    if (!requestId) return res.status(400).json({ message: 'Request ID is required' });
    if (status === undefined && assigned_to === undefined) {
      return res.status(400).json({ message: 'Status or assigned_to is required' });
    }

    const now = new Date();
    const mongoDbInstance = await connectToMongo();
    const mongoCollection = mongoDbInstance.collection('InitialRequests');

    const mongoUpdates = { $set: {} };
    if (status !== undefined) {
      mongoUpdates.$set.status = status;
      if (status === 'completed') mongoUpdates.$set.completed_at_iso = now;
    }
    if (assigned_to !== undefined) mongoUpdates.$set.assigned_to = assigned_to;
    mongoUpdates.$set.updated_at_iso = now;

    const mongoUpdateResult = await mongoCollection.updateOne(
      { '_new_system_data.pg_id': requestId },
      mongoUpdates
    );

    if (mongoUpdateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Request not found in MongoDB.' });
    }
    console.log(`MongoDB: Updated trafficking request for pg_id: ${requestId}, Matched: ${mongoUpdateResult.matchedCount}, Modified: ${mongoUpdateResult.modifiedCount}`);

    const updatedMongoDoc = await mongoCollection.findOne({ '_new_system_data.pg_id': requestId });

    res.json({
        message: "Request updated successfully in MongoDB.",
        mongoRecord: updatedMongoDoc
    });

  } catch (error) {
    console.error("Error updating trafficking request (Mongo):", error);
    res.status(500).json({ message: 'Internal server error. ' + error.message });
  }
});

// LEGEND FIELDS ROUTES
app.get('/api/legend-fields', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    let queryText;
    const queryParams = [];
    if (category) {
      if (category === '__ALL_ITEMS__') {
        queryText = `SELECT id, display_name, value, abbreviation FROM wb_legend_fields ORDER BY display_name ASC, value ASC`;
      } else {
        queryText = `SELECT id, display_name as category_name, value, abbreviation FROM wb_legend_fields WHERE display_name = $1 ORDER BY value ASC`;
        queryParams.push(category);
      }
    } else {
      queryText = 'SELECT DISTINCT display_name FROM wb_legend_fields ORDER BY display_name ASC';
    }
    const result = await query(queryText, queryParams);
    let legendItems;
    if (category) {
        if (category === '__ALL_ITEMS__') {
            legendItems = result.rows.map(row => ({
                id: row.id,
                label: `${row.display_name}: ${row.value}${row.abbreviation ? ` (${row.abbreviation})` : ''}`,
                value: row.id,
                category: row.display_name,
                actual_value: row.value,
                abbreviation: row.abbreviation
            }));
        } else {
            legendItems = result.rows.map(row => ({
                id: row.id,
                label: `${row.value || 'N/A'}${row.abbreviation ? ` (${row.abbreviation})` : ''}`,
                value: row.value,
                abbreviation: row.abbreviation
            }));
        }
    } else {
        legendItems = result.rows.map(row => ({ label: row.display_name, value: row.display_name }));
    }
    res.json(legendItems);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// CRUD for Legend Fields
app.post('/api/legend-fields', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { display_name, value, abbreviation } = req.body;
    if (!display_name || !value) {
      return res.status(400).json({ message: 'Category (display_name) and Value are required.' });
    }
    const id = generateId();
    const now = new Date();
    const userId = req.user.userId;
    const result = await query(
      `INSERT INTO wb_legend_fields (id, display_name, value, abbreviation, dt_created, created_by, dt_updated, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, display_name, value, abbreviation || null, now, userId, now, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A legend item with this combination already exists.' });
    console.error('Error creating legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/legend-fields/:id', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, value, abbreviation } = req.body;
    if (!display_name || !value) {
      return res.status(400).json({ message: 'Category (display_name) and Value are required.' });
    }
    const now = new Date();
    const userId = req.user.userId;
    const result = await query(
      `UPDATE wb_legend_fields
       SET display_name = $1, value = $2, abbreviation = $3, dt_updated = $4, updated_by = $5
       WHERE id = $6
       RETURNING *`,
      [display_name, value, abbreviation || null, now, userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Legend field not found.' });
    res.json(result.rows[0]);
  } catch (error) {
     if (error.code === '23505') return res.status(409).json({ message: 'A legend item with this combination already exists.' });
    console.error('Error updating legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/legend-fields/:id', authenticateToken, authorizeAdOps, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM wb_legend_fields WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Legend field not found.' });
    res.json({ message: 'Legend field deleted successfully.' });
  } catch (error) {
    console.error('Error deleting legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/legend-fields/bulk-upload', authenticateToken, authorizeAdOps, async (req, res) => {
  const { items, mode } = req.body;
  const userId = req.user.userId;

  if (!items || !Array.isArray(items) || !mode) {
    return res.status(400).json({ message: 'Invalid payload. "items" array and "mode" are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (mode === 'replace_category') {
      const categories = [...new Set(items.map(item => item.category))];
      if (categories.length > 0) {
        await client.query('DELETE FROM wb_legend_fields WHERE display_name = ANY($1)', [categories]);
      }
    }

    for (const item of items) {
      const { category, value, abbreviation } = item;
      if (!category || !value) continue;

      const id = generateId();
      const now = new Date();

      if (mode === 'add_new') {
        await client.query(
          `INSERT INTO wb_legend_fields (id, display_name, value, abbreviation, dt_created, created_by, dt_updated, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (display_name, value) DO NOTHING`,
          [id, category, value, abbreviation || null, now, userId, now, userId]
        );
      } else {
        await client.query(
          `INSERT INTO wb_legend_fields (id, display_name, value, abbreviation, dt_created, created_by, dt_updated, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (display_name, value) DO UPDATE SET
             abbreviation = EXCLUDED.abbreviation,
             dt_updated = NOW(),
             updated_by = $6`,
          [id, category, value, abbreviation || null, now, userId, now, userId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Legend fields uploaded successfully.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during bulk legend upload:', error);
    res.status(500).json({ message: 'Internal server error during upload.' });
  } finally {
    client.release();
  }
});

// UTMs ENDPOINTS
app.get('/api/utms', authenticateToken, async (req, res) => {
  try {
    const { client_id, campaign_id, search } = req.query;
    
    let queryText = `
      SELECT u.*, 
             cl.name as client_name, 
             camp.name as campaign_name
      FROM wb_utms u
      LEFT JOIN wb_clients cl ON u.client_id = cl.id
      LEFT JOIN wb_campaigns camp ON u.campaign_id = camp.id
    `;
    const params = [];
    const whereClauses = [];
    let paramIndex = 1;

    if (client_id) {
      whereClauses.push(`u.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    if (campaign_id) {
      whereClauses.push(`u.campaign_id = $${paramIndex++}`);
      params.push(campaign_id);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      const searchParamIndex = paramIndex++;
      whereClauses.push(`(
        u.source ILIKE $${searchParamIndex} OR 
        u.medium ILIKE $${searchParamIndex} OR 
        u.term ILIKE $${searchParamIndex} OR 
        u.content ILIKE $${searchParamIndex} OR 
        u.full_url ILIKE $${searchParamIndex} OR
        cl.name ILIKE $${searchParamIndex} OR
        camp.name ILIKE $${searchParamIndex}
      )`);
      params.push(searchTerm);
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY u.dt_created DESC';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching UTMs:', error);
    res.status(500).json({ message: 'Internal server error while fetching UTMs.' });
  }
});

app.post('/api/utms', authenticateToken, async (req, res) => {
  try {
    const utmsToCreate = req.body; 
    
    if (!utmsToCreate || !Array.isArray(utmsToCreate) || utmsToCreate.length === 0) {
      return res.status(400).json({ message: 'An array of UTMs to create is required.' });
    }

    const createdUtms = [];
    const userId = req.user.userId;
    const now = new Date();

    for (const utm of utmsToCreate) {
      const { client_id, campaign_id, source, medium, term, content, full_url } = utm;
      if (!source || !medium || !full_url) {
        console.warn('Skipping a UTM in the batch due to missing required fields:', utm);
        continue;
      }
      const newId = generateId();
      const result = await query(
        `INSERT INTO wb_utms (id, client_id, campaign_id, source, medium, term, content, full_url, owner, dt_created, created_by, dt_updated, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [ newId, client_id || null, campaign_id || null, source, medium, term || null, content || null,
          full_url, userId, now, userId, now, userId ]
      );
      if (result.rows[0]) createdUtms.push(result.rows[0]);
    }
    res.status(201).json(createdUtms);
  } catch (error) {
    console.error('Error creating UTMs:', error);
    res.status(500).json({ message: 'Internal server error while creating UTMs.' });
  }
});

app.put('/api/utms/:utmId', authenticateToken, async (req, res) => {
  try {
    const { utmId } = req.params;
    const { client_id, campaign_id, source, medium, term, content, full_url } = req.body;

    if (!source || !medium || !full_url) {
      return res.status(400).json({ message: 'Source, medium, and full_url are required.' });
    }

    const now = new Date();
    const userId = req.user.userId;

    const result = await query(`
      UPDATE wb_utms
      SET client_id = $1, campaign_id = $2, source = $3, medium = $4, term = $5, content = $6, full_url = $7,
          dt_updated = $8, updated_by = $9
      WHERE id = $10
      RETURNING *
    `, [ client_id || null, campaign_id || null, source, medium, term || null, content || null, full_url,
      now, userId, utmId ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'UTM not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating UTM:', error);
    res.status(500).json({ message: 'Internal server error while updating UTM.' });
  }
});

app.delete('/api/utms/:utmId', authenticateToken, async (req, res) => {
  try {
    const { utmId } = req.params;
    const result = await query(`
      DELETE FROM wb_utms
      WHERE id = $1
      RETURNING id
    `, [utmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'UTM not found.' });
    }
    res.json({ message: 'UTM deleted successfully.' });
  } catch (error) {
    console.error('Error deleting UTM:', error);
    res.status(500).json({ message: 'Internal server error while deleting UTM.' });
  }
});

// Error handling middleware & 404
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ message: 'Internal server error' })
})
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})