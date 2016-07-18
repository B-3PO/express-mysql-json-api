var structureManager = require('./structure');
var dataRetriever = require('./dataRetriever')

module.exports = {
  get: get
};




function get(req, resource, callback) {
  var include = req.query.include;
  var id = req.params.id;
  var structure = structureManager.get(resource, include, true);
  var query = dataRetriever.Create(structure, id);

  callback({});
}
