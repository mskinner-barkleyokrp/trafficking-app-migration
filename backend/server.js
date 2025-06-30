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
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Explicitly allow all common methods
  credentials: true,
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With', // Explicitly allow headers
  preflightContinue: false, // Let CORS handle the OPTIONS response
  optionsSuccessStatus: 204 // For legacy browser support
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
// let mailTransporter;
// async function setupMailer() {
//   if (process.env.NODE_ENV === 'production' && process.env.EMAIL_HOST) {
//       mailTransporter = nodemailer.createTransport({
//           host: process.env.EMAIL_HOST,
//           port: process.env.EMAIL_PORT || 587,
//           secure: (process.env.EMAIL_PORT || 587) == 465,
//           auth: {
//               user: process.env.EMAIL_USER,
//               pass: process.env.EMAIL_PASS,
//           },
//       });
//   } else {
//       let testAccount = await nodemailer.createTestAccount();
//       console.log('Ethereal test account for development emails:');
//       console.log('User: %s', testAccount.user);
//       console.log('Password: %s', testAccount.pass);
//       mailTransporter = nodemailer.createTransport({
//           host: 'smtp.ethereal.email',
//           port: 587,
//           secure: false,
//           auth: {
//               user: testAccount.user,
//               pass: testAccount.pass,
//           },
//       });
//   }
//   try {
//       await mailTransporter.verify();
//       console.log('Mail transporter is ready to send emails.');
//   } catch(error) {
//       console.error('Error verifying mail transporter:', error);
//   }
// }
// setupMailer().catch(console.error);

// async function sendTraffickingRequestEmail(requestDetails, userEmail, clientName, campaignName) {
//     if (!mailTransporter) {
//         console.error('Mail transporter not configured. Skipping email.');
//         return;
//     }
//     const adOpsEmail = process.env.ADOP_TEAM_EMAIL || 'adops-team@example.com';
//     const fromEmail = process.env.EMAIL_FROM || '"M1M Platform" <noreply@m1m.com>';

//     const subject = `New Trafficking Request Submitted for ${clientName}`;
//     const trafficItemsHtml = requestDetails.trafficData.map(item => `
//         <li style="margin-bottom: 10px;">
//             <strong>Placement:</strong> ${item.placementName}
//             <ul style="list-style-type: circle; margin-left: 20px;">
//                 ${item.creativeAssignments.map(creative => `
//                     <li>Creative: ${creative.creativeName} (${creative.startDate} - ${creative.endDate})</li>
//                     <li>URL: <a href="${creative.landingPage}">${creative.landingPage}</a></li>
//                 `).join('')}
//             </ul>
//         </li>
//     `).join('');

//     const htmlBody = `
//         <h1>New Trafficking Request</h1>
//         <p>A new trafficking request has been submitted.</p>
//         <ul style="line-height: 1.6;">
//             <li><strong>Submitted By:</strong> ${userEmail}</li>
//             <li><strong>Client:</strong> ${clientName}</li>
//             <li><strong>Campaign:</strong> ${campaignName || 'N/A'}</li>
//             <li><strong>Due Date:</strong> ${requestDetails.dueDate ? new Date(requestDetails.dueDate).toLocaleDateString() : 'N/A'}</li>
//             <li><strong>Notes:</strong> ${requestDetails.notes || 'None'}</li>
//         </ul>
//         <h2>Request Details:</h2>
//         <ul>
//             ${trafficItemsHtml}
//         </ul>
//         <p>Please review the request in the Trafficking Queue.</p>
//     `;

//     const mailOptions = {
//         from: fromEmail,
//         to: adOpsEmail,
//         cc: userEmail,
//         subject: subject,
//         html: htmlBody
//     };

//     try {
//         let info = await mailTransporter.sendMail(mailOptions);
//         console.log('Email sent: ' + info.response);
//         if (process.env.NODE_ENV !== 'production' || !process.env.EMAIL_HOST) {
//             console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
//         }
//     } catch (error) {
//         console.error('Error sending trafficking request email:', error);
//     }
// }
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
const MONGO_URI = process.env.MONGO_URI;
let mongoClient;
let mongoDb; // This will hold the db instance

