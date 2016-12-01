var resources = {};

module.exports = {
  define: define
};


function define(config) {
  validateConfig(config);
  config = transformConfig(config);
}


function validateConfig(config) {

}

function transformConfig(config) {
  return config;
}
