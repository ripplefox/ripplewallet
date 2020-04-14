myApp.factory('Federation', ['$rootScope', '$q', '$http',  function($rootScope, $q, $http) {
  
  var promises = {};

  function get(domain) {
    if (promises[domain]) {
      return promises[domain];
    }

    var txtPromise = $q.defer();

    var urls = [
      'https://www.' + domain + '/ripple.txt',
      'https://' + domain + '/ripple.txt'
    ].reverse();

    var next = function() {
      if (!urls.length) {
        txtPromise.reject(new Error("NoRippleTXT"));
        return;
      }

      var url = urls.pop();
      console.log('resolve', url);
      $http.get(url).then(resp => {
        txtPromise.resolve(parse(resp.data));
      }).catch(next);
    };

    next();

    return promises[domain] = txtPromise.promise;
  }

  function parse(txt) {
    txt = txt.replace('\r\n', '\n');
    txt = txt.replace('\r', '\n');
    txt = txt.split('\n');

    var currentSection = "", sections = {};
    for (var i = 0, l = txt.length; i < l; i++) {
      var line = txt[i];
      if (!line.length || line[0] === '#') {
        continue;
      }
      else if (line[0] === '[' && line[line.length - 1] === ']') {
        currentSection = line.slice(1, line.length - 1);
        sections[currentSection] = [];
      }
      else {
        line = line.replace(/^\s+|\s+$/g, '');
        if (sections[currentSection]) {
          sections[currentSection].push(line);
        }
      }
    }

    return sections;
  }

  return {
    get: get,
    parse: parse
  };
  
} ]);
