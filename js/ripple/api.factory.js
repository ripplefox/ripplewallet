/* global _, myApp, round */
myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager', 'XrpOrderbook',
  function($rootScope, AuthenticationFactory, SM, XrpOrderbook) {

    let _ownerCount = 0;
    let _xrpBalance = "";
    let _sequence = 0;
    
    let _balances = []; // all balances include xrp
    let _lines = []; // no xrp

    let _myHandleAccountEvent = undefined;
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
        return amount.currency == "XRP" ? xrpl.xrpToDrops(Number(amount.value).toFixed(6)) : amount;
      } else {
        return parseInt(amount).toString();
      }
    };
    function parseAmount(input) {
      return "object" === typeof input ? input : {currency: "XRP", value: xrpl.dropsToXrp(input)};
    }
    function isXRP(amount) {
      return "object" === typeof amount ? amount.currency == "XRP" : true;
    }

    return {      
      set client(client) {
        _client = client;
        XrpOrderbook.client = client;
        if (this.address) {
          this.queryAccount();
          this.listenStream();
        }
      },

      set appVersion(info) {
        _appVersion = info;
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
      
      async checkSettings(address) {
        try {
          await this.conn();
          let {result} = await _client.request({ command: "account_info", account: address || this.address, ledger_index: "validated" });
          let data = {
            domain : result.account_data.Domain ? hexToAscii(result.account_data.Domain) : null,
            messageKey : result.account_data.MessageKey,
            disallowIncomingXRP : result.account_flags.disallowIncomingXRP,
            requireDestinationTag : result.account_flags.requireDestinationTag,
            defaultRipple : result.account_flags.defaultRipple
          };
          return data;
        } catch(e){
          if (e.data && e.data.error === 'actNotFound') {
            e.unfunded = true;
          }
          throw e;
        };
      },
      
      async checkCurrencies(address) {
        try {
          await this.conn();
          const {result} = await _client.request({ command: "account_currencies", account: address || this.address, ledger_index: "validated" });
          return result;
        } catch(e) {
          if (e.data && e.data.error === 'actNotFound') {
            e.unfunded = true;
          }
          throw e;
        };
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

      async voteLp(asset1, asset2, fee) {
        try {
          let amm_vote = {
            "Account" : this.address,
            "Asset" : { "currency" : asset1.currency },
            "Asset2": { "currency" : asset2.currency },
            "TradingFee": parseInt(fee),
            "TransactionType" : "AMMVote"
          };
          if (asset1.issuer) { amm_vote.Asset.issuer = asset1.issuer; }
          if (asset2.issuer) { amm_vote.Asset2.issuer = asset2.issuer; }          
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(amm_vote);
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

      async setDomain(str) {
        try {
          let hex = '';
          for(let i = 0; i < str.length; i++) {
              hex += str.charCodeAt(i).toString(16).padStart(2, '0');
          }
          const settings = {
            "Account" : this.address,
            "TransactionType": "AccountSet",
            "Domain": hex         
          };
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(settings);
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

      async setMessageKey(str) {
        try {
          const settings = {
            "Account" : this.address,
            "TransactionType": "AccountSet",
            "MessageKey": str         
          };
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(settings);
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

      //xrpl.AccountSetAsfFlags
      //{"1":"asfRequireDest","2":"asfRequireAuth","3":"asfDisallowXRP","4":"asfDisableMaster","5":"asfAccountTxnID","6":"asfNoFreeze","7":"asfGlobalFreeze","8":"asfDefaultRipple",
      //"9":"asfDepositAuth","10":"asfAuthorizedNFTokenMinter","12":"asfDisallowIncomingNFTokenOffer","13":"asfDisallowIncomingCheck","14":"asfDisallowIncomingPayChan","15":"asfDisallowIncomingTrustline","16":"asfAllowTrustLineClawback",
      //"asfRequireDest":1,"asfRequireAuth":2,"asfDisallowXRP":3,"asfDisableMaster":4,"asfAccountTxnID":5,"asfNoFreeze":6,"asfGlobalFreeze":7,"asfDefaultRipple":8,
      //"asfDepositAuth":9,"asfAuthorizedNFTokenMinter":10,"asfDisallowIncomingNFTokenOffer":12,"asfDisallowIncomingCheck":13,"asfDisallowIncomingPayChan":14,"asfDisallowIncomingTrustline":15,"asfAllowTrustLineClawback":16}
      async setFlag(name, value) {
        try {
          const settings = {
            "Account" : this.address,
            "TransactionType": "AccountSet"
          };
          let flag_index = xrpl.AccountSetAsfFlags[name]; //
          if (value) {
            settings.SetFlag = flag_index;
          } else {
            settings.ClearFlag = flag_index;
          }          
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(settings);
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
      
      async changeTrust(code, issuer, limit) {
        try {
          const trustline = {
            "Account": this.address,
            "TransactionType":"TrustSet",
            "LimitAmount":{"currency": realCode(code), "issuer": issuer, "value": limit},
            "Flags": xrpl.TrustSetFlags.tfSetNoRipple
          };
          trustline.memos = [{data: _appVersion, type: 'client', format: 'text'}];
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(trustline);
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
          console.error(err);
          throw err;
        }
      },
      
      async payment(destinationAddress, srcAmount, destAmount, tag, invoice, memos, paths) {
        const payment = {
          "TransactionType": "Payment",
          "Account": this.address,
          "Destination": destinationAddress,
          "Amount" : convertAmount(destAmount)          
        };
        if (!isXRP(srcAmount) || !isXRP(destAmount)) {
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
      
      async deleteAccount(dest_account) {
        try {
          let special = {
            "Account" : this.address,
            "TransactionType": "AccountDelete",
            "Destination": dest_account
          };
          special.Fee = xrpl.xrpToDrops(SM.reserveIncrementXRP);          
          special.memos = [{data: _appVersion, type: 'client', format: 'text'}];          
          const ledger = await _client.getLedgerIndex();
          const tx_json = await _client.autofill(special);
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
      
      async queryAccount() {
        try {
          let response = await _client.request({ command: "account_info", account: this.address, ledger_index: "validated" });
          _xrpBalance = xrpl.dropsToXrp(response.result.account_data.Balance);
          _ownerCount = response.result.account_data.OwnerCount;
          _sequence = response.result.account_data.Sequence;
          response = await _client.request({ command: "account_lines", account: this.address });
          _lines = [];
          _balances = [{currency: "XRP", value: _xrpBalance}];
          response.result.lines.forEach(line => {
            if (line.balance != "0" || line.limit != "0") {
              let item = {currency: line.currency, issuer: line.account, value: line.balance, limit: line.limit, no_ripple: line.no_ripple};
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
