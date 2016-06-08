exports.do = function (req, res, config) {
  // var clientDate = parseInt(req.headers['d-m-version'] || -1, 10);

  // TODO implement versioning
  res.set({
    'jam-handshake': true,
    // 'jam-versioning': true,
    'jam-no-updates': true
  });
  res.end();
};
