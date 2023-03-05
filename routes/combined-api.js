const getItemById = function(itemId, database) {
  database.getMenu(itemId)
    .then(menu_item => menu_item)
    .catch(e => {
      console.error(e);
      res.send(e);
    });
};

module.exports = function(router, database) {

  // Get all users
  router.get('/users', (req, res) => {
    database.getUsers()
      .then(users => {
        res.send(users);
      })
      .catch(err => {
        res
          .status(500)
          .send("User retrieval unsuccessful");
      });
  });

  // Get specific users
  router.get('users/:id', (req, res) => {
    database.getUsers(req.params.id)
      .then(user => {
        res.send(user);
      })
      .catch(err => {
        res
          .status(500)
          .send("User retrieval unsuccessful");
      });
  });

  // Full menu retrieval
  router.get('/menu', (req, res) => {
    database.getFullMenu(req.query)
      .then(menu => res.send(menu))
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  // Specific menu item retrieval
  router.get('/menu/:id', (req, res) => {
    database.getMenuItem(req.params.id)
      .then(menu_item => res.send(menu_item))
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  // Cart retrieval
  router.get('/cart', (req, res) => {
    database.getCartItemsbyUserID(req.cookies["userId"])
      .then(cart => res.send(cart))
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  // Adding to cart (increment and initial placement)
  router.post('/cart/add', (req, res) => {

    const userId = req.cookies["userId"];

    database.getQuantityInCart(req.cookies["userId"], req.body.itemId)
      .then(quantityArray => {

        let quantity = quantityArray[0];
        const constructed_cart_item = { name: req.body.itemName, price: req.body.itemPrice, quantity: 0 };

        if (!quantity) {

          // Pass into database to create new cart item (initial add)
          database.createCartItem({ item_id: req.body.itemId, user_id: userId, quantity: 1 });
          constructed_cart_item.quantity = 1;
          res.send(constructed_cart_item);
          return;
        }

        quantity = quantity["quantity"];

        if (quantity === 0) {
          // Update existing zeroed cart item with 1
          // The update function is not passing in the userId in the DB for some reason
          database.updateCartItems({ user_id: userId, item_id: req.body.itemId, }, { quantity: 1 });
          ++constructed_cart_item.quantity;
          res.send(constructed_cart_item);
          return;
        }

        // Increment the cart
        quantity++;
        database.updateCartItems({ user_id: userId, item_id: req.body.itemId, }, { quantity: quantity });
        ++constructed_cart_item.quantity;
        res.send(constructed_cart_item);
        return;
      });
  });

  // Purging cart
  router.post('/cart/delete', async (req, res) => {

    try {

      const cart = await database.getCartItemsbyUserID(req.cookies["userId"]);

      const deletion_array = [];

      for (let item of cart) {
        if (item.quantity > 0) {
          deletion_array.push({ user_id: req.cookies["userId"], item_id: item["item_id"], quantity: 0 });
        }
      }

      await database.updateCartQuantities(deletion_array);
      
      res.status(200).redirect('back');

    } catch (err) {

      console.error(err);
      res.status(500).send("Error purging cart");

    }

  });

  return router;

}

