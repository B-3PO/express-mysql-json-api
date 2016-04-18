exports.do = function (req, res, config) {
  // var clientDate = parseInt(req.headers['d-m-version'] || -1, 10);

  // TODO implement versioning
  res.set({
    'd-m-handshake': true,
    'd-m-versioning': false
  });
  res.end();
};
