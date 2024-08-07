/* global _, myApp */

myApp.factory('Gateways', ['$rootScope', function($rootScope) {
    let _gateways = {
        "xrps.io" : {
          name : 'xrps.io',
          website : 'https://xrps.io/',
          deposit : "https://xrps.io/deposit",
          assets : [
            {code : 'XRPS', issuer : 'rN1bCPAxHDvyJzvkUso1L2wvXufgE4gXPL', list: true, name: "XRP Inscription", logo: "img/coin/xrps.png"},
            {code : 'USDT', issuer : 'rGbUjUtNVq5M3Un5r4efJqHed4o5P2Usdt', list: true, name: "Tether (USDT)", logo: "img/coin/usdt.svg", deposit: true},
            {code : 'BTC', issuer : 'raPhno5Bpmch3oWwqXy6e4vgQeidKknBTC', list: true, name: "Bitcoin", logo: "img/coin/btc.svg"},
            {code : 'BNB',  issuer : 'rsL5YuuidUu5zqSDdf4KQEpp3eHdPy2yes', list: true, name: "Binance", logo: "img/coin/bnb.svg"},
            {code : 'FIL', issuer : 'rsL5YuuidUu5zqSDdf4KQEpp3eHdPy2yes', list: true, name: "Filecoin", logo: "img/coin/filecoin.svg"},
            {code : 'OKB',  issuer : 'rsL5YuuidUu5zqSDdf4KQEpp3eHdPy2yes', list: true, name: "OKX", logo: "img/coin/okb.webp"},
            {code : 'PEOPLE', issuer : 'rfY6rBycwpcyt49TGFvaVAoib3qmcWJERC', list: true, name: "ConstitutionDAO", logo: "img/coin/people.png"},
            {code : 'PEPE', issuer : 'rfY6rBycwpcyt49TGFvaVAoib3qmcWJERC', list: true, name: "Pepe", logo: "img/coin/pepe.jpg"},
            {code : 'SHIB', issuer : 'rfY6rBycwpcyt49TGFvaVAoib3qmcWJERC', list: true, name: "Shiba Inu", logo: "img/coin/shib.svg"},
            {code : 'SOL',  issuer : 'rsL5YuuidUu5zqSDdf4KQEpp3eHdPy2yes', list: true, name: "Solana", logo: "img/coin/sol.webp"},
            {code : 'UNI',  issuer : 'rfY6rBycwpcyt49TGFvaVAoib3qmcWJERC', list: true, name: "Uniswap", logo: "img/coin/uni.png"}
          ],
          logo : "img/coin/xrps.png"
        },
        "ripplefox.com" : {
          name : 'ripplefox.com',
          website : 'https://ripplefox.com/',
          deposit : 'https://ripplefox.com/deposit',
          assets : [
            {code : 'USD', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: false, name: "USDT", logo: "img/coin/usdt.svg", deposit: true, withdraw: "usdt@ripplefox.com"},
            {code : 'ETH', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Ethereum", logo: "img/coin/eth.svg", deposit: true, withdraw: "eth@ripplefox.com"},
            {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Stellar Lumens", logo: "img/coin/xlm.png", deposit: true, withdraw: "xlm@ripplefox.com"},
            {code : 'ULT', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Ultiledger", logo: "img/coin/ult.png"}
          ],
          logo : "img/gateway/ripplefox.png"
        },
        "foxcny.com" : {
          name : 'foxcny.com',
          website : 'https://foxcny.com/',        
          assets : [
            {code : 'CNY', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "CNYT"}
          ],
          logo : "img/gateway/ripplefox.png"
        },
        "iripplechina.com" : {
          name : 'iripplechina.com',
          website : 'http://wg.iripplechina.com',
          assets : [
            {code : 'CNY', issuer : 'razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA'}
          ],
          logo : "img/gateway/ripplechina.png"
        },
        "bitstamp.net" : {
          name : 'bitstamp.net',
          website : 'https://www.bitstamp.net/',
          assets : [
            {code : 'USD', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'},
            {code : 'BTC', issuer : 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'}
          ],
          logo : "img/gateway/bitstamp.png"
        },
        "gatehub.net" : {
          name : 'gatehub.net',
          website : 'https://www.gatehub.net/',
          assets : [
            {code : 'USD', issuer : 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'},
            {code : 'EUR', issuer : 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', list: false},
            {code : 'BTC', issuer : 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL', list: false}
          ],
          logo : "img/gateway/gatehub.png"
        },
        "xagfans.com" : {
          name : 'xagfans.com',
          website : 'https://xagfans.com/',
          deposit : 'https://xagfans.com/deposit',
          assets : [
            {code : 'XAG', issuer : 'rpG9E7B3ocgaKqG7vmrsu3jmGwex8W4xAG', list: true, logo: "img/coin/xag.png", deposit: true, withdraw: "xag@xagfans.com"}
          ],
          logo : "img/coin/xag.png"
        }
        // "dxperts.org" : {
        //   name : 'dxperts.org',
        //   website : 'https://dxperts.org/',
        //   service : [],
        //   assets : [
        //     {code : 'DXP', issuer : 'rM8AhEC5Zz46ecWC8KwkoMugY1KwFQqhZT'}
        //   ],
        //   logo : "img/gateway/dxperts.png"
        // }
    };
    
    let _xagnet = {
        "xagfans.com" : {
          name : 'xagfans.com',
          website : 'https://xagfans.com',
          assets : [
            {code : 'USDT', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT', list: true, name: "Tether", logo: "img/coin/usdt.svg"},
            {code : 'Ripple', issuer : 'rMeL8gHJifANAfVchSDkTUmUWjHMvCeXrp', list: true, name: "Ripple XRP", logo: "img/coin/xrp.png"},
            {code : 'XLM', issuer : 'rUWABeB63z3pq2L6Ke4BTQAPS6hbBtFXLM', list: true, name: "Stellar Lumens", logo: "img/coin/xlm.png"},
            {code : 'ETH', issuer : 'rHJ6a42xxExCxyUJWQAKHdwarxVf6L9ETH', list: true, name: "Ethereum", logo: "img/coin/eth.svg"}
          ],
          logo : "img/coin/xag.png"
        }
    };

    let _testingnet = {
        "xrps.is" : {
          name : 'xrps.io',
          website : 'https://xrps.io/',
          assets : [
            {code : 'XRPS', issuer : 'rN1bCPAxHDvyJzvkUso1L2wvXufgE4gXPL', list: true, name: "XRPS (Testing)", logo: "img/coin/xrps.png", mint: "mint@xrps.io"}
          ],
          logo : "img/coin/xrps.png"
        },
        "ripplefox.com" : {
          name : 'ripplefox.com',
          website : 'https://ripplefox.com/',
          deposit : 'https://ripplefox.com/deposit',
          assets : [
            {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y', list: true, name: "Lumens (Testing)", logo: "img/coin/xlm.png", deposit: true}
          ],
          logo : "img/gateway/ripplefox.png"
        }
    };
    
    let _asset2gateway = {};
    addMap(_asset2gateway, _gateways);
    addMap(_asset2gateway, _xagnet);

    function addMap(map, gateways) {
      for (var name in gateways) {
        var gateway = gateways[name];
        gateway.assets.forEach(asset =>{
          if (asset.logo) {
            map[key(asset.code, asset.issuer)] = {
                name : gateway.name,
                website : gateway.website,
                logo : asset.logo,
                deposit : asset.deposit ? gateway.deposit : "",
                withdraw : asset.withdraw
            };
          }
          map[asset.issuer] = {
              name : gateway.name,
              website : gateway.website,
              logo : gateway.logo
          }
        });
      }
    }

    //add xag net asset to asset2gateway
    _xagnet["xagfans.com"].assets.forEach(asset => {
      _asset2gateway[asset.issuer] = {
          name : _xagnet["xagfans.com"].name,
          website : _xagnet["xagfans.com"].website,
          logo : _xagnet["xagfans.com"].logo
      }
    });

    return {
/* {
        "currency": "XLM",
        "issuer": "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y",
        "logo": "https://xrps.io/images/coin/xlm.png",
        "name": "Stellar Lumens",
        "deposit": "https://ripplefox.com/deposit",
        "domain": "ripplefox.com",
        "list": true
} */
      // add item to _gateways & _asset2gateway
      addGateway(item) {
        if (!_gateways[item.domain]) {
          _gateways[item.domain] = {
            name: item.domain,
            website: "https://" + item.domain,
            assets : []
          }
        }
        let assets = _gateways[item.domain].assets;
        let asset = assets.find(x => { return x.code == item.currency });
        if (!asset) {
          console.log(`Add ${item.currency} to ${item.domain}`);
          assets.push({
            code: item.currency,
            issuer: item.issuer,
            name : item.name,
            logo : item.logo,
            list : item.list
          });
          _asset2gateway[key(item.currency, item.issuer)] = {
            logo: item.logo,
            deposit : item.deposit || ""
          }
        }
      },

      getGateway(code, issuer) {
        if (code === $rootScope.currentNetwork.coin.code) {
          return { logo : $rootScope.currentNetwork.coin.logo };
        }
        if (code.length == 40 && code.substring(0, 2) == "03") {
          return { logo : "img/coin/lp.png" };
        }
        return _asset2gateway[key(code, issuer)] || _asset2gateway[issuer] || {logo : 'img/unknown.png'};
      },

      get gateways() {
        if ($rootScope.currentNetwork.networkType == 'xrpTest') {
          return _testingnet;
        } 
        if ($rootScope.currentNetwork.networkType == 'xag') {
          return _xagnet;
        }
        return _gateways;
      },
      
      get defaultTradeAssets() {
        if ($rootScope.currentNetwork.coin.code == "XAG") {
          return [
            {code : 'USDT', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT'},
            {code : 'Ripple', issuer : 'rMeL8gHJifANAfVchSDkTUmUWjHMvCeXrp'},
            {code : 'XLM', issuer : 'rUWABeB63z3pq2L6Ke4BTQAPS6hbBtFXLM'},
            {code : 'ETH', issuer : 'rHJ6a42xxExCxyUJWQAKHdwarxVf6L9ETH'}
          ];
        }
        return [
          {code : 'USDT', issuer : 'rGbUjUtNVq5M3Un5r4efJqHed4o5P2Usdt'},
          {code : 'CNY',  issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'XRPS', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'XLM', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'},
          {code : 'ETH', issuer : 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'}
        ]
      }
    };
  } ]);
