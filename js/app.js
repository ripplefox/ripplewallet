/* globals angular, nw, translate_cn, translate_en, translate_jp */
window.appinfo = require('./package.json');

/* exported myApp */
var myApp = angular.module('myApp', ['ngRoute', 'pascalprecht.translate', 'monospaced.qrcode']);

myApp.config(function($routeProvider, $httpProvider, $translateProvider, $compileProvider) {
  $translateProvider.translations('cn', translate_cn);
  $translateProvider.translations('jp', translate_jp);
  $translateProvider.translations('en', translate_en);
  $translateProvider.preferredLanguage('cn');
  $translateProvider.useSanitizeValueStrategy('escape');

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(local|http|https|app|tel|ftp|file|blob|content|ms-appx|x-wmapp0|cdvfile|chrome-extension):|data:image\//);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

  //$httpProvider.interceptors.push('TokenInterceptor');

  $routeProvider.when('/login', {
    templateUrl : 'pages/login.html',
    controller : 'LoginCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/register', {
    templateUrl : 'pages/register.html',
    controller : 'RegisterCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/security', {
    templateUrl : 'pages/security.html',
    controller : 'SecurityCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/', {
    templateUrl : 'pages/balance.html',
    controller : 'BalanceCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/balance', {
    templateUrl : 'pages/balance.html',
    controller : 'BalanceCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/trust', {
    templateUrl : 'pages/trust.html',
    controller : 'TrustCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/send', {
    templateUrl : 'pages/send.html',
    controller : 'SendCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/contact', {
    templateUrl : 'pages/contact.html',
    controller : 'ContactCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/convert', {
    templateUrl : 'pages/convert.html',
    controller : 'ConvertCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/history', {
    templateUrl : 'pages/history.html',
    controller : 'HistoryCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/trade', {
    templateUrl : 'pages/trade.html',
    controller : 'TradeCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/settings', {
    templateUrl : 'pages/settings.html',
    controller : 'SettingsCtrl',
    access : {
      requiredLogin : true
    }
  }).otherwise({
    redirectTo : '/login'
  });
});

//myApp.run(['$rootScope', '$window', '$location', '$translate', 'AuthenticationFactory', 'StellarApi', 'SettingFactory', 'RemoteFactory', 'AnchorFactory',
//  function($rootScope, $window, $location, $translate, AuthenticationFactory, StellarApi, SettingFactory, RemoteFactory, AnchorFactory) {

myApp.run(['$rootScope', '$window', '$location', '$translate', 'AuthenticationFactory', 'SettingFactory', 'Id', 'ServerManager', 'XrpApi', 'Gateways',
  function($rootScope, $window, $location, $translate, AuthenticationFactory, SettingFactory, Id, SM, XrpApi, Gateways) {

    $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
      if ((nextRoute.access && nextRoute.access.requiredLogin) && !AuthenticationFactory.isInSession) {
        $location.path("/login");
      } else {
        if (currentRoute && currentRoute.originalPath == '/trade') {
          console.log('Leave trade page');
        }
        if (currentRoute && currentRoute.originalPath == '/send') {
          console.log('Leave send page');
          $location.search({}); // clean params
        }
        // check if user object exists else fetch it. This is incase of a page refresh
        if(AuthenticationFactory.isInSession) AuthenticationFactory.restore();
      }
    });

    $rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
      $rootScope.showMenu = AuthenticationFactory.isInSession;
      // if the user is already logged in, take him to the home page
      if (AuthenticationFactory.isInSession && $location.path() == '/login') {
        $location.path('/');
      }
    });

    $rootScope.$on('$authUpdate', function(){
      console.log('$authUpdate', AuthenticationFactory.isInMemory, $rootScope.address, AuthenticationFactory.address);

      if (AuthenticationFactory.isInMemory) {
        $rootScope.address = AuthenticationFactory.address;
        $rootScope.contacts = AuthenticationFactory.contacts;
        XrpApi.init();
      } else {
        delete $rootScope.address;
        delete $rootScope.contacts;
      }
    });

    $rootScope.goTo = function(url){
      $location.path(url);
    };

    XrpApi.appVersion = "foxlet-" + appinfo.version;
    $rootScope.currentNetwork = SettingFactory.getCurrentNetwork();
    $rootScope.native = $rootScope.currentNetwork.coin;
    
    $rootScope.balance = "0"; //native asset;
    $rootScope.reserve = 0;
    $rootScope.lines = []; // lines.CNY.xxx = {code: 'CNY', issuer: 'xxx', balance: 200, limit: 1000}
    $rootScope.getBalance = function(code, issuer) {
      if (code == $rootScope.native.code) {
        code = "XRP";
      } else {
        code = realCode(code);
      }
      let asset = $rootScope.balances.find(x => {
        return code == 'XRP' ? x.currency == 'XRP' : x.currency == code && x.issuer == issuer;
      });
      return asset ? Number(asset.value) : 0;
    }
    $rootScope.funded = function() {
      return $rootScope.balance !== "0";
    }

    reset();
    function reset() {
      console.warn('reset');
      $rootScope.fed_name = "";
      $rootScope.address  = 'undefined';
      $rootScope.contacts = [];
      $rootScope.balances = [];
      $rootScope.lines = [];
      $rootScope.balance = "0";
      $rootScope.reserve = 0;

      $rootScope.events = [];
      $rootScope.history = [];      
      $rootScope.loadState = [];
      $rootScope.unseenNotifications = {
        count: 0
      };
    }

    $rootScope.reset = function(){
      reset();
    }

    $rootScope.objKeyLength = function(obj) {
      return Object.keys(obj).length;
    }
    $rootScope.isValidAddress = function(address) {
      return Id.isValidAddress(address);
    }
    $rootScope.getGateway = function(code, issuer) {
      return Gateways.getGateway(code, issuer);
    }
    
    $rootScope.isPublicNetwork = function() {
      return this.currentNetwork.name == "Ripple Public Network";
    }

    $rootScope.isLangCN = function() {
      return SettingFactory.getLang() == 'cn';
    }

    $translate.use(SettingFactory.getLang());
    try {
      //SM.setMaxfee(SettingFactory.getMaxfee());
      //SM.setTimeout(SettingFactory.getTimeout());
      SM.setServers(SettingFactory.getServers());
      SM.connect().then((name) => {
        console.log(`Client connect to ${name}`);
        XrpApi.client = SM.client;
      });
    } catch(e) {
      console.error("Cannot set server", SettingFactory.getNetworkType(), e);
      console.warn("Change network back to xrp.");
      SettingFactory.setNetworkType('xrp');
      SM.setServers(SettingFactory.getServers());
    }

    if (SettingFactory.getProxy()) {
      try {
        nw.App.setProxyConfig(SettingFactory.getProxy()); //"127.0.0.1:53323"
      } catch(e) {
        console.error("Cannot set proxy", SettingFactory.getProxy(), e);
      }
    }
  }]);


/* exported common functions */
var round = function(dight, howMany) {
  if(howMany) {
    dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
  } else {
    dight = Math.round(dight);
  }
  return dight;
}

var hexToAscii = function(hex) {
    var str = "";
    var i = 0, l = hex.length;
    if (hex.substring(0, 2) === '0x') {
        i = 2;
    }
    for (; i < l; i+=2) {
        var code = parseInt(hex.substr(i, 2), 16);
        if (code > 0) {
          str += String.fromCharCode(code);
        }
    }

    return str;
};

var asciiToHex = function(str) {
  var hex = "";
  for(var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    var n = code.toString(16);
    hex += n.length < 2 ? '0' + n : n;
  }
  return (hex + "0000000000000000000000000000000000000000").substring(0, 40).toUpperCase();;
};

var realCode = function(input) {
  return input && input.length > 3 && input.length <= 20 && input != "drops" ? asciiToHex(input) : input;
};

var fmtCode = function(input) {
  if (!input || input.length != 40) {
    return input;
  }
  if (input.substring(0, 2) == "03") {
    return input.substring(0, 7) + "...";
  }
  return hexToAscii(input);
};

function key(code, issuer) {
  if (!code) {
    return "NONE";
  }
  code = realCode(code);
  return !issuer ? code : code + '.' + issuer;
};