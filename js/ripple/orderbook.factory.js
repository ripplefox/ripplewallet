/* global myApp */

myApp.factory('XrpOrderbook', ['$rootScope', 'AuthenticationFactory', '$q', function($rootScope, AuthenticationFactory, $q) {
  let _client;
  
  function parseAmount(input) {
    return "object" === typeof input ? input : {currency: "XRP", value: xrpl.dropsToXrp(input)};
  };

  return {
    get address() {
      return AuthenticationFactory.address;
    },
    
    get nativeCode() {
      return $rootScope.currentNetwork.coin.code;
    },

    set client(client) {
      _client = client;
    },
    
    connect() {
      if (!_client) throw new Error("NotConnectedError");
      return _client.isConnected() ? Promise.resolve() : _client.connect();
    },
    
    async checkBook(info) {
      let asset1, asset2;
      if (this.nativeCode === info.base.currency) {
        asset1 = {currency: "XRP"};
      } else {
        asset1 = {currency: info.base.currency, issuer: info.base.issuer};
      }
      if (this.nativeCode === info.counter.currency) {
        asset2 = {currency: "XRP"};
      } else {
        asset2 = {currency: info.counter.currency, issuer: info.counter.issuer};
      }
      if (asset1.currency !== "XRP" && asset2.currency !== "XRP") {
        return await this._bridgeBook(asset1, asset2);
      } else {
        return await this._getBook(asset1, asset2);
      }
    },
    
    async _getBook(asset1, asset2) {
        try {
          await this.connect();
          let data = {asks:[], bids:[]};
          const book1 = await _client.request({"command": "book_offers", "taker_gets": asset1, "taker_pays": asset2, "limit": 40});
          book1.result.offers.forEach(offer => {            
            let taker_gets = parseAmount(offer.taker_gets_funded ? offer.taker_gets_funded : offer.TakerGets);
            let taker_pays = parseAmount(offer.taker_pays_funded ? offer.taker_pays_funded : offer.TakerPays);
            let order = {
              account: offer.Account,
              gets_currency : taker_gets.currency,
              gets_value : parseFloat(taker_gets.value),
              pays_currency : taker_pays.currency,
              pays_value : parseFloat(taker_pays.value)
            };
            order.amount = order.gets_value;
            order.volume = order.pays_value;
            order.price = order.volume/order.amount;
            data.asks.push(order);
          });

          const book2 = await _client.request({"command": "book_offers", "taker_gets": asset2, "taker_pays": asset1, "limit": 40});
          book2.result.offers.forEach(offer => {            
            let taker_gets = parseAmount(offer.taker_gets_funded ? offer.taker_gets_funded : offer.TakerGets);
            let taker_pays = parseAmount(offer.taker_pays_funded ? offer.taker_pays_funded : offer.TakerPays);
            let order = {
              account: offer.Account,
              gets_currency : taker_gets.currency,
              gets_value : parseFloat(taker_gets.value),
              pays_currency : taker_pays.currency,
              pays_value : parseFloat(taker_pays.value)
            };
            order.amount = order.pays_value;
            order.volume = order.gets_value;
            order.price = order.volume/order.amount;
            data.bids.push(order);
          });
          return data;
        } catch (err) {
          console.error(asset1.currency + '/' + asset2.currency, err);
          return {asks:[], bids:[]};
        }
    },
    
    async _bridgeBook(asset1, asset2) {
      let values = await Promise.all([this._getBook(asset1, asset2), this._getBook(asset1, {currency: "XRP"}), this._getBook({currency: "XRP"}, asset2)]);
      let book0 = values[0];
      let book1 = values[1];
      let book2 = values[2];
      let bridge_asks = this._calculateAsks(book1.asks, book2.asks).concat(book0.asks).sort((a, b)=>{
        return a.price - b.price
      });
      let birdge_bids = this._calculateBids(book1.bids, book2.bids).concat(book0.bids).sort((a, b)=>{
        return b.price - a.price;
      });
      return {asks: bridge_asks, bids: birdge_bids};
    },
    
    _calculateAsks(asks1, asks2) {
      var data = [];
      var pointer1 = 0, pointer2 = 0, i = 0;
      while (pointer1 < asks1.length && pointer2 < asks2.length && i < 30) {
        var ask1 = asks1[pointer1], ask2 = asks2[pointer2];
        if (ask1.pays_value < 0.001) {
          pointer1++;
          continue;
        }
        if (ask2.gets_value < 0.001) {
          pointer2++;
          continue;
        }
        var order = {
            account : 'AUTOBRIDGED',
            gets_currency : ask1.gets_currency,
            pays_currency : ask2.pays_currency
        };
        if(ask1.pays_value >= ask2.gets_value) {
          order.pays_value = ask2.pays_value;
          order.gets_value = ask2.gets_value / ask1.price;
          pointer2++;
          ask1.pays_value = ask1.pays_value - ask2.gets_value;
          ask1.gets_value = ask1.pays_value / ask1.price;
        } else {
          order.pays_value = ask1.pays_value * ask2.price;
          order.gets_value = ask1.gets_value;
          pointer1++;
          ask2.gets_value = ask2.gets_value - ask1.pays_value;
          ask2.pays_value = ask2.gets_value * ask2.price;
        }
        order.amount = order.gets_value;
        order.volume = order.pays_value;
        order.price = order.volume / order.amount;
        data.push(order);
        i++;
      }
      return data;
    },
    
    _calculateBids(bids1, bids2) {
      var data = [];
      var pointer1 = 0, pointer2 = 0, i = 0;
      while (pointer1 < bids1.length && pointer2 < bids2.length && i < 30) {
        var bid1 = bids1[pointer1], bid2 = bids2[pointer2];
        if (bid1.gets_value < 0.001) {
          pointer1++;
          continue;
        }
        if (bid2.pays_value < 0.001) {
          pointer2++;
          continue;
        }
        var order = {
            account : 'AUTOBRIDGED',
            gets_currency : bid2.gets_currency,
            pays_currency : bid1.pays_currency
        };
        if(bid1.gets_value >= bid2.pays_value) {
          order.gets_value = bid2.gets_value;
          order.pays_value = bid2.pays_value / bid1.price;
          pointer2++;
          bid1.gets_value = bid1.gets_value - bid2.pays_value;
          bid1.pays_value = bid1.gets_value / bid1.price;
        } else {
          order.gets_value = bid1.gets_value * bid2.price;
          order.pays_value = bid1.pays_value;
          pointer1++;
          bid2.pays_value = bid2.pays_value - bid1.gets_value;
          bid2.gets_value = bid2.pays_value * bid2.price;
        }
        order.amount = order.pays_value;
        order.volume = order.gets_value;
        order.price = order.volume / order.amount;
        data.push(order);
        i++;
      }
      return data;
    }
  };
} ]);
