/* global _, myApp */

myApp.factory('Gateways', ['$rootScope', function($rootScope) {
    let _gateways = {
        "ripplefox.com" : {
          name : 'ripplefox.com',
          website : 'https://ripplefox.com/',
          service : [
            {type: 'unionpay', name: 'bank'},
            {type: 'stellar',  name: 'stellar'},
          ],
          assets : [
            {code : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "CNYT"},
            {code : 'USD', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "USDT", logo: "img/coin/usdt.svg"},
            {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Stellar Lumens", logo: "img/coin/xlm.png"},
            {code : 'ULT', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Ultiledger", logo: "img/coin/ult.png"}
          ],
          logo : "img/gateway/ripplefox.png"
        },
        "iripplechina.com" : {
          name : 'iripplechina.com',
          website : 'http://wg.iripplechina.com',
          service : [],
          assets : [
            {code : 'CNY', issuer : 'razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA'}
          ],
          logo : "img/gateway/ripplechina.png"
        },
        "bitstamp.net" : {
          name : 'bitstamp.net',
          website : 'https://www.bitstamp.net/',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', list: true},
            {code : 'BTC', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'}
          ],
          logo : "img/gateway/bitstamp.png"
        },
        "gatehub.net" : {
          name : 'gatehub.net',
          website : 'https://www.gatehub.net/',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'},
            {code : 'EUR', issuer : 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'},
            {code : 'BTC', issuer : 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL', list: true}
          ],
          logo : "img/gateway/gatehub.png"
        },
        "xagfans.com" : {
          name : 'xagfans.com',
          website : 'https://xagfans.com/',
          service : [],
          assets : [
            {code : 'XAG', issuer : 'rpG9E7B3ocgaKqG7vmrsu3jmGwex8W4xAG', list: true}
          ],
          logo : "img/coin/xag.png"
        },
        "dxperts.org" : {
          name : 'dxperts.org',
          website : 'https://dxperts.org/',
          service : [],
          assets : [
            {code : 'DXP', issuer : 'rM8AhEC5Zz46ecWC8KwkoMugY1KwFQqhZT', list: true}
          ],
          logo : "img/gateway/dxperts.png"
        }
    };
    
    let _testingnet = {
        "xrptoolkit.com" : {
          name : 'xrptoolkit.com',
          website : 'https://xrptoolkit.com',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rD9W7ULveavz8qBGM1R5jMgK2QKsEDPQVi', list: true, name: "USD (Testing)"},
            {code : 'BTC', issuer : 'rD9W7ULveavz8qBGM1R5jMgK2QKsEDPQVi', list: true, name: "BTC (Testing)"},
            {code : 'ETH', issuer : 'rD9W7ULveavz8qBGM1R5jMgK2QKsEDPQVi', name: "ETH (Testing)"},
            {code : 'EUR', issuer : 'rD9W7ULveavz8qBGM1R5jMgK2QKsEDPQVi', name: "EUR (Testing)"},
          ],
          logo : "img/gateway/xrptoolkit.png"
        }
    };
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };
    
    let _asset2gateway = {};
    for (var name in _gateways) {
      var gateway = _gateways[name];
      gateway.assets.forEach(asset =>{
        if (asset.logo) {
          _asset2gateway[key(asset.code, asset.issuer)] = {
              name : gateway.name,
              website : gateway.website,
              logo : asset.logo
          };
        }
        _asset2gateway[asset.issuer] = {
            name : gateway.name,
            website : gateway.website,
            logo : gateway.logo
        }
      });
    }
    //add testing net asset to asset2gateway
    _testingnet["xrptoolkit.com"].assets.forEach(asset => {
      _asset2gateway[asset.issuer] = {
          name : _testingnet["xrptoolkit.com"].name,
          website : _testingnet["xrptoolkit.com"].website,
          logo : _testingnet["xrptoolkit.com"].logo
      }
    });
    
    return {
      getGateway(code, issuer) {
        if (code === $rootScope.currentNetwork.coin.code) {
          return {
            logo : $rootScope.currentNetwork.coin.logo
          }
        }
        return _asset2gateway[key(code, issuer)] || _asset2gateway[issuer] || {logo : 'img/unknown.png'};
      },
      
      get gateways() {
        if ($rootScope.currentNetwork.networkType == 'xrpTest') {
          return _testingnet;
        } 
        if ($rootScope.currentNetwork.networkType == 'xag') {
          return {};
        }
        return _gateways;
      },
      
      get defaultTradeAssets() {
        return [
          {code : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'ULT', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'USD', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'}
        ]
      }
    };
  } ]);
