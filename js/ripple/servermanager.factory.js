/* global _, myApp, round */

myApp.factory('ServerManager', ['$rootScope',
  function($rootScope) {
    let _clients = {};
    let _client = undefined;
    let _path = undefined; // full function node for path find

    let _timeout = 10000;
    
    let _reserveBaseXRP = 0;
    let _reserveIncrementXRP = 0;
    
    return {
      get client() {
        return _client ? _client.client : null;
      },

      get pathNode() {
        return _path ? _path.client : this.client;
      },
      
      get online() {
        return _client ? _client.client.isConnected() : false;
      },
      
      get reserveBaseXRP() {return _reserveBaseXRP; },
      get reserveIncrementXRP() { return _reserveIncrementXRP; },
      
      disconnect() {
        for (var name in _clients) {
          var client = _clients[name];
          if (client.isConnected()) {
            client.disconnect().then(()=>{ console.log(`${client.connection._url} client disconnect.`)});
          }
        }
      },

      _connect(client, name) {
        return new Promise((resolve, reject)=>{
          if (!client.isConnected()) {
            console.log(`connect to client ${name} ...`);
            client.connect().then(()=>{
              console.log(`${client.connection.url} client connectted.`);
              resolve({client: client, name: name});
            }).catch((err) => {
              console.log(`${name} client cannot connect.`);
              reject(err);
            });
          } else {
            resolve({client: client, name: name});
          }
        });
      },

      connect() {
        return new Promise((resolve, reject)=>{
          for (var name in _clients) {
            this._connect(_clients[name], name).then((result) => {
              //console.log(result.client);
              if(!_client) {
                //console.log(`${result.server.connection._url} is the fatest`);
                _client = result;
                _client.client.on('connected', () => {
                  $rootScope.$broadcast("networkChange");
                  console.warn(_client.name, 'client connected');
                });
                _client.client.on('disconnected', (code) => {
                  $rootScope.$broadcast("networkChange");
                  console.warn(_client.name, 'client disconnected, code:', code);
                });
                _client.client.request({command: "server_info"}).then(response => {
                  _reserveBaseXRP = response.result.info.validated_ledger.reserve_base_xrp;
                  _reserveIncrementXRP = response.result.info.validated_ledger.reserve_inc_xrp;
                  console.warn(`Base ${_reserveBaseXRP} XRP, Inc ${_reserveIncrementXRP} XRP.`);
                });                
                $rootScope.$broadcast("networkChange");
                resolve(result.name);
              } else {
                if (_path && _path.name == result.name) {
                  console.warn("pathNode connected.", _path.name);
                } else {
                  result.client.disconnect();
                }
              }
            }).catch((err) => {
              console.log('ignore client', err);
            });
          }
        });
      },
      
      _removeAll() {
        this.disconnect();
        _clients = {};
        _client = undefined;
        _path = undefined;
      },

      setServers(arr) {
        this._removeAll();
        arr.forEach((item)=>{
            var url = item.server.indexOf("://") < 0 ? "wss://" + item.server : item.server;
            var full_url = url + ":" + item.port;
            
            var client = new xrpl.Client(full_url, {feeCushion: 1.1, connectionTimeout: _timeout});
            _clients[item.server] = client;
            if (["xrpl.ws", "xrplcluster.com"].indexOf(item.server) >= 0) {
              _path = {name: item.server, client: client};
            }
        });
      },
    };
  } ]);
