var mysql = require('mysql');

var pools = {};


module.exports = {
  add: add,
  get: get,
  query: query
};



function get(name) {
  return pools[name];
}

function add(config) {
  // TODO validate config

  pools[config.database] = mysql.createPool({
    connectionLimit: config.connectionlimit || 100,
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
  });

  if (config.default === true || pools.default === undefined) {
    pools.default = pools[config.database];
  }
}


function query(query, callback) {
  // TODO allow for passing of db name
  pools.default.getConnection(function(err, connection) {
    connection.query(query, function(err, rows, fields) {
      if (err !== null) {
        console.log(err);
        connection.release();
        callback(err);
        return;
      }

      connection.release();
      callback(undefined, rows);
    });
  });
}
