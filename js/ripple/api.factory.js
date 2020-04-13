/* global _, myApp, round, RippleAPI */
const rewriter = require('./js/ripple/jsonrewriter.js');

myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager', 'XrpPath', 'XrpOrderbook',
  function($rootScope, AuthenticationFactory, SM, XrpPath, XrpOrderbook) {

    let _ownerCount = 0;
    let _xrpBalance = "";
    let _sequence = 0;
    
    let _balances = {}; // all balances include xrp
    let _trustlines = {}; // no xrp line
    let _history = [];
    let _myHandleAccountEvent = undefined;
    let _remote;
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };
    
    function toTimestamp(rpepoch) {
      return (rpepoch + 0x386D4380) * 1000;
    };
    
    function convertAmount(amount) {
      amount.value = new BigNumber(new BigNumber(amount.value).toPrecision(16)).toString();
      return amount;
    };

    return {
      set remote(remote) {
        _remote = remote;
        XrpPath.remote = remote;
        XrpOrderbook.remote = remote;
        
        if (this.address) {
          this.queryAccount();
          this.listenStream();
        }
      },
      
      connect() {
        if (!_remote) throw new Error("NotConnectedError");
        return _remote.isConnected() ? Promise.resolve() : _remote.connect();
      },
      
      init() {
        if (this.address && _remote) {
          this.queryAccount();
          this.listenStream();
        }
      },
      
      logout() {
        _ownerCount = 0;
        _xrpBalance = "";
        _sequence = 0;
        _balances = {}; // all balances include xrp
        _trustlines = {}; // no xrp line
        _history = [];
        this._closeStream();
      },
      
      get address() {
        return AuthenticationFactory.address;
      },
      
      checkFunded(address) {
        return new Promise(async (resolve, reject)=>{
          await this.connect();
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
          try {
            await this.connect();
            let info = await _remote.getAccountInfo(address || this.address);
            resolve(info);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkSettings(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.getSettings(address || this.address);
            resolve(data);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkCurrencies(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.request('account_currencies', {account: address || this.address});
            resolve(data);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkBalances(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let bal = await _remote.getBalances(address || this.address);
            resolve(bal);
          } catch(e) {
            console.error('getBalance', e);
            reject(e);
          }
        });
      },
      
      checkTrustlines(address) {
        return new Promise(async (resolve, reject)=>{
          await this.connect();
          _remote.getTrustlines(address || this.address).then((ret) => {
            let lines = {};
            ret.forEach((item)=>{
              var keystr = key(item.specification.currency, item.specification.counterparty);
              lines[keystr] = item.specification; //{limit: "100000000", currency: "USD", counterparty: "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y", ripplingDisabled: true}
              lines[keystr].balance = item.state.balance;
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
      
      checkOffers(address) {
        address = address || this.address;
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let page = await _remote.getOrders(address, {limit: 200});
            resolve(page);
          } catch (err) {
            reject(err);
          }
        });
      },
      
      checkTx(marker, address) {
        var address = address || this.address;
        var params = {
            account: address,
            ledger_index_min: -1,
            limit: 30,
            binary: false
        };
        if (marker) {
          params.marker = marker;
        }
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.request('account_tx', params);
            var transactions = [];
            if (data.transactions) {
              data.transactions.forEach(function (e) {
                var tx = rewriter.processTxn(e.tx, e.meta, address);
                if (tx) {
                  transactions.push(tx);
                }
              });
            }
            resolve({marker: data.marker, transactions: transactions});
          } catch (err) {
            console.error('getTx', err);
            reject(err);
          }
        });
      },
      
      changeTrust(code, issuer, limit, ripplingDisabled = true) {
        const trustline = {
          currency: code,
          counterparty: issuer,
          limit: limit,
          ripplingDisabled: ripplingDisabled
        };
        return new Promise(async (resolve, reject)=> {
          try {
            let prepared = await _remote.prepareTrustline(this.address, trustline);
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            let result = await _remote.submit(signedTransaction);
            resolve(result);
          } catch (err) {
            console.info('changeTrust', err);
            reject(err);
          }
        });
      },
      
      payment(destinationAddress, srcAmount, destAmount, tag) {
        const payment = {
            "source": {
              "address": this.address,
              "maxAmount": convertAmount(srcAmount)
            },
            "destination": {
              "address": destinationAddress,
              "amount": convertAmount(destAmount)
            }
        }
        if (tag) payment.destination.tag = Number(tag);
        return new Promise(async (resolve, reject)=>{
          try {
            let prepared = await _remote.preparePayment(this.address, payment);
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            let result = await _remote.submit(signedTransaction);
            resolve(result);
          } catch (err) {
            err.data ? console.error(err.data) : console.error('payment', payment, err);
            reject(err);
          }
        });
      },
      
      pathPayment(destinationAddress, srcAmount, destAmount, paths, tag, partial) {
        //remove the type, type_hex to pass checkTxSerialization in sign function
        paths.forEach(path => {
          path.forEach(asset => {
            delete asset.type;
            delete asset.type_hex;
          });
        });
        const payment = {
            "source": {
              "address": this.address,
              "maxAmount": convertAmount(srcAmount)
            },
            "destination": {
              "address": destinationAddress,
              "amount": convertAmount(destAmount)
            },
            "paths" : JSON.stringify(paths),
            "allowPartialPayment": !!partial
        }
        if (tag) payment.destination.tag = Number(tag);
        return new Promise(async (resolve, reject)=>{
          try {
            let prepared = await _remote.preparePayment(this.address, payment);
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            let result = await _remote.submit(signedTransaction);
            resolve(result);
          } catch (err) {
            err.data ? console.error(err.data) : console.error('pathPayment', payment, err);
            reject(err);
          }
        });
      },
      
      convert(srcAmount, destAmount, paths) {
        return this.pathPayment(this.address, srcAmount, destAmount, paths, null, true);
      },
      
      offer(options) {
        let totalPriceValue = new BigNumber(options.amount).multipliedBy(options.price).toString();
        const order = {
          'direction': options.type,
          'quantity'  : {value: options.amount.toString()},
          'totalPrice': {value: totalPriceValue}
        };
        if (options.base_issuer) {
          order.quantity.currency = options.base;
          order.quantity.counterparty = options.base_issuer;
        } else {
          order.quantity.currency = 'XRP';
        }
        if (options.counter_issuer) {
          order.totalPrice.currency = options.counter;
          order.totalPrice.counterparty = options.counter_issuer;
        } else {
          order.totalPrice.currency = 'XRP';
        }
        order.memos = [{data: 'foxlet', type: 'client', format: 'plain/text'}];
        return new Promise(async (resolve, reject) => {
          try {
            let prepared = await _remote.prepareOrder(this.address, order);
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            let result = await _remote.submit(signedTransaction);
            resolve(result);
          } catch (err) {
            console.error('offer', err);
            reject(err);
          }
        });
      },
      
      cancelOffer (offer_id) {
        const orderCancellation = {orderSequence: offer_id};
        orderCancellation.memos = [{data: 'foxlet', type: 'client', format: 'plain/text'}];
        return new Promise(async (resolve, reject) => {
          try {
            let prepared = await _remote.prepareOrderCancellation(this.address, orderCancellation);
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            let result = await _remote.submit(signedTransaction);
            resolve(result);
          } catch (err) {
            console.error('cancelOffer', err);
            reject(err);
          }
        });
      },
      
      queryAccount(callback) {
        this.checkInfo().then(info => {
          _xrpBalance = info.xrpBalance;
          _ownerCount = info.ownerCount;
          _sequence = info.sequence;
          return this.checkTrustlines();
        }).then(lines => {
          this._updateRootInfo();
          if (callback) { callback(); }
        }).catch(err => {
          console.error(err);
          if (callback) { callback(err); }
        });
      },
      
      _updateRootInfo() {
        $rootScope.balance = _xrpBalance;
        $rootScope.reserve = SM.reserveBaseXRP + SM.reserveIncrementXRP * _ownerCount;
        
        var lines = {};
        for(var keystr in _trustlines) {
          var line = _trustlines[keystr];
          if (line.balance == "0" && line.limit == "0") {
            continue;
          }
          if (!lines[line.currency]) {
            lines[line.currency] = {};
          }
          lines[line.currency][line.counterparty] = {
              code    : line.currency,
              issuer  : line.counterparty,
              balance : line.balance,
              limit   : line.limit,
              ripplingDisabled: line.ripplingDisabled
          };
        }
        $rootScope.lines = lines;
        $rootScope.$broadcast("balanceChange");
        $rootScope.$apply();
      },
      
      listenStream() {
        this._closeStream();
        console.log('subscribe', this.address);
        var self = this;
        _myHandleAccountEvent = function(e) {
          self._handleAccountEvent(e)
        }
        _remote.connection.on('transaction', _myHandleAccountEvent);
        _remote.request('subscribe', {
          accounts: [ this.address ]
        }).then(response => {
          console.log('subscribe done', response);
        }).catch(error => {
          console.log('subscribe', error);
        });
      },

      _closeStream() {
        if(_myHandleAccountEvent) {
          console.log('unsubscribe', this.address);
          _remote.connection.removeListener('transaction', _myHandleAccountEvent);
          _myHandleAccountEvent = undefined;
          _remote.request('unsubscribe', {
            accounts: [ this.address ]
          }).then(response => {
            console.log('unsubscribe done', response);
          }).catch(function(error) {
            console.log('unsubscribe', error);
          });
        }
      },
      
      _handleAccountEvent(event) {
        console.log('event', event);
        try {
          this._processTx(event.transaction, event.meta);
        } catch(err) {
          console.error(err);
        };
      },
      
      _handleAccountEntry(data) {
        _xrpBalance = round(data.Balance / 1000000, 6).toString();
        _ownerCount = data.OwnerCount || 0;
        this._updateRootInfo();
      },
      
      _updateLines(effects) {
        if (!Array.isArray(effects)) return;

        effects.forEach(effect => {
          if (['trust_create_local',
               'trust_create_remote',
               'trust_change_local',
               'trust_change_remote',
               'trust_change_balance',
               'trust_change_no_ripple'].indexOf(effect.type) >= 0) {
            var line = {};
            var index = key(effect.currency, effect.counterparty);

            line.currency = effect.currency;
            line.counterparty = effect.counterparty;
            line.flags = effect.flags;
            line.no_ripple = !!effect.noRipple; // Force Boolean

            if (effect.balance) {
              line.balance = effect.balance.to_number().toString();
            }

            if (effect.deleted) {
              delete _trustlines[index];
              return;
            }

            if (effect.limit) {
              line.limit = effect.limit.to_number().toString();
            }

            if (effect.limit_peer) {
              line.limit_peer = effect.limit_peer;
            }
            console.log('_lines need update', line);
            if (_trustlines[index]) {
              _trustlines[index].limit = line.limit || _trustlines[index].limit;
              _trustlines[index].balance = line.balance || _trustlines[index].balance;
              _trustlines[index].ripplingDisabled = line.no_ripple;
            } else {
              _trustlines[index] = {
                  limit: line.limit,
                  currency: line.currency,
                  counterparty: line.counterparty,
                  ripplingDisabled: line.no_ripple,
                  balance: line.balance
              }
            }
          }
        });
        this._updateRootInfo();
      },
      
      _updateOffer(offer) {
        console.log('_updateOffer', offer);
        $rootScope.$broadcast("offerChange");
      },
      
      _processTx(tx, meta, is_historic) {
        var self = this;
        var processedTxn = rewriter.processTxn(tx, meta, this.address);
        if (processedTxn && processedTxn.error) {
          console.error('Error processing transaction ', processedTxn.error);
          // Add to history only
          _history.unshift(processedTxn);
        } else if (processedTxn) {
          var transaction = processedTxn.transaction;

          // Update account
          if (processedTxn.accountRoot) {
            this._handleAccountEntry(processedTxn.accountRoot);
          }

          // Show status notification
          if (processedTxn.tx_result === "tesSUCCESS" && transaction && !is_historic) {
            console.log('tx success', tx);
            //$scope.$broadcast('$appTxNotification', { hash:tx.hash, tx: transaction });
          }

          // Add to recent notifications
          if (processedTxn.tx_result === "tesSUCCESS" && transaction) {

            var effects = [];
            // Only show specific transactions
            switch (transaction.type) {
              case 'offernew':
              case 'exchange':
                var funded = false;
                processedTxn.effects.some(function(effect) {
                  if (['offer_bought','offer_funded','offer_partially_funded'].indexOf(effect.type)>=0) {
                    funded = true;
                    effects.push(effect);
                    return true;
                  }
                });

                // Only show trades/exchanges which are at least partially funded
                if (!funded) {
                  break;
                }
                /* falls through */
              case 'received':
                // Is it unseen?
                //if (processedTxn.date > ($scope.userBlob.data.lastSeenTxDate || 0)) {
                  //processedTxn.unseen = true;
                  //$scope.unseenNotifications.count++;
                //}

                processedTxn.showEffects = effects;
                //$scope.events.unshift(processedTxn);
            }
          }

          // Add to history
          _history.unshift(processedTxn);

          // Update Ripple lines
          if (processedTxn.effects && !is_historic) {
            this._updateLines(processedTxn.effects);
          }

          // Update my offers
          if (processedTxn.effects && !is_historic) {
            // Iterate on each effect to find offers
            processedTxn.effects.forEach(function (effect) {
              // Only these types are offers
              if (['offer_created', 'offer_funded', 'offer_partially_funded', 'offer_cancelled'].indexOf(effect.type) >= 0) {
                var offer = {
                  seq: +effect.seq,
                  gets: effect.gets,
                  pays: effect.pays,
                  deleted: effect.deleted,
                  flags: effect.flags
                };

                self._updateOffer(offer);
              }
            });

            //$scope.$broadcast('$offersUpdate');
          }
        }
        
        console.log(processedTxn);
      },

    };
  } ]);
