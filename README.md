## HandyBrowser

### Download Latest Prebuilt in [Releases](./releases)

### Building from Source

First, install frontend client dependencies

0. ```npm install -g bower```
1. ```bower install```

#### Building for Mac

0. [Download nw.js](https://nwjs.io/)
1. Copy this repo to folder ```./nwjs.app/Contents/Resources/app.nw```
2. Copy app.icns, document.icns to ```./nwjs.app/Contents/Resources/```
3. To change the app display names, follow directions [here](https://nwjs.readthedocs.io/en/latest/For%20Users/Package%20and%20Distribute/)

#### Building for Windows / Linux

0. [Download nw.js](https://nwjs.io/)
1. Checkout this repo into the nw.js directory next to nwjs.exe as a folder named ```package.nw```
2. To change icons, use ResourceHacker to modify nwjs.exe icons
3. Further options to build/distribute [here](https://nwjs.readthedocs.io/en/latest/For%20Users/Package%20and%20Distribute/)

### How HandyBrowser works

HandyBrowser is using node-webkit [nw.js](https://nwjs.io) under the hood. Nw.js packages the latest chromium with the latest node.js and allows us granular security, html and many other features. 
Since we did not want users to manually have to modify system level configurations and run HNSD/HNS resolvers locally themselves, we rely on Docker. 
Docker allows us to create a lightweight linux virtual machine that installs HNS resolvers, and is pre-configured to use the HNS resolver. We simply proxy all web traffic from the chromium browser into the Docker machine which resolves via HSD and returns content! Docker generates a self-signed certificate on container creation which allows the user to proxy https traffic to the browser.

Why nw.js over electron? The lead-dev of this project has used nw.js extensively in enterprise-class application for many years and knows the inside/outs of every piece of the framework. In addition, the window manager (urlbar) we wrote needed to control all windows (tabs) created within the application and IPC is not fun. Nw.js allowed us more flexibility for the task of building a web-browser while offering the security we needed: No browser windows have access to node.js, just the window manager. 
[More reasons here, including: ](https://hackernoon.com/why-i-prefer-nw-js-over-electron-2018-comparison-e60b7289752) ```"Even better, you can run Chrome Apps/extensions using NW.js"```

### Project TODOs

0. Make Windows Resize/move work properly. Currently the window.move and window.resize events for Windows result in subpixel walks across the screen. Likely need an elegant way to do this.

1. Re-enable HNSD when it's production ready. We got HNSD to work and the dockerfile is there to build. Setting ```this.resolver = 'hsd'; //|| hnsd``` to 'hnsd' in file ```js/boot.js:24``` will allow you to boot with hnsd. Why not HNSD? We had issues with queueing and timeouts at scale. It works great for one site at a time. However when opening multiple tabs with tons of analytics happening (google.com, ebay.com, facebook.com, yahoo.com) HNSD would have a request that would lag and cause subsequent requests to wait for a timeout to happen. Replicating can be done by modifying ```/etc/resolv.conf``` to use ```8.8.8.8``` instead of ```127.0.0.1``` and see the difference. Thus we use hsd for now.

2. It would be great to not need docker's overhead. If there were a way to tell the browser which DNS to use locally that would be ideal.

3. Re-enable the HandyMiner GUI that's build in already. Shell script/workflow to install hstratum onto the dockerized HSD machine needs made.

4. Figure out how to get chrome extensions working. They are most certainly supported in nw.js.

### Project Roadmap

0. Build-in WebRTC Video/Audio chat + Screensharing

### Donate HNS to the HandyBrowser Team:

![alt text](./icons/qr.png)

HNS: ```hs1qwfpd5ukdwdew7tn7vdgtk0luglgckp3klj44f8```



