//? I realize this is a crude solution for getting the queries and connection together, but it's just to get a test run going

const db = require('./connection');
const { getFullMenu } = require('./queries/menu');
const { getUsers } = require('./queries/users');

module.exports = { db, getFullMenu, getUsers }