require('dotenv').config()
const CORS_HOSTS = [ process.env.SOCKET_ADMIN_DOMAIN ].concat(process.env.SOCKET_CLIENT_DOMAINS.split(','));
const crypto = require('crypto');
const { checkSchema, validationResult }  = require('express-validator');
const express = require('express');
const cors = require('cors')
const app = express();
const httpServer = require("http").Server(app);
const io = require('socket.io')(httpServer, {
  cors: {
    origin: CORS_HOSTS,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: [
      'content-type', 
      'authorization', 
      'x-authorization-id'
    ]
  }
});

/** SocketIO Admin UI */
const { instrument } = require("@socket.io/admin-ui");
instrument(io, {
  auth: {
    type: "basic",
    username: process.env.SOCKET_ADMIN_USER,
    password: process.env.SOCKET_ADMIN_PASSWORD_HASH,
    // password: "$2b$10$heqvAkYMez.Va6Et2uXInOnkCT6/uQj1brkrbyG3LpopDklcq7ZOS" // "changeit" encrypted with bcrypt

    /**
     * the password is encrypted with bcrypt
     * check scripts/generate_password.js
    */
  },
});

/** Database */
const db = require('./models/index.js');
const AuthClient = db.AuthClient;
const UserConnection = db.UserConnection;

var corsOptions = {
  origin: CORS_HOSTS,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

const ENVIRONMENT_CHANNELS = [
  'local',
  'development',
  'staging',
  'production'
];

const onConnection = async (socket) => {
  console.log("New client connected");
  
  const headers = socket.handshake.headers;
  const user_id = headers['x-authorization-id'] !== undefined && headers['x-authorization-id'] ? headers['x-authorization-id'] : null;
  const socket_id = socket.id;

  // Save user_id with connecttionId
  if(user_id && socket_id){    
    const data = {
      user_id: user_id,
      socket_id: socket_id
    };

    const condition = {
      user_id: user_id
    };

    try {
      const [record, created] = await UserConnection.upsert(
        data,               // Record to upsert
        condition,          // Condition to update
        { returning: true } // Return upserted record
      );
      console.log("Upserted user connection: ", record);
    } catch (error) {
      console.log("Error when save use connection: ", error);
    }
  }

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    
    if(user_id){
      try {
        UserConnection.destroy({
          where: {
            user_id: user_id
          }
        });
        console.log("Delete UserConnection record success.");
      } catch (error) {
        console.log("Error when delete UserConnection record!");
      }
    }
  });

  // Handle event: paas_deployment_log
  socket.on( 'paas_deployment_log', function( data ) {
    console.log(data.title,data.message);
    io.sockets.emit( 'show_log', { 
      title: data.title, 
      message: data.message, 
      icon: data.icon, 
    });
  });

}

function currentUserMiddleware(req, res, next) {
  const token = req.header("x-authorization") !== undefined && req.header("x-authorization") ? req.header("x-authorization") : null;
  if (token){
    AuthClient.findOne({ where: { access_token: token } }).then(user => {
      req.user = user;
      console.log(req.user);
      next();
    });
  }else{
    next();
  }
};

function isLoggedIn (req, res, next) {
  if (req.user) {
    next();
  } else {
    res.status = 401;
    return res.json({ message: "Unauthorized" });
  }
};

/**
 * Attach SocketIO to Expressjs
 */
app.set('io', io);
app.get('io').on('connection', onConnection);

/**
 * Configure Expressjs
 */
// Config CORS orign as global
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware
app.use(currentUserMiddleware);

function isEmpty(val){
  var isEmpty = false;
  if(val == null){
    isEmpty = true;
  }
  return isEmpty;
}

/**
 * RestAPI
*/
app.get('/', function(req, res) {
  return res.json({ message: new Date()});
});

// Notification
app.post('/logs', 
  isLoggedIn,
  checkSchema({
    // ENVIRONMENT_CHANNELS
    environment: {  
      in: ['body'],
      errorMessage: 'Log environment is required!',
      isString: true,
      exists: {
        options: {
          checkNull: true,
        },
        errorMessage: 'Log environment is missing!',
      },
      customSanitizer: {
        options: (value, {}) => {
          return value !== undefined && value !== null ? value.trim() : '';
        },
      },
    },
    // Log type: ['emergency','alert','critical','error','warning','notice','info,'debug']
    type: {
      in: ['body'],
      errorMessage: 'Log type is required!',
      isString: true,
      exists: {
        options: {
          checkNull: true,
        },
        errorMessage: 'Log type is missing!',
      },
      customSanitizer: {
        options: (value, {}) => {
          return value !== undefined && value !== null ? value.trim() : '';
        },
      },
    },
    // Log message
    message: {
      in: ['body'],
      errorMessage: 'Message is required!',
      isString: true,
      exists: {
        options: {
          checkNull: true,
        },
        errorMessage: 'Message is missing!',
      },
      customSanitizer: {
        options: (value, {}) => {
          return value !== undefined && value !== null ? value.trim() : '';
        },
      },
      isLength: {
        options: { min: 1 },
        errorMessage: 'Message should be at least 1 chars long!',
      },
    },
    // Log data
    data: {
      in: ['body'],
    },
  }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(403).json({ errors: errors.array() });
    }

    const environment = req.body.environment || null;
    const type = req.body.type || null;
    const message = req.body.message || null;
    const data = req.body.data || null;

    const payload = {
      environment: environment,
      type: type,
      message: message,
      data: data,
    }

    console.log(data);

    if(type && ENVIRONMENT_CHANNELS.indexOf(environment) > -1)
    {
      try {
        // to individual socketid (private message)
        req.app.get('io').emit(type, payload);
        return res.json({ 
          message: `Sent logs to channel: ${type}.`
        });
      } catch (error) {
        return res.status(404).json({
          message: `Error when logs to channel: ${environment}`,
          error: error,
        });
      }
    }

});

