import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
import serviceAccount from './gen-lang-client-0907876494-firebase-adminsdk-fbsvc-cbbecb81cb.json' assert { type: 'json' };
const configProjectId = "gen-lang-client-0907876494";
let firebaseApp: admin.app.App;

firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  projectId: configProjectId,
});

// Force the correct project ID for Firebase Admin
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`Environment Project ID Forced to: ${process.env.GOOGLE_CLOUD_PROJECT}`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Firebase Admin
  let firebaseApp: admin.app.App;
  let dbInstance: admin.firestore.Firestore;
  const configProjectId = firebaseConfig.projectId;
  const configDatabaseId = firebaseConfig.firestoreDatabaseId;

  console.log(`Initializing Firebase with Project: ${configProjectId}, Database: ${configDatabaseId}`);

  try {
    // 1. Check existing apps and handle project ID mismatch
    if (admin.apps.length > 0) {
      const defaultApp = admin.app();
      if (defaultApp.options.projectId !== configProjectId) {
        console.warn(`Default app project ID mismatch: ${defaultApp.options.projectId}. Deleting and re-initializing...`);
        // In some environments we can't delete the default app, so we'll use a named app instead
        firebaseApp = admin.apps.find(a => a?.name === 'applet') || 
                      admin.initializeApp({ projectId: configProjectId }, 'applet');
      } else {
        firebaseApp = defaultApp;
      }
    } else {
      firebaseApp = admin.initializeApp({
        projectId: configProjectId,
      });
    }
    
    console.log(`Firebase App initialized. Final Project ID: ${firebaseApp.options.projectId}`);

    // 2. Initialize Firestore with the specific app and database ID
    // CRITICAL: We MUST pass the firebaseApp instance to getFirestore
    try {
      if (configDatabaseId && configDatabaseId !== '(default)') {
        console.log(`Attempting to use named database: ${configDatabaseId}`);
        dbInstance = getFirestore(firebaseApp, configDatabaseId);
        // Test this specific database
        await dbInstance.collection('agents').limit(1).get();
        console.log(`Successfully connected to named database: ${configDatabaseId}`);
      } else {
        dbInstance = getFirestore(firebaseApp);
        await dbInstance.collection('agents').limit(1).get();
        console.log('Successfully connected to default database');
      }
    } catch (dbErr: any) {
      console.warn(`Database ${configDatabaseId} failed: ${dbErr.message}`);
      if (dbErr.message.includes('NOT_FOUND') || dbErr.code === 5) {
        console.log('Falling back to (default) database...');
        dbInstance = getFirestore(firebaseApp);
        await dbInstance.collection('agents').limit(1).get();
        console.log('Successfully connected to default database (fallback)');
      } else {
        throw dbErr;
      }
    }
    
    console.log('Firestore connectivity test successful');

  } catch (err: any) {
    console.error(`Primary Firebase initialization failed: ${err.message}`);
    
    // Fallback: Try to force a named app if not already tried
    try {
      console.log('Attempting named app fallback...');
      const fallbackApp = admin.apps.find(a => a?.name === 'fallback') || 
                          admin.initializeApp({ projectId: configProjectId }, 'fallback');
      
      firebaseApp = fallbackApp;
      dbInstance = configDatabaseId && configDatabaseId !== '(default)' 
        ? getFirestore(fallbackApp, configDatabaseId)
        : getFirestore(fallbackApp);
        
      await dbInstance.collection('agents').limit(1).get();
      console.log('Fallback initialization successful');
    } catch (err2: any) {
      console.error(`Fallback initialization also failed: ${err2.message}`);
      // Final attempt: just use whatever is available
      firebaseApp = admin.apps[0] || admin.initializeApp();
      dbInstance = getFirestore(firebaseApp);
    }
  }

  // Request Logging Middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API is reachable', 
      dbInitialized: !!dbInstance,
      projectId: firebaseApp.options.projectId,
      databaseId: (dbInstance as any)._databaseId || 'unknown'
    });
  });

  app.get('/api/audit-logs', async (req, res) => {
  try {
    if (!dbInstance) {
      throw new Error('Firestore not initialized');
    }

    const snapshot = await dbInstance
      .collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
  });

  // Proxy Endpoint for Agents
  app.post('/api/proxy', async (req, res) => {
    const { agentId, capabilityId, payload, targetUrl, ownerId } = req.body;
    
    console.log(`Proxying request for agent ${agentId} to ${targetUrl} (Owner: ${ownerId})`);
    
    try {
      if (!dbInstance) {
        throw new Error('Firestore Admin SDK not initialized');
      }

      // 1. Verify Agent and Capability
      const agentDoc = await dbInstance.collection('agents').doc(agentId).get();
      if (!agentDoc.exists) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      const agentData = agentDoc.data();
      if (agentData?.ownerId !== ownerId) {
        throw new Error('Unauthorized: Agent owner mismatch');
      }
      if (!agentData?.capabilities.includes(capabilityId)) {
        throw new Error('Agent does not have the requested capability');
      }

      // 2. Get Capability Details
      const capDoc = await dbInstance.collection('capabilities').doc(capabilityId).get();
      if (!capDoc.exists) {
        throw new Error(`Capability definition not found: ${capabilityId}`);
      }
      const capData = capDoc.data();
      const apiType = capData?.api || 'custom';

      // 3. Fetch Secret
      const secretKey = `${apiType.toUpperCase()}_KEY`;
      console.log(`Looking for secret: ${secretKey} for owner ${ownerId}`);
      
      const secretsQuery = await dbInstance.collection('secrets')
        .where('ownerId', '==', ownerId)
        .where('key', '==', secretKey)
        .limit(1)
        .get();

      let apiKey = '';
      if (!secretsQuery.empty) {
        apiKey = secretsQuery.docs[0].data().value;
        console.log(`Found secret for ${apiType}`);
      } else {
        console.warn(`No secret found for ${secretKey}`);
      }

      // 4. Forward Request
      let responseData;
      let status = 200;

      if (targetUrl.includes('example.com')) {
        responseData = { 
          message: `Simulated ${apiType} call successful`, 
          received: payload,
          usingKey: apiKey ? `${apiKey.substring(0, 4)}...` : 'none'
        };
      } else {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          if (apiKey) {
            if (apiType === 'gemini') {
              headers['x-goog-api-key'] = apiKey;
            } else if (apiType === 'stripe' || apiType === 'chatgpt') {
              headers['Authorization'] = `Bearer ${apiKey}`;
            } else {
              headers['X-API-Key'] = apiKey;
            }
          }

          const apiResponse = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });

          status = apiResponse.status;
          const contentType = apiResponse.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            responseData = await apiResponse.json();
          } else {
            responseData = { message: await apiResponse.text() };
          }
        } catch (fetchError: any) {
          console.error('External API fetch failed:', fetchError);
          status = 502;
          responseData = { error: 'Failed to reach target API', details: fetchError.message };
        }
      }

      // 5. Log the API call
      try {
        await dbInstance.collection('auditLogs').add({
          agentId: agentId || 'unknown',
          ownerId: ownerId || 'system',
          api: apiType,
          endpoint: targetUrl || 'unknown',
          status: status,
          timestamp: new Date().toISOString(),
          payload: JSON.stringify(payload)
        });
      } catch (logError: any) {
        console.error('Failed to create audit log entry:', logError);
      }

      res.status(200).json({
        success: status >= 200 && status < 300,
        agentId,
        capabilityId,
        apiType,
        secretFound: !!apiKey,
        data: responseData,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Proxy error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        details: error.stack,
        projectId: firebaseApp.options.projectId,
        databaseId: (dbInstance as any)._databaseId || 'unknown',
        adminApps: admin.apps.length,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Catch-all for unmatched API routes to prevent HTML fall-through
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
