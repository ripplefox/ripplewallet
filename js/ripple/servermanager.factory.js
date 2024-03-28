/* global _, myApp, round, RippleAPI */

myApp.factory('ServerManager', ['$rootScope',
  function($rootScope) {
  
    let _servers = {};
    let _active = undefined;

    let _clients = {};
    let _client = undefined;

    let _maxfee = 0.2;
    let _timeout = 100000;
    
    let _reserveBaseXRP = 0;
    let _reserveIncrementXRP = 0;
    
    return {
      setMaxfee(maxfee) {
        _maxfee = parseFloat(maxfee);
      },
      
      setTimeout(seconds) {
        _timeout = parseFloat(seconds) * 1000;
      },
      
      get remote() {
        return _active ? _active.server : null;
      },

      get client() {
        return _client ? _client.client : null;
      },
      
      get online() {
        return _client ? _client.client.isConnected() : false;
      },
      
      get reserveBaseXRP() {return _reserveBaseXRP; },
      get reserveIncrementXRP() { return _reserveIncrementXRP; },
      
      disconnect() {
        for (var name in _servers) {
          var server = _servers[name];
          if (server.isConnected()) {
            server.disconnect().then(()=>{ console.log(`${server.connection._url} disconnect.`)});
          }
        }
        for (var name in _clients) {
          var client = _clients[name];
          if (client.isConnected()) {
            client.disconnect().then(()=>{ console.log(`${client.connection._url} client disconnect.`)});
          }
        }
      },
      
      _connect(remote, name) {
        return new Promise((resolve, reject)=>{
          if (!remote.isConnected()) {
            console.log(`connect to ${name} ...`);
            remote.connect().then(()=>{
              console.log(`${remote.connection._url} connectted.`);
              resolve({server: remote, name: name});
            }).catch((err) => {
              console.log(`${name} cannot connect.`);
              reject(err);
            });
          } else {
            resolve({server: remote, name: name});
          }
        });
      },
      
      connect() {
        _active = undefined;

        return new Promise((resolve, reject)=>{
          for (var name in _servers) {
            this._connect(_servers[name], name).then((result) => {
              if(!_active) {
                //console.log(`${result.server.connection._url} is the fatest`);
                _active = result;
                resolve(result.name);
              } else {
                result.server.disconnect();
              }
            }).catch((err) => {
              console.log('ignore', err);
            });
          }
        });
      },

      _connectClient(client, name) {
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

      connectClient() {
        _client = undefined;

        return new Promise((resolve, reject)=>{
          for (var name in _clients) {
            this._connectClient(_clients[name], name).then((result) => {
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
                result.client.disconnect();
              }
            }).catch((err) => {
              console.log('ignore client', err);
            });
          }
        });
      },
      
      _removeAll() {
        this.disconnect();
        _servers = {};
        _clients = {};
        _active = undefined;
        _client = undefined;
      },

      setServers(arr) {
        this._removeAll();
        arr.forEach((item)=>{
            var url = item.server.indexOf("://") < 0 ? "wss://" + item.server : item.server;
            var full_url = url + ":" + item.port;
            
            var server = new RippleAPI({server: full_url, feeCushion: 1.1, maxFeeXRP: _maxfee.toString() });
            server.connection._config.connectionTimeout = _timeout;
            _servers[item.server] = server;

            var client = new xrpl.Client(full_url);
            _clients[item.server] = client;
        });
      },
    };
  } ]);
