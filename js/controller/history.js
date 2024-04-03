/* global myApp */
myApp.controller("HistoryCtrl", [ '$scope', '$rootScope', 'XrpApi', 'AuthenticationFactory',
  function($scope, $rootScope, XrpApi, AuthenticationFactory) {
    const parser = require("ripple-lib-transactionparser");
    const address = $rootScope.address;
    $scope.history = [];
    $scope.loading = false;
    $scope.marker = null;
    
    $scope.load_more = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      XrpApi.checkTx($scope.marker).then(data => {
        $scope.loading = false;
        $scope.error_msg = "";
        $scope.marker = data.marker;
        data.transactions.forEach(tx => {
          $scope.history.push(processTx(tx.tx, tx.meta, address));
        });
        console.debug(data);
        $scope.$apply();
      }).catch(err => {
        console.error(err);
        $scope.loading = false;
        $scope.error_msg = err.message;
        $scope.$apply();
      });
    };

    $scope.refresh = function() {
      $scope.history = [];
      $scope.marker = null;
      $scope.load_more();
    };
    $scope.refresh();
    
    function processTx(tx, meta, account) {
      var obj = {};
      var affected_currencies = [];

      // Main transaction
      if (tx.Account === account
          || (tx.Destination && tx.Destination === account)
          || (tx.LimitAmount && tx.LimitAmount.issuer === account)) {

        var t = {};
        if (tx.Flags) {
          t.flags = tx.Flags;
        }

        if ('tesSUCCESS' === meta.TransactionResult) {
          switch (tx.TransactionType) {
            case 'Payment':
              t.delivered = parseAmount(meta.delivered_amount);
              t.source = tx.Account;
              t.destination= tx.Destination;
              t.tag = tx.DestinationTag;
              if (tx.SendMax) {
                t.sendMax = parseAmount(tx.SendMax);
              }              
              if (account == t.source && account == t.destination) {
                t.type = 'convert';
              } else if (account == t.source) {
                t.type = 'sent';
              } else if (account == t.destination) {
                t.type = 'received';
              }
              break;
            case 'TrustSet':
              t.type = tx.Account === account ? 'trusting' : 'trusted';
              t.counterparty = tx.Account === account ? tx.LimitAmount.issuer : tx.Account;
              t.currency = tx.LimitAmount.currency;
              t.limit = tx.LimitAmount.value;
              break;

            case 'OfferCreate':
              t.type = 'offernew';
              t.pays = parseAmount(tx.TakerPays);
              t.gets = parseAmount(tx.TakerGets);
              t.sell = tx.Flags & xrpl.OfferCreateFlags.tfSell;
              if (t.sell) {
                t.price = new BigNumber(t.pays.value).dividedBy(t.gets.value).toString();
              } else {
                t.price = new BigNumber(t.gets.value).dividedBy(t.pays.value).toString();
              }
              break;

            case 'OfferCancel':
              t.type = 'offercancel';
              t.seq = tx.OfferSequence;
              break;

            case 'AccountSet':
              // Ignore empty accountset transactions. (Used to sync sequence numbers)
              if (meta.AffectedNodes.length === 1 && _.size(meta.AffectedNodes[0].ModifiedNode.PreviousFields) === 2)
                break;
              t.type = 'accountset';
              break;
            case 'AMMBid':
            case 'AMMCreate':
            case 'AMMDelete':
            case 'AMMDeposit':
            case 'AMMWithdraw':
            case 'AMMVote':
              t.type = 'amm';
              t.action = tx.TransactionType;
              break;

            default:
              console.log('Unknown transaction type: "'+tx.TransactionType+'"', tx);
          }

          
        } else {
          t.type = 'failed';
        }

        if (!isEmptyObject(t)) {
          obj.transaction = t;
        }
      }

      var offerChanges = parser.parseOrderbookChanges(meta);
      var balanceChanges = parser.parseBalanceChanges(meta); //xrpl.getBalanceChanges(meta);
      obj.effects = filterOrderbookChanges(offerChanges, account, tx);
      if (balanceChanges[account]) {
        balanceChanges[account].forEach(change => {
          obj.effects.push({type: "balance_change", amount: change});
        });
      }

      obj.tag = tx.DestinationTag;
      obj.invoice = tx.InvoiceID;
      obj.memos = parseMemos(tx);
      obj.xrc20 = getMemo(obj.memos, "xrc20");
      obj.tx_type = tx.TransactionType;
      obj.tx_result = meta.TransactionResult;
      obj.fee = tx.Fee;
      obj.date = xrpl.rippleTimeToUnixTime(tx.date);
      obj.hash = tx.hash;
      obj.ledger_index = tx.ledger_index;

      console.log(obj);
      return obj;

    }

    function filterOrderbookChanges(orderbookChanges, address, tx) {
      var effects = []
      //The status of the order. One of "created", "filled", "partially-filled", "cancelled".
      for (let account in orderbookChanges) {
        let orders = orderbookChanges[account];
        orders.forEach(order => {
          let e = {};
          if (account == address) {
            switch (order.status) {
              case "cancelled": 
                e.type = 'offer_cancel_' + order.direction;
                e.force = address != tx.Account;
                break;               
              case "filled":
                e.filled = true;
              case "partially-filled":
                e.type = order.direction == 'buy' ? 'offer_bought' : 'offer_sold';
                break;
              case "created":
                e.type = 'offer_create_' + order.direction;
                break;
              default: 
                console.error("Unsupported " + order.status, tx);
            }
          } else {
            switch (order.status) {
              case "filled":
              case "partially-filled":
                if (address == tx.Account) {
                  e.type = order.direction == 'sell' ? 'offer_bought' : 'offer_sold';
                }
                break;
              case "cancelled": 
              case "created":
                break;
              default: 
                console.error("Unsupported " + order.status, tx);
            }
          }
          e.quantity = order.quantity;
          e.total = order.totalPrice;
          e.price = new BigNumber(e.total.value).dividedBy(e.quantity.value).toString();
          if (e.type) {
            effects.push(e);
          }
        });
      }
      return effects;
    }

    function getMemo(memos, type) {
      if (!memos) {
        return "";
      }
      let output = "";
      memos.forEach(memo =>{
        if (memo.type == type) {
          output = memo.data;
        }
      });
      return output;
    }

    function parseAmount(input) {
      return "object" === typeof input ? input : {currency: "XRP", value: xrpl.dropsToXrp(input)};
    }
    function isEmptyObject(obj) {
      return !Object.keys(obj).length;
    }
    function hexToString(hex) {
      return hex ? Buffer.from(hex, 'hex').toString('utf-8') : undefined
    }
    function parseMemos(tx) {
      if (!Array.isArray(tx.Memos) || tx.Memos.length === 0) {
        return undefined
      }
      return tx.Memos.map(m => {
        return {
          type: m.Memo.parsed_memo_type || hexToString(m.Memo.MemoType),
          format: m.Memo.parsed_memo_format || hexToString(m.Memo.MemoFormat),
          data: m.Memo.parsed_memo_data || hexToString(m.Memo.MemoData)
        };
      });
    }
    
  } ]);