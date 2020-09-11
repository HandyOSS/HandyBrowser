const fs = require('fs');
const spawn = require('child_process').spawn;
var os = require('os');
const http = require('http');
process.env.PATH = process.env.PATH+':/usr/local/bin';
let boot;

$(document).ready(function(){
  boot = new bsApp();
});
class bsApp{
	constructor(){
		console.log('construct');
		nw.App.on('open',()=>{
			console.log('new open process');
			this.showTray();
		})
		if(process.platform == 'darwin'){
			nw.App.on('reopen',()=>{
				console.log('new open process');
				this.showTray();
			});
		}
		nw.Window.get().focus();
		//set guid		
		if(window.localStorage.getItem('guid') == null){
			this.guid = this.getGuid();
			window.localStorage.setItem('guid',this.guid);
		}
		else{
			this.guid = window.localStorage.getItem('guid');
		}

		/*setting this will use hsd or hnsd*/
		this.resolver =  'hnsd'; // OR 'hsd'

		window.localStorage.setItem('resolver',this.resolver);

		this.containerName = this.resolver == 'hsd' ? 'HandyBrowserHSD' : 'HandyBrowserHNSD';
		this.serviceName = this.resolver == 'hsd' ? 'HSD' : 'HNSD';
		
		if(localStorage.getItem('isRebuildingDockerNode') != null){
			this.nukeDocker();
		}
		else{
			this.checkDockerSupport(true);
			if(process.platform == 'linux'){
				//write linux .desktop file proper
				this.writeLinuxDesktopRunner();
			}
			this.initSystemTray()
		}
		
	}
	getGuid(){
		function S4() {
        	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	    }
	    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
	}
	showTray(){
		let w = screen.availWidth;
		let h = screen.availHeight;
		let x = screen.availLeft;
		let y = screen.availTop;
		let hasState = false;
		if(window.localStorage.getItem('windowState') != null){
			let state = JSON.parse(window.localStorage.getItem('windowState'));
			console.log('window state is here',state);
			w = state.width;
			h = state.height;
			x = state.x;
			y = state.y;
			hasState = true;
		}
		nw.App.setProxyConfig('127.0.0.1:5301');
		let isResizable = true;
		nw.Window.open('./tray.html',{
			width:w,
			height:h,
			frame:false,
			resizable:isResizable,
			transparent:true,
			x:x,
			y:y
		},(win)=>{
			win.x = x;
			win.y = y;
		});
	}
	//create docker image for hnsd
	checkDockerSupport(isFirstTimeLaunch){
		//check if we have docker support
		const _this = this;
		let checker = spawn('docker',['ps','-a']);
		let resp = '';
		
		let hsdLogs = '';
		checker.stdout.on('data',d=>{
			//console.log('checker data',d.toString('utf8'));
			resp += d.toString('utf8');
			hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			if(isFirstTimeLaunch){
				$('#logOutput').html(hsdLogs);
			}
		});
		checker.stderr.on('data',d=>{
			$('#logOutput').append(d.toString('utf8'));
			$('#logs').removeClass('required');
			console.log('checker error',d.toString('utf8'));
			$('.main').html('ERROR, DOCKER NOT PRESENT. PLEASE INSTALL OR START DOCKER.')
		})
		checker.on('error',d=>{
			console.log('checker errored out');
			$('.main').html('ERROR, DOCKER NOT PRESENT. PLEASE INSTALL OR START DOCKER.')
		})
		checker.on('close',d=>{
			//checker is done, lets look around
			console.log('checker is done');
			let lines = resp.split('\n');
			
			let earthLine = lines.filter(l=>{
				return l.indexOf(this.containerName) >=0;
			});
			console.log(this.containerName+' len',earthLine.length)
			if(earthLine.length > 0){
				if(earthLine[0].indexOf('Exited') >= 0){
					//this machine was exited
					console.log('machine is down');
					_this.pushToLogs('#### DOCKER:: BOOTING HSD DOCKER CONTAINER #####','stdout','hsd')
					$('.syncedIcon').removeClass('alert');
					$('.syncedButton .statusLabel').html('Booting Docker Container')
					$('.main').html('BOOTING DOCKER CONTAINER');
					this.startExistingDockerMachine();
				}
				else{
					//heyo machine is running
					console.log('docker machine is already running');
					_this.pushToLogs('#### DOCKER:: STARTING HSD ON DOCKER CONTAINER #####','stdout','hsd')
					$('.syncedIcon').removeClass('alert');
					
					$('.syncedButton .statusLabel').html('Starting '+this.serviceName+' in Docker')
					
					this.startDockerizedHSD();
				}
			}
			else{
				//no line = no docker box
				console.log('no docker machine was present, lets make one');
				_this.pushToLogs('#### DOCKER:: STARTING NEW HSD DOCKER MACHINE, THIS WILL TAKE 2-5 MINUTES #####','stdout','hsd');
				$('.syncedIcon').removeClass('alert');
				$('.syncedButton .statusLabel').html('Building Brand New Docker Machine. This will take 2-5 minutes only once..')
				this.startNewDockerMachine(isFirstTimeLaunch);
			}
		})
	}
	startExistingDockerMachine(){
		
		let startD = spawn('docker',['start',this.containerName]);
		startD.stdout.on('data',d=>{
			console.log('startD data',d.toString('utf8'));
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'stdout','hsd');
		})
		startD.stderr.on('data',d=>{
			$('.main').html('ERROR, DOCKER NOT PRESENT. PLEASE INSTALL OR START DOCKER.')
			console.log('startD error',d.toString('utf8'));
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'error','hsd');
		})
		startD.on('close',d=>{
			this.startDockerizedHSD();
			console.log('started existing docker box!')
		})
	}
	startNewDockerMachine(){
		//first we'll create the docker machine
		let hsdLogs = '';
		let listData = '';
		let listD = spawn('docker',['image','ls']);
		listD.stdout.on('data',d=>{
			listData += d.toString('utf8');
			hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			
		});
		
		listD.on('close',d=>{
			$('.syncedButton .statusLabel').html('Built Docker Container!')
			console.log('start listD stdout',listData,listData.indexOf('earthlab'));
			if(listData.indexOf('handybrowserhnsd') == -1){
				//we dont need to build image
				this.createDockerImage();
			}
			else{
				this.createDockerContainer();
			}
		});

		
	}
	createDockerImage(){
		let msgStrings = 
		[
			"Connecting to the Handshake Network...",
			"Spinning up a HSD node...",
			"Becoming one with Satoshi...",
			"Calculating Dollarydoos",
			"Connecting to the Masternodes...",
			"Downloading Skyrim...",
			"Texting Vitalik...",
			"Washing our Hands...",
			"Contacting Aliens...",
			"640K ought to be enough for anybody...",
			"We're almost done, this shit is hard...",
			"The bits are flipping...",
			"Ooops lost a file...",
			"Just kidding...",
			"Handshake was built by aliens, they're lying...",
			"Satellites moving into position...",
			"Wakanda Forever...",
			"Counting backwards from Infinity...",
			"Epstein didn't kill himself...",
			"Creating time-loop inversion field...",
			"HODLING...",
			"Sending Data to the International Space Station...",
			"Loading the Internet of Money...",
			"Downloading Blocks...",
			"Generating UTXOs",
			"We're taking HNS private at $420...",
			"What's a name worth?",
			"This is a simulation, wake-up!.",
			"Donate to the HandyBrowser Team!",
			"No, really, we're broke. Donate to us...",
			"Convincing the Handshake AI not to turn evil...",
			"Creating the New Internet...",
		];
		$('.main').html('BUILDING NEW '+this.serviceName+' DOCKER MACHINE...THIS WILL TAKE A FEW MINUTES (one time only).<br /><span class="statusMessage"></span>');
		let wasError = false;
		
		let dockerFileName = this.resolver == 'hsd' ? './Dockerfile-HSD_RESOLVER' : './Dockerfile-HNSD-Prebuilt';
		
		let createD = spawn('docker',['build', '-t', 'handybrowserhnsd', '-f', dockerFileName, '.'],{cwd:nw.__dirname+'/docker_utils'});
		let hsdLogs = '';
		let stepVal = 0;
		createD.stdout.on('data',d=>{
			let text = d.toString('utf8');
			console.log('progress',text);
			if(text.indexOf ('Step') >= 0){
				let stepText = text.split('Step')[1];
				stepText = stepText.split(':')[0];
				
				if(stepVal > msgStrings.length-1){
					stepVal = 0;
				}
				
				$('.main .statusMessage').html('Step '+stepText+': '+msgStrings[stepVal])
				stepVal++;
			}
		})
		createD.stderr.on('data',d=>{	
			wasError = true;
			
			$('.main').html("ERROR CREATING DOCKER MACHINE: "+d.toString('utf8'))
		})
		createD.on('close',d=>{
			//we should now make our container
			if(!wasError){
				this.createDockerContainer();
			}
		})
	}
	createDockerContainer(){
		
		$('.main').html('BUILDING NEW '+this.serviceName+' DOCKER ENVIRONMENT...THIS MAY TAKE A MINUTE (once).');
		let wasContainerError = false;
		let hsdLogs = '';
		let containerD = spawn('docker', ['run', '-p', '13937:13037', '-p', '13938:13038', '-p', '14937:14037','-p','14938:14038', '-p', '12937:12037', '-p', '12938:12038', '-p', '3008:3008', '-p', '15937:15037', '-p', '15938:15038', '-p', '5301:5301', '-p', '5302:5302', '-p', '13038:13038', '-p', '15359:15359', '--expose', '3008', '--name', this.containerName, '-td', 'handybrowserhnsd'],{cwd:nw.__dirname+'/docker_utils'});
		containerD.stdout.on('data',d=>{
			
			console.log('container creation data',d.toString('utf8'));
			//TODO log things/notify user
		})
		containerD.stderr.on('data',d=>{
			wasContainerError = true;
			
			console.log('container creation ERROR',d.toString('utf8'));
		  $('.main').html("ERROR CREATING DOCKER CONTAINER: "+d.toString('utf8'))
		});
		containerD.on('close',d=>{
			console.log('containerD was closed');
			if(!wasContainerError){
				//lets start
				this.startDockerizedHSD();
			}
		})
	}
	startDockerizedHSD(){

		$('.main').html('STARTING '+this.serviceName);
		this.hasLogged = false;
		let envVars = process.env;
		console.log('starting hsd')
		let hsdProcess;
		let hsdFullnodeProcess;
		console.log('this resolver',this.resolver)
		if(this.resolver == 'hsd'){
			hsdProcess = spawn('docker',['exec','-i',this.containerName,'sh','-c','"./run.hns.resolver.sh\ '+this.guid+'"'],{shell:true})
		} 
		else{
			hsdProcess = spawn('docker',['exec','-i',this.containerName,'sh','-c','"./run.hnsd.sh"'],{shell:true})
			hsdFullnodeProcess = spawn('docker',['exec','-i',this.containerName,'sh','-c','"/usr/hsd/run.hns.node.sh\ '+this.guid+'"'],{shell:true})
		}

		let godaneProxyProcess = spawn('docker',['exec','-i',this.containerName,'sh','-c','"/usr/godane/run.godane.proxy.sh\ '+this.guid+'"'],{shell:true})
		
		//let hsdLogs = '';
		hsdProcess.stdout.on('data',d=>{
			//console.log('hsd data',d.toString('utf8'));
			if(this.resolver == 'hsd' && !this.hasLogged){
				if(d.toString('utf8').indexOf('listening on port 53') == -1){
					return;
				}
			}
			if(!this.hasLogged){

				this.hsdIsRunningLocally = true;
				this.hasLogged = true;
				this.finishup();
				
			}
			
		})
		hsdProcess.stderr.on('data',d=>{
			console.log('stderr log',d.toString('utf8'))
			let errmsg = d.toString('utf8');
			let msg;
			if(errmsg.indexOf('failed opening ns') >= 0 || errmsg.indexOf('lock') >= 0){
				msg = 'HSD ALREADY RUNNING';
			}
			else{
				msg = errmsg;
			}
			if(errmsg.indexOf('EFAILURE') >= 0 && this.resolver == 'hnsd'){
				msg = 'HNSD ALREADY RUNNING';
			}
			$('.main').html(msg);
			if(this.resolver == 'hsd'){
				this.finishup();
			}
		})
		hsdProcess.on('close',d=>{
			console.log('hsd process closed');
		});
		
		console.log('attempt start of hsd')
	}
	finishup(){
		let manifest = nw.App.manifest;
		console.log('finishup')
		//always keep the godane cert updated in the app manifest
		let p = new Promise((resolve,reject)=>{
		let cpSpawn = spawn('docker',['cp','HandyBrowserHNSD:/root/.godane/cert.crt',nw.App.dataPath+'/godane.cert.crt']);
		cpSpawn.on('close',()=>{
			//console.log('copied cert')
			let certText = fs.readFileSync(nw.App.dataPath+'/godane.cert.crt','utf8');
			let ogCert = manifest.additional_trust_anchors;
			if(typeof ogCert != "undefined"){
				ogCert = manifest.additional_trust_anchors[0];
			}
			/*certText = certText.replace(/\n/gi,'\n');
			if(process.platform != 'darwin'){
				let guts = certText.split('\n').slice(0,-1).slice(1,-1);
				let begin = certText.split('\n').slice(0,-1).slice(0,1)
				let end = certText.split('\n').slice(0,-1).slice(-1)
				guts = guts.join('')
				certText = guts;

			}*/
			//console.log('certText',certText);
			manifest.additional_trust_anchors = [certText];
			manifest.main = manifest.main.split('/');
			manifest.main = manifest.main[manifest.main.length-1];
			if(process.platform == 'win32'){
				manifest.main = manifest.main.split('\\')
				manifest.main = manifest.main[manifest.main.length-1];
			}
			let execPath = process.execPath;
			let startPath = nw.App.startPath;
			/*let p = spawn('sleep',['1','&&',execPath,startPath])
			p.stdout.on('data',d=>{
				console.log('stdout:::',d.toString('utf8'))
			})
			p.stderr.on('data',d=>{
				console.log('stderr:::',d.toString('utf8'))
			})*/
			//setTimeout(()=>{
				//let child;
			const path = require('path');
			let wp;
			if (process.platform == "darwin")  {
				wp = path.dirname(process.execPath.match(/^([^\0]+?\.app)\//)[1])
				//fs.writeFileSync(wp+'/package.json',JSON.stringify(manifest,null,2),'utf8');
		        //child = spawn("open", ["-n", "-a", process.execPath.match(/^([^\0]+?\.app)\//)[1]], {detached:true})
		    } else {
		        //child = spawn(process.execPath, [], {detached: true})
		        wp = path.dirname(process.execPath)+'/package.nw'
				//fs.writeFileSync(wp+'/package.json',JSON.stringify(manifest,null,2),'utf8');
		    }
		    console.log('write manifest to',wp);
		    if(process.platform != 'linux'){
		    	fs.writeFileSync(wp+'/package.json',JSON.stringify(manifest,null,2),'utf8');
			}
		    if(ogCert != certText){
		    	if(localStorage.getItem('isRebuildingDockerNode') != null){
					localStorage.removeItem('isRebuildingDockerNode');
				}
		    	console.log('rewrite cert and restart')
		    	$('.main').html('UPDATING PROXY CERTIFICATE AND RESTARTING APP...');
		    	//we rewrote it, we should restart the app real fast
		    	if(process.platform == 'darwin'){
		    		//console.log('to restart',wp+'/utils/restart.mac.sh')
		    		let restartMAC = spawn(wp+'/utils/restart.mac.sh',[process.pid,process.execPath.match(/^([^\0]+?\.app)\//)[1]],{detached:true})
		    		
		    		//restart.unref();
		    		//nw.App.quit();
		    	}
		    	if(process.platform == 'win32'){
		    		//let restartWIN = spawn('cmd.exe',['sh',wp+'/utils/restart.windows.sh',process.pid,process.execPath],{detached:true})
		    		//Import-Certificate -FilePath "C:\CA-PublicKey.Cer" -CertStoreLocation Cert:\LocalMachine\Root
		    		let installCert = spawn('powershell.exe',['-command','Import-Certificate', '-FilePath', '"'+nw.App.dataPath+'/godane.cert.crt'+'"', '-CertStoreLocation', 'Cert:\\LocalMachine\\Root'])
		    		installCert.stdout.on('data',d=>{
		    			console.log('install stdout',d.toString('utf8'));
		    		})
		    		installCert.stderr.on('data',d=>{
		    			console.log('install stderr',d.toString('utf8'));
		    		})
		    		installCert.on('close',()=>{
		    			let restartWIN = spawn( 'restart.windows.bat',[ process.pid, process.execPath],{detached:true,silent:true,cwd:wp+'/utils'});
		    		
			    		setTimeout(()=>{
			    			nw.Window.get().setAlwaysOnTop(true);
			    		},100)
			    		restartWIN.unref();
			    		setTimeout(()=>{
			    			nw.App.quit();
			    		},2000)
			    		restartWIN.stdout.on('data',d=>{
							console.log('stdout:::',d.toString('utf8'))
						})
						restartWIN.stderr.on('data',d=>{
							console.log('stderr:::',d.toString('utf8'))
						})
		    		})
		    		
		    	}
		    	if(process.platform == 'linux'){
		    		$('.main').html('UPDATING PROXY CERTIFICATE<br />CERTIFICATE INSTALL WILL ASK FOR PERMISSIONS...');
		    		/*let installCERT = spawn('./install_CA_cert_linux.sh',[nw.App.dataPath+'/godane.cert.crt'],{detached:true,silent:true,cwd:wp+'/utils'})
		    		installCERT.stdout.on('data',d=>{
						console.log('stdout:::',d.toString('utf8'))
					})
					installCERT.stderr.on('data',d=>{
						console.log('stderr:::',d.toString('utf8'))
					})
					installCERT.on('close',()=>{
						console.log('install cert closed');
					})*/
					//check for certutil
					let utilCheck = spawn('certutil',['-H']);
					let wasError = false;
					utilCheck.on('error',()=>{
						wasError = true;
						console.log('util check err');
						$('.main').html('"certutil" command not found</br />Please run:<br /><br />sudo apt install libnss3-tools<br /><br /> and restart HandyBrowser');
					})
					utilCheck.on('close',()=>{
						//success
						if(wasError){
							return;
						}
						fs.writeFileSync(wp+'/package.json',JSON.stringify(manifest,null,2),'utf8'); //add cert to manifest
						const sp = require('sudo-prompt');
						let options = {
						  name: 'HandyBrowser'
						};
						process.title = 'HandyBrowser';
						setTimeout(()=>{
							sp.exec(wp+'/utils/install_CA_cert_linux.sh '+nw.App.dataPath+'/godane.cert.crt',options,
								function(error, stdout, stderr) {
									//if(error){
										console.log("ERR",error,stdout,stderr);;
									//}
									$('.main').html('CERTIFICATE UPDATED<br />RESTARTING HANDYBROWSER...');
								    let restartLIN = spawn(wp+'/utils/restart.linux.sh',[process.pid,process.execPath],{detached:true,env:process.env})
						    		restartLIN.unref();
						    		setTimeout(()=>{
						    			nw.App.quit();
						    		},2000)
								}
							);
						},2000)
					})
					
					
		    		
		    	}
			    //child.unref()
		    }
		    else {
		    	resolve();
		    }
			//},100);
			
		})
		//console.log('manifest',nw.App.manifest);
		//}
		
	}).then(()=>{
		let toClose = nw.Window.get();
		if(localStorage.getItem('isRebuildingDockerNode') != null){
			localStorage.removeItem('isRebuildingDockerNode');
		}
		else{
			this.showTray();
		}
		setTimeout(()=>{
			if(process.platform != 'linux'){
				//tray icon not showing on ubuntu 16?
				toClose.hide();//toClose.close();
			}
			else{
				toClose.close();
			}
		},1000)
	})
		
		
	}
	pushToLogs(line,type,context){
		console.log('LOGS:',line,type,context);
	}
	writeLinuxDesktopRunner(){
		let runnerPath = nw.App.getStartPath()+'/HandyBrowser.desktop';
		let execPath = nw.App.getStartPath();
		if(global.__dirname.indexOf('package.nw') >= 0){
			execPath = global.__dirname.split('/').slice(0,-1).join('/');
			runnerPath = execPath+'/HandyBrowser.desktop';
		}
		let runnerText = fs.readFileSync(runnerPath,'utf8');
		let lines = runnerText.split('\n').map(line=>{
			if(line.indexOf('Icon=') == 0){
				//target line, update icon w abs path
				return `Icon=${global.__dirname}/icons/app_png.png`;
			}
			else if(line.indexOf('Path=') == 0){
				//update path
				return `Path=${execPath}`;
			}
			else if(line.indexOf('Exec=') == 0){
				return `Exec=${execPath}/HandyBrowser`;
			}
			else return line;
		})
		fs.writeFileSync(runnerPath,lines.join('\n'),'utf8');
	}
	nukeDocker(){
		$('.main').html('REMOVING DOCKER CONTAINER...');
		let containerD = spawn('docker',['stop','HandyBrowserHNSD','&&','docker','rm','HandyBrowserHNSD','&&','docker','image','rm','handybrowserhnsd'],{shell:true});
		containerD.on('close',d=>{
			
			$('.main').html('REMOVED DOCKER CONTAINER, REBUILDING');
			this.checkDockerSupport(true);
			if(process.platform == 'linux'){
				//write linux .desktop file proper
				this.writeLinuxDesktopRunner();
			}
			
		})
		containerD.stdout.on('data',d=>{	
			console.log('nuke docker continer msg',d.toString('utf8'))
		})
		containerD.stderr.on('data',d=>{
			$('.main').html('ERROR REMOVING DOCKER CONTAINER: '+d.toString('utf8'));
			console.log('cant nuke docker continer',d.toString('utf8'))
		})
	}
	initSystemTray(){
		// Create a tray icon
		let icon = './icons/app_256x256x32.png';
		let title = 'HandyBrowser';
		if(process.platform == 'darwin'){
			icon = './icons/app_16x16x32.png'
			title = '';
		}
		//if(process.platform == 'darwin'){
		var tray = new nw.Tray({ title: title, icon: icon });

		// Give it a menu
		var menu = new nw.Menu();
		menu.append(
			new nw.MenuItem({ label: 'New HandyBrowser Window',click:()=>{
				this.showTray();
			} 
		}));
		menu.append(
			new nw.MenuItem({
				label:'Quit and Halt Handshake Proxy',
				click:()=>{
					let stopCmd = spawn('docker',['stop','HandyBrowserHNSD'],{shell:true});
					$('.main').html('STOPPING DOCKER HNSD CONTAINER...');
					nw.Window.get().show();
					nw.Window.get().focus();
					stopCmd.stdout.on('data',(d)=>{
						console.log('stop cmd out',d.toString('utf8'))
						tray.remove();
						nw.Window.get().close(true);
						nw.App.quit();
					})
					stopCmd.stderr.on('data',(d)=>{
						tray.remove();
						nw.Window.get().close(true);
						nw.App.quit();
					})
					
				}
			})
		);
		menu.append(
			new nw.MenuItem({
				label:'How to Use Handshake in Chrome/Firefox/etc',
				click:()=>{
					this.showHowtoProxy();
				}
			})
		)
		tray.menu = menu;
		//}

		/*// Remove the tray
		tray.remove();
		tray = null;*/
	}
	showHowtoProxy(){
		//show the proxy info panel
		const nets = os.networkInterfaces();
		const results = {};

		for (const name of Object.keys(nets)) {
		    for (const net of nets[name]) {
		        // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
		        if (net.family === 'IPv4' && !net.internal) {
		            
		            if(net.address.indexOf('10.') == 0 || net.address.indexOf('192.168') == 0){
		            	if (!results[name]) {
			                results[name] = [];
			            }
		            	results[name].push(net.address);
		        	}
		        }
		    }
		}


		let state = localStorage.getItem('windowState');
		let x = screen.availLeft;
		let y = screen.availTop;
		let w = screen.availWidth;
		let h = screen.availHeight;

		if(state != null){
			state = JSON.parse(state);
			x = state.x;
			y = state.y;
			w = state.width;
			h = state.height;
		}
		nw.Window.open('./proxyInfo.html',{
			width:w,
			height:h,
			frame:false,
			resizable:true,
			transparent:true,
			x:x,
			y:y
		},(win)=>{
			win.x = x;
			win.y = y;
			win.on('loaded',()=>{
				$.getJSON('http://localhost:5302/__handybrowser_get_godane_cert__',(certD)=>{
					let certText = certD.data;
					let $a = $('#downloadCert',$(win.window.document));
					$a[0].href = URL.createObjectURL(new Blob([certText]));
					$a.attr('type','text/crt')
					$a.attr('download','godane.cert.crt');
				})
				$('#modalNav',$(win.window.document)).css('position','fixed');
				//console.log('opened win',win,$('.proxyInfo',$(win.window.document)));
				console.log('ip res',results);
				if(Object.keys(results).length > 0){
					let $el = $('.proxyInfo .ips',$(win.window.document))
					$el.html('<div class="myInfoLabel">My Proxy Server Info:</div>')
					Object.keys(results).map(netName=>{
						console.log('nn',results[netName])
						if(results[netName].length > 0){
							results[netName].map((ip,i)=>{
								if(i == 0){
					  			$el.append('<div>'+netName+'</div>')
					  		}
					  		$el.append('<div class="IP">IP: '+ip+'</div>')
					  		$el.append('<div class="port">port: 5301</div>')
							})
				  		
				  		}
					})
				}
				switch(process.platform){
					case 'win32':
						$('#modalNav',$(win.window.document)).addClass('windows');
					break;
					case 'linux':
						$('#modalNav',$(win.window.document)).addClass('linux');
					break;
				}

				$('#closeMap',$(win.window.document)).on('click',()=>{
					//$('#modal',win.window).hide().html('');
					win.close(true);
				})
			})
			
		});
		
	}
}
