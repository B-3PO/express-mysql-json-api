const types = {
  ID: 'id',
  STRING: 'string',
  NUMBER: 'number',
  CURRENCY: 'currency',
  INT: 'int',
  BOOLEAN: 'boolean'
};


function processId(value) {
  if (value === null) { return null; }
  return value.toString();
}

function returnValue(value) {
  return value;
}

function processCurrency(value) {
  return parseFloat(value).toFixed(2);
}

function processBoolean(value) {
  return value === 1;
}

function revertBoolean(value) {
  return value === 'true' || value === true ? 1 : 0;
}




exports.types = types;
exports.convert = {
  id: processId,
  string: returnValue,
  number: returnValue,
  currency: processCurrency,
  int: returnValue,
  boolean: processBoolean
};

exports.revert = {
  id: returnValue,
  string: returnValue,
  number: returnValue,
  currency: returnValue,
  int: returnValue,
  boolean: revertBoolean
};
