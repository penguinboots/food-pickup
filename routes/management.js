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

      const dateString = templateVars.order.created_at;
      const dateObject = new Date(dateString);
      // const total = Number(templateVars.order.total);
      // templateVars.order.total = total;
      templateVars.order.created_at = dateObject;

      // res.send(templateVars.order);
      // return;

      res.render("vendor-order-view", templateVars);

    } catch (err) {
      console.error(err);
      res.status(500);
    }

  });

  // Accept an order, setting the pick-up time
  router.post('/orders/:id/accept', async (req, res) => {

    try {

      const orderId = req.params.id;
      const estimatedTime = req.body["est-time"];
      const userID = req.cookies["userId"];

      // Calculate estimated end time
      const now = new Date();
      let estimatedEndTime = new Date(now.getTime() + (estimatedTime * 60000));
      estimatedEndTime = estimatedEndTime.toISOString().replace(/\.\d+Z$/, '').replace('T', ' ');

      await database.acceptOrder(orderId, estimatedEndTime);

      // get order and user details to send to twillio
      const order = await database.getOrderById(req.params.id);
      const users = await database.getUser(userID);
      notifications(users[0], order, estimatedTime);

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

      // Calculate & format completed time
      const now = new Date();
      let completedTime = now.toISOString().replace(/\.\d+Z$/, '').replace('T', ' ');

      //!placeholder db query
      await database.completeOrder(orderId, completedTime);

      //TODO: Twilio client notification

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
