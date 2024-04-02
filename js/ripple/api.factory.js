/* global _, myApp, round, RippleAPI */
myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager', 'XrpPath', 'XrpOrderbook',
  function($rootScope, AuthenticationFactory, SM, XrpPath, XrpOrderbook) {

    let _ownerCount = 0;
    let _xrpBalance = "";
    let _sequence = 0;
    
    let _balances = []; // all balances include xrp
    let _lines = []; // no xrp

    let _myHandleAccountEvent = undefined;
    let _remote;
    let _client;
    let _appVersion = ""; // foxlet version
    const failHard = true;
    const lsfSell = 0x00020000;

    const sleep = (timeountMS) => new Promise((resolve) => {
      setTimeout(resolve, timeountMS);
    });

    function convertAmount(amount) {
      if ("object" === typeof amount) {
        amount.value = new BigNumber(new BigNumber(amount.value).toPrecision(16)).toString();
        return amount.currency == "XRP" ? xrpl.xrpToDrops(amount.value) : amount;
      } else {
        return new BigNumber(new BigNumber(amount).toPrecision(16)).toString()
      }
    };
    function parseAmount(input) {
      return "object" === typeof input ? input : {currency: "XRP", value: xrpl.dropsToXrp(input)};
    }

    return {
      set remote(remote) {
        _remote = remote;
      },
      
      set client(client) {
        _client = client;
        XrpOrderbook.client = client;
        XrpPath.client = client;
        if (this.address) {
          this.queryAccount();
          this.listenStream();
        }
      },

      set appVersion(info) {
        _appVersion = info;
      },
      
      connect() {
        if (!_remote) throw new Error("NotConnectedError");
        return _remote.isConnected() ? Promise.resolve() : _remote.connect();
      },

      async conn() {
        if (!_client) throw new Error("NotConnectedError");
        if (!_client.isConnected()) {
          await _client.connect();
        }
      },
      
      init() {
        if (this.address && _client) {
          this.listenStream();
          this.queryAccount();
        }
      },
      
      logout() {
        _ownerCount = 0;
        _xrpBalance = "";
        _sequence = 0;
        _balances = []; // all balances include xrp
        _lines = []; // no xrp line
        this._closeStream();
      },
      
      get address() {
        return AuthenticationFactory.address;
      },
      
      // used by auth factory only
      sign(txtJson, secret, maxFee) {
        if (maxFee) {
          return new RippleAPI({maxFeeXRP: maxFee}).sign(txtJson, secret);
        } else {
          return _remote.sign(txtJson, secret);
        }
      },
      
      verifyTx(hash, minLedger, maxLedger) {
        const options = {
          minLedgerVersion: minLedger,
          maxLedgerVersion: maxLedger
        };
        _remote.getTransaction(hash, options).then(data => {
          if (data.outcome.result === 'tesSUCCESS') {
            $rootScope.$broadcast('txSuccess', { hash: hash, options: options});
          } else {
            console.error(data);
            $rootScope.$broadcast('txFail', { hash: hash});
          }
        }).catch(err => {
          console.warn('verify fail', err);
          /* If transaction not in latest validated ledger, try again until max ledger hit */
          if (err instanceof _remote.errors.PendingLedgerVersionError) {
             setTimeout(() => this.verifyTx(hash, minLedger, maxLedger), 1000);
          } else {
            console.error("Transaction may have failed.");
          }
        });
      },

      async verify(hash, minLedger, maxLedger) {
        await sleep(2000);
        let latestLedger = 0;
        try {
          lastestLedger = await _client.getLedgerIndex();
          const response = await _client.request({command: 'tx', transaction: hash, min_ledger: minLedger, max_ledger: maxLedger});
          if (response.result.validated) {
            let result_code = response.result.meta.TransactionResult;
            if (result_code == "tesSUCCESS") {
              $rootScope.$broadcast('txSuccess', {hash: hash});
            } else {
              console.error("Verify fail", txResponse.result);
              $rootScope.$broadcast('txFail', {hash: hash, message: result_code});
            }
            return {done: result_code == "tesSUCCESS", hash, hash, message: result_code};
          } else {
            console.warn("Tx not validated.", response);
            return await this.verify(hash, minLedger, maxLedger);
          }
        } catch (err) {
          if (lastestLedger > maxLedger) {
            console.warn(err.data ? err.data.error : err); //err.data.error == "txnNotFound"
            console.warn(`${lastestLedger} is larger than ${maxLedger}`);
            $rootScope.$broadcast('txFail', {hash: hash, message: err.data ? err.data.error : err.message});
            return {done: false, hash: hash, message: err.data ? err.data.error : err.message};
          } else {
            return await this.verify(hash, minLedger, maxLedger);
          }
        }
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
      
      async checkOffers(address) {
        try {
          const {result} = await _client.request({command: "account_offers", account: address || this.address});
          let offers = result.offers.map(offer => {
            offer.type = offer.flags & lsfSell ? "sell" : "buy";
            offer.quantity = offer.type == "sell" ? parseAmount(offer.taker_gets) : parseAmount(offer.taker_pays);
            offer.total = offer.type == "sell" ? parseAmount(offer.taker_pays) : parseAmount(offer.taker_gets);
            offer.price = new BigNumber(offer.total.value).dividedBy(offer.quantity.value).toString();
            return offer;
          });
          return offers;
        } catch (err) {
          throw err;
        }
      },
      
      async checkTx(marker, address) {
        try {
          await this.conn();
          const {result: {info} } = await _client.request({command: "server_info"});
          console.log(info);
          let params = {
            command: 'account_tx',
            account: address || this.address,
            ledger_index_min: -1,
            limit: 30,
            binary: false
          };
          if (marker) {
            params.marker = marker;
          }
          let {result} = await _client.request(params);
          console.log(result);
          return {marker: result.marker, transactions: result.transactions};
        } catch (err) {
          console.error(err);
          return {marker: null, transactions: []};
        }
      },

      async checkAmm(base_code, base_issuer, counter_code, counter_issuer) {
        try {
          await this.conn();
          const asset = base_code == "XRP" ? {currency: "XRP"} : { "currency": realCode(base_code), "issuer": base_issuer};
          const asset2 = counter_code == "XRP" ? {currency: "XRP"} : { "currency": realCode(counter_code), "issuer": counter_issuer};
          const amm_info_request = {
            "command": "amm_info",
            "asset" : asset,
            "asset2": asset2,
            "ledger_index": "validated"
          };

          const amm_info_result = await _client.request(amm_info_request);
          let info = amm_info_result.result.amm;
          if ("string" == typeof info.amount) {
            info.amount = {"currency": "XRP", value: xrpl.dropsToXrp(info.amount)};
          }
          if ("string" == typeof info.amount2) {
            info.amount2 = {"currency": "XRP", value: xrpl.dropsToXrp(info.amount2)};
          }
          return info;
        } catch(err) {          
          if (err.data && err.data.error === 'actNotFound') {
            console.log(`No AMM exists yet for the pair. (This is probably as expected.)`);
          } else {
            console.error("getAmm", err);
          }
          return null;
        }
      },

      async addLp(amount1, amount2) {
        try {
          const amm_deposit = {
            "Account" : this.address,
            "Asset" : { "currency" : amount1.currency },
            "Asset2": { "currency" : amount2.currency },
            "Amount" : convertAmount(amount1),
            "Amount2": convertAmount(amount2),
            "Flags": xrpl.AMMDepositFlags.tfTwoAsset,
            "TransactionType" : "AMMDeposit"
          };
          if (amount1.issuer) { amm_deposit.Asset.issuer = amount1.issuer; }
          if (amount2.issuer) { amm_deposit.Asset2.issuer = amount2.issuer; }
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(amm_deposit);
          const {tx_blob, hash} = await AuthenticationFactory.localSign(this.address, tx_json);
          const response = await _client.submit(tx_blob, {failHard});
          if (["tesSUCCESS", "terQUEUED"].indexOf(response.result.engine_result) < 0) {
            console.warn(response);
            throw new Error(response.result.engine_result_message);
          }
          this.verify(hash, ledger, tx_json.LastLedgerSequence);
          return hash;
        } catch (err) {
          console.error(err);
          throw err;
        }
      },

      async withdrawLp(asset1, asset2, lpAmount, withdrawAll = false) {
        try {
          let amm_withdraw = {
            "Account" : this.address,
            "Asset" : { "currency" : asset1.currency },
            "Asset2": { "currency" : asset2.currency },
            "TransactionType" : "AMMWithdraw"
          };
          if (asset1.issuer) { amm_withdraw.Asset.issuer = asset1.issuer; }
          if (asset2.issuer) { amm_withdraw.Asset2.issuer = asset2.issuer; }
          if (withdrawAll) {
            amm_withdraw.Flags = xrpl.AMMWithdrawFlags.tfWithdrawAll;
          } else {
            amm_withdraw.Flags = xrpl.AMMWithdrawFlags.tfLPToken;
            amm_withdraw.LPTokenIn = convertAmount(lpAmount);
          }
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(amm_withdraw);
          const {tx_blob, hash} = await AuthenticationFactory.localSign(this.address, tx_json);
          const response = await _client.submit(tx_blob, {failHard});
          if (["tesSUCCESS", "terQUEUED"].indexOf(response.result.engine_result) < 0) {
            console.warn(response);
            throw new Error(response.result.engine_result_message);
          }
          this.verify(hash, ledger, tx_json.LastLedgerSequence);
          return hash;
        } catch (err) {
          console.error(err);
          throw err;
        }
      },
      
      changeSettings(settings) {
        return new Promise(async (resolve, reject)=> {
          try {
            let prepared = await _remote.prepareSettings(this.address, settings);
            const {signedTransaction} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            if ("tesSUCCESS" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(result);
          } catch (err) {
            console.info('changeSettings', err.data || err);
            reject(err);
          }
        });
      },
      
      changeTrust(code, issuer, limit, ripplingDisabled = true) {
        const trustline = {
          currency: realCode(code),
          counterparty: issuer,
          limit: limit,
          ripplingDisabled: ripplingDisabled
        };
        trustline.memos = [{data: _appVersion, type: 'client', format: 'text'}];
        return new Promise(async (resolve, reject)=> {
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.prepareTrustline(this.address, trustline);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(id);
          } catch (err) {
            console.info('changeTrust', err);
            reject(err);
          }
        });
      },
      
      async payment(destinationAddress, srcAmount, destAmount, tag, invoice, memos, paths) {
        const payment = {
          "TransactionType": "Payment",
          "Account": this.address,
          "Destination": destinationAddress,
          "Amount" : convertAmount(destAmount)          
        };
        if (srcAmount.currency !== "XRP" || destAmount.currency !== "XRP") {
          payment.SendMax = convertAmount(srcAmount);
        }
        if (paths && paths.length) {
          payment.Paths = paths;
        }
        if (tag) payment.DestinationTag = Number(tag);
        if (invoice) payment.InvoiceID = invoice;
        payment.memos = [{data: _appVersion, type: 'client', format: 'text'}].concat(memos || []);

        try {
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(payment);
          console.log(tx_json);
          const {tx_blob, hash} = await AuthenticationFactory.localSign(this.address, tx_json);
          const response = await _client.submit(tx_blob, {failHard});
          if (["tesSUCCESS", "terQUEUED"].indexOf(response.result.engine_result) < 0) {
            console.warn(response);
            throw new Error(response.result.engine_result_message);
          }
          this.verify(hash, ledger, tx_json.LastLedgerSequence);
          return hash;
        } catch (err) {
          console.error("payment", err);
          throw err;
        }
      },      
      
      convert(srcAmount, destAmount, paths) {
        return this.payment(this.address, srcAmount, destAmount, null, null, null, paths);
      },
      
      async offer(options) {
        try {
          let totalValue = new BigNumber(options.amount).multipliedBy(options.price).toString();
          let quantity = options.base_issuer ? {currency: options.base, issuer: options.base_issuer, value: options.amount} : {currency: "XRP", value: options.amount};
          let total = options.counter_issuer ? {currency: options.counter, issuer: options.counter_issuer, value: totalValue} : {currency: "XRP", value: totalValue};

          let order = {
            "Account": this.address,
            "TransactionType": "OfferCreate",
            "Flags"    : options.type == "sell" ? xrpl.OfferCreateFlags.tfSell : 0,
            "TakerGets": options.type == "sell" ? convertAmount(quantity) : convertAmount(total),
            "TakerPays": options.type == "sell" ? convertAmount(total) : convertAmount(quantity)
          };
          order.memos = [{data: _appVersion, type: 'client', format: 'text'}];
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(order);
          const {tx_blob, hash} = await AuthenticationFactory.localSign(this.address, tx_json);
          const response = await _client.submit(tx_blob, {failHard});
          if (["tesSUCCESS", "terQUEUED"].indexOf(response.result.engine_result) < 0) {
            console.warn(response);
            throw new Error(response.result.engine_result_message);
          }
          this.verify(hash, ledger, tx_json.LastLedgerSequence);
          return hash;
        } catch (err) {
          console.error("offer", err);
          throw err;
        }        
      },
      
      async cancelOffer (offer_id) {
        try {
          let cancel = {
            "Account" : this.address,
            "TransactionType": "OfferCancel",
            "OfferSequence": offer_id
          };
          cancel.memos = [{data: _appVersion, type: 'client', format: 'text'}];          
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(cancel);
          const {tx_blob, hash} = await AuthenticationFactory.localSign(this.address, tx_json);
          const response = await _client.submit(tx_blob, {failHard});
          if (["tesSUCCESS", "terQUEUED"].indexOf(response.result.engine_result) < 0) {
            console.warn(response);
            throw new Error(response.result.engine_result_message);
          }
          this.verify(hash, ledger, tx_json.LastLedgerSequence);
          return hash;
        } catch (err) {
          console.error("cancel", err);
          throw err;
        }
      },
      
      deleteAccount(dest_account) {
        const localInstructions = { maxFee: SM.reserveIncrementXRP.toString()};
        return new Promise(async (resolve, reject) => {
          try {
            let prepared = await _remote.prepareTransaction({
              TransactionType: 'AccountDelete',
              Account: this.address,
              Destination: dest_account
            }, localInstructions);
            console.log(prepared);
            var obj = JSON.parse(prepared.txJSON);
            obj.Fee = "" + SM.reserveIncrementXRP + "000000";
            const {signedTransaction} = AuthenticationFactory.sign(this, JSON.stringify(obj), SM.reserveIncrementXRP.toString());
            let result = await _remote.submit(signedTransaction, true);
            if ("tesSUCCESS" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(result);
          } catch (err) {
            console.error('deleteAccount', err);
            reject(err);
          }
        });
      },
      
      async queryAccount() {
        try {
          console.debug("queryAccount");
          let response = await _client.request({ command: "account_info", account: this.address, ledger_index: "validated" });
          _xrpBalance = xrpl.dropsToXrp(response.result.account_data.Balance);
          _ownerCount = response.result.account_data.OwnerCount;
          _sequence = response.result.account_data.Sequence;
          response = await _client.request({ command: "account_lines", account: this.address });
          _lines = [];
          _balances = [{currency: "XRP", value: _xrpBalance}];
          response.result.lines.forEach(line => {
            if (line.balance != "0" || line.limit != "0") {
              let item = {currency: line.currency, issuer: line.account, value: line.balance, limit: line.limit};
              _lines.push(item);
              _balances.push(item);
            }
          });
          this._updateRootInfo();
        } catch (err) {
          if (err.data && err.data.error === 'actNotFound') {
            $rootScope.unfunded = true;
            $rootScope.$apply();
          } else {
            console.log(err);
          }
        }
      },
      
      _updateRootInfo() {
        $rootScope.balance = _xrpBalance;
        $rootScope.reserve = SM.reserveBaseXRP + SM.reserveIncrementXRP * _ownerCount;
        $rootScope.lines = _lines;
        $rootScope.balances = _balances;
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
        _client.connection.on('transaction', _myHandleAccountEvent);
        _client.request({
          command: "subscribe",
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
          _client.connection.removeListener('transaction', _myHandleAccountEvent);
          _myHandleAccountEvent = undefined;
          _client.request({
            command : 'unsubscribe',
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
        $rootScope.$broadcast("accountEvent");
        this.queryAccount();
      }

    };
  } ]);
