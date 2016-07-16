var mysql = require('mysql');

var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'tester',
  password: 'testTester',
  database: 'datamanager'
});

var secret;


function patch(data) { 
  var query = 'select locations.name, locations.city,locations.state,locations_reference.owner from locations_reference\n';
  query += 'left join locations on locations_reference.id = locations.id\n';
  query += 'where locations_reference.uuid=\'9d16411c-fe77-11e5-86aa-5e5517507c67\'';
  connection.query(query, function(error, rows, fields) {
    console.log(rows, data);
  });
}

// { data:
//    { id: '9d16411c-fe77-11e5-86aa-5e5517507c66',
//      type: 'locations',
//      attributes: { name: 'Bypass' } } }


module.exports = {
  patch: patch
};
