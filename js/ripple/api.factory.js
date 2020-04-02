/* global _, myApp, round, RippleAPI */
const rewriter = require('./js/ripple/jsonrewriter.js');

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
          this.listenStream();
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
        $rootScope.lines = lines;
        $rootScope.$broadcast("balanceChange");
        $rootScope.$apply();
      },
      
      listenStream() {
        this._closeStream();
        console.log('subscribe', this.address);
        var self = this;
        _remote.connection.on('transaction', function(e){
          self._handleAccountEvent(e);
        });
        _remote.request('subscribe', {
          accounts: [ this.address ]
        }).then(response => {
          console.log('subscribe done', response);
        }).catch(error => {
          console.log('subscribe', error);
        });
      },

      _closeStream() {
        console.log('unsubscribe', this.address);
        _remote.request('unsubscribe', {
          accounts: [ this.address ]
        }).then(response => {
          console.log('unsubscribe done', response);
        }).catch(function(error) {
          console.log('unsubscribe', error);
        });
      },
      
      _handleAccountEvent(event) {
        console.log('event', event);
        try {
          this._processTx(event.transaction, event.meta, this.address);
        } catch(err) {
          console.error(err);
        };
      },
      
      _processTx(tx, meta, account) {
        var processedTxn = rewriter.processTxn(tx, meta, account);
        console.log(processedTxn);
      },

    };
  } ]);
