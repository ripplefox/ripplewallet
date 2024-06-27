myApp.factory('Federation', ['$rootScope', '$q', '$http',  function($rootScope, $q, $http) {
  const toml_data = {};

  async function getToml(domain) {
    if (toml_data[domain]) {
      console.log(`${domain} has toml info already.`);
      return toml_data[domain];
    }
    try {
        const response = await fetch('https://' + domain + '/.well-known/ripple.toml');
        if (!response.ok) {
          console.error('Network response was not ok ' + response.statusText);
          throw new Error("NoRippleToml");
        }
        const tomlText = await response.text();
        const parsedToml = toml.parse(tomlText);
        //displayParsedToml(parsedToml);
        console.log(parsedToml);
        toml_data[domain] = parsedToml;
        return parsedToml;
    } catch (error) {
        console.error('Failed to fetch and parse TOML:', error);
        throw new Error("NoRippleToml");
    }
  }

  var promises = {};

  function get(domain) {
    if (promises[domain] && promises[domain].$$state.status != 2) {
      return promises[domain];
    }

    var txtPromise = $q.defer();

    var urls = [
      'https://www.' + domain + '/ripple.txt',
      'https://' + domain + '/ripple.txt'
    ];

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
    getToml: getToml,
    parse: parse
  };
  
} ]);
