const AnyProxy = require('anyproxy');
const options = {
  port: 5301,
  webInterface: {
    enable: false,
    webPort: 8002
  },
  rule: require('./proxyRule.js'),
  forceProxyHttps: true,
  wsIntercept: true,
  silent: true
};
const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => { console.log('anyproxy is ready');/* */ });
proxyServer.on('error', (e) => { console.log('proxy error',e); /* */ });
proxyServer.start();