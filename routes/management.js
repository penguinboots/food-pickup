const notifications = require('./notifications');

module.exports = function(router, database) {

  router.get('/menu', (req, res) => {

    const username = req.cookies["userId"];

    // if (!username) {
    //   res
    //     .status(401)
    //     .send("No currently logged in user detected");
    //   return;
    // }

    //! Privileged account check
    // if (username !== 'PRIV USER') {
    //   res
    //       .status(403)
    //       .send("The current user does not have access to the requested resource!");
    //       return;
    // }

    database.getFullMenu()
      .then(menu => {
        const templateVars = {
          menu
        };
        res.render("edit-menu", templateVars);
        return;
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });

  });

  router.get('/orders', (req, res) => {
    const user = req.cookies["userId"];

    // if (!username) {
    //   res
    //     .status(401)
    //     .send("No currently logged in user detected");
    //   return;
    // }
    //! Privileged account check
    // if (username !== 'PRIV USER') {
    //   res
    //       .status(403)
    //       .send("The current user does not have access to the requested resource!");
    //   return;
    // }

    database.getOrders()
      .then(orders => {
        const templateVars = {
          orders,
          user
        };
        res.render("vendor-orders", templateVars);
        return;
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });

  });

  // Render specific order page
  router.get('/orders/:id', async (req, res) => {
    const user = req.cookies["userId"];

    try {

      //!placeholder queries for db

      const templateVars = {
        user,
        order: await database.getOrderById(req.params.id),
        orderItems: await database.getOrderItemsByOrderId(req.params.id),
      };

      // const total = Number(templateVars.order.total);
      // templateVars.order.total = total;
      // Formatting timestamps appropriately
      templateVars.order.created_at = new Date(templateVars.order.created_at);

      if (templateVars.order.completed_at) {
        templateVars.order.completed_at = new Date(templateVars.order.completed_at);
      }

      if (templateVars.order.estimated_end_time) {
        templateVars.order.estimated_end_time = new Date(templateVars.order.estimated_end_time);
      }

      if (templateVars.order.accepted_at) {
        templateVars.order.accepted_at = new Date(templateVars.order.accepted_at);
      }

      // res.send(templateVars.order);
      // return;

      res.render("vendor-order-view", templateVars);

    } catch (err) {
      console.error(err);
      res.status(500);
    }

  });

  // Helper for db timestamp formatting
  // function formatDateForPostgres(date) {
  //   const timeZoneOffset = date.getTimezoneOffset();
  //   const timeZoneOffsetHours = Math.floor(Math.abs(timeZoneOffset) / 60);
  //   const timeZoneOffsetMinutes = Math.abs(timeZoneOffset) % 60;
  //   const timeZoneOffsetString = (timeZoneOffset < 0 ? '+' : '-') +
  //     (timeZoneOffsetHours < 10 ? '0' : '') + timeZoneOffsetHours +
  //     ':' +
  //     (timeZoneOffsetMinutes < 10 ? '0' : '') + timeZoneOffsetMinutes;

  //   const timestamp = date.toLocaleString('en-US', { timeZoneName: 'short' })
  //     .replace(/, /g, ' ')
  //     .replace(/(AM|PM)$/, '$1 ') + timeZoneOffsetString;
  //   return timestamp.replace(' ', 'T');
  // }

  // Accept an order, setting the pick-up time
  router.post('/orders/:id/accept', async (req, res) => {

    try {

      const orderId = req.params.id;
      const estimatedTime = `${req.body["est-time"]} minutes`;

      // Calculate estimated end time
      // const now = new Date();
      // now.setMinutes(now.getMinutes() + estimatedTime);
      // let estimatedEndTime = formatDateForPostgres(now);

      await database.acceptOrder(orderId, estimatedTime);

      // get order and user details to send to twillio
      const order = await database.getOrderById(req.params.id);
      const users = await database.getUser(order.customer_id);
      const message = `Hello ${users[0].name}! Great news, your order (#${order.id}) has been accepted! We're so excited for you to try out your delicious meal. Your estimated pickup time is ${estimatedTime}, so please come by at your convenience. If you have any special requests or concerns, don't hesitate to let us know. Our team is dedicated to making your experience as enjoyable as possible. Thanks for choosing us, and we can't wait to see you soon!`;

      notifications(users[0], message);

      res.status(200).redirect('back');

    } catch (err) {
      console.error(err);
      res.status(500);
    }

  });


  // Reject an order
  router.post('/orders/:id/reject', async (req, res) => {

    try {

      //!placeholder queries for db

      const orderId = req.params.id;
      await database.rejectOrder(orderId);

      // twillio
      const order = await database.getOrderById(orderId);
      const users = await database.getUser(order.customer_id);
      const message = `Hi ${users[0].name}! We're sorry to let you know that we had to reject your order (#${order.id}) due to some unforeseen circumstances. But don't worry, we're here to help. If you have any questions or concerns, please don't hesitate to give us a call at xxx-xxx-xxx. We'll be happy to provide you with all the information you need and work with you to find a solution that meets your needs. Thanks for your understanding and cooperation, and we hope to hear from you soon!`;

      notifications(users[0], message);
      res.status(200).redirect('back');

    } catch (err) {
      console.error(err);
      res.status(500);
    }

  });

  // Mark an order as complete, notify guest
  router.post('/orders/:id/complete', async (req, res) => {

    try {

      const orderId = req.params.id;

      // // Calculate & format completed time
      // const now = new Date();
      // let completedTime = now.toISOString().replace(/\.\d+Z$/, '').replace('T', ' ');

      //!placeholder db query
      await database.completeOrder(orderId);

      //TODO: Twilio client notification
      // twillio
      const order = await database.getOrderById(orderId);
      const users = await database.getUser(order.customer_id);
      const message = `Hi ${users[0].name}! Just letting you know that your order (#${order.id}) is now complete and ready for pickup. We can't wait for you to try it out! Please come to the pickup area whenever you're ready, and our team will be happy to assist you. Thanks for choosing us and have a great day!`;
      
      notifications(users[0], message);

      res.status(200).redirect('back');

    } catch (err) {
      console.error(err);
      res.status(500);
    }

  });

  // Change menu (privileged access)
  router.post('/menu', (req, res) => {
    const username = req.cookies["username"];

    //! Privileged account check
    // if (username !== 'PLACEHOLDER FOR privileged ACC') {
    //   res
    //     .status(403)
    //     .send("The current user does not have access to the requested resource!");
    // }

    database.updateMenu({ ...req.body })
      .then(menu => {
        const templateVars = {
          menu
        };
        res.render('edit-menu', templateVars);
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  // Change menu item (privileged access)
  router.post('/menu/:id', (req, res) => {
    const username = req.cookies["username"];

    //! Privileged account check
    // if (username !== 1) {
    //   res
    //     .status(403)
    //     .send("The current user does not have access to the requested resource!");
    //   return;
    // }

    database.updateMenuItem({ ...req.body, menu_item_id: req.params.id })
      .then(menu_item => {
        templateVars = {
          menu_item
        };
        res.render('edit-menu', templateVars);
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  // Delete menu item (privileged access)
  router.post('/menu/:id/delete', (req, res) => {
    const username = req.cookies["username"];

    //! Privileged account check
    // if (username !== 1) {
    //   res
    //     .status(403)
    //     .send("The current user does not have access to the requested resource!");
    //   return;
    // }

    database.deleteMenuItem({ ...req.body, menu_item_id: req.params.id })
      .then(menu_item => {
        const templateVars = {
          menu_item
        };
        res.render('edit-menu', templateVars);
        return;
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });
  return router;
};