app.post('/logs/multiple', 
  isLoggedIn,
  async (req, res) => {
    
    const logs = req.body.logs;
    var countUserOffline = 0;
    var countUserOnline = 0;
    
    try {

      for (let i = 0; i < logs.length; i++) 
      {
        const item = logs[i];

        if( ! isEmpty(item.user_id) && ! isEmpty(item.title) && 
          ! isEmpty(item.message) && ! isEmpty(item.icon)
        ){

          const user_id = item.user_id;
          const data = {
            title: item.title,
            message: item.message,
            icon: item.icon,
          }
          
          const userConnection = await UserConnection.findOne({ where: { user_id: user_id } });        
        
          if (userConnection) 
          {
            req.app.get('io').to(userConnection.socket_id).emit('paas_deployment_log', data);
            countUserOnline += 1;
            console.log(`Sent logs to user: ${user_id}.`);
          }
          else
          {
            countUserOffline += 1;
            console.log(`User offline: ${user_id}.`);
          }
        }
        else
        {
          console.log(`Notification ${i} is invalid`);
        }        
      }

      return res.json({
        message: `Sent ${countUserOnline} logs!`,
        data: {
          online: countUserOnline,
          offline: countUserOffline,
        },
      });

    } catch (error) {
      return res.status(404).json({
        message: `Error when send multiple logs!`,
        error: error,
      });
    }
});

// Connection
app.get('/connections', isLoggedIn, async function(req, res) {
  const page_size = req.query.page_size !== undefined && req.query.page_size ? parseInt(req.query.page_size) : 10;
  const page_no = req.query.page_no !== undefined && req.query.page_no ? parseInt(req.query.page_no) : 1;
  const offset = page_size * (page_no - 1);

  const total = await UserConnection.count();
  const connections = await UserConnection.findAll({ offset: offset, limit: page_size });

  return res.json({
    message: "Retrieve user connections successfully.",
    total: total,
    current_page: page_no,
    last_page: Math.ceil(total / page_size),
    data: connections,
  })
});

// AuthClient
app.post('/auth/access_token', 
  checkSchema({
    client_id: {
      in: ['body'],
      errorMessage: 'Client ID is required!',
      isString: true,
      exists: {
        options: {
          checkNull: true,
        },
        errorMessage: 'Client ID is missing!',
      },
      customSanitizer: {
        options: (value, {}) => {
          return value !== undefined && value !== null ? value.trim() : '';
        },
      },
      isLength: {
        options: { min: 1 },
        errorMessage: 'Client ID should be at least 1 chars long!',
      },
    },
    client_secret: {
      in: ['body'],
      errorMessage: 'Client secret is required!',
      isString: true,
      exists: {
        options: {
          checkNull: true,
        },
        errorMessage: 'Client secret is missing!',
      },
      customSanitizer: {
        options: (value, {}) => {
          return value !== undefined && value !== null ? value.trim() : '';
        },
      },
      isLength: {
        options: { min: 1 },
        errorMessage: 'Client secret should be at least 1 chars long!',
      },
    },
  }),
  async (req, res) => {  
    const errors = validationResult(req);    
    if (!errors.isEmpty()) {
      return res.status(403).json({ errors: errors.array() });
    }

    const authClient = await AuthClient.findOne({ 
      where: { 
        client_id: req.body.client_id,
        client_secret: req.body.client_secret,
      } 
    });

    if (authClient) {
        try {
          const access_token = crypto.randomBytes(32).toString('hex');

          AuthClient.update({
            access_token: access_token,
          }, {
            where: { 
              client_id: authClient.client_id,
              client_secret: authClient.client_secret,
            } 
          });

          return res.json({
            message: `Create new access token successfully.`,
            data: {
              access_token: access_token,
            }
          });
        } catch (error) {
          return res.status(500).json({
            message: `Error when create new access token!`,
          });
        }
    }else{
      return res.status(401).json({
        message: `Client is unauthorized`
      });
    }
  }
);

/**
 * Start server
 */
httpServer.listen(process.env.APP_PORT, function() {
   console.log(`Listening on http://localhost:${process.env.APP_PORT}`);
});