/* global _, myApp, round */

myApp.controller("TradeCtrl", [ '$scope', '$rootScope', 'XrpApi', 'XrpOrderbook', 'SettingFactory', 'Gateways',
  function($scope, $rootScope, XrpApi, XrpOrderbook, SettingFactory, Gateways) {
    $scope.offers = {
      origin : null,
      all : {},
      ask : [],
      bid : [],
      clean : function() {
        this.origin = null;
        this.all = {};
        this.ask = [];
        this.bid = [];
      },
      update : function(data) {
        this.origin = data;
        this.all = {};
        this.ask = [];
        this.bid = [];
        data.forEach(offer => {
          offer.quantity = native2coin(offer.quantity);
          offer.total = native2coin(offer.total);          
          this.all[offer.seq] = offer;
          if (sameAsset(offer.quantity.currency, offer.quantity.issuer, $scope.base_code, $scope.base_issuer)
              && sameAsset(offer.total.currency, offer.total.issuer, $scope.counter_code, $scope.counter_issuer)) {
            if (offer.type == "sell") {
              this.ask.push(offer);
            } else {
              this.bid.push(offer);
            }
          }
        });
        try {
          this.ask = this.ask.sort((a, b) => {
            return parseFloat(a.price) - parseFloat(b.price);
          });
          this.bid = this.bid.sort((a, b) => {
            return parseFloat(b.price) - parseFloat(a.price);
          });
        } catch(e) {
          cosole.error(e);
        }
        
      }
    }

    var tradepair = SettingFactory.getTradepair();
    if (tradepair.base_issuer) {
      $scope.base_code   = realCode(tradepair.base_code);
      $scope.base_issuer = tradepair.base_issuer;
    } else {
      $scope.base_code   = $rootScope.currentNetwork.coin.code;
      $scope.base_issuer = null;
    }
    if (tradepair.counter_issuer) {
      $scope.counter_code   = realCode(tradepair.counter_code);
      $scope.counter_issuer = tradepair.counter_issuer;
    } else {
      $scope.counter_code   = $rootScope.currentNetwork.coin.code;
      $scope.counter_issuer = null;
    }
    $scope.savePair = function() {
      SettingFactory.setTradepair($scope.base_code, $scope.base_issuer, $scope.counter_code, $scope.counter_issuer);
    }
    $scope.base    = $rootScope.getGateway($scope.base_code, $scope.base_issuer);
    $scope.counter = $rootScope.getGateway($scope.counter_code, $scope.counter_issuer);

    $scope.tradeAssets = {};
    function addLinesToTradePairs() {
      for (var line of $rootScope.lines) {
        if (line.currency.substring(0, 2) !== "03") {
          $scope.tradeAssets[key(line.currency, line.issuer)] = {code: line.currency, issuer: line.issuer};
        }
      }
    };
    addLinesToTradePairs();
    $scope.$on("balanceChange", function() {
      addLinesToTradePairs();
    });
    Gateways.defaultTradeAssets.forEach(asset =>{
      $scope.tradeAssets[key(asset.code, asset.issuer)] = {
        code: realCode(asset.code),
        issuer: asset.issuer
      }
    });
    
    
    $scope.precise = 2;
    $scope.price_precise = 4;
    $scope.precise_jutify = function() {
      if (['BTC', 'ETH'].indexOf($scope.base_code) >= 0) {
        $scope.precise = 4;
      } else {
        $scope.precise = 2;
      }

      if (['USD', 'CNY', 'XRP', 'XLM', 'USDT'].indexOf(fmtCode($scope.counter_code)) >= 0) {
        $scope.price_precise = 4;
        if (['BTC', 'ETH'].indexOf($scope.base_code) >= 0) {
          $scope.price_precise = 0;
        }
        if ("XRPS" == fmtCode($scope.base_code)) {
          $scope.price_precise = 6;
        }
      } else if (['BTC', 'ETH'].indexOf($scope.counter_code) >= 0) {
        $scope.price_precise = 6;
      } else {
        $scope.price_precise = 4;
      }
    }
    $scope.precise_jutify();

    $scope.book = {
      origin : null,
      asks : [],
      bids : [],
      clean : function() {
        this.origin = null;
        this.asks = [];
        this.bids = [];
      },
      update : function(data) {
        this.origin = data;
        this.asks = JSON.parse(JSON.stringify(data.asks));
        this.bids = JSON.parse(JSON.stringify(data.bids));
        this.process();
      },
      price :function(type) {
        if (type == 'ask') {
          return this.asks.length ? this.asks[0].price : null;
        } else {
          return this.bids.length ? this.bids[0].price : null;
        }
      },
      process : function() {
        var depth = 0;
        this.asks = this.asks.map((item)=>{
          depth = depth + item.amount;
          item.depth = depth;
          return item;
        });
        
        depth = 0;
        this.bids = this.bids.map((item)=>{
          depth = depth + item.amount;
          item.depth = depth;
          return item;
        });
        
        this.asks = this.asks.filter(item => {
          return new BigNumber(item.gets_value).isGreaterThan("0.001") || new BigNumber(item.pays_value).isGreaterThan("0.001");
        });
        this.bids = this.bids.filter(item => {
          return new BigNumber(item.gets_value).isGreaterThan("0.001") || new BigNumber(item.pays_value).isGreaterThan("0.001");
        });
        
        var displayNum = 20;
        if (this.asks.length > displayNum) {
          this.asks = this.asks.slice(0, displayNum);
        }
        if (this.bids.length > displayNum) {
          this.bids = this.bids.slice(0, displayNum);
        }
      }
    }

    $scope.refreshingBook = false;
    $scope.refreshBook = function() {
      var info = {
          base : {currency: $scope.base_code, issuer: $scope.base_issuer},
          counter : {currency: $scope.counter_code, issuer: $scope.counter_issuer}
      };
      $scope.refreshingBook = true;
      $scope.countdown = 30;
      XrpOrderbook.checkBook(info).then(data => {
        if (!$scope.book.origin || !_.isEqual($scope.book.origin.asks, data.asks) || !_.isEqual($scope.book.origin.bids, data.bids)) {
          console.debug('book changed', $scope.book);
        }
        $scope.book.update(data);
        $scope.refreshingBook = false;
        //$scope.$apply();
      }).catch(err => {
        console.error('Should not reach here.', err);
        $scope.refreshingBook = false;
        //$scope.$apply();
      });
    }
    $scope.refreshBook();

    $scope.ammtab = "deposit"; //For tab switch
    $scope.amm = {};
    $scope.refreshingAmm = false;
    $scope.refreshAmm = function() {
      $scope.refreshingAmm = true;
      XrpApi.checkAmm($scope.base_code, $scope.base_issuer, $scope.counter_code, $scope.counter_issuer).then(data => {
        $scope.refreshingAmm = false;
        if (!data) {
          $scope.amm = {};
          return;
        }
        data.logo = $rootScope.getGateway(data.amount.currency, data.amount.issuer).logo;
        data.logo2 = $rootScope.getGateway(data.amount2.currency, data.amount2.issuer).logo;
        data.rate = fmtNumber(data.amount.value / data.amount2.value);
        data.rate2 = fmtNumber(data.amount2.value / data.amount.value);
        data.hold_1 = $rootScope.getBalance(data.amount.currency, data.amount.issuer);
        data.hold_2 = $rootScope.getBalance(data.amount2.currency, data.amount2.issuer);
        data.hold_lp = $rootScope.getBalance(data.lp_token.currency, data.lp_token.issuer);
        data.hold_lp_pct = data.hold / data.lp_token.value * 100;
        data.trading_fee = data.trading_fee / 1000;
        data.vote_slots.sort((a,b) => { return b.vote_weight - a.vote_weight; });
        $scope.amm = data;
        console.log(data);
      }).catch(err => {
        console.error('Should not reach here.', err);
        $scope.amm = {};
        $scope.refreshingAmm = false;
      });
    }
    $scope.refreshAmm();

    $scope.calcAmm = function(name) {
      if ("asset1" == name) {
        $scope.asset2_amt = round($scope.asset1_amt * $scope.amm.rate2, 8);
      } else {
        $scope.asset1_amt = round($scope.asset2_amt * $scope.amm.rate, 8);
      }
    }
    $scope.withdrawAll = false;
    $scope.updateLpValue = function(rate) {
      if (rate) {
        $scope.withdrawAll = rate == 1;
        $scope.lp_amt = round($scope.amm.hold_lp * rate, 8);
      } else {
        $scope.withdrawAll = false;
      }      
    }

    $scope.adding = false;
    $scope.add_fail;
    $scope.addLp = function() {
      $scope.adding = true;
      $scope.add_hash = "";
      $scope.add_state = "";
      $scope.add_fail = "";
      let amount1 = Object.assign({}, $scope.amm.amount);
      let amount2 = Object.assign({}, $scope.amm.amount2);
      amount1.value = $scope.asset1_amt.toString();
      amount2.value = $scope.asset2_amt.toString();
      $scope.adding = true;
      XrpApi.addLp(amount1, amount2).then(hash => {
        $scope.adding = false;
        $scope.add_hash = hash;
        $scope.add_state = "submitted";
        $scope.asset1_amt = "";
        $scope.asset2_amt = "";
        $scope.$apply();
        $scope.refreshAmm();
      }).catch(err => {
        $scope.adding = false;
        $scope.add_fail = err.message;
        $scope.$apply();
      });
    }
    $scope.withdrawing = false;
    $scope.withdraw_fail;
    $scope.withdrawLp = function() {
      $scope.withdrawing = true;
      $scope.withdraw_hash = "";
      $scope.withdraw_state = "";
      $scope.withdraw_fail = "";
      let asset1 = {currency: $scope.amm.amount.currency, issuer: $scope.amm.amount.issuer};
      let asset2 = {currency: $scope.amm.amount2.currency, issuer: $scope.amm.amount2.issuer};
      let lpAmount = Object.assign({}, $scope.amm.lp_token);
      lpAmount.value = $scope.lp_amt.toString();
      $scope.withdrawing = true;
      XrpApi.withdrawLp(asset1, asset2, lpAmount, $scope.withdrawAll).then(hash => {
        $scope.withdrawing = false;
        $scope.withdraw_hash = hash;
        $scope.withdraw_state = "submitted";
        $scope.lp_amt = "";
        $scope.withdrawAll = false;
        $scope.$apply();
        $scope.refreshAmm();
      }).catch(err => {
        $scope.withdrawing = false;
        $scope.withdraw_fail = err.message;
        $scope.$apply();
      });
    }
    $scope.voting = false;
    $scope.vote_fail;
    $scope.voteLp = function() {
      $scope.voting = true;
      $scope.vote_hash = "";
      $scope.vote_state = "";
      $scope.vote_fail = "";
      let asset1 = {currency: $scope.amm.amount.currency, issuer: $scope.amm.amount.issuer};
      let asset2 = {currency: $scope.amm.amount2.currency, issuer: $scope.amm.amount2.issuer};
      let fee = round($scope.lp_fee * 1000).toString();
      $scope.voting = true;      
      XrpApi.voteLp(asset1, asset2, fee).then(hash => {
        $scope.voting = false;
        $scope.vote_hash = hash;
        $scope.vote_state = "submitted";
        $scope.lp_fee = "";
        $scope.$apply();
        $scope.refreshAmm();
      }).catch(err => {
        $scope.voting = false;
        $scope.vote_fail = err.message;
        $scope.$apply();
      });
    }

    $scope.refreshingOffer = false;
    $scope.refreshOffer = function() {
      $scope.refreshingOffer = true;
      XrpApi.checkOffers().then(data => {
        $scope.offers.update(data);
        console.log($scope.offers);
        $scope.refreshingOffer = false;
        $scope.$apply();
      }).catch(err => {
        $scope.refreshingOffer = false;
        $scope.$apply();
      });
    }
    $scope.refreshOffer();
    
    $scope.$on("balanceUpdate", function() {
      console.debug('balanceUpdate event got');
      $scope.refreshOffer();
      $scope.refreshBook();
    });

    $scope.buying = false;
    $scope.buy_fail;
    $scope.selling = false;
    $scope.sell_fail;
    
    $scope.buy_hash = "";
    $scope.buy_state = "";
    $scope.sell_hash = "";
    $scope.sell_state = "";
    $scope.add_hash = "";
    $scope.add_state = "";
    $scope.withdraw_hash = "";
    $scope.withdraw_state = "";
    $scope.vote_hash = "";
    $scope.vote_state = "";
    $scope.$on("txSuccess", function(e, tx) {
      console.debug('txSuccess event', tx);
      if (tx.hash == $scope.buy_hash) {
        $scope.buy_state = "success";
        $scope.refreshOffer();
        $scope.refreshBook();
      }
      if (tx.hash == $scope.sell_hash) {
        $scope.sell_state = "success";
        $scope.refreshOffer();
        $scope.refreshBook();
      }
      if (tx.hash == $scope.add_hash) {
        $scope.add_state = "success";
        $scope.refreshAmm();
      }
      if (tx.hash == $scope.withdraw_hash) {
        $scope.withdraw_state = "success";
        $scope.refreshAmm();
      }
      if (tx.hash == $scope.vote_hash) {
        $scope.vote_state = "success";
        $scope.refreshAmm();
      }
      $scope.$apply();
    });
    $scope.$on("txFail", function(e, tx) {
      console.debug('txFail event', tx);
      if (tx.hash == $scope.buy_hash) {
        $scope.buy_state = "fail";
        $scope.buy_fail = tx.message;
        $scope.refreshOffer();
        $scope.refreshBook();
      }
      if (tx.hash == $scope.sell_hash) {
        $scope.sell_state = "fail";
        $scope.sell_fail = tx.message;
        $scope.refreshOffer();
        $scope.refreshBook();
      }
      if (tx.hash == $scope.add_hash) {
        $scope.add_state = "fail";
        $scope.add_fail = tx.message;
        $scope.refreshAmm();
      }
      if (tx.hash == $scope.withdraw_hash) {
        $scope.withdraw_state = "fail";
        $scope.withdraw_fail = tx.message;
        $scope.refreshAmm();
      }
      if (tx.hash == $scope.vote_hash) {
        $scope.vote_state = "fail";
        $scope.vote_fail = tx.message;
        $scope.refreshAmm();
      }
      $scope.$apply();
    });

    $scope.buy_price;
    $scope.buy_amount;
    $scope.buy_volume;
    $scope.sell_price;
    $scope.sell_amount;
    $scope.sell_volume;
    $scope.calculate = function(name) {
      switch(name) {
      case 'buy_price':
        $scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
        break;
      case 'buy_amount':
        $scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
        break;
      case 'buy_volume':
        $scope.buy_amount = round($scope.buy_volume / $scope.buy_price, 8);
        break;
      case 'sell_price':
        $scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
        break;
      case 'sell_amount':
        $scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
        break;
      case 'sell_volume':
        $scope.sell_amount = round($scope.sell_volume / $scope.sell_price, 8);
        break;
      }
    }
    $scope.pickPrice = function(src, price) {
      if (src == 'bid') {
        $scope.sell_price = price;
      } else {
        $scope.buy_price = price;
      }
    }
    
    $scope.offerWithCheck = function(type) {
      var price;
      if (type == 'buy') {
        price = $scope.book.price('ask');
        if (price && $scope.buy_price > price * 1.2) {
          $scope.fatfingerbuy = true;
        } else {
          $scope.offer(type);
        }
      } else {
        price = $scope.book.price('bid');
        if (price && $scope.sell_price < price * 0.8) {
          $scope.fatfingersell = true;
        } else {
          $scope.offer(type);
        }
      }
    }

    $scope.offer = function(type) {
      $scope['fatfinger' + type] = false; // hide the fatfinger warning
      $scope[type + 'ing'] = true;
      $scope[type + '_hash'] = "";
      $scope[type + '_state'] = "";
      $scope[type + '_fail'] = "";
      var option = {
        type : type,
        base        : $scope.base_code,
        base_issuer : $scope.base_issuer,
        counter        : $scope.counter_code,
        counter_issuer : $scope.counter_issuer
      };
      if (type == 'buy') {
        option.amount = $scope.buy_amount;
        option.price  = $scope.buy_price;
      } else {
        option.amount = $scope.sell_amount;
        option.price  = $scope.sell_price;
      }
      XrpApi.offer(option).then(hash => {
        $scope[type + 'ing'] = false;
        $scope[type + '_hash'] = hash;
        $scope[type + '_state'] = "submitted";
        $scope[type + '_amount'] = "";
        $scope[type + '_price'] = "";
        $scope[type + '_volume'] = "";
        $scope.$apply();
        $scope.refreshOffer();
        $scope.refreshBook();
      }).catch(err => {
        $scope[type + 'ing'] = false;
        $scope[type + '_fail'] = err.message;
        $scope.$apply();
      });
    }

    $scope.offerDelete = {};
    $scope.isCancelling = function(id) {
      return !!$scope.offerDelete[id];
    }
    
    $scope.cancel = function(offer_id) {
      $scope.offerDelete[offer_id] = true;
      $scope.cancel_error = "";
      XrpApi.cancelOffer(offer_id).then(result => {
        $scope.refreshOffer();
      }).catch(err => {
        $scope.offerDelete[offer_id] = false;
        $scope.cancel_error = err.message;
      });
    }

    $scope.show_pair = false;
    $scope.choosePair = function() {
      $scope.show_pair = !$scope.show_pair;
      if (!$scope.show_pair) {
        $scope.book.clean();
        $scope.offers.clean();
        $scope.offerDelete = {};
        $scope.refreshOffer();
        $scope.refreshBook();
        $scope.show_amm = false;
        $scope.refreshAmm();
        $scope.savePair();
      }
    }
    $scope.pick = function(type, code, issuer) {
      if (type == 'base') {
        $scope.base_code = code;
        $scope.base_issuer = issuer;
        $scope.base = $rootScope.getGateway(code, issuer);
      } else {
        $scope.counter_code = code;
        $scope.counter_issuer = issuer;
        $scope.counter = $rootScope.getGateway(code, issuer);
      }
      $scope.precise_jutify();
    }
    $scope.flip = function() {
      var old_base_code = $scope.base_code;
      var old_base_issuer = $scope.base_issuer;
      $scope.pick('base', $scope.counter_code, $scope.counter_issuer);
      $scope.pick('counter', old_base_code, old_base_issuer);
      if (!$scope.show_pair) {
        $scope.book.clean();
        $scope.offers.clean();
        $scope.offerDelete = {};
        $scope.refreshOffer();
        $scope.refreshBook();
        $scope.show_amm = false;
        $scope.refreshAmm();
        $scope.savePair();
      }
    }

    $scope.isBase = function(code, issue) {
      return sameAsset(code, issue, $scope.base_code, $scope.base_issuer);
    }
    $scope.isCounter = function(code, issue) {
      return sameAsset(code, issue, $scope.counter_code, $scope.counter_issuer);
    }
    
    $scope.countdown = 30;
    console.log('countdown');
    $scope.timer = setInterval(function() {
      $scope.$apply(function() {
        $scope.countdown = $scope.countdown - 1;
        if ($scope.countdown <= 0) {
          $scope.refreshBook();
          $scope.refreshAmm();
        }
      });
    }, 1000);
    
    $scope.$on("$destroy", function() {
      clearInterval($scope.timer);
    });
    
    function sameAsset(code, issuer, code2, issuer2) {
      if (code == $rootScope.currentNetwork.coin.code) {
        return code == code2;
      } else {
        return code == code2 && issuer == issuer2;
      }
    }
    
    function native2coin(asset) {
      obj = JSON.parse(JSON.stringify(asset));
      if (obj.currency == 'XRP') {
        obj.currency = $rootScope.currentNetwork.coin.code;
      }
      if (obj.code == 'XRP') {
        obj.code = $rootScope.currentNetwork.coin.code;
      }
      return obj;
    }

    function fmtNumber(num) {
      if (num > 100) {
        return parseFloat(num.toFixed(2));
      } else if (num > 10) {
        return parseFloat(num.toFixed(3));
      } else {
        return parseFloat(num.toFixed(6));
      }
    }
  } ]);