async function connectToMongo() {
  if (mongoDb) {
    // If mongoDb instance is already available, check client's connection status
    // This is a basic check; more robust checks might be needed for production
    try {
      if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected()) {
        return mongoDb;
      }
    } catch (e) {
      console.warn("Error checking MongoDB connection status, will try to reconnect:", e.message);
      // Fall through to reconnect
    }
  }

  if (!MONGO_URI) {
    console.error('MONGO_URI is not defined in your environment variables.');
    process.exit(1); // Or handle more gracefully
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    mongoClient = new MongoClient(MONGO_URI); // MongoClient does not take dbName here directly for URI parsing
    await mongoClient.connect();

    const dbNameFromUri = mongoClient.options?.dbName; // Tries to get dbName if parsed from URI

    if (!dbNameFromUri && !process.env.MONGO_DB_NAME_FALLBACK) { // Added a fallback env variable
        console.error("MongoDB database name not found in MONGO_URI and MONGO_DB_NAME_FALLBACK is not set. Please include the database name in your MONGO_URI (e.g., mongodb://localhost:27017/yourDbName) or set MONGO_DB_NAME_FALLBACK.");
        await mongoClient.close(); // Close the client if we can't determine a DB
        process.exit(1);
    }

    mongoDb = mongoClient.db(dbNameFromUri || process.env.MONGO_DB_NAME_FALLBACK); // Use parsed dbName or fallback
    console.log(`Connected to MongoDB successfully. Database: ${mongoDb.databaseName}`);
    return mongoDb;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    if (mongoClient) {
        try { await mongoClient.close(); } catch (e) { console.error("Error closing mongoClient after connection failure:", e); }
    }
    process.exit(1); // Or handle more gracefully
  }
}

