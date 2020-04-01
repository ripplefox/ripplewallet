/* global _, myApp, round, RippleAPI */

myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager',
  function($rootScope, AuthenticationFactory, SM) {

    let _ownerCount = 0;
    let _xrpBalance = "";
    let _sequence = 0;
    
    let _balances = {}; // all balances include xrp
    let _trustlines = {}; // no xrp line
    let _unsubscribeAccount;
    let _unsubscribeTx;
    let _remote;
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };

    return {
      set remote(remote) {
        _remote = remote;
        
        if (this.address) {
          this.queryAccount();
        }
      },
      
      logout() {
        this.address = undefined;
        _balances = {};
        //this._closeStream();
      },
      
      get address() {
        return AuthenticationFactory.address;
      },
      
      checkFunded(address) {
        return new Promise(async (resolve)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          _remote.getAccountInfo(address || this.address).then(() => {
              resolve(true);
          }).catch(e => {
              if (e.data.error === 'actNotFound') {
                resolve(false);
              } else {
                reject(e);
              }
          });
        });
      },
      
      checkInfo(address) {
        return new Promise(async (resolve, reject)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          _remote.getAccountInfo(address || this.address).then((info) => {
            _xrpBalance = info.xrpBalance;
            _ownerCount = info.ownerCount;
            _sequence = info.sequence;
            resolve(info);
          }).catch(e => {
            if (e.data.error === 'actNotFound') {
              e.funded = false;
            }
            reject(e);
          });
        });
      },
      
      checkBalances(address) {
        return new Promise(async (resolve)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          _remote.getBalances(address || this.address).then((ret) => {
            let balances = {};
            ret.forEach((item)=>{
              balances[key(item.currency, item.counterparty)] = item;
            });
            _balances = balances;
            console.log(ret);
            resolve(balances);
          }).catch(e => {
            console.error('getBalance', e);
            reject(e);
          });
        });
      },
      
      checkTrustlines(address) {
        return new Promise(async (resolve)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          _remote.getTrustlines(address || this.address).then((ret) => {
            let lines = {};
            ret.forEach((item)=>{
              var keystr = key(item.specification.currency, item.specification.counterparty);
              lines[keystr] = item;
            });
            _trustlines = lines;
            console.log(ret);
            resolve(lines);
          }).catch(e => {
            console.error('getTrustlines', e);
            reject(e);
          });
        });
      },
      
      queryAccount(callback) {
        this.checkInfo().then(info => {
          return this.checkBalances();
        }).then(bal => {
          return this.checkTrustlines();
        }).then(lines => {
          this._updateRootInfo();
          if (callback) { callback(); }
        }).catch(e => {
          console.error(e);
          if (callback) { callback(err); }
        });
      },
      
      _updateRootInfo() {
        $rootScope.balance = _xrpBalance;
        $rootScope.reserve = SM.reserveBaseXRP + SM.reserveIncrementXRP * _ownerCount;
        var lines = {};
        
        for (var keystr in _balances) {
          if (keystr !== 'XRP') {
            var asset = _balances[keystr];
            var trust = _trustlines[keystr];
            if (asset.value == "0" && trust.specification.limit == "0") {
              continue; // do not show line others trusted
            }
            if (!lines[asset.currency]) {
              lines[asset.currency] = {};
            }
            const item = {
              code : asset.currency,
              issuer : asset.counterparty,
              balance : asset.value,
              limit: trust.specification.limit
            };
            lines[asset.currency][asset.counterparty] = item;
          }
        }
        $rootScope.lines = lines;
        $rootScope.$broadcast("balanceChange");
        $rootScope.$apply();
      },
      

      _sendToken(target, currency, issuer, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        _server.loadAccount(this.address).then((account) => {
          this._updateSeq(account);
          const payment = StellarSdk.Operation.payment({
            destination: target,
            asset: new StellarSdk.Asset(currency, issuer),
            amount: amount.toString()
          });
          const memo = new StellarSdk.Memo(memo_type, memo_value);
          const te = new StellarSdk.TransactionBuilder(account, {memo:memo, fee: _basefee}).addOperation(payment).setTimeout(_timeout).build();
          return AuthenticationFactory.sign(te);
        }).then((te) => {
          return _server.submitTransaction(te);
        }).then((txResult) => {
          console.log('Send Asset done.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Send Fail !', err);
          callback(err, null);
        });
      },

      _offer(selling, buying, amount, price, callback) {
        amount = round(amount, 7);
        console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price, _basefee);
        _server.loadAccount(this.address).then((account) => {
          this._updateSeq(account);
          const op = StellarSdk.Operation.manageOffer({
            selling: selling,
            buying: buying,
            amount: amount.toString(),
            price : price.toString()
          });
          const te = new StellarSdk.TransactionBuilder(account, {fee: _basefee}).addOperation(op).setTimeout(_timeout).build();
          return AuthenticationFactory.sign(te);
        }).then((te) => {
          return _server.submitTransaction(te);
        }).then((txResult) => {
          console.log(txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Offer Fail !', err);
          callback(err, null);
        });
      },

      _closeStream() {
        if (_closeAccountStream) {
          _closeAccountStream();
          _closeAccountStream = undefined;
        }
        if (_closeTxStream) {
          _closeTxStream();
          _closeTxStream = undefined;
        }
      },

      send(target, currency, issuer, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        console.debug(target, currency, issuer, amount, memo_type, memo_value);
        if (currency == $rootScope.currentNetwork.coin.code) {
          this._isFunded(target, (err, isFunded) => {
            if (err) {
              return callback(err, null);
            } else {
              if (isFunded) {
                this._sendCoin(target, amount, memo_type, memo_value, callback);
              } else {
                this._fund(target, amount, memo_type, memo_value, callback);
              }
            }
          });
        } else {
          this._sendToken(target, currency, issuer, amount, memo_type, memo_value, callback);
        }
      },

      convert(alt, callback) {
        console.debug(alt.origin.source_amount + '/' + alt.src_code + ' -> ' + alt.origin.destination_amount + '/' + alt.dst_code);
        const path = alt.origin.path.map((item) => {
          if (item.asset_type == 'native') {
            return new StellarSdk.Asset.native();
          } else {
            return new StellarSdk.Asset(item.asset_code, item.asset_issuer);
          }
        });
        let sendMax = alt.origin.source_amount;
        if (alt.max_rate) {
          sendMax = round(alt.max_rate * sendMax, 7).toString();
        }
        _server.loadAccount(this.address).then((account) => {
          this._updateSeq(account);
          const pathPayment = StellarSdk.Operation.pathPayment({
            destination: this.address,
            sendAsset  : getAsset(alt.src_code, alt.src_issuer),
            sendMax    : sendMax,
            destAsset  : getAsset(alt.dst_code, alt.dst_issuer),
            destAmount : alt.origin.destination_amount,
            path       : path
          });
          const te = new StellarSdk.TransactionBuilder(account, {fee: _basefee}).addOperation(pathPayment).setTimeout(_timeout).build();
          return AuthenticationFactory.sign(te);
        }).then((te) => {
          return _server.submitTransaction(te);
        }).then((txResult) => {
          console.log('Send Asset done.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Send Fail !', err);
          callback(err, null);
        });
      },

      listenStream() {
        this._closeStream();

        console.log(this.address, _server.accounts().accountId(this.address))
        _closeAccountStream = _server.accounts().accountId(this.address).stream({
          onmessage: (res) => {
            if (_subentry !== res.subentry_count) {
              console.debug('subentry: ' + _subentry + ' -> ' + res.subentry_count);
              _subentry = res.subentry_count;
              $rootScope.reserve = _subentry * 0.5 + 1;
              $rootScope.$apply();
            }
            if(!_.isEqual(_balances, res.balances)) {
              console.debug('balances: ', _balances, res.balances);
              _balances = res.balances;
              this._updateRootBalance();
              $rootScope.$apply();
            }
          }
        });

        // TODO: parse the tx and do action
        _closeTxStream = _server.transactions().forAccount(this.address)
          .cursor("now")
          .stream({
            onmessage: (res) => {
              const tx = StellarHistory.processTx(res, this.address);
              console.log('tx stream', tx);
            }
          });
      },


      changeTrust(code, issuer, limit, callback) {
        const asset = new StellarSdk.Asset(code, issuer);
        console.debug('Turst asset', asset, limit);
        _server.loadAccount(this.address).then((account) => {
          this._updateSeq(account);
          const op = StellarSdk.Operation.changeTrust({
            asset: asset,
            limit: limit.toString()
          });
          const te = new StellarSdk.TransactionBuilder(account, {fee: _basefee}).addOperation(op).setTimeout(_timeout).build();
          return AuthenticationFactory.sign(te);
        }).then((te) => {
          return _server.submitTransaction(te);
        }).then((txResult) => {
          console.log(txResult);
          console.log('Trust updated.', txResult.hash);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Trust Fail !', err);
          callback(err, null);
        });
      },



      

      queryPayments(callback) {
        console.debug('payments', this.address);
        StellarHistory.payments(this.address, callback);
      },

      queryPaymentsNext(addressOrPage, callback) {
        console.debug('loop payments', this.address);
        StellarHistory.payments(addressOrPage, callback);
      },

      queryTransactions(callback) {
        console.debug('transactions', this.address);
        StellarHistory.transactions(this.address, callback);
      },

      queryTransactionsNext(page, callback) {
        console.debug('loop transactions');
        StellarHistory.transactions(page, callback);
      },

      queryBook(baseBuy, counterSell, callback) {
        StellarOrderbook.get(baseBuy, counterSell, callback);
      },

      listenOrderbook(baseBuying, counterSelling, handler) {
        StellarOrderbook.listen(baseBuying, counterSelling, handler);
      },

      closeOrderbook() {
        StellarOrderbook.close();
      },

      queryPath(src, dest, code, issuer, amount, callback) {
        StellarPath.get(src, dest, code, issuer, amount, callback);
      },

      listenPath(src, dest, code, issuer, amount, handler) {
        StellarHistory.listen(src, dest, code, issuer, amount, handler);
      },

      closePath() {
        StellarHistory.close();
      },

      queryOffer(callback) {
        console.debug('offers', this.address);
        _server.offers('accounts', this.address).limit(200).call().then((data) => {
          console.log('offers', data.records);
          callback(null, data.records);
        }).catch((err) => {
          console.error('QueryOffer Fail !', err);
          callback(err, null);
        });
      },

      offer(option, callback) {
        console.debug('%s %s %s use %s@ %s', option.type, option.amount, option.currency, option.base, option.price);
        let buying, selling;
        let selling_amount, selling_price;

        if (option.type == 'buy') {
          selling = getAsset(option.base, option.base_issuer);
          buying = getAsset(option.currency, option.issuer);
          selling_amount = option.amount * option.price;
          selling_price = 1 / option.price;
        } else {
          selling = getAsset(option.currency, option.issuer);
          buying = getAsset(option.base, option.base_issuer);
          selling_amount = option.amount;
          selling_price = option.price;
        }
        this._offer(selling, buying, selling_amount, selling_price, callback);
      },

      cancel(offer, callback) {
        let selling, buying, price, offer_id;
        if (typeof offer === 'object') {
          selling = offer.selling;
          buying  = offer.buying;
          price   = round(offer.price, 7);
          offer_id = offer.id;
        } else {
          selling = StellarSdk.Asset.native();
          buying  = new StellarSdk.Asset('DUMMY', this.address);
          price   = "1";
          offer_id = offer;
        }
        console.debug('Cancel Offer', offer_id);
        _server.loadAccount(this.address).then((account) => {
          this._updateSeq(account);
          const op = StellarSdk.Operation.manageOffer({
            selling: selling,
            buying: buying,
            amount: "0",
            price : price,
            offerId : offer_id
          });
          const te = new StellarSdk.TransactionBuilder(account, {fee: _basefee}).addOperation(op).setTimeout(_timeout).build();
          return AuthenticationFactory.sign(te);
        }).then((te) => {
          return _server.submitTransaction(te);
        }).then((txResult) => {
          console.log(txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Cancel Offer Fail !', err);
          callback(err, null);
        });
      },

      getFedName(domain, address, callback) {
        StellarSdk.FederationServer.createForDomain(domain).then((server) => {
          return server.resolveAccountId(address);
        })
        .then((data) => {
          if(data.stellar_address) {
            const index = data.stellar_address.indexOf("*");
            const fed_name = data.stellar_address.substring(0, index);
            return callback(null, fed_name);
          }
        }).catch((err) => {
          return callback(err);
        });
      },

      getErrMsg(err) {
        let message = "";
        if (err instanceof StellarSdk.NotFoundError) {
          message = "NotFoundError";
        } else if (err.response && err.response.data && err.response.data.extras && err.response.data.extras.result_xdr) {
          const resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.response.data.extras.result_xdr, 'base64');
          if (resultXdr.result().results()) {
            message = resultXdr.result().results()[0].value().value().switch().name;
          } else {
            message = resultXdr.result().switch().name;
          }
        } else {
          message = err.detail || err.message;
        }

        if (!message) console.error("Fail in getErrMsg", err);
        return message;
      },

    };
  } ]);
