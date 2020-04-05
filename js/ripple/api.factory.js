/* global _, myApp, round, RippleAPI */
const rewriter = require('./js/ripple/jsonrewriter.js');

myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager',
  function($rootScope, AuthenticationFactory, SM) {

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

    return {
      set remote(remote) {
        _remote = remote;
        
        if (this.address) {
          this.queryAccount();
          this.listenStream();
        }
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
        return new Promise(async (resolve, reject)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
          _remote.getBalances(address || this.address).then((bal) => {
            _balances = bal;
            resolve(bal);
          }).catch(e => {
            console.error('getBalance', e);
            reject(e);
          });
        });
      },
      
      checkTrustlines(address) {
        return new Promise(async (resolve, reject)=>{
          if (!_remote.isConnected()) {
            await _remote.connect();
          }
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
      
      changeTrust(code, issuer, limit, ripplingDisabled = true) {
        const trustline = {
          currency: code,
          counterparty: issuer,
          limit: limit,
          ripplingDisabled: ripplingDisabled
        };

        return new Promise((resolve, reject)=> {
          _remote.prepareTrustline(this.address, trustline).then(prepared => {
            const {signedTransaction} = AuthenticationFactory.sign(this.address, prepared.txJSON);
            _remote.submit(signedTransaction).then(result => {
                console.info(result);
                resolve(result);
              }).catch (err => {
              console.info(err);
              reject(err);
            });
          });
        });
      },
      
      queryAccount(callback) {
        this.checkInfo().then(info => {
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
        /*
        _balances.forEach((asset)=>{
          var keystr = key(asset.currency, asset.counterparty);
          if (keystr !== 'XRP') {
            var trust = _trustlines[keystr];
            if (asset.value == "0" && trust.specification.limit == "0") {
              return; // do not show line others trusted
            }
            if (!lines[asset.currency]) {
              lines[asset.currency] = {};
            }
            const item = {
              code : asset.currency,
              issuer : asset.counterparty,
              balance : asset.value,
              limit: trust.specification.limit,
              ripplingDisabled: trust.specification.ripplingDisabled
            };
            lines[asset.currency][asset.counterparty] = item;
          }
        });
        */
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