// Call connectToMongo on server start to establish the initial connection
// and handle potential startup errors.
connectToMongo().catch(err => {
    console.error("MongoDB initial connection failed on startup:", err);
    // process.exit(1) might be here if connectToMongo doesn't exit itself on failure
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

// CLIENT ROUTES
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    // MODIFIED: Removed user-based restrictions to allow all users to see all clients.
    const result = await query(`
      SELECT * FROM wb_clients 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/api/clients', authenticateToken, async (req, res) => {
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
app.put('/api/clients/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params
    const { name, placement_name_template, utm_structure, cm360_instance_id } = req.body
    if (!name) return res.status(400).json({ message: 'Client name is required' })
    const now = new Date()
    const result = await query(`
      UPDATE wb_clients 
      SET name = $1, placement_name_template = $2, utm_structure = $3, cm360_instance_id = $4, dt_updated = $5, updated_by = $6
      WHERE id = $7 AND (created_by = $8 OR (access ? $9 AND access->>$9 LIKE '%edit%'))
      RETURNING *
    `, [name, 
        typeof placement_name_template === 'object' ? JSON.stringify(placement_name_template) : placement_name_template,
        typeof utm_structure === 'object' ? JSON.stringify(utm_structure) : utm_structure,
        cm360_instance_id, now, req.user.userId, clientId, req.user.userId, req.user.userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or no permission to edit' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})
app.delete('/api/clients/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params
    const campaignCheck = await query('SELECT COUNT(*) as count FROM wb_campaigns WHERE client_id = $1', [clientId])
    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete client with existing campaigns.' })
    }
    const result = await query(`
      DELETE FROM wb_clients 
      WHERE id = $1 AND (created_by = $2 OR (access ? $3 AND access->>$3 LIKE '%delete%'))
      RETURNING *
    `, [clientId, req.user.userId, req.user.userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or no permission to delete' })
    }
    res.json({ message: 'Client deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// CAMPAIGN ROUTES
app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const { client_id } = req.query
    if (!client_id) return res.status(400).json({ message: 'client_id is required' })
    // MODIFIED: Removed user-based ownership/access checks.
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
app.post('/api/campaigns', authenticateToken, async (req, res) => {
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
app.put('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params
    const { client_id, name, start_date, end_date, status } = req.body
    if (!client_id || !name) return res.status(400).json({ message: 'client_id and name are required' })
    const now = new Date()
    const result = await query(`
      UPDATE wb_campaigns 
      SET client_id = $1, name = $2, start_date = $3, end_date = $4, status = $5, dt_updated = $6, updated_by = $7
      WHERE id = $8 AND (owner = $9 OR (access ? $10 AND access->>$10 LIKE '%edit%'))
      RETURNING *
    `, [client_id, name, start_date, end_date, status, now, req.user.userId, campaignId, req.user.userId, req.user.userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found or no permission to edit' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})
app.delete('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params
    const placementCheck = await query('SELECT COUNT(*) as count FROM wb_placements WHERE campaign_id = $1', [campaignId])
    if (parseInt(placementCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete campaign with existing placements.' })
    }
    const result = await query(`
      DELETE FROM wb_campaigns 
      WHERE id = $1 AND (owner = $2 OR (access ? $3 AND access->>$3 LIKE '%delete%'))
      RETURNING *
    `, [campaignId, req.user.userId, req.user.userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found or no permission to delete' })
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

    // MODIFIED: Re-structured to remove user-based restrictions and build query dynamically.
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
  // This endpoint is for BULK creation from PlacementBuilder's main grid
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
      WHERE id = $8 AND (owner = $9 OR (access ? $10 AND access->>$10 LIKE '%edit%'))
      RETURNING *
    `, [
      name, client_id, campaign_id, status || 'draft', 
      JSON.stringify(otherPlacementData), 
      now, req.user.userId, 
      placementId, req.user.userId, req.user.userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Placement not found or no permission to edit.' });
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
      WHERE id = $1 AND (owner = $2 OR (access ? $3 AND access->>$3 LIKE '%delete%'))
      RETURNING id 
    `, [placementId, req.user.userId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Placement not found or no permission to delete.' });
    }
    res.json({ message: 'Placement deleted successfully.' });
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// TEMPLATE ROUTES (wb_naming_templates)
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
      queryText += ` AND (t.client = $${paramIndex++} OR t.is_global = true) `; // Client specific or global
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
app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { name: displayName, type, client_id, description, template_structure, is_global = false } = req.body;
    if (!displayName || !type || !template_structure) {
      return res.status(400).json({ message: 'Display name, type, and template structure are required' });
    }
    const id = generateId();
    const now = new Date();
    const ownerId = req.user.userId;
    // If is_global is true, client_id should be null. Otherwise, use the provided client_id or null if not provided.
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
app.put('/api/templates/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name: displayName, type, client_id, description, template_structure, is_global } = req.body;
    if (!displayName || !type || !template_structure) {
      return res.status(400).json({ message: 'Display name, type, and template structure are required' });
    }
    const now = new Date();
    const updaterId = req.user.userId;
    // If is_global is explicitly true, client_id becomes null.
    // Otherwise, use the provided client_id (or null if it wasn't provided).
    const finalClientId = (typeof is_global === 'boolean' && is_global) ? null : (client_id || null);
    // Ensure is_global is a boolean. If client_id is provided and is_global is not explicitly set, assume not global for that client.
    // If no client_id and is_global not set, default to false unless it's a global edit.
    const finalIsGlobal = typeof is_global === 'boolean' ? is_global : (finalClientId === null);


    const result = await query(`
      UPDATE wb_naming_templates
      SET display_name = $1, type = $2, client = $3, description = $4, fields = $5, is_global = $6, dt_updated = $7, updated_by = $8
      WHERE id = $9 AND (owner = $10 OR (access ? $11 AND access->>$11 LIKE '%edit%')) 
      RETURNING *, display_name as name
    `, [displayName, type, finalClientId, description || null, JSON.stringify(template_structure), finalIsGlobal, now, updaterId, templateId, updaterId, updaterId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found or no permission.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Template name conflict.' });
    console.error("Error updating template:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.delete('/api/templates/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params
    const result = await query(`
      DELETE FROM wb_naming_templates
      WHERE id = $1 AND (owner = $2 OR (access ? $3 AND access->>$3 LIKE '%delete%'))
      RETURNING id
    `, [templateId, req.user.userId, req.user.userId])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found or no permission.' });
    res.json({ message: 'Template deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// TRAFFICKING REQUEST ROUTES  
// app.get('/api/trafficking-requests', authenticateToken, async (req, res) => {
//   try {
//     let queryText = `
//       SELECT tr.*, 
//              c.name as campaign_name, 
//              cl.name as client_name,
//              u.email as submitted_by_email
//       FROM wb_trafficking_requests tr
//       LEFT JOIN wb_campaigns c ON tr.campaign_id = c.id
//       LEFT JOIN wb_clients cl ON tr.client_id = cl.id
//       LEFT JOIN wb_users u ON tr.submitted_by = u.id`
//     const params = []
//     let whereClauses = []
//     let paramIndex = 1
//     if (req.user.role === 'buyer') {
//       whereClauses.push(`tr.submitted_by = $${paramIndex++}`)
//       params.push(req.user.userId)
//     } else if (req.user.role === 'adops') {
//       // Ad-ops users should see all requests
//       // No specific filter here, but you could add one e.g., for assigned requests
//     }
//     // Note: The original filtering logic was a bit restrictive. I've simplified it
//     // to allow admins/adops to see all requests and buyers to see their own.
//     // Adjust as needed.
//     if (whereClauses.length > 0) queryText += ' WHERE ' + whereClauses.join(' AND ')
//     queryText += ' ORDER BY tr.submitted_at DESC'
//     const result = await query(queryText, params)
//     res.json(result.rows)
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error' })
//   }
// })
app.get('/api/trafficking-requests', authenticateToken, async (req, res) => {
  try {
    const mongoDbInstance = await connectToMongo();
    const collection = mongoDbInstance.collection('InitialRequests');

    const filter = {};
    // Apply role-based filtering, matching the logic in the POST route
    if (req.user.role === 'buyer') {
      // Buyers see requests they submitted. 'submitedBy' in Mongo stores the email.
      filter.submitedBy = req.user.email;
    } 
    // AdOps and other roles see all requests, so the filter remains empty {}.

    const requestsFromMongo = await collection.find(filter)
      // Sort by the ISO date we stored for better accuracy
      .sort({ '_new_system_data.submitted_at_iso': -1 })
      .toArray();

    // Map the MongoDB document structure to what the frontend expects
    const formattedRequests = requestsFromMongo.map(doc => {
      // The frontend expects the PostgreSQL ID for update/delete operations
      const pg_id = doc._new_system_data?.pg_id || doc._id.toString();

      return {
        id: pg_id, // Use the stable PostgreSQL ID
        client_id: doc._new_system_data?.client_id || null,
        campaign_id: doc._new_system_data?.campaign_id || null,
        
        // --- Data for display ---
        client_name: doc.client, // This comes directly from the 'client' field
        campaign_name: doc.campaign || 'N/A', // Use campaign name if it was stored
        status: doc.status || 'pending', // Provide default status if not present
        notes: doc.notes || doc._new_system_data?.notes_new || null,
        
        // --- Dates and Submitter ---
        submitted_at: doc._new_system_data?.submitted_at_iso || doc.submitDate,
        due_date: doc.dueDate,
        submitted_by_email: doc.submitedBy, // Use the email from 'submitedBy'
        
        // --- Nested details object for the traffic data ---
        request_details: {
          mongo_doc_id: doc._id.toString(),
          traffic: doc.traffic || [] // The detailed traffic data
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
    const ownerId = req.user.userId; // User's UUID
    const userEmail = req.user.email;

    // --- Get Database Connections First ---
    const mongoDbInstance = await connectToMongo();
    pgClient = await pool.connect(); // Get a client from the PostgreSQL pool

    // --- Fetch Client Name (and Campaign Name if campaign_id exists) for MongoDB payload ---
    let clientName = client_id; // Fallback to ID if name not found
    try {
        const clientResult = await pgClient.query('SELECT name FROM wb_clients WHERE id = $1', [client_id]);
        if (clientResult.rows.length > 0) {
            clientName = clientResult.rows[0].name;
        }
    } catch (dbError) {
        console.warn(`Warning: Could not fetch client name for ID ${client_id}: ${dbError.message}`);
    }

    let campaignNameForMongo = null;
    if (campaign_id) {
        try {
            const campaignResult = await pgClient.query('SELECT name FROM wb_campaigns WHERE id = $1', [campaign_id]);
            if (campaignResult.rows.length > 0) {
                campaignNameForMongo = campaignResult.rows[0].name;
            }
        } catch (dbError) {
            console.warn(`Warning: Could not fetch campaign name for ID ${campaign_id}: ${dbError.message}`);
        }
    }


    // --- 1. Prepare Payload for MongoDB ("InitialRequests" collection, old structure) ---
    const mongoPayloadForInitialRequests = {
      _id: mongoObjectId,
      // pg_id: generatedPgId, // Desktop app might not know/care about this
      client: clientName, // Use fetched client name
      // campaign: campaignNameForMongo, // Add if desktop app expects a top-level campaign name
      trackingCreatives: [], // Add as empty array for compatibility
      traffic: trafficData.map(placement => ({
        placementName: placement.placementName,
        noIas: placement.creativeAssignments[0]?.noIas !== undefined ? String(placement.creativeAssignments[0].noIas) : "false", // Take from first creative, convert boolean to string
        creativeAssignments: placement.creativeAssignments.map(creative => ({
          creativeName: creative.creativeName,
          landingPage: creative.landingPage,
          startDate: creative.startDate, // Assuming these are already "YYYY-MM-DD" strings from frontend
          endDate: creative.endDate,     // Assuming these are already "YYYY-MM-DD" strings from frontend
        })),
      })),
      submitedBy: userEmail, // Keeping the typo for compatibility
      dueDate: dueDate ? dueDate.split('T')[0] : null, // Store as "YYYY-MM-DD" string
      submitDate: now.toISOString().split('T')[0], // "YYYY-MM-DD" string

      // --- New fields (desktop app will likely ignore these, but good for new system) ---
      // You can choose to include them or not in the "InitialRequests" document.
      // For cleaner separation, you might only put fields the desktop app *needs*.
      // However, having them doesn't hurt if the desktop app ignores unknown fields.
      _new_system_data: { // Optional: Group new fields
          pg_id: generatedPgId,
          client_id: client_id,
          campaign_id: campaign_id || null,
          submitted_at_iso: now,
          notes_new: notes || null, // Use different name if 'notes' is expected by old app
          status_new: 'pending',
          owner_new: ownerId,
      }
    };

    // --- 2. Prepare Payload for PostgreSQL JSONB column (new structure) ---
    const requestDetailsForPgJsonb = {
      mongo_doc_id: mongoObjectId.toString(),
      submitDate: mongoPayloadForInitialRequests.submitDate, // from adapted payload
      client_id: client_id, // Actual ID
      campaign_id: campaign_id || null, // Actual ID
      traffic: trafficData, // Original rich trafficData from frontend
      submitedBy: userEmail, // Correct spelling if possible, or use the typo
      dueDate: dueDate || null, // Original dueDate
      notes: notes || null,
      status: 'pending',
      owner: ownerId
    };

    // --- Start PostgreSQL Transaction ---
    await pgClient.query('BEGIN');

    // --- 3. Insert into PostgreSQL (wb_trafficking_requests table, new structure) ---
    const pgInsertQuery = `
      INSERT INTO wb_trafficking_requests
        (id, client_id, campaign_id, status, notes, submitted_at, owner, submitted_by, due_date, request_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`;
    const pgInsertParams = [
      generatedPgId,
      client_id,
      campaign_id || null,
      'pending', // status
      notes || null, // notes
      now, // submitted_at (TIMESTAMPTZ)
      ownerId, // owner (UUID)
      ownerId, // submitted_by (UUID)
      dueDate ? new Date(dueDate) : null, // due_date (DATE)
      JSON.stringify(requestDetailsForPgJsonb)
    ];
    const pgResult = await pgClient.query(pgInsertQuery, pgInsertParams);

    // --- 4. Insert into MongoDB ("InitialRequests" collection) ---
    const mongoCollection = mongoDbInstance.collection('InitialRequests'); // TARGET COLLECTION
    await mongoCollection.insertOne(mongoPayloadForInitialRequests);
    console.log(`MongoDB: Inserted into "InitialRequests" with _id: ${mongoPayloadForInitialRequests._id}`);

    // --- Commit PostgreSQL Transaction ---
    await pgClient.query('COMMIT');
     // --- 5. Send Email Notification ---
    // await sendTraffickingRequestEmail(
    //     { trafficData, notes, dueDate },
    //     userEmail,
    //     clientName,
    //     campaignNameForMongo
    // );

    res.status(201).json({
      message: 'Trafficking request created successfully. Data sent to InitialRequests (MongoDB) and wb_trafficking_requests (PostgreSQL).',
      postgresRecord: pgResult.rows[0],
      mongoRecordId: mongoPayloadForInitialRequests._id.toString()
    });

  } catch (error) {
    if (pgClient) {
      await pgClient.query('ROLLBACK');
    }
    console.error("Error creating trafficking request (dual write to InitialRequests):", error);
    res.status(500).json({ message: 'Internal server error while creating trafficking request. ' + error.message });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
});


// app.patch('/api/trafficking-requests/:requestId', authenticateToken, async (req, res) => {
//   try {
//     const { requestId } = req.params; // This 'requestId' is the pg_id (UUID)
//     const { status, assigned_to } = req.body;

//     if (!requestId) return res.status(400).json({ message: 'Request ID is required' });
//     if (status === undefined && assigned_to === undefined) {
//       return res.status(400).json({ message: 'Status or assigned_to is required' });
//     }

//     const now = new Date();
//     const mongoDbInstance = await connectToMongo();
//     const mongoCollection = mongoDbInstance.collection('trafficking_requests_mongo');

//     // --- Prepare updates for MongoDB ---
//     const mongoUpdates = { $set: {} };
//     if (status !== undefined) {
//       mongoUpdates.$set.status = status;
//       if (status === 'completed') {
//         mongoUpdates.$set.completed_at_iso = now;
//       }
//     }
//     if (assigned_to !== undefined) {
//       // Assuming assigned_to stores a user ID (e.g., from req.user.userId or another user's ID)
//       // Or it could be an email or name. Adjust your Mongo schema accordingly.
//       mongoUpdates.$set.assigned_to = assigned_to; // Can be null to unassign
//     }

//     // --- Update MongoDB document using pg_id as the reference ---
//     const mongoUpdateResult = await mongoCollection.updateOne(
//       { pg_id: requestId }, // Find document by its PostgreSQL ID
//       mongoUpdates
//     );

//     if (mongoUpdateResult.matchedCount === 0) {
//       return res.status(404).json({ message: 'Request not found in MongoDB or pg_id mismatch.' });
//     }
//     console.log(`MongoDB: Updated trafficking request for pg_id: ${requestId}, Matched: ${mongoUpdateResult.matchedCount}, Modified: ${mongoUpdateResult.modifiedCount}`);

//     // --- Prepare updates for PostgreSQL ---
//     // (PostgreSQL update logic remains similar, using its own 'id' column)
//     let pgUpdateFields = [];
//     let pgParams = [];
//     let pgParamIndex = 1;

//     if (status) {
//       pgUpdateFields.push(`status = $${pgParamIndex++}`);
//       pgParams.push(status);
//     }
//     if (status === 'completed') {
//       pgUpdateFields.push(`completed_at = $${pgParamIndex++}`);
//       pgParams.push(now);
//     }
//     if (assigned_to !== undefined) {
//       pgUpdateFields.push(`assigned_to = $${pgParamIndex++}`); // Ensure 'assigned_to' column exists in wb_trafficking_requests
//       pgParams.push(assigned_to);
//     }

//     if (pgUpdateFields.length === 0) {
//       // If only Mongo was updated (e.g., a field not in PG) and PG has nothing to update.
//       // We still need to fetch the (potentially unchanged) PG record to return.
//       // Or, if no PG update is needed, just fetch the updated Mongo doc and return that.
//       // For consistency, let's assume PG might always have a status or assigned_to field.
//        return res.status(400).json({ message: 'No valid fields to update for PostgreSQL record.' });
//     }

//     pgUpdateFields.push(`dt_updated = $${pgParamIndex++}`); // Always update dt_updated
//     pgParams.push(now);

//     let pgUpdateQuery = `UPDATE wb_trafficking_requests SET ${pgUpdateFields.join(', ')} WHERE id = $${pgParamIndex++} RETURNING *`;
//     pgParams.push(requestId); // The 'requestId' from params is the PG 'id'

//     const pgResult = await query(pgUpdateQuery, pgParams);

//     if (pgResult.rows.length === 0) {
//       // This case should ideally not happen if Mongo update was successful with a match,
//       // unless data is inconsistent.
//       console.warn(`Potentially inconsistent data: MongoDB doc found for pg_id ${requestId}, but no matching PG record.`);
//       return res.status(404).json({ message: 'Request not found in PostgreSQL or no permission, despite MongoDB update.' });
//     }

//     // Fetch the updated MongoDB document to include in the response
//     const updatedMongoDoc = await mongoCollection.findOne({ pg_id: requestId });

//     res.json({
//         message: "Request updated successfully in both databases.",
//         postgresRecord: pgResult.rows[0],
//         mongoRecord: updatedMongoDoc
//     });

//   } catch (error) {
//     console.error("Error updating trafficking request (dual write):", error);
//     res.status(500).json({ message: 'Internal server error. ' + error.message });
//   }
// });
app.patch('/api/trafficking-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params; // This 'requestId' is the pg_id (UUID)
    const { status, assigned_to } = req.body;

    if (!requestId) return res.status(400).json({ message: 'Request ID is required' });
    if (status === undefined && assigned_to === undefined) {
      return res.status(400).json({ message: 'Status or assigned_to is required' });
    }

    const now = new Date();
    const mongoDbInstance = await connectToMongo();
    const mongoCollection = mongoDbInstance.collection('InitialRequests'); // Target the correct collection

    // --- Prepare updates for MongoDB ---
    const mongoUpdates = { $set: {} };
    if (status !== undefined) {
      mongoUpdates.$set.status = status;
      if (status === 'completed') {
        mongoUpdates.$set.completed_at_iso = now;
      }
    }
    if (assigned_to !== undefined) {
      mongoUpdates.$set.assigned_to = assigned_to; // Can be null to unassign
    }
    mongoUpdates.$set.updated_at_iso = now; // Add an update timestamp

    // --- Update MongoDB document using pg_id as the reference ---
    const mongoUpdateResult = await mongoCollection.updateOne(
      { '_new_system_data.pg_id': requestId }, // Find document by its PostgreSQL ID
      mongoUpdates
    );

    if (mongoUpdateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Request not found in MongoDB.' });
    }
    console.log(`MongoDB: Updated trafficking request for pg_id: ${requestId}, Matched: ${mongoUpdateResult.matchedCount}, Modified: ${mongoUpdateResult.modifiedCount}`);

    // Fetch the updated MongoDB document to include in the response
    const updatedMongoDoc = await mongoCollection.findOne({ '_new_system_data.pg_id': requestId });

    res.json({
        message: "Request updated successfully in MongoDB.",
        // We will no longer return a separate postgresRecord
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
        // Fetches all items, good for a global legend item selector in a template
        queryText = `SELECT id, display_name, value, abbreviation FROM wb_legend_fields ORDER BY display_name ASC, value ASC`;
      } else {
        // Fetches items for a specific category, good for populating dropdowns in builders
        queryText = `SELECT id, display_name as category_name, value, abbreviation FROM wb_legend_fields WHERE display_name = $1 ORDER BY value ASC`;
        queryParams.push(category);
      }
    } else {
      // Fetches distinct categories, good for TemplateBuilder's category selection
      queryText = 'SELECT DISTINCT display_name FROM wb_legend_fields ORDER BY display_name ASC';
    }
    const result = await query(queryText, queryParams);
    let legendItems;
    if (category) {
        if (category === '__ALL_ITEMS__') {
            legendItems = result.rows.map(row => ({
                id: row.id, // Unique ID of the legend item itself
                label: `${row.display_name}: ${row.value}${row.abbreviation ? ` (${row.abbreviation})` : ''}`, // For display in a flat list
                value: row.id, // Use unique ID as value for selection
                category: row.display_name, // The category this item belongs to
                actual_value: row.value, // The actual value string
                abbreviation: row.abbreviation
            }));
        } else { // Items for a specific category
            legendItems = result.rows.map(row => ({
                id: row.id,
                label: `${row.value || 'N/A'}${row.abbreviation ? ` (${row.abbreviation})` : ''}`, // Display in dropdown
                value: row.value, // The actual value to be used in naming conventions
                abbreviation: row.abbreviation // Abbreviation, if present
            }));
        }
    } else { // Distinct categories
        legendItems = result.rows.map(row => ({ label: row.display_name, value: row.display_name }));
    }
    res.json(legendItems);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
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
        // Fetches all items, good for a global legend item selector in a template
        queryText = `SELECT id, display_name, value, abbreviation FROM wb_legend_fields ORDER BY display_name ASC, value ASC`;
      } else {
        // Fetches items for a specific category, good for populating dropdowns in builders
        queryText = `SELECT id, display_name as category_name, value, abbreviation FROM wb_legend_fields WHERE display_name = $1 ORDER BY value ASC`;
        queryParams.push(category);
      }
    } else {
      // Fetches distinct categories, good for TemplateBuilder's category selection
      queryText = 'SELECT DISTINCT display_name FROM wb_legend_fields ORDER BY display_name ASC';
    }
    const result = await query(queryText, queryParams);
    let legendItems;
    if (category) {
        if (category === '__ALL_ITEMS__') {
            legendItems = result.rows.map(row => ({
                id: row.id, // Unique ID of the legend item itself
                label: `${row.display_name}: ${row.value}${row.abbreviation ? ` (${row.abbreviation})` : ''}`, // For display in a flat list
                value: row.id, // Use unique ID as value for selection
                category: row.display_name, // The category this item belongs to
                actual_value: row.value, // The actual value string
                abbreviation: row.abbreviation
            }));
        } else { // Items for a specific category
            legendItems = result.rows.map(row => ({
                id: row.id,
                label: `${row.value || 'N/A'}${row.abbreviation ? ` (${row.abbreviation})` : ''}`, // Display in dropdown
                value: row.value, // The actual value to be used in naming conventions
                abbreviation: row.abbreviation // Abbreviation, if present
            }));
        }
    } else { // Distinct categories
        legendItems = result.rows.map(row => ({ label: row.display_name, value: row.display_name }));
    }
    res.json(legendItems);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---- START: NEW LEGEND FIELD CRUD ENDPOINTS ----
app.post('/api/legend-fields', authenticateToken, async (req, res) => {
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
    if (error.code === '23505') { // unique constraint violation
        return res.status(409).json({ message: 'A legend item with this combination already exists.' });
    }
    console.error('Error creating legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/legend-fields/:id', authenticateToken, async (req, res) => {
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
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Legend field not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
     if (error.code === '23505') {
        return res.status(409).json({ message: 'A legend item with this combination already exists.' });
    }
    console.error('Error updating legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/legend-fields/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM wb_legend_fields WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Legend field not found.' });
    }
    res.json({ message: 'Legend field deleted successfully.' });
  } catch (error) {
    console.error('Error deleting legend field:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// ---- END: NEW LEGEND FIELD CRUD ENDPOINTS ----

// ---- START: NEW UTMs ENDPOINT ----
app.get('/api/utms', authenticateToken, async (req, res) => {
  try {
    const { client_id, campaign_id, search } = req.query;
    
    // MODIFIED: Re-structured to remove user-based restrictions and build query dynamically.
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
    // The UTMBuilder sends an array of UTM objects directly in the body
    const utmsToCreate = req.body; 
    
    // Basic validation
    if (!utmsToCreate || !Array.isArray(utmsToCreate) || utmsToCreate.length === 0) {
      return res.status(400).json({ message: 'An array of UTMs to create is required.' });
    }

    const createdUtms = [];
    const userId = req.user.userId;
    const now = new Date();

    // Loop through each UTM object sent from the frontend
    for (const utm of utmsToCreate) {
      const { client_id, campaign_id, source, medium, term, content, full_url } = utm;

      // Server-side validation for required fields in each object
      if (!source || !medium || !full_url) {
        console.warn('Skipping a UTM in the batch due to missing required fields:', utm);
        continue; // Skip this invalid item and proceed with the rest
      }

      const newId = generateId();

      const result = await query(
        `INSERT INTO wb_utms (id, client_id, campaign_id, source, medium, term, content, full_url, owner, dt_created, created_by, dt_updated, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          newId,
          client_id || null,
          campaign_id || null,
          source,
          medium,
          term || null,
          content || null,
          full_url,
          userId,
          now,
          userId,
          now,
          userId
        ]
      );
      
      if (result.rows[0]) {
        createdUtms.push(result.rows[0]);
      }
    }

    // Respond with a 201 "Created" status and the data of the new UTMs
    res.status(201).json(createdUtms);

  } catch (error) {
    console.error('Error creating UTMs:', error);
    res.status(500).json({ message: 'Internal server error while creating UTMs.' });
  }
});
// PUT /api/utms/:utmId - Update a UTM
app.put('/api/utms/:utmId', authenticateToken, async (req, res) => {
  try {
    const { utmId } = req.params;
    const {
      client_id, // May or may not be updatable depending on rules
      campaign_id, // May or may not be updatable
      source,
      medium,
      term,
      content,
      full_url, // This should be regenerated if components change
    } = req.body;

    if (!source || !medium || !full_url) {
      return res.status(400).json({ message: 'Source, medium, and full_url are required.' });
    }

    const now = new Date();
    const userId = req.user.userId;

    const result = await query(`
      UPDATE wb_utms
      SET client_id = $1, campaign_id = $2, source = $3, medium = $4, term = $5, content = $6, full_url = $7,
          dt_updated = $8, updated_by = $9
      WHERE id = $10 AND (owner = $11) -- Add access check if necessary
      RETURNING *
    `, [
      client_id || null, campaign_id || null, source, medium, term || null, content || null, full_url,
      now, userId, utmId, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'UTM not found or no permission to edit.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating UTM:', error);
    res.status(500).json({ message: 'Internal server error while updating UTM.' });
  }
});

// DELETE /api/utms/:utmId - Delete a UTM
app.delete('/api/utms/:utmId', authenticateToken, async (req, res) => {
  try {
    const { utmId } = req.params;
    const userId = req.user.userId;

    const result = await query(`
      DELETE FROM wb_utms
      WHERE id = $1 AND (owner = $2) -- Add access check if necessary
      RETURNING id
    `, [utmId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'UTM not found or no permission to delete.' });
    }
    res.json({ message: 'UTM deleted successfully.' });
  } catch (error) {
    console.error('Error deleting UTM:', error);
    res.status(500).json({ message: 'Internal server error while deleting UTM.' });
  }
});
// ---- END: NEW UTMs ENDPOINT ----


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