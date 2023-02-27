// load .env data into process.env
require('dotenv').config();

// Web server config
const sassMiddleware = require('./lib/sass-middleware');
const express = require('express');
const morgan = require('morgan');

// Temp placeholder for db
const database = require('database.js');

const cookieSession = require('cookie-session');

const PORT = process.env.PORT || 8080;
const app = express();

app.set('view engine', 'ejs');

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(
  '/styles',
  sassMiddleware({
    source: __dirname + '/styles',
    destination: __dirname + '/public/styles',
    isSass: false, // false => scss, true => sass
  })
);
app.use(express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1']
}));

// Separated Routes for each Resource
// Note: Feel free to replace the example routes below with your own
const userApiRoutes = require('./routes/users-api');
const widgetApiRoutes = require('./routes/widgets-api');
const usersRoutes = require('./routes/users');
const managementRoutes = require('./routes/management')

// Mount all resource routes
// Note: Feel free to replace the example routes below with your own
// Note: Endpoints that return data (eg. JSON) usually start with `/api`
app.use('/api/users', userApiRoutes);
app.use('/api/widgets', widgetApiRoutes);
app.use('/users', usersRoutes);
app.use('/management', managementRoutes);
// Note: mount other resources here, using the same pattern above


// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).

app.get('/', (req, res) => {
  res.render('index');
});

//TODO: to be refactored -- testing purposes only

app.get('/menu', (req, res) => {

  const userId = req.session.userId;

  //! Privileged account check
  if (userId === 1) {

    database.getFullMenu()
      .then(menu => {
        const templateVars = {
          menu
        };
        res.render("edit-menu", templateVars);
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  }

  database.getFullMenu(req.query)
    .then(menu => {
      const templateVars = {
        menu
      };
      res.render("menu", templateVars);
    })
    .catch(e => {
      console.error(e);
      res.send(e);
    });

});

app.get('/orders', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res
      .status(401)
      .send("No currently logged in user detected");
    return;
  }

  //! Privileged account check
  if (userId === 1) {

    database.getAllOrders()
      .then(orders => {
        const templateVars = {
          orders
        };
        res.render("orders", templateVars);
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  }

  database.getAllUserOrders(userId)()
    .then(orders => {
      const templateVars = {
        orders
      };
      res.render("orders", templateVars);
    })
    .catch(e => {
      console.error(e);
      res.send(e);
    });

  });


app.get('/about', (req, res) => {

  res.render('about');

});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
