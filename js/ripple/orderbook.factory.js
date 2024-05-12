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
    
    async getBookAll(info) {
      let values = await Promise.all([this.getBook(info), this.getAmmBook(info)]);
      let book0 = values[0];
      let book1 = values[1];
      let all_asks = book0.asks.concat(book1.asks).filter(o=> o.gets_value!=0 && o.pays_value!=0).sort((a, b)=>{
        return a.price - b.price
      });
      let all_bids = book0.bids.concat(book1.bids).filter(o=> o.gets_value!=0 && o.pays_value!=0).sort((a, b)=>{
        return b.price - a.price;
      });
      return {asks: all_asks, bids: all_bids, amm: book1.amm};
    },

    async getAmmBook(info) {
      try {
        const asset = info.base.currency == "XRP" ? {currency: "XRP"} : { "currency": info.base.currency, "issuer": info.base.issuer};
        const asset2 = info.counter.currency == "XRP" ? {currency: "XRP"} : { "currency": info.counter.currency, "issuer": info.counter.issuer};
        const amm_info_request = {
          "command": "amm_info",
          "asset" : asset,
          "asset2": asset2,
          "ledger_index": "validated"
        };

        const {result: {amm}} = await _client.request(amm_info_request);
        //console.log(amm);
        if ("string" == typeof amm.amount) {
          amm.amount = {"currency": "XRP", value: xrpl.dropsToXrp(amm.amount)};
        }
        if ("string" == typeof amm.amount2) {
          amm.amount2 = {"currency": "XRP", value: xrpl.dropsToXrp(amm.amount2)};
        }
        let data = this._genBook(Number(amm.amount.value), Number(amm.amount2.value), (amm.trading_fee*1.1)/100000);
        data.amm = amm;
        return data;
      } catch(err) {          
        if (err.data && err.data.error === 'actNotFound') {
          console.log(`No AMM exists yet for the pair. (This is probably as expected.)`);
        } else {
          console.error("getAmm", err);
        }
        return {asks:[], bids:[]};
      }
    },

    _genBook(x, y, fee) {
      const k = x*y;
      const rate = [0.001, 0.003, 0.01];
      let bids = [], asks = [];
      for(let i=0; i<rate.length; i++) {
        let delta_x = x*rate[i];
        let x_in = delta_x * (1-fee);
        let y_out = y - k/(x+x_in);
        let buy_order = {
          account: "AMM",
          gets_value : y_out,
          pays_value : delta_x,
          amount : delta_x,
          volume : y_out
        }
        buy_order.price = buy_order.volume/buy_order.amount;
        bids.push(buy_order);

        let x_out = x*rate[i];
        let y_in = k/(x-x_out) - y;
        let delta_y = y_in / (1-fee);
        let sell_order = {
          account: "AMM",
          gets_value : x_out,
          pays_value : delta_y,
          amount : x_out,
          volume : delta_y
        }
        sell_order.price = sell_order.volume/sell_order.amount;
        asks.push(sell_order);
      }
  
      for(let i=rate.length-1; i>0; i--) {
        bids[i].amount -= bids[i-1].amount;
        bids[i].volume -= bids[i-1].volume;
        bids[i].price = bids[i].volume/bids[i].amount;

        asks[i].amount -= asks[i-1].amount;
        asks[i].volume -= asks[i-1].volume;
        asks[i].price = asks[i].volume/asks[i].amount;
      }
      return {asks: asks, bids: bids};
    },

    async getBook(info) {
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
