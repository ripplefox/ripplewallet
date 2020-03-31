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
            {code : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true},
            {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true},
            {code : 'ULT', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true}
          ],
          logo : "img/gateway/ripplefox.png"
        },
        "bitstamp.net" : {
          name : 'bitstamp.net',
          website : 'https://www.bitstamp.net/',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', list: true},
            {code : 'BTC', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', list: true},
          ],
          logo : "img/gateway/bitstamp.png"
        },
        "gatehub.net" : {
          name : 'gatehub.net',
          website : 'https://www.gatehub.net/',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', list: true},
            {code : 'BTC', issuer : 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL', list: true},
          ],
          logo : "img/gateway/bitstamp.png"
        },
        "unkown" : {
          name : 'unkown',
          website : '',
          assets: [],
          logo : 'data:image/png;base64, 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',
        }
    };
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };
    
    let _issuer2gateway = {};
    for (var name in _gateways) {
      var gateway = _gateways[name];
      gateway.assets.forEach(asset =>{
        _issuer2gateway[asset.issuer] = {
            name : gateway.name,
            website : gateway.website,
            logo : gateway.logo
        }
      });
    }
    
    return {
      getGateway(issuer) {
        return _issuer2gateway[issuer] || _gateways["unkown"];
      }
    };
  } ]);
