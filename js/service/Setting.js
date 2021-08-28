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
          {server: 'xrpl.link', port: 443},
          {server: 'xrplcluster.com', port: 443},
          {server: 'xrpl.ws', port: 443},
          {server: 'ws.foxcny.com', port: 443}
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
      xag: {
        name: "XAG Fork",
        translationKey: 'xag_url',
        networkType: 'xag',
        servers: [
          {server: 'g1.xrpgen.com', port: 443},
          {server: 'g2.xrpgen.com', port: 443},
          {server: 'g3.xrpgen.com', port: 443},
          {server: 'g4.xrpgen.com', port: 443}
        ],
        coin: {
          name: "xrpgen",
          atom: "drop",
          code: "XAG",
          logo: "img/coin/xag.png"
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
        return JSON.parse(JSON.stringify(this.NETWORKS[type].servers));
      }
    },
    resetServers : function(type) {
      type = type || this.getNetworkType();
      console.log($window.localStorage[`network_servers/${type}`]);
      delete $window.localStorage[`network_servers/${type}`];
      console.log($window.localStorage[`network_servers/${type}`]);
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