(function(){"use strict";/**
  * @ngdoc module
  * @name jsonApiManager
  */
angular
  .module('jsonapi-manager', [])
  .provider('jam', jamProvider)
  .constant('jamKeys', {
    STORED_DATA_PREFIX: '_jamData_'
  });



/**
  * @ngdoc provider
  * @name jamProvider
  * @module jsonapi-manager
  *
  * @description
  * Edit Base settings for all managers
  */
function jamProvider() {
  var provider = {
    /**
      * @ngdoc property
      * @name jsonApiManagerProvider#baseUrl
      * @module jsonApiManagerProvider
      * @description Set the base url for all calls
      */
    baseUrl: '',

    /**
      * @ngdoc property
      * @name jsonApiManagerProvider#headers
      * @module jsonApiManagerProvider
      * @description Object of base headers to be used on all calls
      */
    headers: undefined,
    $get: ['jamRequest', 'jamManager', jamService]
  };
  return provider;




  function jamService(jamRequest, jamManager) {
    jamRequest.baseUrl = provider.baseUrl;

    var service = {
      Create: Create
    };
    return service;


    /**
     * @ngdoc method
     * @name jsonApiManager#Create
     * @function
     *
     * @description
     * Create a new manager
     * The manager will allow you to bind properties to data
     * it will get and format date from the server. It will automate calles to the server
     *
     * @param {object} options - object containing options you can set
     * @param {function=} callback - function to be called when manager has completed handshake with server. It will pass back any errors
     * @param {string} options.url - url for the resource
     * @param {id=} options.id - if you want to retrieve a single resource
     * @param {array=} include - Array of string values for the data you want included with resource
     *
     * @return {manager} - json api manager object
     */
    function Create(options, callback) {
      return jamManager.Create(options, callback);
    }
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamBatch', jamBatch);


jamBatch.$inject = ['$q', 'jamPatch', 'jamRequest', 'jamHistory'];
function jamBatch($q, jamPatch, jamRequest, jamHistory) {
  var current;
  var queue = [];

  var service = {
    add: add
  };
  return service;


  function add(options, callback) {
    var patches = jamPatch.diff(options);
    if (patches.length === 0) { return; }
    var historyID = jamHistory.add(options, patches);
    options.oldValue = angular.copy(options.data);
    queue.push({
      complete: false,
      running: false,
      historyID: historyID,
      patches: patches,
      options: options,
      callback: callback
    });
    nextBatchItem();
  }


  // run next batch
  function nextBatchItem() {
    // when no current patch exists or the current batch is complete then fire the next batch if one exists
    if ((current === undefined || current.complete === true) && queue.length > 0) {
      runBatchItem(queue.shift());
    }
  }

  function runBatchItem(item) {
    item.running = true;
    runRequests(item.patches, function (error) {
      if (error === true) {
        void 0;
        rollback(item, function () {
          // TODO centralize errros
          item.callback({
            code: 3,
            message: 'There was an error processing your batch. Your changes have been reverted'
          });
          queue = [];
        });
        return;
      }


      item.complete = true;
      item.callback();
      nextBatchItem();
    });
  }



  function runRequests(items, callback) {
    // you have succefeully made it thorugh all requests in batch
    if (items.length === 0) {
      callback(undefined);
      return;
    }

    var callFail = false;
    var promises = [];
    var precedence = items[0].precedence;

    // call all items of the loswest precedence
    items.filter(function (item) {
      return item.precedence === precedence;
    }).forEach(function (patch) {
      promises.push(jamRequest.sendBatchItem(patch).then(function (response) {
        patch.success = true;
      }, function (error) {
        callFail = true;
        patch.success = false;
      }));
    });


    $q.all(promises).then(function () {
      if (callFail === true) {
        callback(true);
        return;
      }

      // run next set of calls with a heigher precedence
      runRequests(items.filter(function (item) {
        return item.precedence > precedence;
      }), callback);
    });
  }


  function rollback(item, callback) {
    // TODO rollback data, including any waiting batches
    jamHistory.undo(item.options, item.historyID);

    runRequests(reversePatches(item.patches), function () {
      item.complete = true;
      callback();
      nextBatchItem();
    });
  }


  // reverse patches and filter out any patches that did not succesfully call to the server
  function reversePatches(patches) {
    var newPatches = [];
    patches.filter(function (patch) {
      return patch.success === true;
    }).forEach(function (patch) {
      var newPatch = {
        op: patch.op,
        path: patch.path,
        precedence: patch.precedence,
      };

      if (patch.op === 'add' || patch.op === 'update') {
        newPatch.resource = {
          id: patch.resource.id,
          type: patch.resource.type
        };
        if (patch.op === 'add') { newPatch.op = 'delete'; }
        if (patch.op === 'update' && Object.keys(patch.resource.oldAttributes).length) {
          newPatch.resource.attributes = patch.resource.oldAttributes;
        }

        if (Object.keys(patch.resource.relationships).length) {
          newPatches.push({
            op: 'delete-relationship',
            path: patch.path,
            precedence: 0,
            resource: {
              relationships: patch.resource.relationships
            }
          });
        }

      } else if (patch.op === 'delete') {
        newPatch.op = 'add';
        newPatch.resource = patch.resource;
      } else if (patch.op === 'delete-relationship') {
        newPatch.op = 'update';
        newPatch.resource = patch.resource;
      }

      newPatches.push(newPatch);
    });
    return newPatches;
  }
}
}());
(function(){"use strict";/**
  * @ngdoc module
  * @name Manager
  * @description
  * Object returned when you call created
  */
angular
  .module('jsonapi-manager')
  .factory('jamData', jamData);


jamData.$inject = ['jamRequest', 'jamUtil', 'jamJSONAPI'];
function jamData(jamRequest, jamUtil, jamJSONAPI) {
  var service = {
    get: get,
    getById: getById
  };
  return service;



  // get all data based on schema and optional id
  function get(options, callback) {
    jamRequest.get(jamUtil.getCacheBustUrl(options.getUrl, Date.now())).then(function (response) {
      options.original = angular.copy(response.data);
      var parsedJSONAPI = jamJSONAPI.parse(response.data, options.typeScopes);
      options.data = parsedJSONAPI.data;
      options.oldValue = angular.copy(parsedJSONAPI.data);
      options.typeList = parsedJSONAPI.typeList || {};
      callback(undefined);
    }, function (error) {
      callback(error);
    });
  }


  // get data by a single id for top level resource. This will not work if you set am id in the managers options
  function getById(options, id, callback) {
    if (options.id !== undefined) {
      throw Error('jam.getById() can only be called if no id was specified in the menager options');
    }

    // TODO make this call add to the original as patches
    // we have to assume updated data can be coming down with this and current patches might be out of date
    var url = jamUtil.createGetUrl(options, id);
    jamRequest.get(jamUtil.getCacheBustUrl(url, Date.now())).then(function (response) {
      var combinedResponse = jamJSONAPI.combineData(options.original, response.data);
      options.original = angular.copy(combinedResponse);
      var parsedJSONAPI = jamJSONAPI.parse(combinedResponse, options.typeScopes);
      options.data = parsedJSONAPI.data;
      options.typeList = parsedJSONAPI.typeList || {};

      var patches = jamUtil.getPatches(options);
      if (patches !== undefined) {
        jamPatch.apply(options, patches);
      }

      options.oldValue = angular.copy(options.data);
      callback(undefined);
    }, function (error) {
      callback(error);
    });
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamHistory', jamHistory);


jamHistory.$inject = ['jamStorage', 'jamKeys', 'jamPatch'];
function jamHistory(jamStorage, jamKeys, jamPatch) {
  var service = {
    add: add,
    undo: undo,
    clear: clear
  };
  return service;


  function add(options, data) {
    var storedItem = jamStorage.get(jamKeys.STORED_DATA_PREFIX + options.managerId) || [];
    var date = Date.now();
    storedItem.push({data: data, date: date});
    jamStorage.set(jamKeys.STORED_DATA_PREFIX + options.managerId, storedItem);
    return date;
  }


  function undo(options, date) {
    var removed;
    var storedItem = jamStorage.get(jamKeys.STORED_DATA_PREFIX + options.managerId) || [];
    if (storedItem.length === 0) { return; }

    if (date === undefined) {
      removed = storedItem.splice(storedItem.length - 1, 1)[0];
    } else {
      removed = storedItem.filter(function (item) {
        return item.date === date;
      })[0];
    }
    jamStorage.set(jamKeys.STORED_DATA_PREFIX + options.managerId, storedItem);
    jamPatch.apply(options, removed.data, true);
    options.oldValue = angular.copy(options.data);
  }


  function clear(options) {
    jamStorage.remove(jamKeys.STORED_DATA_PREFIX + options.managerId);
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamJSONAPI', jamJSONAPI);


jamJSONAPI.$inject = ['jamUtil'];
function jamJSONAPI(jamUtil) {
  var getKeys = Object.keys;
  var defineProperty = Object.defineProperty;

  var service = {
    parse: parse,
    combineData: combineData
  };
  return service;


  // takes jsonapi data and returns a plain javascirpt object with all includes memory referenced.
  // It also returns a object that its keys are types and they contain arrays of all resources of that type. These are the same objects in the data
  function parse(payload, typeScopes) {
    var typeList = {};
    var parsedData = buildData(payload.data, payload.included, typeScopes, typeList, '');
    return {
      data: parsedData,
      typeList: typeList
    };
  }


  // combine 2 sets of raw jsonapi data
  function combineData(oldData, newData) {
    var combinedData = {};

    // palce data in an array and pass it back if no old data exists
    if (oldData === undefined) {
      newData.data = newData.data === null ? [] : [angular.copy(newData.data)];
      return newData;
    }
    combinedData.data = combineToArray(oldData.data, [newData.data]);
    combinedData.included = combineToArray(oldData.included, newData.included);

    return combinedData;
  }
  // create one deduped array of jsonapi resources
  // objects can be passed in, they will be combined into an array
  function combineToArray(oldData, newData) {
    if (!oldData || !oldData.length) {
      if (newData === undefined || newData === null) { return []; }
      else { return [].concat(newData); }
    }
    if (newData === undefined || newData === null) { return oldData; }

    var i;
    var combinedArray = [].concat(oldData).concat(newData);
    var index = 0;
    var length = combinedArray.length;
    combinedArray = combinedArray.filter(function (item) {
      index += 1;
      i = index;
      while (i < length) {
        if (item.id === combinedArray[i].id) { return false; }
        i += 1;
      }
      return true;
    });

    return combinedArray;
  }




  // return an object or array containing a nested object built from jsonapi data
  function buildData(data, included, typeScopes, destType, path, destData) {
    var newObj;
    var keys;
    var key;
    var i;
    var length;
    var includeItem;

    // if data is an array pass the sub abjects back in
    if (data instanceof Array) {
      destData = [];
      var item = data.pop();
      while (item !== undefined) {
        buildData(item, included, typeScopes, destType, path, destData);
        item = data.pop();
      }

    } else if (typeof data === 'object') {
      // add resouce
      newObj = data === null ? null : getResource(data, destType, typeScopes, path);
      if (destData instanceof Array) {
        destData.push(newObj);
      } else {
        destData = newObj;
      }

      // default all relationships and pass them back in for processing
      if (data && newObj && data.relationships) {
        keys = getKeys(data.relationships);
        key = keys.pop();
        while (key !== undefined) {
          if (data.relationships[key].data instanceof Array) {
            newObj[key] = []; // defualt value
            i = 0;
            length = data.relationships[key].data.length;
            while (i < length) {
              includeItem = getInclude(data.relationships[key].data[i], included, destType);
              buildData(includeItem, included, typeScopes, destType, path+'/'+key, newObj[key]);
              i += 1;
            }

          } else {
            newObj[key] = null; // defualt value
            includeItem = getInclude(data.relationships[key].data, included, destType);
            buildData(includeItem, included, typeScopes, destType, path+'/'+key, newObj[key]);
          }
          key = keys.pop();
        }
      }
    }

    return destData;
  }





  // gets include resource from typelist and if not found then it will pull it from the raw data
  function getInclude(obj, included, typeList) {
    if (!obj || !included) { return undefined; }
    var typeObj = findInTypeList(obj, typeList);
    if (typeObj !== undefined) { return typeObj; }

    var i = 0;
    var length = included.length;
    while (i < length) {
      if (included[i].type === obj.type && included[i].id === obj.id) {
        return included[i];
      }
      i += 1;
    }

    return undefined;
  }


  // gets resource from typelist or creates one and ads it to the type list and add a typeScope to it
  function getResource(obj, typeList, typeScopes, path) {
    if (obj === null) { return null; }
    if (obj.typeScope !== undefined) { return obj; }

    var newObj;
    var typeScope;
    var typeObj = findInTypeList(obj, typeList);
    // if typeObj exists then we will pass that same one back. This means objects used more than once are the same objects
    if (typeObj !== undefined) { return typeObj; }

    if (typeList[obj.type] === undefined) { typeList[obj.type] = []; }
    newObj = obj.attributes;
    newObj.id = obj.id;
    typeScope = getTypeScope(obj.type, typeScopes);
    jamUtil.defaultRelationships(newObj, typeScope);

    // add typeScope
    defineProperty(newObj, 'typeScope', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: typeScope
    });

    typeList[obj.type].push(newObj);
    return newObj;
  }


  // get typeScope by type name
  function getTypeScope(type, typeScopes) {
    if (typeScopes === undefined) { return undefined; }

    // try to match path
    var i = 0;
    var length = typeScopes.length;
    while (i < length) {
      if (typeScopes[i].type === type) { return typeScopes[i]; }
      i += 1;
    }
    return undefined;
  }


  // try to find a type by id, otherwise return undefined
  function findInTypeList(obj, typeList) {
    if (!obj || !typeList || !typeList[obj.type]) { return undefined; }
    typeList = typeList[obj.type];
    var i = 0;
    var length = typeList.length;
    while (i < length) {
      if (typeList[i].id === obj.id) { return typeList[i]; }
      i += 1;
    }
    return undefined;
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamLZString', jamLZString);




function jamLZString () {

  var service = {
    compressToUTF16: compressToUTF16,
    decompressFromUTF16: decompressFromUTF16,
  };
  return service;



  function compressToUTF16(input) {
    if (input === null) { return ''; }

    var c;
    var length;
    var i = 0;
    var output = '';
    var current = 0;
    var status = 0;

    input = compress(input);
    length = input.length;

    while (i < length) {
      c = input.charCodeAt(i);
      i++;

      switch (status) {
        case 0:
          output += String.fromCharCode((c >> 1) + 32);
          current = (c & 1) << 14;
          status++;
          break;

        case 14:
          output += String.fromCharCode((current + (c >> 15)) + 32, (c & 32767) + 32);
          status = 0;
          break;

        default:
          output += String.fromCharCode((current + (c >> (status + 1))) + 32);
          current = (c & ((2 << status) - 1)) << (14 - status);
          status++;
          break;
      }
    }

    return output + String.fromCharCode(current + 32);
  }


  function decompressFromUTF16(input) {
    if (input === null) { return ''; }

    var c;
    var i = 0;
    var output = '';
    var current = 0;
    var length = input.length;


    while (i < length) {
      c = input.charCodeAt(i) - 32;

      if ((i & 15) !== 0) {
        output += String.fromCharCode(current | (c >> (15 - (i & 15))));
      }

      current = (c & ((1 << (15 - (i & 15))) - 1)) << ((i+1) & 15);

      i++;
    }

    return decompress(output);
  }


  function writeBit(value, data) {
    data.val = (data.val << 1) | value;

    if (data.position == 15) {
      data.position = 0;
      data.string += String.fromCharCode(data.val);
      data.val = 0;
    } else {
      data.position++;
    }
  }

  function writeBits(numBits, value, data) {
    var i = 0;
    var length = numBits;

    if (typeof(value) == "string") { value = value.charCodeAt(0); }

    while (i < length) {
      i++;

      writeBit(value & 1, data);
      value = value >> 1;
    }
  }

  function produceW(context) {
    if (context.dictionaryToCreate[context.w]) {
      if (context.w.charCodeAt(0) < 256) {
        writeBits(context.numBits, 0, context.data);
        writeBits(8, context.w, context.data);
      } else {
        writeBits(context.numBits, 1, context.data);
        writeBits(16, context.w, context.data);
      }
      decrementEnlargeIn(context);
      delete context.dictionaryToCreate[context.w];
    } else {
      writeBits(context.numBits, context.dictionary[context.w], context.data);
    }
    decrementEnlargeIn(context);
  }

  function decrementEnlargeIn(context) {
    context.enlargeIn--;

    if (context.enlargeIn === 0) {
      context.enlargeIn = Math.pow(2, context.numBits);
      context.numBits++;
    }
  }

  function compress(uncompressed) {
    if (uncompressed === null || uncompressed === undefined) {
      return '';
    }

    var context = {
      dictionary: {},
      dictionaryToCreate: {},
      c: '',
      wc: '',
      w: '',
      enlargeIn: 2, // Compensate for the first entry which should not count
      dictSize: 3,
      numBits: 2,
      result: '',
      data: {string: '', val: 0, position: 0}
    };

    var i = 0;
    var length = uncompressed.length;

    while (i < length) {
      context.c = uncompressed.charAt(i);
      i++;

      if (!context.dictionary[context.c]) {
        context.dictionary[context.c] = context.dictSize++;
        context.dictionaryToCreate[context.c] = true;
      }

      context.wc = context.w + context.c;
      if (context.dictionary[context.wc]) {
        context.w = context.wc;
      } else {
        produceW(context);
        // Add wc to the dictionary.
        context.dictionary[context.wc] = context.dictSize++;
        context.w = String(context.c);
      }
    }

    // Output the code for w.
    if (context.w !== '') {
      produceW(context);
    }

    // Mark the end of the stream
    writeBits(context.numBits, 2, context.data);

    // Flush the last char
    while (true) {
      context.data.val = (context.data.val << 1);
      if (context.data.position == 15) {
        context.data.string += String.fromCharCode(context.data.val);
        break;
      }
      else context.data.position++;
    }

    return context.data.string;
  }

  function readBit(data) {
    var res = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) {
      data.position = 32768;
      data.val = data.string.charCodeAt(data.index++);
    }
    return res > 0 ? 1 : 0;
  }

  function readBits(numBits, data) {
    var res = 0;
    var maxpower = Math.pow(2, numBits);
    var power = 1;
    while (power != maxpower) {
      res |= readBit(data) * power;
      power <<= 1;
    }
    return res;
  }

  function decompress(compressed) {
    if (compressed === '') {
      return null;
    }

    if (compressed === null || compressed === undefined) {
      return '';
    }

    var next;
    var result;
    var w;
    var c;
    var i = 0;
    var dictionary = {};
    var enlargeIn = 4;
    var dictSize = 4;
    var numBits = 3;
    var entry = '';
    var errorCount = 0;
    var data = {string: compressed, val: compressed.charCodeAt(0), position: 32768, index: 1};

    while (i < 3) {
      dictionary[i] = i;
      i++;
    }

    next = readBits(2, data);
    switch (next) {
      case 0:
        c = String.fromCharCode(readBits(8, data));
        break;
      case 1:
        c = String.fromCharCode(readBits(16, data));
        break;
      case 2:
        return '';
    }

    dictionary[3] = c;
    w = result = c;
    while (true) {
      c = readBits(numBits, data);

      switch (c) {
        case 0:
          if (errorCount++ > 10000) return "Error";
          c = String.fromCharCode(readBits(8, data));
          dictionary[dictSize++] = c;
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          c = String.fromCharCode(readBits(16, data));
          dictionary[dictSize++] = c;
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result;
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result += entry;

      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }

}
}());
(function(){"use strict";/**
  * @ngdoc module
  * @name Manager
  * @description
  * Object returned when you call created
  */
angular
  .module('jsonapi-manager')
  .factory('jamManager', jamManager);


jamManager.$inject = ['$q', 'jamUtil', 'jamData', 'jamPatch', 'jamBatch', 'jamHistory'];
function jamManager($q, jamUtil, jamData, jamPatch, jamBatch, jamHistory) {
  var service = {
    Create: Create
  };
  return service;



  function Create(options) {
    validateOptions(options);
    options = angular.copy(options); // copy so options cannot be manipulated from experior
    buildOptions(options);
    return constructManager(options);
  }




  // -- Cerate and return manager -----
  function constructManager(options) {
    var inited = false;
    var initDefer = $q.defer();
    var bindings = [];

    var manager = {
      get: get,
      getById: getById,
      bind: bind,
      unbind: unbind,
      registerScope: registerScope,
      destroy: destroy,
      applyChanges: applyChanges,
      removeChanges: removeChanges
    };
    init();
    return manager;


    function init() {
      // defualt the data and includes so bindings can run
      options.data = options.id ? {} : [];
      options.oldValue = options.id ? {} : [];
      options.typeList = {};

      // if schema is passed in then build scopes of that
      if (options.schema) {
        options.typeScopes = buildtypeScopes(options.schema, options.url);
        // convert scopes from object and feeze the objects so they cannot be manipulated
        options.typeScopes = Object.keys(options.typeScopes).map(function (key) {
          Object.freeze(options.typeScopes[key]);
          return options.typeScopes[key];
        });

        inited = true;
        initDefer.resolve(); // resolve the promise so gets can run
      } else {
        // call for schema
      }
    }



    /**
     * @ngdoc method
     * @name Manager#get
     * @function
     *
     * @description
     * get data from server
     *
     * @param {function=} callback - function to be called when data is recieved. It will pass back any errors
     */
    function get(callback) {
      initDefer.promise.then(function () { // resolves after scopes have been built
        jamHistory.clear(options);
        jamData.get(options, function (error) {
          if (error === undefined) { updateAllBindings(); }
          if (typeof callback === 'function') { callback(error); }
        });
      });
    }


    /**
     * @ngdoc method
     * @name Manager#getById
     * @function
     *
     * @description
     * get data from server by specific id and add it to current data
     *
     * @param {string} id - uid of the specific resource
     * @param {function=} callback - function to be called when data is recieved. It will pass back any errors
     */
    function getById(id, callback) {
      initDefer.promise.then(function () { // resolves after scopes have been built
        jamData.getById(options, id, function (error) {
          if (error === undefined) { updateAllBindings(); }
          if (typeof callback === 'function') { callback(error); }
        });
      });
    }




    /**
     * @ngdoc method
     * @name Manager#applyChanges
     * @function
     *
     * @description
     * Submit any changed made to server
     *
     * @param {function=} callback - function to be called when changes are applied. It will pass back any errors
     */
    // will callback on complete and pass in error if one exists
    function applyChanges(callback) {
      jamBatch.add(options, function (error) {
        updateAllBindings();
        if (typeof callback === 'function') { callback(error); }
      });
    }



    /**
     * @ngdoc method
     * @name Manager#removeChanges
     * @function
     *
     * @description
     * remove any changes made tht have not been submitted by applyChanges
     */
    function removeChanges() {
      var patches = jamPatch.diff(options);
      if (patches.length > 0) {
        jamPatch.apply(options, patches, true);
        options.oldValue = angular.copy(options.data);
        updateAllBindings();
      }
    }






    // --- Bind variables ----

    /**
     * @ngdoc method
     * @name Manager#bind
     * @function
     *
     * @description
     * Bind data to property of an object
     * You can optionally pass in a type to get all of a given type
     * You can optionally pass in a id to get one of a given type
     *
     * @param {object} object - object that you will bind properties to. This will most likley be the scope or controller
     * @param {string} property - string name of property to set variable on
     * @param {string=} type - Pass in type name to get all of that type
     * @param {string=} id - pass in an id to get a single object of a given type
     */
    function bind(obj, property, type, id) {
      if (typeof obj !== 'object' || obj === null) {
        throw Error('jam.bind() requires a object to be passed as the first parameter');
      }
      if (typeof property !== 'string') {
        throw Error('jam.bind() requires `property` attribute as the second parameter');
      }

      var binding = {
        obj: obj,
        property: property,
        type: type,
        id: id
      };
      bindings.push(binding);
      if (inited === true) { updateBinding(binding); }
    }



    /**
     * @ngdoc method
     * @name Manager#unbind
     * @function
     *
     * @description
     * Unbind an entire object or a specific property
     *
     * @param {object} object - object that you will bind properties to. This will most likley be the scope or controller
     * @param {string} property - string name of property to set variable on
     */
    function unbind(obj, property) {
      var i = 0;
      var length = bindings.length;

      while (i < length) {
        if (bindings[i].obj === obj && (property === undefined || bindings[i].property === property)) {
          // set bound property to undefined
          bindings[i].obj[bindings[i].property] = undefined;
          bindings[i] = undefined;

          // remove from bindings list
          bindings.splice(i, 1);
          length -= 1;
          i -= 1;
        }
        i += 1;
      }
    }


    function unbindAll() {
      var i = 0;
      var length = bindings.length;
      while (i < length) {
        // set bound property to undefined
        bindings[i].obj[bindings[i].property] = undefined;
        bindings[i] = undefined;
        i += 1;
      }
      bindings = [];
    }

    function updateAllBindings() {
      var i = 0;
      var length = bindings.length;
      while (i < length) {
        // remove binding if it cannot be updated
        if (updateBinding(bindings[i]) === false) {
          bindings.splice(i, 1);
          length -= 1;
          i -= 1;
        }
        i += 1;
      }
    }

    function updateBinding(binding) {
      // if the passed in object have been indefined kick back false
      if (binding.obj === undefined) { return false; }
      if (binding.type !== undefined) {
        binding.obj[binding.property] = getBindingType(binding);
      } else {
        binding.obj[binding.property] = options.data;
      }
      return true;
    }


    function getBindingType(binding) {
      var typeList = options.typeList[binding.type];
      if (binding.id === undefined) { return typeList; }
      return getTypeById(typeList, binding.id);
    }

    function getTypeById(typeList, id) {
      typeList = typeList || [];

      var i = 0;
      var length = typeList.length;
      while (i < length) {
        if (typeList[i].id === id) {
          return typeList[i];
        }
        i += 1;
      }
    }


    /**
     * @ngdoc method
     * @name Manager#registerScope
     * @function
     *
     * @description
     * Pass in a scope and an array of any other object you bound data to, and they will automatically be unbound when scope is destroyed
     *
     * @param {scope} scope - scope that will be watched for destroy
     * @param {boolean=} removeChanges - By default when the scope is destroyed all changes not applied will get removed. Pass in false to not remove changes
     * @param {array|object} boundObjs - pass in any other bound object(Like the controller) to unbind on scope destroy
     */
    function registerScope(scope, _removeChanges, boundObjs) {
      if (typeof scope !== 'object' || scope === null || scope.$watch === undefined) {
        throw Error('Must pass in a scope object');
      }

      boundObjs = boundObjs ? [].concat(boundObjs) : [];
      scope.$on('$destroy', function () {
        unbind(scope);
        // call unbind indirectly so the second param of forEach does not get passed
        boundObjs.forEach(function (obj) { unbind(obj); });
        if (_removeChanges !== false) { removeChanges(); }
      });
    }


    /**
     * @ngdoc method
     * @name Manager#destroy
     * @function
     *
     * @description
     * Kill any watcher, unbind all data, set data to undefined
     */
    function destroy() {
      unbindAll();
      options = undefined;
    }

  }





  // --- buidl typeScopes based on schema
  function buildtypeScopes(schema, path, parent, obj) {
    obj = obj || {};
    path = path || '';

    // create base type object if none exists
    if (obj[schema.type] === undefined) {
      obj[schema.type] = {
        type: schema.type,
        url: path,
        maps: [],
        parents: []
      };
      if (schema.meta) { obj[schema.type].meta = angular.copy(schema.meta); }
    }

    // add map to typeScope. this is used to find the correct typescope bassed on the objects properties
    obj[schema.type].maps.push(parent === undefined ? '' : (parent.maps[parent.maps.length-1] + '/' + path).replace(/^\//, ''));

    // if parent scope exists then make refernces to and from it
    if (parent) {
      obj[schema.type].parents.push(parent);
      // add typeScope to parent scopes relationships
      if (parent.relationships === undefined) { parent.relationships = {}; }
      parent.relationships[path] = obj[schema.type];
    }

    // run on all relationships
    if (schema.relationships) {
      var keys = Object.keys(schema.relationships);
      var key = keys.pop();
      while (key !== undefined) {
        buildtypeScopes(schema.relationships[key], key, obj[schema.type], obj);
        key = keys.pop();
      }
    }

    return obj;
  }



  function buildOptions(options) {
    // main get url bassed on schema and optional passed in id
    options.getUrl = jamUtil.createGetUrl(options);
    // create hex hash. used to refernce this manger
    options.managerId = jamUtil.hashString(options.getUrl);
  }


  function validateOptions(options) {
    if (typeof options !== 'object' || options === null) {
      throw Error('jam.Create() expcts a paramter `options` of type `object`');
    }
    if (options.url === undefined) {
      throw Error('jam.Create() `options` requires a `url` propert');
    }
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamPatch', jamPatch);


jamPatch.$inject = ['jamUtil'];
function jamPatch(jamUtil) {
  var getKeys = Object.keys;
  var reversePatchFuncs = {
    update: reverseUpdate,
    add: reverseAdd,
    delete: reverseDelete,
    relationship: reverseRelationship,
    'delete-relationship': reverseDeleteRelationship
  };

  var service = {
    diff: diff,
    apply: apply
  };
  return service;



  // --- Diff ---------------------------------------
  // ------------------------------------------------


  function apply(options, patches, reverse) {
    if (reverse === true) {
      patches = reversePatches(patches);
    }

    var i = 0;
    var length = patches.length;
    while (i < length) {
      if (options.data instanceof Array) {
        applyArray(options.data, patches[i], '', options);
      } else {
        applyObject(options.data, patches[i], '', options);
      }
      i += 1;
    }
  }


  function applyArray(data, patch, path, options) {
    var i;
    var length;

    if (patch.path === path) {
      if (patch.op === 'add') {
        applyAddPath(patch, data, path, options);
        applyRelationships(data, patch, options.typeList);
        return true;

      // find and splice out resource
      } else if (patch.op === 'delete') {
        applyArrayDeletePatch(data, patch, options);
        return true;
      }
    }

    // run patch apply on objects
    i = 0;
    length = data.length;
    while (i < length) {
      if (applyObject(data[i], patch, path, options) === true) { return true; }
      i += 1;
    }
  }

  function applyObject(data, patch, path, options) {
    if (typeof data !== 'object' || data === null || data.id === undefined) { return; }
    path = formatPath(path, data.id);
    if (patch.path === path) {
      if (patch.op === 'update' && patch.resource.id === data.id) {
        applyUpdatePatch(data, patch);
        applyRelationships(data, patch, options.typeList);
        return true;
      } else if (patch.op === 'relationship' && patch.resource.id === data.id) {
        applyRelationships(data, patch, options.typeList);
        return true;
      } else if (patch.op === 'delete' && patch.resource.id === data.id) {
        void 0;
        // applyDeletePatch(data, patch, options);
        // return true;
      }
    }



    var nextPath;
    var keys = getFilteredKeys(data);
    var key = keys.pop();
    while (key !== undefined) {
      nextPath = formatPath(path, key);

      if (patch.path === nextPath && patch.op === 'delete-relationship') {
        applyDeleteRelationshipsPatch(data, patch, options);
        return true;
      }

      if (data[key] instanceof Array) {
        if (applyArray(data[key], patch, nextPath, options) === true) { return true; }
      } else {
        if (applyObject(data[key], patch, nextPath, options) === true) { return true; }
      }

      key = keys.pop();
    }
  }



  function applyDeletePatch(data, patch, options) {

  }

  function applyUpdatePatch(data, patch) {
    if (patch.resource.attributes && getKeys(patch.resource.attributes).length) {
      angular.merge(data, patch.resource.attributes);
    }
  }

  function applyDeleteRelationshipsPatch(data, patch, options) {
    var key = patch.path.split('/').pop();
    if (patch.resource.data instanceof Array) {
      if (data[key] === undefined) { return; }
      patch.resource.data.forEach(function (patchData) {
        var i = 0;
        var length = data[key].length;
        while (i < length) {
          if (data[key][i].id === patchData.id) {
            data[key].splice(i, 1);
            return;
          }
          i += 1;
        }
      });
    } else {
      data[key] = null;
      checkForRemovalFromTypeList(patch.resource.data.id, patch.resource.data.type, options);
    }
  }

  function checkForRemovalFromTypeList(id, type, options) {
    var i;
    var length;

    if (traverseForResource(options.data, id, type) !== true) {
      i = 0;
      length = options.typeList[type].length;
      while (i < length) {
        if (options.typeList[type][i].id === id) {
          options.typeList[type].splice(i, 1);
          return;
        }
        i += 1;
      }
    }
  }

  function applyArrayDeletePatch(data, patch, options) {
    var i = 0;
    var length = data.length;
    while (i < length) {
      if (data[i].id === patch.resource.id) {
        data.splice(i, 1);
        checkForRemovalFromTypeList(patch.resource.id, patch.resource.type, options);
        return;
      }
      i += 1;
    }
  }

  function applyAddPath(patch, data, path, options) {
    var obj = angular.copy(patch.resource.attributes);
    obj.id = patch.resource.id;
    Object.defineProperty(obj, 'typeScope', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: jamUtil.getTypeScopeByPath(path, options.typeScopes)
    });
    options.typeList[patch.resource.type].push(obj);
    data.push(obj);
  }

  function applyRelationships(data, patch, typeList) {
    var relKeys = getKeys(patch.resource.relationships || {});
    relKeys.forEach(function (key) {
      if (patch.resource.relationships[key].data instanceof Array) {
        data[key] = data[key] || [];
        patch.resource.relationships[key].data.forEach(function (sub) {
          data[key].push(findById(sub.id, typeList[sub.type]));
        });
      } else {
        data[key] = findById(patch.resource.relationships[key].data.id, typeList[patch.resource.relationships[key].data.type]);
      }
    });
  }


  function reversePatches(patches) {
    return patches.map(function (patch) {
      return reversePatchFuncs[patch.op](patch);
    }).reduce(function (a, b) {
      return a.concat(b);
    }, []);
  }

  function reverseUpdate(patch) {
    var newPatch = angular.copy(patch);
    newPatch.resource.attributes = patch.resource.oldAttributes;
    newPatch.resource.oldAttributes = patch.resource.attributes;
    return newPatch;
  }

  function reverseAdd(patch) {
    patch.op = 'delete';
    return patch;
  }

  function reverseDelete(patch) {
    patch.op = 'add';
    return patch;
  }

  function reverseRelationship(patch) {
    var newPatches = [];

    getKeys(patch.resource.relationships).forEach(function (key) {
      if (patch.resource.relationships[key].data instanceof Array) {
        patch.resource.relationships[key].data.forEach(function (sub) {
          newPatches.push({
            op: 'delete-relationship',
            path: patch.path+'/'+key,
            url: patch.url+'/'+patch.resource.id+'/relationships/'+key,
            resource: {
              id: sub.id,
              type: sub.type,
              data: [{
                id: sub.id,
                type: sub.type
              }]
            }
          });
        });
      } else {
        newPatches.push({
          op: 'delete-relationship',
          path: patch.path+'/'+key,
          url: patch.url+'/'+patch.resource.id+'/relationships/'+key,
          resource: {
            id: patch.resource.relationships[key].data.id,
            type: patch.resource.relationships[key].data.type,
            data: patch.resource.relationships[key].data
          }
        });
      }
    });
    return newPatches;
  }

  function reverseDeleteRelationship(patch) {
    var splitUrl = patch.url.split('/');
    var url = splitUrl.shift();
    var id = splitUrl.shift();
    var key = splitUrl.pop();
    var newPatch = {
      op: 'relationship',
      path: patch.path.split('/').shift(),
      url: patch.url.split('/').shift(),
      resource: {
        id: id,
        // type: jamUtil.getTypeScopeByPath(patch.path, typeScopeList),
        relationships: {}
      }
    };
    newPatch.resource.relationships[key] = {
      data: patch.resource.data
    };
    return newPatch;
  }










  // --- Diff ---------------------------------------
  // ------------------------------------------------


  function diff(options) {
    var patches = [];
    generatePataches(options.data, options.oldValue, patches, '', options);
    patches = reducePatches(patches, options.data);
    return patches;
  }


  function reducePatches(patches, data) {
    var obj = {};
    patches.forEach(function (patch) {
      if (obj[patch.resource.id] === undefined) {
        obj[patch.resource.id] = patch;
      } else {
        // combine updates
        if (patch.op === 'update' && obj[patch.resource.id].op === 'update') {
          angular.extend(obj[patch.resource.id].resource.attributes, patch.resource.attributes);
          angular.extend(obj[patch.resource.id].resource.oldAttributes, patch.resource.oldAttributes);

        // combine relationships
        } else if (patch.op === 'relationship' && obj[patch.resource.id].op === 'relationship') {
          angular.merge(obj[patch.resource.id].resource.relationships, patch.resource.relationships);

        // combine relationships
        } else if (patch.op === 'delete-relationship' && obj[patch.resource.id].op === 'delete-relationship') {
          angular.merge(obj[patch.resource.id].resource.data, patch.resource.data);

        // combine a match of update and relationship
        } else if ((patch.op === 'update' || patch.op === 'relationship') && (obj[patch.resource.id].op === 'update' || obj[patch.resource.id].op === 'relationship')) {
          if (obj[patch.resource.id].op === 'update') {
            obj[patch.resource.id].resource.relationships = patch.resource.relationships;
          } else {
            patch.resource.relationships = obj[patch.resource.id].resource.relationships;
            obj[patch.resource.id] = patch;
          }

        // combine add with relationships
        } else if ((patch.op === 'add' || patch.op === 'relationship') && (obj[patch.resource.id].op === 'add' || obj[patch.resource.id].op === 'relationship')) {
          if (obj[patch.resource.id].op === 'add') {
            obj[patch.resource.id].resource.relationships = patch.resource.relationships;
          } else {
            patch.resource.relationships = obj[patch.resource.id].resource.relationships;
            obj[patch.resource.id] = patch;
          }
        }
      }
    });
    // convert object to array
    return getKeys(obj).map(function (key) { return obj[key]; });
  }


  function generatePataches(newValue, oldValue, patches, path, options, parent) {
    if (oldValue instanceof Array) {
      diffArray(newValue, oldValue, patches, path, options, parent);
    } else {
      diffObj(newValue, oldValue, patches, path, options, parent);
    }
  }


  // expects an array of resource objects
  function diffArray(newValue, oldValue, patches, path, options, parent) {
    var oldSub;
    var newSub;
    var newLength;
    var typeScope;
    var match;
    var i = 0;
    var oldLength = oldValue.length;

    // deletes
    while (i < oldLength) {
      oldSub = oldValue[i];
      i += 1;
      if (!oldSub || typeof oldSub !== 'object' || oldSub.id === undefined) { continue; }
      typeScope = oldSub.typeScope || jamUtil.getTypeScopeByPath(path, options.typeScopes);
      if (typeScope === undefined) {
        void 0;
        continue;
      }

      // cannot find matching resource in new data, create delete patch
      if (findById(oldSub.id, newValue) === undefined) {
        patches.push(createDeletePatch(oldSub, path, typeScope, options, parent));
        i -= 1;
        oldLength -= 1;
        oldValue.splice(i, 1);
      }
    }


    // aditions
    i = 0;
    newLength = newValue.length;
    oldLength = oldValue.length;
    while (i < newLength) {
      newSub = newValue[i];
      i += 1;
      if (!newSub || typeof newSub !== 'object') { continue; }
      // if no typeScope exists then try to find a match
      if (newSub.typeScope === undefined) {
        typeScope = jamUtil.getTypeScopeByPath(path, options.typeScopes);
        if (typeScope !== undefined) {
          setupNewResource(newSub, typeScope);
          diffNewResource(newSub, patches, path, options);
          diffObj(newSub, null, patches, path, options, parent);
        } else {
          void 0;
        }
      } else if (parent && findById(newSub.id, oldValue) === undefined) {
        patches.push(createAddRelationshipPatch(newSub, path, parent));
      }
    }


    // recusive check
    i = 0;
    while (i < oldLength) {
      oldSub = oldValue[i];
      i += 1;

      // only run on existing resource objects
      if (!oldSub || typeof oldSub !== 'object') { continue; }
      match = findById(oldSub.id, newValue);
      if (match !== undefined) {
        generatePataches(match, oldSub, patches, path, options, parent);
      }
    }
  }


  function diffNewResource(obj, patches, path, options) {
    var keys = getFilteredKeys(obj);
    var key = keys.pop();
    var relKeys = obj.typeScope.relationships ? getKeys(obj.typeScope.relationships) : [];

    while (key !== undefined) {
      // check for chanes in relationships
      if (relKeys.indexOf(key) !== -1) {
        generatePataches(obj[key], obj[key] instanceof Array ? [] : null, patches, (path+'/'+obj.id+'/'+key).replace(/^\//, ''), options, obj);
      }
      key = keys.pop();
    }
  }



  function diffObj(newValue, oldValue, patches, path, options, parent) {
    var key;
    var relKeys;
    var newSub;
    var oldSub;
    var newKeys;
    var oldKeys;

    // add
    if (!oldValue && newValue) {
      patches.push(createAddPatch(newValue, path, newValue.typeScope));
      if (parent) {
        patches.push(createAddRelationshipPatch(newValue, path, parent));
      }
      return;
    // delete
    } else if (!newValue && oldValue) {
      patches.push(createDeletePatch(oldValue, path, jamUtil.getTypeScopeByPath(path, options.typeScopes), options, parent));
      return;
    }

    newKeys = newValue ? getFilteredKeys(newValue) : [];
    oldKeys = oldValue ? getFilteredKeys(oldValue) : [];
    if (oldKeys.length < newKeys.length) {
      // TODO figure out how to handle this situation
      // should i allow this or should i require the allowed attrs to be in the schema
      void 0;
    }

    key = oldKeys.pop();
    relKeys = newValue.typeScope.relationships ? getKeys(newValue.typeScope.relationships) : [];
    while (key !== undefined) {
      oldSub = oldValue[key];
      newSub = newValue[key];

      // check for chanes in relationships
      if (relKeys.indexOf(key) !== -1) {
        generatePataches(newSub, oldSub, patches, (path+'/'+newValue.id+'/'+key).replace(/^\//, ''), options, newValue);

      // if previous resource exists and items do not match
      } else if (oldSub !== newSub || angular.equals(oldSub, newSub) === false) {
        patches.push(createUpdatePatch(newValue, newSub, oldSub, key, path));
      }
      key = oldKeys.pop();
    }
  }



  function setupNewResource(obj, typeScope) {
    if (obj.id === undefined) { obj.id = jamUtil.generateUUID(); } // add uuid if none exists. this should onyl apply to newely created resources
    Object.defineProperty(obj, 'typeScope', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: typeScope
    });
  }

  function createUpdatePatch(obj, newValue, oldValue, key, path) {
    var patch = {
      op: 'update',
      path: (path+'/'+obj.id).replace(/^\//, ''),
      url: obj.typeScope.url,
      resource: {
        id: obj.id,
        type: obj.typeScope.type,
        attributes: {},
        oldAttributes: {}
      }
    };
    patch.resource.attributes[key] = typeof newValue !== 'object' ? newValue : angular.copy(newValue);
    patch.resource.oldAttributes[key] = typeof oldValue !== 'object' ? oldValue : angular.copy(oldValue);
    return patch;
  }

  function createAddRelationshipPatch(obj, path, parent) {
    var key = path.split('/').pop();
    var patch = {
      op: 'relationship',
      path: path.replace('/'+key, ''),
      url: parent.typeScope.url,
      resource: {
        id: parent.id,
        type: parent.typeScope.type,
        relationships: {}
      }
    };
    patch.resource.relationships[key] = {data: {
      id: obj.id,
      type: obj.typeScope.type
    }};
    if (parent.typeScope.relationships[key].meta.toMany) {
      patch.resource.relationships[key].data = [patch.resource.relationships[key].data];
    }
    return patch;
  }

  function createAddPatch(obj, path, typeScope) {
    return {
      op: 'add',
      path: path,
      url: typeScope.url,
      resource: convertToResource(obj, typeScope)
    };
  }
  function createDeletePatch(obj, path, typeScope, options, parent) {
    if (parent) {
      var key = path.split('/').pop();
      var patch = {
        op: 'delete-relationship',
        path: path,
        url: formatPath(parent.typeScope.url, parent.id) + '/relationships/' + key,
        resource: {
          id: obj.id,
          type: typeScope.type,
          data: {
            id: obj.id,
            type: typeScope.type,
          }
        }
      };
      if (parent[key] instanceof Array) {
        patch.resource.data = [patch.resource.data];
      }
      return patch;
    } else {
      return {
        op: 'delete',
        path: path,
        url: typeScope.url,
        inUse: traverseForResource(options.data, obj.id, typeScope.type) === true,
        resource: convertToResource(obj, typeScope)
      };
    }
  }

  function convertToResource(obj, typeScope) {
    return {
      id: obj.id,
      type: typeScope.type,
      attributes: copyAttributes(obj, typeScope),
      relationships: copyRelationships(obj, typeScope)
    };
  }

  function copyAttributes(obj, typeScope) {
    var attrs = {};
    var relationshipKeys = typeScope.relationships ? getKeys(typeScope.relationships) : [];
    getFilteredKeys(obj).forEach(function (key) {
      if (relationshipKeys.indexOf(key) === -1) {
        attrs[key] = typeof obj[key] !== 'object' ? obj[key] : angular.copy(obj[key]);
      }
    });
    return attrs;
  }

  function copyRelationships(obj, typeScope) {
    var rel = {};
    var relationshipKeys = typeScope.relationships ? getKeys(typeScope.relationships) : [];
    getFilteredKeys(obj).forEach(function (key) {
      if (relationshipKeys.indexOf(key) !== -1) {
        if (obj[key] instanceof Array) {
          rel[key] = {data: []};
          obj[key].forEach(function (sub) {
            rel[key].data.push({
              id: sub.id,
              type: typeScope.relationships[key].type
            });
          });
        } else {
          rel[key] = {
            data: {
              id: obj[key].id,
              type: typeScope.relationships[key].type
            }
          };
        }
      }
    });
    return rel;
  }







  // --- Private ----------------------



  function traverseForResource(data, id, type) {
    var i;
    var length;
    var keys;
    var key;
    var found = false;

    if (data instanceof Array) {
      i = 0;
      length = data.length;
      while (i < length) {
        if (traverseForResource(data[i], id, type) === true) {
          found = true;
          break;
        }
        i += 1;
      }
    } else if (typeof data === 'object' && data !== null) {
      if (data.typeScope && data.typeScope.type === type && data.id === id) {
        found = true;
        return found;
      }

      keys = getFilteredKeys(data);
      key = keys.pop();
      while (key !== undefined) {
        if (traverseForResource(data[key], id, type) === true) {
          found = true;
          break;
        }
        key = keys.pop();
      }
    }

    return found;
  }


  // ket object keys. filter out `id` and any property that starts with `$$`
  function getFilteredKeys(obj) {
    return getKeys(obj).filter(function (key) {
      return key !== 'id' && key.indexOf('$$') !== 0;
    });
  }

  // find an object by given id or return undefined
  function findById(id, arr) {
    if (id === undefined || !(arr instanceof Array)) { return undefined; }
    var i = 0;
    var length = arr.length;
    while (i < length) {
      if (arr[i] && arr[i].id === id) { return arr[i]; }
      i += 1;
    }
    return undefined;
  }

  // append to path and make sure the first charater is not `/`
  function formatPath(base, addition) {
    return (base+'/'+addition).replace(/^\//, '');
  }

}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamPatch_old', jamPatch_old);


jamPatch_old.$inject = ['jamUtil'];
function jamPatch_old(jamUtil) {
  var getKeys = Object.keys;

  var service = {
    diff: diff,
    apply: apply
  };
  return service;


  function apply(options, patches, reverse) {
    var i = 0;
    var length = patches.length;
    while (i < length) {
      if (options.data instanceof Array) {
        applyArray(options.data, patches[i], '', options);
      } else {
        applyObject(options.data, patches[i], '', options);
      }
      i += 1;
    }
  }


  function applyArray(data, patch, path, options) {
    var i;
    var length;
    if (patch.map === path) {
      if (patch.op === 'add') {
        var resource = createObjFromPatch(patch.resource, path, options);
        options.typeList[resource.typeScope.type].push(resource);
        data.push(resource);
        return true;

      // find and splice out resource
      } else if (patch.op === 'delete') {
        i = 0;
        length = data.length;
        while (i < length) {
          if (patch.resource.id === data[i].id) {
            data.splice(i, 1);

            // if resource no longer exists in data structure remove it from typelist
            if (traverseForResource(options.data, patch.resource.id, patch.resource.type) !== true) {
              i = 0;
              length = options.typeList[patch.resource.type].length;
              while (i < length) {
                if (options.typeList[patch.resource.type][i].id === patch.resource.id) {
                  options.typeList[patch.resource.type].splice(i, 1);
                  return true;
                }
                i += 1;
              }
            }
            return true;
          }
          i += 1;
        }
      }
    }

    // run patch apply on objects
    i = 0;
    length = data.length;
    while (i < length) {
      if (applyObject(data[i], patch, path, options) === true) { return true; }
      i += 1;
    }
  }


  function applyObject(data, patch, path, options) {
    if (typeof data !== 'object' || data === null || data.id === undefined) { return; }
    path += '/'+data.id;
    if (patch.map === path && patch.resource.id === data.id) {
      if (patch.op === 'update') {
        extendDataWithResource(data, patch.resource, options.typeList);
      } else if (patch.op === 'delete-relationship') {
        removeRelationshipResource(data, patch.resource.relationships);
      }
      return true;
    }

    var i;
    var length;
    var keys = getFilteredKeys(data);
    var key = keys.pop();
    var nextPath;
    var resource;
    while (key !== undefined) {
      nextPath = path+'/'+key;
      if (data[key] instanceof Array) {
        if (applyArray(data[key], patch, nextPath, options) === true) { return true; }
      } else {
        if (patch.map === nextPath) {
          if (patch.op === 'add') {
            resource = createObjFromPatch(patch.resource, nextPath, options);
            options.typeList[resource.typeScope.type].push(resource);
            data[key] = resource;
            return true;
          } else if (patch.op === 'delete') {
            data[key] = null;
            // if resource no longer exists in data structure remove it from typelist
            if (traverseForResource(options.data, patch.resource.id, patch.resource.type) !== true) {
              i = 0;
              length = options.typeList[patch.resource.type].length;
              while (i < length) {
                if (options.typeList[patch.resource.type][i].id === patch.resource.id) {
                  options.typeList[patch.resource.type].splice(i, 1);
                  return true;
                }
                i += 1;
              }
            }
            return true;
          }
        }
        if (applyObject(data[key], patch, nextPath, options) === true) { return true; }
      }
      key = keys.pop();
    }
  }


  function createObjFromPatch(resource, path, options) {
    var obj = angular.copy(resource.attributes);
    obj.id = resource.id;
    Object.defineProperty(obj, 'typeScope', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: jamUtil.getTypeScopeByPath(path, options.typeScopes)
    });

    getKeys(resource.relationships || {}).forEach(function (key) {
      if (resource.relationships[key].data instanceof Array) {
        obj[key] = [];
        resource.relationships[key].data.forEach(function (data) {
          obj[key].push(findById(data.id, options.typeList[data.type]));
        });
      } else {
        obj[key] = findById(resource.relationships[key].data.id, options.typeList[resource.relationships[key].data.type]);
      }
    });

    return obj;
  }



  function extendDataWithResource(data, resource, typeList) {
    angular.extend(data, resource.attributes);
    Object.keys(resource.relationships || {}).forEach(function (key) {
      if (resource.relationships[key].data instanceof Array) {
        data[key] = data[key] || [];
        resource.relationships[key].data.forEach(function (sub) {
          data[key].push(findById(sub.id, typeList[sub.type]));
        });
      } else {
        data[key] = findById(resource.relationships[key].data.id, typeList[resource.relationships[key].data.type]);
      }
    });
  }


  function removeRelationshipResource(data, relationships) {
    Object.keys(relationships || {}).forEach(function (key) {
      if (relationships[key].data instanceof Array) {
        data[key] = data[key].filter(function (data) {
          var i = 0;
          var length = relationships[key].data.length;
          while (i < length) {
            if (relationships[key].data[i].id === data.id) {
              return false;
            }
            i += 1;
          }
          return true;
        });
      } else {
        data[key] = null;
      }
    });
  }






  // returns an array of pathces for adds,removes, and replaces(updates)
  function diff(options) {
    var patches = [];
    generatePataches(options.data, options.oldValue, patches, '', options.typeScopes);
    patches = reducePatches(patches, options.data);
    setPrecedence(patches);
    return patches;
  }


  // precedence is based on add/delete relationships
  function setPrecedence(patches) {
    patches.forEach(function (patch) {
      patch.precedence = 0; // default

      if (patch.op === 'add') {
        patches.every(function (compare) {
          if (compare.op === 'add') {
            // if the added patch has a relationship of the patch
            if (relatedById(patch.resource.id, compare.resource.relationships)) {
              compare.precedence = patch.precedence ? patch.precedence + 1 : 1; // add one to the related patch
              return false;

            // if patch has a relationship of the added patch
            } else if (relatedById(compare.resource.id, patch.resource.relationships)) {
              patch.precedence = compare.precedence ? compare.precedence + 1 : 1; // add one to the related patch
              return false;
            }
          }
          return true;
        });
      }
    });

    patches.sort(function (a, b) {
      if (a.precedence > b.precedence) { return 1; }
      if (a.precedence < b.precedence) { return -1; }
      return 0;
    });
  }

  // check if id exists in resource relationships
  function relatedById(id, relationships) {
    var i;
    var length;
    var keys = Object.keys(relationships);
    var key = keys.pop();

    while (key !== undefined) {
      if (relationships[key].data instanceof Array) {
        i = 0;
        length = relationships[key].data.length;
        while (i < length) {
          if (relationships[key].data[i].id === id) {
            return true;
          }
          i += 1;
        }
      } else if (relationships[key].data.id === id) {
        return true;
      }
      key = keys.pop();
    }

    return false;
  }



  function reducePatches(patches, data) {
    var obj = {};
    patches.forEach(function (patch) {
      if (patch.resource.id === undefined) {
        void 0;
        return;
      }

      // check to see if resource is attached to anything else and remove patch
      if (patch.op === 'delete' && traverseForResource(data, patch.resource.id, patch.resource.type) === true) {
        return;
      }

      // add patch if it does not exist
      if (obj[patch.resource.id] === undefined) {
        obj[patch.resource.id] = patch;
        return;
      }

      if (obj[patch.resource.id].op === patch.op) {
        if (patch.op === 'update') {
          extendResource(obj[patch.resource.id].resource, patch.resource);
        } else {
          // NOTE this may not apply to deletions
          void 0;
        }
      } else if ((obj[patch.resource.id].op === 'add' || obj[patch.resource.id].op === 'update') && (patch.op === 'update' || patch.op === 'add')) {
        obj[patch.resource.id].op = 'add';
        extendResource(obj[patch.resource.id].resource, patch.resource);
      } else {
        void 0;
      }
    });
    // convert object to array
    return getKeys(obj).map(function (key) { return obj[key]; });
  }

  function extendResource(dest, src) {
    // attributes
    var keys = getKeys(src.attributes);
    var key = keys.pop();
    while (key !== undefined) {
      dest.attributes[key] = src.attributes[key];
      key = keys.pop();
    }

    // old attributes
    keys = getKeys(src.oldAttributes);
    key = keys.pop();
    while (key !== undefined) {
      dest.oldAttributes[key] = src.oldAttributes[key];
      key = keys.pop();
    }

    // relationships
    keys = getKeys(src.relationships);
    key = keys.pop();
    while (key !== undefined) {
      if (dest.relationships[key] === undefined) {
        dest.relationships[key] = angular.copy(src.relationships[key]);
      } else if (dest.relationships[key].data instanceof Array) {
        dest.relationships[key].push(src.relationships[key].data[0]);
      } else {
        void 0;
      }
      key = keys.pop();
    }
  }

  function traverseForResource(data, id, type) {
    var i;
    var length;
    var keys;
    var key;
    var found = false;

    if (data instanceof Array) {
      i = 0;
      length = data.length;
      while (i < length) {
        if (traverseForResource(data[i], id, type) === true) {
          found = true;
          break;
        }
        i += 1;
      }
    } else if (typeof data === 'object' && data !== null) {
      if (data.typeScope && data.typeScope.type === type && data.id === id) {
        found = true;
        return found;
      }

      keys = getFilteredKeys(data);
      key = keys.pop();
      while (key !== undefined) {
        if (traverseForResource(data[key], id, type) === true) {
          found = true;
          break;
        }
        key = keys.pop();
      }
    }

    return found;
  }





  // this function expects to onyl receive resoure objects or arrays containing resource objects
  function generatePataches(newValue, oldValue, patches, path, typeScopeList, parent) {
    if (oldValue instanceof Array) {
      diffArray(newValue, oldValue, patches, path, typeScopeList, parent);
    } else {
      diffObj(newValue, oldValue, patches, path, typeScopeList, parent);
    }
  }


  // expects an array of resource objects
  function diffArray(newValue, oldValue, patches, path, typeScopeList, parent) {
    var j;
    var newSub;
    var oldSub;
    var match;
    var typeScope;
    var patch;
    var resourceKey;
    var i = 0;
    var oldLength = oldValue.length;
    var newLength = newValue.length;


    // TODO implament deletions

    while (i < oldLength) {
      oldSub = oldValue[i];
      i += 1;
      if (!oldSub || typeof oldSub !== 'object') { continue; }
      // if no typeScope exists then try to find a match
      typeScope = jamUtil.getTypeScopeByPath(path, typeScopeList);
      if (typeScope === undefined) {
        void 0;
        continue;
      }

      // cannot find matching resource in new data, create delete patch
      if (findById(oldSub.id, newValue) === undefined) {
        createDeletePatch(oldSub, patches, path, typeScope, parent);
        i -= 1;
        oldLength -= 1;
        oldValue.splice(i, 1);
      }
    }

    // aditions
    i = 0;
    oldLength = oldValue.length;
    while (i < newLength) {
      newSub = newValue[i];
      i += 1;
      if (!newSub || typeof newSub !== 'object') { continue; }

      // if no typeScope exists then try to find a match
      if (newSub.typeScope === undefined) {
        // if no typeScope then assume the resource is new
        if (jamUtil.getTypeScopeByPath(path, typeScopeList) !== undefined) {
          // create id and attach typeScope
          createAddPatch(newSub, oldSub, patches, path, typeScopeList, parent);
        } else {
          void 0;
        }

      // if parent exists and a matching item cannot be found in the old data
      } else if (parent && findById(newSub.id, oldValue) === undefined) {
        createRelationshipPatch('update', newSub.id, newSub.typeScope.type, patches, path, parent);
      }
    }


    // recusive check
    i = 0;
    while (i < oldLength) {
      oldSub = oldValue[i];
      i += 1;

      // only run on existing resource objects
      if (!oldSub || typeof oldSub !== 'object') { continue; }
      match = findById(oldSub.id, newValue);
      if (match !== undefined) {
        generatePataches(match, oldSub, patches, path, typeScopeList, parent);
      }
    }
  }


  function diffObj(newValue, oldValue, patches, path, typeScopeList, parent) {
    var i;
    var newSub;
    var oldSub;
    var oldKeys;
    var key;
    var relKeys;
    var patch;


    if (!newValue && oldValue) {
      createDeletePatch(oldValue, patches, path, jamUtil.getTypeScopeByPath(path, typeScopeList), parent);
      return;
    } else if (newValue && !oldValue) {
      createAddPatch(newValue, oldValue, patches, path, typeScopeList, parent);
      return;
    }

    oldKeys = getFilteredKeys(oldValue);
    if (oldKeys.length < getFilteredKeys(newValue).length) {
      // TODO figure out how to handle this situation
      // should i allow this or should i require the allowed attrs to be in the schema
      void 0;
    }
    key = oldKeys.pop();
    relKeys = newValue.typeScope.relationships ? getKeys(newValue.typeScope.relationships) : [];
    while (key !== undefined) {
      oldSub = oldValue[key];
      newSub = newValue[key];

      if (relKeys.indexOf(key) !== -1) {
        generatePataches(newSub, oldSub, patches, path+'/'+key, typeScopeList, newValue);
      } else if (oldSub !== newSub || angular.equals(oldSub, newSub) === false) {
        createUpdatePatch(newValue, key, newSub, oldSub, patches, path, parent);
      }

      key = oldKeys.pop();
    }
  }


  function convertToResource(obj, path, typeScopeList) {
    var typeScope = obj.typeScope ? obj.typeScope : jamUtil.getTypeScopeByPath(path, typeScopeList);
    var typeRelationships = typeScope.relationships ? getKeys(typeScope.relationships) : [];
    var resource = createBaseResource(obj.id, typeScope);

    // copy attributes. getFilteredKeys will filter out `id` and properties with `$$`
    getFilteredKeys(obj).filter(function (key) {
      return typeRelationships.indexOf(key) === -1;
    }).forEach(function (key) {
      // only run copy on objects for performance
      resource.attributes[key] = typeof obj[key] !== 'object' ? obj[key] : angular.copy(obj[key]);
    });

    return resource;
  }

  function convertToFullResource(obj, typeScope) {
    var resource = createBaseResource(obj.id, typeScope);
    var typeRelationships = typeScope.relationships ? getKeys(typeScope.relationships) : [];

    // copy attributes. getFilteredKeys will filter out `id` and properties with `$$`
    getFilteredKeys(obj).forEach(function (key) {
      if (typeRelationships.indexOf(key) === -1) {
        // only run copy on objects for performance
        resource.attributes[key] = typeof obj[key] !== 'object' ? obj[key] : angular.copy(obj[key]);
      } else {
        if (obj[key] instanceof Array && obj[key].length) {
          resource.relationships[key] = {};
          resource.relationships[key].data = obj[key].map(function (item) {
            return {
              id: item.id,
              type: typeScope.relationships[key].type
            };
          });
        } else if (Object.keys(obj[key]).length) {
          resource.relationships[key] = {};
          resource.relationships[key].data = {
            id: obj[key].id,
            type: typeScope.relationships[key].type
          };
        }
      }
    });

    return resource;
  }


  function createDeletePatch(oldSub, patches, path, typeScope, parent) {
    patches.push(createPatch('delete', path, convertToFullResource(oldSub, typeScope), parent));
    if (parent) {
      createRelationshipPatch('delete-relationship', oldSub.id, typeScope.type, patches, path, parent);
    }
  }

  // create patch fore new item and ckeck its relationships.
  function createAddPatch(newSub, oldSub, patches, path, typeScopeList, parent) {
    if (newSub.id === undefined) { newSub.id = jamUtil.generateUUID(); } // add uuid if none exists. this should onyl apply to newely created resources
    Object.defineProperty(newSub, 'typeScope', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: jamUtil.getTypeScopeByPath(path, typeScopeList)
    });


    // run gen patches on relationships that exist
    if (newSub.typeScope.relationships) {
      getKeys(newSub.typeScope.relationships).forEach(function (key) {
        if (newSub[key] === undefined) { return; }
        var many = newSub.typeScope.relationships[key].meta.toMany;
        generatePataches(newSub[key], many ? [] : null, patches, path+'/'+key, typeScopeList, newSub);
      });
    }
    patches.push(createPatch('add', path, convertToResource(newSub, path, typeScopeList), parent));

    // create relationship update for new items added to parents
    if (parent) {
      createRelationshipPatch('update', newSub.id, newSub.typeScope.type, patches, path, parent);
    }
  }

  // create update patch fro relationships
  function createRelationshipPatch(op, id, type, patches, path, parent) {
    var resourceKey = path.split('/').pop();
    var resource = createBaseResource(parent.id, parent.typeScope);
    resource.relationships[resourceKey] = {
      data: {
        id: id,
        type: type
      }
    };
    // convert to array if toMany relationship
    if (parent[resourceKey] instanceof Array) {
      resource.relationships[resourceKey].data = [resource.relationships[resourceKey].data];
    }
    patches.push(createPatch(op, path.slice(0, path.lastIndexOf('/')), resource));
  }

  // create update patch for attributes
  function createUpdatePatch(newValue, key, newSub, oldSub, patches, path, parent) {
    var resource = createBaseResource(newValue.id, newValue.typeScope);
    resource.attributes[key] = typeof newSub !== 'object' ? newSub : angular.copy(newSub);
    resource.oldAttributes[key] = typeof oldSub !== 'object' ? oldSub : angular.copy(oldSub);
    patches.push(createPatch('update', path, resource, parent));
  }


  // patch format
  function createPatch(op, path, resource, parent) {
    return {
      op: op,
      path: path,
      resource: resource,
      parent: !parent ? {} : {
        id: parent.id,
        type: parent.typeScope.type
      }
    };
  }

  // shell of the resource objec used for all patches
  function createBaseResource(id, typeScope) {
    return {
      id: id,
      type: typeScope.type,
      url: typeScope.url,
      attributes: {},
      oldAttributes: {},
      relationships: {}
    };
  }





  // find an object by given id or return undefined
  function findById(id, arr) {
    if (id === undefined || !(arr instanceof Array)) { return undefined; }
    var i = 0;
    var length = arr.length;
    while (i < length) {
      if (arr[i] && arr[i].id === id) { return arr[i]; }
      i += 1;
    }
    return undefined;
  }


  // ket object keys. filter out `id` and any property that starts with `$$`
  function getFilteredKeys(obj) {
    return getKeys(obj).filter(function (key) {
      return key !== 'id' && key.indexOf('$$') !== 0;
    });
  }

  // --- escpae path ~, / ---
  function escapePath(str) {
    if (str.indexOf('/') === -1 && str.indexOf('~') === -1) {
      return str;
    }
    return str.replace(/~/g, '~0').replace(/\//g, '~1');
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamRequest', jamRequest);


jamRequest.$inject = ['$http', '$q'];
function jamRequest($http, $q) {
  var service = {
    baseUrl: '',
    headers: {},
    get: get,
    sendBatchItem: sendBatchItem
  };
  return service;



  function get(url, headers) {
    return request({
      method: 'GET',
      url: url,
      headers: headers
    });
  }

  function sendBatchItem(patch) {
    return request({
      method: getMethod(patch.op),
      url: getUrl(patch),
      data: getData(patch)
    });
  }


  function request(options) {
    var requestObj = {
      method: options.method,
      url: service.baseUrl + options.url
    };

    requestObj.headers = options.headers || {};
    angular.extend(requestObj.headers, service.headers);

    if (options.data !== undefined) {
      requestObj.data = options.data;
    }

    return $http(requestObj);
  }




  function getMethod(op) {
    if (op === 'add') { return 'POST'; }
    if (op === 'update' || op === 'relationship') { return 'PATCH'; }
    if (op === 'delete' || op === 'delete-relationship') { return 'DELETE'; }
  }

  function getUrl(patch) {
    if (patch.op === 'add') { return patch.url; }
    if (patch.op === 'delete') { return patch.url+'/'+patch.resource.id; }
    if (patch.op === 'update' || patch.op === 'relationship') { return patch.url+'/'+patch.resource.id; }
    if (patch.op === 'delete-relationship') { return patch.url; }
  }

  function getData(patch) {
    var data;
    if (patch.op === 'add' || patch.op === 'update' || patch.op === 'relationship') {
      data = {
        id: patch.resource.id,
        type: patch.resource.type
      };
      if (patch.resource.attributes && Object.keys(patch.resource.attributes).length) {
        data.attributes = patch.resource.attributes;
      }
      if (patch.resource.relationships && Object.keys(patch.resource.relationships).length) {
        data.relationships = patch.resource.relationships;
      }
    }

    if (patch.op === 'delete-relationship') {
      data = patch.resource.data;
    }

    return {data: data};
  }
}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .service('jamStorage', jamStorage);



jamStorage.$inject = ['$window', 'jamLZString'];
function jamStorage($window, jamLZString) {
  // these are used to parse the dates with the reviever function
  var ISO_REG = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
  var MS_AJAX_REG = /^\/Date\((d|-|.*)\)[\/|\\]$/;

  var now = Date.now; // returns the milliseconds elapsed since 1 January 1970 00:00:00 UTC
  var memoryStorage = {};
  var storage = $window.sessionStorage; // NOTE using sessionStorage until versioning is implamented
  var isStorageAvailable = testStorage();

  var service = {
    set: set,
    get: get,
    remove: remove
  };
  return service;



  // test if local storage exists
  function testStorage() {
    if (storage === undefined) { return false; }
    try {
      storage.setItem('_jamTest_', 0);
      storage.removeItem('_jamTest_');
      return true;
    } catch (e) {
      return false;
    }
  }


  function set(key, value) {
    memoryStorage[key] = angular.copy(value);

    // store item if enabled
    if (isStorageAvailable === false) { return true; }
    value = jamLZString.compressToUTF16(JSON.stringify(value));

    // store value
    storage.setItem(key, value);

    return true;
  }


  function get(key) {
    var item;

    // gdt from memory
    if (memoryStorage[key] === undefined) {
      if (isStorageAvailable === false) { return undefined; }
      item = storage.getItem(key);
      if (item === null) { return undefined; }

      memoryStorage[key] = JSON.parse(jamLZString.decompressFromUTF16(item), dateParse);
    }

    return angular.copy(memoryStorage[key]);
  }


  function remove(key) {
    memoryStorage[key] = undefined;
    if (isStorageAvailable === true) { storage.removeItem(key); }
    return true;
  }




  // reviver for json parse
  // this function converts dates an sparse arrays
  function dateParse(key, value) {
    var a;
    var b;

    // parse dates
    if (typeof value === 'string') {

      // attemp to parse iso
      a = ISO_REG.exec(value);
      if (a !== null) {
        return new Date(value);
      }

      // attemp to parse ms ajax
      a = MS_AJAX_REG.exec(value);
      if (a !== null) {
        b = a[1].split(/[-+,.]/);
        return new Date(b[0] ? +b[0] : 0 - +b[1]);
      }
    }

    return value;
  }

}
}());
(function(){"use strict";angular
  .module('jsonapi-manager')
  .factory('jamUtil', jamUtil);


var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


jamUtil.$inject = ['jamStorage', 'jamKeys'];
function jamUtil(jamStorage, jamKeys) {
  var performance = window.performance ? angular.bind(window.performance, window.performance.now) : Date.now;
  var slice = Array.prototype.slice;

  var service = {
    hashString: hashString,
    getCacheBustUrl: getCacheBustUrl,
    createGetUrl: createGetUrl,
    getTypeScopeByPath: getTypeScopeByPath,
    generateUUID: generateUUID,
    defaultRelationships: defaultRelationships,
    getPatches: getPatches
  };
  return service;



  // --- Get Patches ---
  function getPatches(options) {
    var storedItem = jamStorage.get(jamKeys.STORED_DATA_PREFIX + options.managerId) || [];

    if (storedItem.length > 0) {
      return storedItem.map(function (item) {
        return item.data;
      }).reduce(function (arr, item) {
        return arr.concat(item);
      });
    }

    return undefined;
  }


  // Calculate a 32 bit FNV-1a hash and convert it to hex
  function hashString(str) {
    /*jshint bitwise:false */
    var i = 0;
    var l = str.length;
    var hval = 0x811c9dc5;

    while (i < l) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
      i++;
    }

    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }

  // adds a cash buster param to a given url and value
  function getCacheBustUrl(url, cb) {
    if (url.indexOf('?') === -1) {
      return url + '?cb=' + cb;
    } else {
      return url + '&cb=' + cb;
    }
  }


  // builds url with ids and includes
  function createGetUrl(options, id) {
    var paths;
    var getUrl = options.url;
    id = options.id || id;
    
    if (id !== undefined) { getUrl += '/' + id; }
    if (options.include instanceof Array && options.include.length > 0) {
      getUrl += '?include=' + options.include.join(',');
    } else if (typeof options.schema === 'object' && options.schema !== null) {
      paths = getAllObjectPaths(options.schema, '');
      if (paths instanceof Array) {
        getUrl += '?include=' + paths.filter(function (arr) {
          return arr.length;
        }).map(function (arr) {
          return arr.join('.');
        }).join(',');
      }
    }

    return getUrl;
  }

  function getAllObjectPaths(obj, parent, arr) {
    if (obj === undefined || obj.relationships === undefined) { return; }
    arr = arr || [];

    var keys = Object.keys(obj.relationships);
    var matchingArr = [];
    var i = 0;
    var length = arr.length;
    while (i < length) {
      if (arr[i][arr[i].length-1] === parent) {
        matchingArr = arr[i];
        break;
      }
      i += 1;
    }

    i = 0;
    length = keys.length;
    while (i < length) {
      arr.push(matchingArr.concat(keys[i]));
      getAllObjectPaths(obj.relationships[keys[i]], keys[i], arr);
      i += 1;
    }

    return arr;
  }




  // find typeScope by an objects nested path from the root object
  function getTypeScopeByPath(path, typeScopes) {
    var i = 0;
    var length = typeScopes.length;
    path = getTypescopePath(path);

    // try to match path
    while (i < length) {
      if (typeScopes[i].maps.indexOf(path) > -1) {
        // NOTE do we want to add the type check here. is it possible to have a path match that does not apply to the scope path
        return typeScopes[i];
      }
      i += 1;
    }
    return undefined;
  }
  // return path minus the array ints
  function getTypescopePath(path) {
    return path.split('/').filter(function (str) {
      return !uuidPattern.test(str);
    }).join('/');
  }




  // --- Generate a uuid (v4) ----
  function generateUUID() {
    var d = Date.now();
    d += performance();

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });

    return uuid;
  }



  // --- Default relationships ---
  // default relationship data to either and empty array for multi resource, or null for single resource
  function defaultRelationships(obj, typeScope) {
    var relationshipKeys;
    var key;

    // default relationship object/array
    if (typeScope.relationships) {
      relationshipKeys = Object.keys(typeScope.relationships);
      key = relationshipKeys.pop();

      while (key !== undefined) {
        if (typeScope.relationships[key].meta && typeScope.relationships[key].meta.toMany === true && obj[key] === undefined) {
          obj[key] = [];
        } else {
          obj[key] = null;
        }
        key = relationshipKeys.pop();
      }
    }
  }
}
}());
