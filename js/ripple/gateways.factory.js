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
        "unkown" : {
          name : '',
          website : '',
          assets: [],
          logo : 'data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAIBUExURf///344Ffr4+IE7Gfz7+3YrBnQoAnQnAJ5pT4RAH3csB9vIv3szD4E8GoA5F+bZ0385FnYqBYtLLHguCYI+HKJvVnQnAXctCP39/fDo5Y9RM3UpBKZ1XYA6GO/m46BrUqRxWZ9qULqVg9S9snw0EY9SNL+ci5JWOa+DbuXY0pBTNcmsnpxmTLiSf6h5Yp9rUfz8/IdEJPby8dfCuKV0XIpKKufa1f7+/vHq56BsU8SkldrGvX43FOLSy7aOe+3k4LGGcYVCIerf2vDp5qh4Yd7NxbuWhK6CbaJwV97MxPTu7L2ZiMGgkJtlSreQfXoxDZNXOufa1MiqnO7l4XUpA6d3YL6aicWllq2Ba9zJwffz8ujb1vr398Oiko5QMdG5rfv6+qx+aMCdjend2LuXhaVzW/n29XowDLGHcqRyWnkvC/Ps6pNYO/bx8IZDInguCta/tdvHvr+djHsyDrOJdZVbP/Lr6e/n5N3Lw+TW0IZEI/n29ppjSK2AasaomZhfQ9O7sIM/HppiR+HQybqUgvXw78qtn8Wml6FtVLKHc7yYhqd2X5JVOJ5oTptkSX02E7mSgKZ2Xujc15BUNodFJfv5+c+1qZRZPHw0EIhGJu7l4rKIdMywo8epm+vh3fHr6NW+s6l6Y+rg28uvormTgeTVz301EopKK9C2qpFVN5RaPc2k5EgAAAKESURBVGje7dj3UxpBFAfwBwc8QUBABaJAIIIkBBKIvSYaY+waW0zvvffee++a3vtfmd1DQo4w42WGN+PE/f6ws/tu9j5zt3twcwAiIiIiIiIiMzwn1tU5gnqTzVFZv4eION5Wir9j99RSGJ02VMRckXvjym7MiKkh58gxfl7DtjKfVuu7GJAV4/ZcI6vPOVHKT4022LlyPvc37GSkID3YypGzxLt5Ed9pl6ifmSqGuKiREoZoiI2aRoasJ0ZW8YVfQmu493LkFC2ykxu7SImNm7hh6aI0qvnOQtsaysfwqJ4bp6vpiDOHNfKPY+U+wuvwysT+g6Rrzokd7WuBHKkgftBlJF8g0woRmX45tLlnGbXRzHdXOTFi4UgVMXJA/kskRsIcuUyMNJXoj1zYIva/iIiISOo9KE8g/zmSPJ3cYl7BbLNmri41voVXFcWhEcnufbSY9SQHwFt8xXoho3Li1IixsKjYiPMnx814W1GcZTX4H/oN1qUAUVMcVmIC4Jneo5w4NaKfo4N5uCA5/px820oXx/A7G4/jcoAYfoSABVdAEw4qJ6q4XazR4kK5O4o96eNyMZF8MZJeAJTh+7h50NXOLqdVOVEdMtkNov1LxnHTT7kw4WJ3Dss7DV3RELRJGef4JwRHvn7TZiA/5AlP+Ic16UMsAm+cPkeHKsR5PysScX9KfndKFxM2N/9apHnK2uhAuA/eGUaH61UhwRYd1Nb9hbCm19mgKI7ha9a7zhceYv3D7FU/3MjWXg3SiwP3CkPZkJf9Rdf+LLIt3NFXLG9htvLP4wDd+KBGFdJ619TSrcuGwA30K4pDd7ylVg9/GNnK32TtYwyAKkRERERERGTG5xfV+1fLS6+G/gAAAABJRU5ErkJggg==',
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
    
    return {
      getGateway(code, issuer) {
        if (code === $rootScope.currentNetwork.coin.code) {
          return {
            logo : $rootScope.currentNetwork.coin.logo
          }
        }
        return  _asset2gateway[key(code, issuer)] || _asset2gateway[issuer] ||_gateways["unkown"];
      },
      
      get gateways() {
        return _gateways;
      },
      
      get defaultTradeAssets() {
        return [
          {code : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'ULT', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'}
        ]
      }
    };
  } ]);
