/* global myApp, nw, RippleAPI */

myApp.factory('SettingFactory', function($window) {
  return {
    // To add new preset network, add new entry here and in `translationKey` to all translations.
    // P.S. Undefined entries will be asked for in user interface.
    NETWORKS: {
      xrp: {
        name: "Ripple Public Network",
        translationKey: 'public_url',
        networkType: 'xrp',
        servers: [
          {server: 's1.ripple.com', port: 443},
          {server: 's-east.ripple.com', port: 443},
          {server: 's-west.ripple.com', port: 443}
        ],
        coin: {
          name: "ripple",
          atom: "drop",
          code: "XRP",
          logo: "img/coin/xrp.png"
        },
        tabs: ["history", "trade", "balance", "send", "trust", "service", "dapp"]
      },
      xrpTest: {
        name: "Ripple Test Network",
        translationKey: 'test_url',
        networkType: 'xrpTest',
        servers: [
          {server: 's.altnet.rippletest.net', port: 51233}
        ],
        coin: {
          name: "ripple",
          atom: "drop",
          code: "XRP",
          logo: "img/coin/xrp.png"
        },
        tabs: ["history", "trade", "balance", "send", "trust"]
      },
      other: {
        name: "User defined",
        translationKey: 'other_url',
        networkType: 'other',
        servers: [
        ],
        coin: {
          name: "ripple",  // TODO: ask in settings
          atom: "drop",    // TODO: ask in settings
          code: undefined,
          logo: "img/waterdrop.jpg",  // TODO: ask in settings
        },
        tabs: ["history", "trade", "balance", "send", "trust"]
      }
    },

    setTimeout : function(timeout) {
      return $window.localStorage['timeout'] = timeout;
    },
    getTimeout : function() {
      return $window.localStorage['timeout'] || '30';
    },

    setMaxfee : function(maxfee) {
      return $window.localStorage['maxfee'] = maxfee;
    },
    getMaxfee : function() {
      return $window.localStorage['maxfee'] || '0.2';
    },

    setLang : function(lang) {
      return $window.localStorage['lang'] = lang;
    },
    getLang : function() {
      if ($window.localStorage['lang']) {
        return $window.localStorage['lang'];
      } else {
        if (nw.global.navigator.language.indexOf('zh') >= 0) {
          return 'cn';
        } else if (nw.global.navigator.language.indexOf('jp') >= 0) {
          return 'jp';
        } else {
          return 'en';
        }
      }
    },

    setProxy : function(proxy) {
      return $window.localStorage[`proxy`] = "undefined" === proxy ? '' : proxy;
    },
    getProxy : function() {
      return $window.localStorage[`proxy`] || "";
    },

    setNetworkType : function(network) {
      return $window.localStorage[`network_type`] = network in this.NETWORKS ? network : 'xrp';
    },
    getNetworkType : function() {
      return $window.localStorage[`network_type`] || this.setNetworkType();
    },
    
    getCurrentNetwork : function() {
      var network = this.NETWORKS[this.getNetworkType()];
      if (this.getNetworkType() === 'other') {
        network.coin.code = this.getCoin();
      }
      return network;
    },
    setServers : function(serverArr, type) {
      type = type || this.getNetworkType();
      return $window.localStorage[`network_servers/${type}`] = JSON.stringify(serverArr);
    },
    getServers : function(type) {
      type = type || this.getNetworkType();
      if ($window.localStorage[`network_servers/${type}`]) {
        return JSON.parse($window.localStorage[`network_servers/${type}`]);
      } else {
        return this.NETWORKS[type].servers;
      }
    },
    setCoin : function(val) {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_coin/${this.getNetworkType()}`] = val : this.NETWORKS[this.getNetworkType()].coin.code;
    },
    getCoin : function(type) {
      type = type || this.getNetworkType();
      return type === 'other' ? $window.localStorage[`network_coin/${type}`] : this.NETWORKS[this.getNetworkType()].coin.code;
    },

    setFedStellar : function(domain) {
      $window.localStorage['fed_stellar'] = domain;
    },
    getFedStellar : function(url) {
      return $window.localStorage['fed_network'] || 'ripplefox.com';
    },
    setFedRipple : function(domain) {
      $window.localStorage['fed_ripple'] = domain;
    },
    getFedRipple : function(url) {
      return $window.localStorage['fed_ripple'] || 'ripplefox.com';
    },
    setFedBitcoin : function(domain) {
      $window.localStorage['fed_bitcoin'] = domain;
    },
    getFedBitcoin : function(url) {
      return $window.localStorage['fed_bitcoin'] || 'naobtc.com';
    },

    getTradepair : function() {
      if ($window.localStorage['tradepair']) {
        return JSON.parse($window.localStorage['tradepair']);
      } else {
        return {
          base_code   : this.getCurrentNetwork().coin.code,
          base_issuer : '',
          counter_code   : 'CNY',
          counter_issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'
        }
      }
    },
    setTradepair : function(base_code, base_issuer, counter_code, counter_issuer) {
      var trade_pair = {
        base_code   : base_code,
        base_issuer : base_issuer,
        counter_code   : counter_code,
        counter_issuer : counter_issuer
      }
      $window.localStorage['tradepair'] = JSON.stringify(trade_pair);
    },

    getBridgeService : function() {
      return $window.localStorage['bridge_service'] || 'ripplefox.com';
    },
    setBridgeService : function(gateway_name) {
      $window.localStorage['bridge_service'] = gateway_name;
    }
  };
});

myApp.factory('Id', function($window) {
  let _ripple = new RippleAPI();
  
  return {
    isValidAddress : function(address) {
      return RippleAPI.isValidClassicAddress(address);
    },
    isValidSecret : function(secret) {
      return _ripple.isValidSecret(secret);
    },
    generateAccount : function() {
      var keypair = _ripple.generateAddress();
      return {address: keypair.address, secret: keypair.secret};
    },
    fromSecret : function(secret) {
      var keypair = _ripple.deriveKeypair(secret);
      return {address:  RippleAPI.deriveClassicAddress(keypair.publicKey), secret: secret};
    },
    sign : function(txtJson, secret) {
      return _ripple.sign(txtJson, secret);
    },
    generateFilename : function() {
      var dt = new Date();
      var datestr = (''+dt.getFullYear()+(dt.getMonth()+1)+dt.getDate()+'_'+dt.getHours()+dt.getMinutes()+dt.getSeconds()).replace(/([-: ])(\d{1})(?!\d)/g,'$10$2');
      return "ripple" + datestr + ".txt";
    }
  };
});

/*
myApp.factory('FedNameFactory', function(SettingFactory, StellarApi) {
  var fed = {
    map : {}
  };

  fed.isCached = function(address) {
    return this.map[address] ? true : false;
  };

  fed.getName = function(address) {
    return this.map[address].nick;
  };

  fed.resolve = function(address, callback) {
    var self = this;

    if (!self.map[address]) {
      self.map[address] = {
        address : address,
        nick    : ""
      }
    } else {
      return callback(new Error("resolving " + address), null);
    }

    StellarApi.getFedName(SettingFactory.getFedNetwork(), address, function(err, name){
      if (err) {
        console.error(address, err);
      } else {
        self.map[address].nick = name;
      }
      return callback(null, self.map[address])
    });
  };

  return fed;
});

myApp.factory('RemoteFactory', function($http) {
  var remote = {};

  function getResource(url, callback){
    console.debug('GET: ' + url);
    $http({
      method: 'GET',
      url: url
    }).then(function(res) {
      if (res.status != "200") {
        callback(res, null);
      } else {
        callback(null, res.data);
      }
    }).catch(function(err) {
      callback(err, null);
    });
  }

  // Poor network in China, need a backup data source
  remote.getIcoAnchors = function(callback) {
    var url = 'https://stellarchat.github.io/ico/data/anchor.json';
    var backup = 'https://ico.stellar.chat/data/anchor.json';

    getResource(url, function(err, data) {
      if (err) {
        console.error(err);
        getResource(backup, function(err, data){
          return callback(err, data);
        });
      } else {
        return callback(null, data);
      }
    });
  };

  remote.getIcoItems = function(callback) {
    var url = 'https://stellarchat.github.io/ico/data/ico.json';
    var backup = 'https://ico.stellar.chat/data/ico.json';

    getResource(url, function(err, data) {
      if (err) {
        console.error(err);
        getResource(backup, function(err, data){
          return callback(err, data);
        });
      } else {
        return callback(null, data);
      }
    });
  };

  remote.getStellarTicker = function(callback) {
    //var url = 'http://ticker.stellar.org/';
    var url = 'https://api.stellarterm.com/v1/ticker.json';
    getResource(url, callback);
  }

  remote.getClientVersion = function(callback) {
    var url = "https://raw.githubusercontent.com/stellarchat/desktop-client/master/src/package.json";
    getResource(url, callback);
  }

  remote.getNwjsClientVersion = function(callback) {
    var url = "https://raw.githubusercontent.com/stellarchat/desktop-client/nwjs/src/package.json";
    getResource(url, callback);
  }

  return remote;
});

myApp.factory('AnchorFactory', ['$rootScope', 'StellarApi',
  function($scope, StellarApi) {
    var obj = {
      anchor : {
        'ripplefox.com' : {domain  : 'ripplefox.com', parsing : false, parsed  : false}
      },
      address : {
        'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX' : {domain : 'ripplefox.com', parsing: false, parsed: false}
      }
    };

    obj.isAnchorParsed = function(domain) {
      return this.anchor[domain] && this.anchor[domain].parsed;
    }
    obj.isAccountParsed = function(address) {
      return this.address[address] && this.address[address].parsed;
    }
    obj.getAnchor = function(domainOrAddress) {
      var domain = domainOrAddress;
      if (this.address[domainOrAddress]) {
        domain = this.address[domainOrAddress].domain;
      }
      return this.anchor[domain];
    }

    obj.addAnchor = function(domain) {
      var self = this;
      if (!self.anchor[domain]) {
        self.anchor[domain] = {domain  : domain, parsing : false, parsed  : false};
      }
      if (!self.anchor[domain].parsed) {
        self.parseDomain(domain);
      }
    }

    obj.addAccount = function(address) {
      var self = this;
      if (!self.address[address]) {
        self.address[address] = {domain  : null, parsing : false, parsed  : false};
      }
      if (!self.address[address].parsed) {
        self.parseAccount(address);
      }
    }

    obj.parseAccount = function(address) {
      var self = this;
      if (self.address[address].parsing) {
        return;
      }

      console.debug('Parse domain of ' + address);
      self.address[address].parsing = true;
      StellarApi.getInfo(address, function(err, data) {
        self.address[address].parsing = false;
        if (err) {
          console.error(err);
        } else {
          self.address[address].parsed = true;
          if (data.home_domain) {
            console.debug(address, data.home_domain);
            self.address[address].domain = data.home_domain;
            self.addAnchor(data.home_domain);
          } else {
            console.debug(address + ' home_domain not set.');
          }
        }
      });
    }

    obj.parseDomain = function(domain) {
      var self = this;
      if (self.anchor[domain].parsing) {
        return;
      }

      console.debug('Parse stellar.toml of ' + domain);
      self.anchor[domain].parsing = true;
      StellarSdk.StellarTomlResolver.resolve(domain).then(function(stellarToml) {
        console.debug(domain, stellarToml);
        self.anchor[domain].parsing = false;
        self.anchor[domain].parsed = true;
        self.anchor[domain].toml = stellarToml;
        self.anchor[domain].deposit_api = stellarToml.DEPOSIT_SERVER;
        self.anchor[domain].fed_api = stellarToml.FEDERATION_SERVER;

        var currencies = stellarToml.CURRENCIES;
        currencies.forEach(function(asset){
          if (asset.host && asset.host.indexOf(domain) < 0) {
            //ignore the asset not issued by this domain
            console.warn(domain, asset);
          } else {
            self.address[asset.issuer] = {domain: domain, parsing: false, parsed: true};
          }
          $scope.gateways.updateAsset(domain, asset);
        });

        $scope.$broadcast("anchorUpdate");
      }).catch(function(err){
        self.anchor[domain].parsing = false;
        console.error('Parse ' + domain + ' fail.', err);
      });

    }

    return obj;
  } ]);
  */
