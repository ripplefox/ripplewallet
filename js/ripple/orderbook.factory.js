/* global myApp */

myApp.factory('XrpOrderbook', ['$rootScope', 'AuthenticationFactory', '$q', function($rootScope, AuthenticationFactory, $q) {
  let _remote;
  let _myHandler;
  
  function formatOrder(item) {
    var order = {};
    order.account = item.properties.maker;
    if (item.specification.direction == 'sell') {
      order.gets_currency = item.specification.quantity.currency;
      order.gets_value = item.state ? parseFloat(item.state.fundedAmount.value) : parseFloat(item.specification.quantity.value);
      order.pays_currency = item.specification.totalPrice.currency
      order.pays_value = item.state ? parseFloat(item.state.priceOfFundedAmount.value) : parseFloat(item.specification.totalPrice.value);
      order.volume = order.pays_value;
      order.amount = order.gets_value;
      order.price = order.pays_value/order.gets_value;
    } else {
      order.gets_currency = item.specification.totalPrice.currency;
      order.gets_value = item.state ? parseFloat(item.state.fundedAmount.value) : parseFloat(item.specification.totalPrice.value);
      order.pays_currency = item.specification.quantity.currency
      order.pays_value = item.state ? parseFloat(item.state.priceOfFundedAmount.value) : parseFloat(item.specification.quantity.value);
      order.volume = order.gets_value;
      order.amount = order.pays_value;
      order.price = order.gets_value/order.pays_value;
    }
    return order;
  };
  
  function formatBook(book) {
    return {
      asks: book.asks.map(formatOrder),
      bids: book.bids.map(formatOrder)
    }
  }

  return {
    get address() {
      return AuthenticationFactory.address;
    },
    
    get nativeCode() {
      return $rootScope.currentNetwork.coin.code;
    },

    set remote(remote) {
      _remote = remote;
    },
    
    connect() {
      if (!_remote) throw new Error("NotConnectedError");
      return _remote.isConnected() ? Promise.resolve() : _remote.connect();
    },
    
    checkBook(info) {
      if (this.nativeCode === info.base.currency) {
        info.base.currency = 'XRP';
        delete info.base.counterparty;
      }
      if (this.nativeCode === info.counter.currency) {
        info.counter.currency = 'XRP';
        delete info.counter.counterparty;
      }
      var bookPromise = $q.defer();
      if (info.base.currency !== 'XRP' && (info.counter.currency !== 'XRP')) {
        this._bridgeBook(info, bookPromise);
      } else {
        this._getBook(info).then(data => {
          bookPromise.resolve(formatBook(data));
        });
      }
      return bookPromise.promise;
    },
    
    _getBook(info) {
      return new Promise(async (resolve, reject)=>{
        try {
          await this.connect();
          const response = await _remote.getOrderbook(this.address, info, {limit: 40});
          resolve(response);
        } catch (err) {
          console.error(info.base.currency + '/' + info.counter.currency, err);
          resolve({asks:[], bids:[]});
        }
      });
    },
    
    _bridgeBook(info, bookPromise) {
      var info1 = { base : info.base, counter : {currency: 'XRP'} };
      var info2 = { base : {currency: 'XRP'}, counter: info.counter };
      Promise.all([this._getBook(info), this._getBook(info1), this._getBook(info2)]).then(values => {
        var book0 = formatBook(values[0]);
        var book1 = formatBook(values[1]);
        var book2 = formatBook(values[2]);
        var bridge_asks = this._calculateAsks(book1.asks, book2.asks).concat(book0.asks).sort((a, b)=>{
          return a.price - b.price
        });
        var birdge_bids = this._calculateBids(book1.bids, book2.bids).concat(book0.bids).sort((a, b)=>{
          return b.price - a.price;
        });
        bookPromise.resolve({asks: bridge_asks, bids: birdge_bids});
      });
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
