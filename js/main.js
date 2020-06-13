let FE;
const fs = require('fs');
const spawn = require('child_process').spawn;
var os = require('os');

const http = require('http');

delete process.env.OPENSSL_CONF;

$(document).ready(function(){
	FE = new feApp();
});
class feApp{
	constructor(){
		/*nw.App.setProxyConfig('127.0.0.1:5301');
		nw.Window.open('./tray.html',{
			width:screen.width,
			height:screen.height,
			frame:false,
			resizable:false
		});*/
		//setTimeout(()=>{
		this.showMiningConsole();
		//},4000)

	}
	showMiningConsole(){
		//nw.Window.get().focus();
		if(typeof process.env.HOME == "undefined"){
			if(typeof process.env.HOMEDRIVE && process.env.HOMEPATH){
				process.env.HOME = process.env.HOMEDRIVE+process.env.HOMEPATH;
			}
		}

		/**********UPDATE ME PLS*****/
		/*this.network = 'testnet';
		this.prodPort = '13037';
		this.peersPort = '13038';*/
		/*this.network = 'simnet';
		this.prodPort = '15037';
		this.peersPort = '15038';*/
		this.network = 'main';
		this.prodPort = '12937';
		this.peersPort = '12938';
		/*****EXTRA UPDATE ME PLS*******/


		if(typeof process.env.HANDY_IS_MAINNET != "undefined"){
			this.network = 'main';
			this.prodPort = '12937';
			this.peersPort = '12938';
		}

		
		this.prodWallet = 'hs1qwfpd5ukdwdew7tn7vdgtk0luglgckp3klj44f8';
		this.macUseDocker = true; //tell mac users to start docker machines and whatnot..
		/***********PRETTY PLS ******/
		
		
		process.env.PATH += ':/usr/local/bin';
		process.env.HANDYRAW = true;
		this.isFirstRunEver = false; //is this the first time we ran this?
		this.hashRates = {};
		this.minerLogs = '';
		this.hsdLogs = '######################################\r\n';
		this.hsdLogs +='############# HANDY MINER ############\r\n';
		this.hsdLogs +='######################################\r\n';
		this.logsVisible = false;
		this.miningMode = 'pool';//solo|pool
		this.soloStratumOption = 'local'; //local || remote
		this.awaitingConfirmation = false;
		this.hsdURL = '127.0.0.1:'+this.prodPort;
		this.hsdUser = 'earthlab';
		this.hsdWallet = 'hs1qwfpd5ukdwdew7tn7vdgtk0luglgckp3klj44f8';
		this.defaultWallet = this.hsdWallet;
		this.hsdWalletPlaceHolder = this.hsdWallet;
		this.last100Blocks = {};
		this.canFetchNetworkTimeline = false;
			
		console.log('fe app is constructed');
		this.initEvents();
		//let config = fs.readFileSync('./HandyMiner/config.json','utf8');
		let config;
		if(!fs.existsSync(process.env.HOME+'/.HandyMiner')){
			fs.mkdirSync(process.env.HOME+'/.HandyMiner/');
			this.isFirstRunEver = true;
			console.log('created ~/.HandyMiner dir');
			$('#stratum.minerForm .saveButton').html('Save Stratum Details and Build Docker Node')
			//is new-ish
		}
		if(!fs.existsSync(process.env.HOME+'/.HandyMiner/config.json')){
			config = {
				"gpus":"",
				"gpu_platform":"",
				"gpu_mfg":"",
				"intensity":10,
				"mode":"",
				"host":"",
				"port":"",
				"stratum_user":"",
				"stratum_pass":"",
				"poolDifficulty":"-1",
				"muteFanfareSong":false,
				"network":this.network
			}
			$('.minerForm').removeClass('hidden');
		}
		else{
			config = JSON.parse(fs.readFileSync(process.env.HOME+'/.HandyMiner/config.json','utf8'))
			$('#gpuList').val(config.gpus);
			$('#gpuMfg option').removeAttr('selected');
			$('#gpuMfg option[value="'+config.gpu_mfg.toLowerCase()+'"]').attr('selected','selected');
			$('#stratumHost').val(config.host);
			$('#stratumPort').val(config.port);
			$('#stratumUser').val(config.stratum_user);
			$('#stratumPass').val(config.stratum_pass);
			$('#network option[value="'+config.network+'"]').attr('selected','selected');
			$('#gpuPlatform option').removeAttr('selected');
			$('#gpuPlatform option[value="'+config.gpu_platform+'"]').attr('selected','selected');
			$('#intensity option[value="'+config.intensity+'"]').attr('selected','selected');
			if(config.poolDifficulty){
				$('#minerDifficulty').val(config.poolDifficulty);
			}
			if(config.muteFanfareSong){
				$('#muteFanfare').attr('checked','checked');
			}
			config.gpus.split(',').map(function(item){
				let $tmpl = $('#gpuTemplate').clone();
				$tmpl.removeAttr('id');
				$tmpl.attr('data-id',item);
				$tmpl.addClass('gpuIcon')
				$('li',$tmpl).eq(0).html('GPU'+item);
				$('li',$tmpl).eq(1).html('0MH');
				$('.gpuStatus').append($tmpl);
			})
			this.miningMode = config.mode || 'pool'
		}
		this.config = config;
		
		if(this.config.mode == 'pool'){
			$('.blocksAllTime .label').html('Shares All Time');
			$('.blocksToday .label').html('Shares Last 100 Blocks')
		}

		console.log('home loc??',process.env.HOME);
		this.initLogo();
		setTimeout(()=>{
			fs.readFile(process.env.HOME+'/.HandyMiner/hsdConfig.json',(err,d)=>{
				if(!err){
					console.log('done reading configs?')
					this.hsdConfig = JSON.parse(d.toString('utf8'));
					$('#hsdApiPass').val(this.hsdConfig.apiKey);
					$('#hsdMinerWallet').val(this.hsdConfig.wallet);
					this.hsdWallet = this.hsdConfig.wallet;
					if(typeof this.hsdConfig.url != "undefined"){
						$('#hsdAPIUrl').val(this.hsdConfig.url);
						$('#hsdAPIPass').val(this.hsdConfig.apiKey);
						this.hsdURL = this.hsdConfig.url;
					}
					console.log('should launch hsd then?')
						this.launchHSD();
					console.log('auto launched HSD on start')
					//fs.writeFileSync(process.env.HOME+'/.HandyMiner/hsdConfig.json',JSON.stringify(this.hsdConfig))
				}
				else{
					//no config was found, first timer i guess
					//this.initLogo();
					this.hideLoading();
					console.log('err launching hsd?',d.toString('utf8'))
				}
			});
		},3000);
		console.log('config isset??',config);
		/*this.getHSDNetworkInfo();
		this.startTimer();*/
	}
	initEvents(){
		const _this = this;
		$('.nukeDocker').off('click').on('click',function(){
			if(!$(this).hasClass('doRemoveThisTime')){
				$('.nukeDocker').addClass('doRemoveThisTime');
				$('.nukeDocker').html('Click again to confirm nuke. It will take 2-5 mins to reconstruct FYI.')
			}
			else{
				//we actually nuke then.
				_this.nukeDockerContainer();
				$('.nukeDocker').removeClass('doRemoveThisTime');
				$('.nukeDocker').html('DONE! Docker will rebuild now.')
				setTimeout(function(){
					$('.minerForm:not(#main)').addClass('hidden');
					$('#logs').removeClass('hidden').removeClass('required');
					_this.logsVisible = true;
					_this.pushToLogs('####DOCKER:: NUKING DOCKER CONTAINER...','stdout','hsd')
				},1000)
				setTimeout(function(){
					$('.nukeDocker').html('Nuke and Rebuild Docker Machine')
				},5000)
				
			}

		})
		$('#poolProvider').off('change').on('change',()=>{
			let val = $('#poolProvider option:selected').val();
			$('#stratumHostPool').val(val);
			//set ports automagically
			switch(val){
				case 'hns.f2pool.com':
					$('#stratumPortPool').val('6000');
					hidePass();
				break;
				case 'stratum+tcp://handshake.6block.com':
					$('#stratumPortPool').val('7701');
					hidePass();
				break;
				case 'hns-us.ss.poolflare.com':
					$('#stratumPortPool').val('3355');
					hidePass();
				break;
				case 'stratum-us.hnspool.com':
					$('#stratumPortPool').val('3001');
					$('#stratumUserPool').attr('placeholder','Account Username');
					$('#stratumPassPool').attr('placeholder','Account Password');
					$('#poolPass').removeClass('hidden');
					$('#stratumUserPool').removeClass('superwide');
				break;
			}
			function hidePass(){
				$('#stratumUserPool').attr('placeholder','wallet.rigName');
				$('#stratumPassPool').attr('placeholder','Anything');
				$('#poolPass').addClass('hidden');
				$('#stratumUserPool').addClass('superwide');
			}
		})
		let _useStratumAdvancedSettings = false;
		$('#advancedPoolSettings').off('click').on('click',()=>{
			$('.stratumSubElement.advancedStratumSetting').toggleClass('hidden');
		});
		$('.saveButton').off('click').on('click',function(){
			let host,port,stratumUser,stratumPass,hsdApiKey,hsdMinerWallet;
			switch($(this).parents('.minerForm').attr('id')){
				case 'gpus':
					console.log('save gpus info');
					let mfg = $('#gpuMfg option:selected').val();
					let platformID = $('#gpuPlatform option:selected').val();
					let gpus = $('#gpuList').val();
					let intensity = $('#intensity option:selected').val();
					let muteFanfare = $('#muteFanfare').is(':checked');
					console.log('gpus isset',gpus);
					_this.config.gpu_mfg = mfg;
					_this.config.gpus = gpus;
					_this.config.gpu_platform = platformID;
					_this.config.intensity = intensity;
					_this.config.muteFanfareSong = muteFanfare;
					/*
					let $tmpl = $('#gpuTemplate').clone();
					$tmpl.removeAttr('id');
					let t = $tmpl.clone();
					t.attr('data-id',v);
					t.addClass('gpuIcon');
					$('li',t).eq(0).html('GPU'+v);
					$('li',t).eq(1).html('0MH');
					$('.gpuStatus').append(t);
					*/
					let $tmpl = $('#gpuTemplate').clone();
					$tmpl.removeAttr('id');
					let gpuArr = gpus.split(',');
					$('.gpuStatus .gpuIcon').remove();
					gpuArr.map(function(gpuID){
						let t = $tmpl.clone();
						t.attr('data-id',gpuID);
						t.addClass('gpuIcon');
						$('li',t).eq(0).html('GPU'+gpuID);
						$('li',t).eq(1).html('0MH');
						$('.gpuStatus').append(t);
					})
					fs.writeFileSync(process.env.HOME+'/.HandyMiner/config.json',JSON.stringify(_this.config,null,2));
					console.log('mfg',mfg,'plat',platformID,'gpus',gpus);
				break;

				case 'stratum':
					//console.log('save stratum info')
					console.log('save stratum info solo strat and mining mode',_this.soloStratumOption,_this.miningMode);
					console.log('yaaaaaaaaaaaaaaaaa')
					//check miningmode here
					//this.soloStratumOption
					if(_this.soloStratumOption == 'local' && _this.miningMode == 'solo'){
						host = '127.0.0.1';
						port = '3008';
						stratumUser = 'earthlab';
						stratumPass = 'earthlab';
					}
					else{
						host = $('#stratumHost').val() || '127.0.0.1';
						port = $('#stratumPort').val() || '3008';
						stratumUser = $('#stratumUser').val() || 'earthlab';
						stratumPass = $('#stratumPass').val() || 'earthlab';	
					}
					_this.config.network = $('#network option:selected').val() || 'testnet';

					let portO;
					let portP;
					let midChar = '0';
					if(host == '127.0.0.1' || host.indexOf('192.168') >= 0){
						midChar = '9';
					}
					switch(_this.config.network){
						case 'main':
							portO = '12'+midChar+'37';
							portP = '12'+midChar+'38';
						break;
						case 'testnet':
							portO = '13'+midChar+'37';
							portP = '13'+midChar+'38';
						break;
						case 'simnet':
							portO = '15'+midChar+'37';
							portP = '15'+midChar+'38';
						break;
						case 'regtest':
							portO = '14'+midChar+'37';
							portP = '14'+midChar+'38';
						break;
					}

					_this.peersPort = portP;
					_this.config.host = host;
					_this.config.port = port;
					_this.config.stratum_user = stratumUser;
					_this.config.stratum_pass = stratumPass;

					_this.hsdUser = _this.config.stratum_user;
					_this.hsdURL = $('#hsdAPIUrl').val() || _this.hsdURL;
					_this.config.hsdURL = _this.hsdURL;
					console.log('hsdrul???',_this.hsdURL);
					let parts = _this.hsdURL.split(':');
					console.log('parts',parts);
					let pbase = parts.slice(0,-1);
					if(pbase.length == 0){
						pbase = ['127.0.0.1'];
					}
					pbase = pbase.concat(portO).join(':')
					_this.hsdURL = pbase;

					hsdApiKey = $('#hsdAPIPass').val() || $('#stratumPass').val() || 'earthlab';
					if(_this.soloStratumOption == 'local' && _this.miningMode == 'solo'){
						hsdApiKey = 'earthlab';
					}
					hsdMinerWallet = $('#hsdMinerWallet').val().trim() || 'hs1qwfpd5ukdwdew7tn7vdgtk0luglgckp3klj44f8';
					_this.hsdWallet = hsdMinerWallet;
					if(typeof hsdApiKey != "undefined" && typeof hsdMinerWallet != "undefined"){
						_this.hsdConfig = {wallet:hsdMinerWallet,apiKey:hsdApiKey,url:_this.hsdURL};
						fs.writeFileSync(process.env.HOME+'/.HandyMiner/hsdConfig.json',JSON.stringify(_this.hsdConfig))
					}
					console.log('we want to restart docker now',_this.macUseDocker);
					if(_this.macUseDocker || process.platform.toLowerCase().indexOf('win') == 0){
						console.log('should now restart docker container')
						_this.restartDockerContainer(true)
					}
					else{
						_this.launchHSD(true);
					}
					
					$('.nukeDocker').removeClass('doRemoveThisTime');
					$('.nukeDocker').html('Nuke and Rebuild Docker Machine')
				
					console.log('vals',host,port,stratumUser,stratumPass);
				break;

				case 'poolUI':
					console.log('save stratum info')
					host = $('#stratumHostPool').val() || '127.0.0.1';
					port = $('#stratumPortPool').val() || '3008';
					stratumUser = $('#stratumUserPool').val() || 'earthlab';
					stratumPass = $('#stratumPassPool').val() || 'earthlab';
					_this.config.host = host;
					_this.config.port = port;
					_this.config.stratum_user = stratumUser;
					_this.config.stratum_pass = stratumPass;
					_this.hsdUser = _this.config.stratum_user;
					_this.hsdURL = $('#hsdAPIUrlPool').val() || _this.hsdURL;
					_this.config.hsdURL = _this.hsdURL;

					hsdApiKey = $('#hsdAPIPassPool').val() || $('#stratumPassPool').val() || 'earthlab';
					hsdMinerWallet = '';
					//_this.hsdWallet = hsdMinerWallet;
					let poolDifficulty = '-1';//$('#minerDifficulty').val() || '-1';
					_this.config.poolDifficulty = poolDifficulty;
					if(typeof hsdApiKey != "undefined" && typeof hsdMinerWallet != "undefined"){
						_this.hsdConfig = {wallet:hsdMinerWallet,apiKey:hsdApiKey,url:_this.hsdURL};
						fs.writeFileSync(process.env.HOME+'/.HandyMiner/hsdConfig.json',JSON.stringify(_this.hsdConfig))
					}
					_this.launchHSD();
					console.log('vals',host,port,stratumUser,stratumPass);
				break;
				default:

				break;
			}

			$(this).parents('.minerForm').addClass('hidden');
		});
		$('.queryGPUs').off('click').on('click',function(){
			_this.queryGPUs();
		})
		/*$('.settings').off('click').on('click',function(){
			$('.minerForm').removeClass('hidden');
		});*/
		$('.settings').off('mouseenter').on('mouseenter',function(){
			$('#settingsOptions').show();
			$(this).addClass('hovered');
		});
		if(process.platform.toLowerCase().indexOf('darwin') >= 0){
			$('.logs').addClass('mac');
		}
		$('.startStop, .logs').off('mouseenter').on('mouseenter',function(){
			$('#settingsOptions').hide();
			$('.settings').removeClass('hovered');
		});
		$('#settingsOptions').off('mouseleave').on('mouseleave',function(){
			$('#settingsOptions').hide();
			$('.settings').removeClass('hovered');
		});
		$('#settingsOptions li').off('click').on('click',function(){
			var id = $(this).attr('id');
			_this.hideLoading();
			switch(id){
				case 'miningMode':
				default:
					$('.minerForm').removeClass('hidden');
				break;
				case 'gpuSettings':
					$('.minerForm#gpus').removeClass('hidden');
				break;
			}
		})
		$('.logs').off('click').on('click',function(){
			_this.logsVisible = true;
			_this.hideLoading();
			$('.logs').removeClass('alerted');
			$('#logs pre#logOutput').html(_this.hsdLogs);
			$('#logs pre#logOutput')[0].scrollTop = $('#logs pre#logOutput')[0].scrollHeight;
			$('#logs').removeClass('hidden').removeClass('required');
		})
		$('.startStop').off('click').on('click',function(){
			if($(this).hasClass('paused')){
				//should play
				$(this).html('&#9612;&#9612;');
				$(this).addClass('playing');
				$(this).removeClass('paused');
				_this.startMiner();
			}
			else{
				$(this).html('&#9654;')
				$(this).addClass('paused');
				$(this).removeClass('playing');
				_this.stopMiner();
			}
		})
		this.startTimer();
		nw.Window.get().on('close',function(){
			if(typeof _this.hsdProcess != "undefined"){
				_this.hsdProcess.kill();
			}
			if(typeof _this.minerProcess != "undefined"){
				_this.minerProcess.kill();
			}
			if(process.platform.toLowerCase().indexOf('win') == 0 || _this.macUseDocker){

				_this.stopDockerMachine();
			}
			this.close(true);
		});

		$('#cyoa .option').off('click').on('click',function(){
			let v = $(this).attr('id');
			_this.miningMode = v;
			_this.config.mode = v;
			$('#cyoa').addClass('hidden');
			switch(v){
				case 'solo':
					//$('#poolUI').addClass('hidden')
					testHSD('solo');
				break;
				case 'pool':
					testHSD('pool');
					$('#cyoa2').addClass('hidden');
					$('#stratum').addClass('hidden');
				break;
				default:

				break;
			}
		});
		function testHSD(mode){
			let apiKey = 'earthlab';
			apiKey = _this.hsdConfig ? _this.hsdConfig.apiKey : apiKey;
			$.post('http://x:'+apiKey+'@'+_this.hsdURL,JSON.stringify({params:[],method:'getmininginfo'}),function(d){
				console.log('got mining info?',d);
				if(d == '[]' || d == [] || d == ''){
					//empty, means were still not in yet
					$('#hsdAPI .notes').show();
				}
				else{
					//TODO show their IP to them? not needed yet..
				}
				
				//success, we can just leave things hidden
			}).fail(function(){
				let selector;
				/*switch(mode){
					case 'pool':
						selector = '#poolUI';
					break;
					case 'solo':
						selector = '#stratum';
					break;
					default:
						selector = '#stratum';
					break;
				}*/
				$('#hsdAPI .notes').hide();
				//try using solo server then..

			})
		}
		$('#cyoa2 .option').off('click').on('click',function(){
			let v = $(this).attr('id');
			$('#cyoa2').addClass('hidden');
			$('#poolUI').addClass('hidden');
			$('#stratum').removeClass('hidden');
			switch(v){
				case 'local':
					//hide all the form elems
					_this.soloStratumOption = 'local';
					$('#stratum #hsdAPI').hide();
					$('#stratum #userPass').hide();
					$('#stratum #serverPort').hide();

				break;
				case 'remote':
					_this.soloStratumOption = 'remote';
					//show all the form elems
					//$('#stratum #hsdAPI').show();
					$('#stratum #userPass').show();
					$('#stratum #serverPort').show();
				break;
			}
		});
		$('#logs .close').off('click').on('click',function(){
			$('#logs').addClass('hidden');
			_this.logsVisible = false;
		})
		console.log('init evts??');
		$(window).on('keyup',function(e){
			console.log('e',e.key,e.key == 'Escape');
			if(e.key == 'Escape'){
				$('.minerForm:not(#main)').addClass('hidden');
				$('#logs').addClass('hidden');
			}
		})
	}
	launchHSD(isFirstTimeLaunch){
		const _this = this;
		let walletTarget = this.prodWallet;
		if(typeof this.hsdConfig.wallet != "undefined"){
			if(this.hsdConfig.wallet != this.hsdWalletPlaceHolder){
				walletTarget = this.hsdConfig.wallet;
			}
		}
		this.hsdParams = [
			'--network='+(this.config.network || 'main'),
			'--cors=true', 
			'--api-key='+this.hsdConfig.apiKey,
			'--http-host=0.0.0.0',
			'--coinbase-address='+walletTarget,
			'--index-address=true',
			'--index-tx=true',
			'--listen',
			'--plugins',
			'hstratum',
			'--stratum-host',
			'0.0.0.0',
			'--stratum-port',
			this.config.port,
			'--stratum-public-host',
			'0.0.0.0',
			'--stratum-public-port',
			this.config.port,
			'--stratum-max-inbound',
			'1000',
			'--stratum-difficulty',
			'8',
			'--stratum-dynamic',
			'--stratum-password='+this.config.stratum_pass
		];
		if(typeof this.hsdProcess != "undefined"){
			this.killHSD();
			this.hideLoading();
		};
		let apiKey = this.hsdConfig.apiKey;
		let wallet = this.hsdConfig.wallet;
		if(wallet == ''){
			wallet = this.prodWallet;
		}
		

		if(process.platform.toLowerCase().indexOf('win') == 0 || _this.macUseDocker){

			_this.checkDockerSupport(isFirstTimeLaunch);
			//if it's windows we'll launch HSD in docker, yas
		}
		if(isFirstTimeLaunch){
			this.hideLoading();
			$('#logs').addClass('required').removeClass('hidden');
			$('#logs pre#logOutput').html('Initializing HSD Installation...\r\n');
			$('#logs pre#logOutput').append('#################################\r\n');
			setTimeout(function(){
				$('#logs').removeClass('required');
			},5000)
		}
		//}

		if(!_this.macUseDocker){
			//launch hsd locally then
			let hsdParams = this.hsdParams;
			console.log('hsd params isset',process.env);

			
			if(!envParams.env.NODE_BACKEND){
				envParams.env.NODE_BACKEND = 'native';
			}
			else{
				console.log("HEYYYYYYYYYY NODE BACKEND WAS HERE",envParams.env.NODE_BACKEND);
			}
			let executable = process.platform.toLowerCase().indexOf('darwin') == 0 ? process.execPath : nw.global.__dirname+'/externals/node.exe';
			
			let hsdProcess = spawn(executable,newParams,envParams)
			let hsdLogs = '';

			console.log('should cwd to ',nw.__dirname+'/submodules/HandyMiner-CLI/node_modules/hsd')
			this.hsdProcess = hsdProcess;
			
			this.hsdProcess.stderr.on('data',function(d){
				console.log('sdterr',d.toString('utf8'));
				//console.log('hsd stderr',d.toString('utf8'))
				if(this.isFirstTimeLaunch){
					$('#logOutput').append(d.toString('utf8'));
					$('#logs pre#logOutput')[0].scrollTop = $('#logs pre#logOutput')[0].scrollHeight;
					$('#logs').removeClass('required');
				}
				else{
					
					_this.pushToLogs(d.toString('utf8'),'error','hsd')
				}
				_this.hideLoading();
			});
			this.hasLogged = false;
			this.hsdProcess.stdout.on('data',(d)=>{
				//console.log('data??',d.toString('utf8'));
				return false;
				//deprecating for now
				if(!this.hasLogged){
					this.hsdIsRunningLocally = true;
					this.hasLogged = true;
					this.hideLoading();
					setTimeout(function(){
						_this.addPeers();
					},1000);
				}
				//console.log('hsd stdout',d.toString('utf8'));
				hsdLogs += d.toString('utf8')+'\r\n';
				if(hsdLogs.length >= 1000000){
					hsdLogs = hsdLogs.slice(-10000);
				}
				if(isFirstTimeLaunch){
					$('#logOutput').html(hsdLogs);
					$('#logs pre#logOutput')[0].scrollTop = $('#logs pre#logOutput')[0].scrollHeight;

				}
				else{
					console.log("HEYYYYYYYYYY NODE BACKEND WAS HERE",envParams.env.NODE_BACKEND);
				}

			});
			this.hsdProcess.on('close',function(d){
				//console.log('ps closed!?',d.toString('utf8'))
				this.hsdIsRunningLocally = false;
				/*$('.syncedIcon').addClass('alert');
				$('.syncedButton .statusLabel').html('Local HSD Closed');*/
			})

			console.log('run test start');


		/*let t = spawn('which',['node'],{env:process.env})
		t.stdout.on('data',function(d){
			console.log('test stdout',d.toString('utf8'))
		});
		t.stderr.on('data',function(d){
			console.log('test stderr',d.toString('utf8'))
		});
		t.on('close',function(d){
			console.log('test is closed');
		})*/
		//if(process.platform.toLowerCase().indexOf('darwin') >= 0){
			
		}
		//}
		//_this.initLogo();
		//setTimeout(function(){
			_this.getHSDNetworkInfo();
			//_this.startTimer();
		//},3000)
	}
	killHSD(){
		this.hsdProcess.kill();
	}
	addPeers(){
		return false; //deprecating
		//manually add some peers
		let peersPort = this.peersPort || '13038';
		let hsdPort = '13037';
		if(['testnet','simnet'].indexOf(this.config.network) == -1){
			return;
		}
		

		switch(this.config.network){
			case 'main':
				hsdPort = '12037';
				peersPort = '12038';
			break;
			case 'testnet':
				hsdPort = '13037';
				peersPort = '13038';
			break;
			case 'simnet':
				hsdPort = '15037';
				peersPort = '15038';
				
			break;
		}
		let nodeaddr = 'aorsxa4ylaacshipyjkfbvzfkh3jhh4yowtoqdt64nzemqtiw2whk@3.14.224.108:'+peersPort;
		$.ajax('http://x:'+this.hsdConfig.apiKey+'@127.0.0.1:'+(hsdPort.replace('0','9'))+'/',{
			type:'POST',
			contentType:'application/json',
			data:JSON.stringify({method:'addnode',params:[nodeaddr,'add']})
		})
		//$.post('http://x:'+this.hsdConfig.apiKey+'@127.0.0.1:13037/',{method:'addnode',params:[nodeaddr,'add']});
	}
	getGlobalIP(callback){
		var options = {
		  host: 'ipv4bot.whatismyipaddress.com',
		  port: 80,
		  path: '/'
		};
		let extIP = '';
		let intIP = '127.0.0.1';

		var ifaces = os.networkInterfaces();
		let desired = ['Ethernet','Wi-Fi','en0'];
		Object.keys(ifaces).forEach(function (ifname) {
		  var alias = 0;

		  ifaces[ifname].forEach(function (iface) {
		    if ('IPv4' !== iface.family || iface.internal !== false) {
		      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
		      return;
		    }

		    if (alias >= 1) {
		      // this single interface has multiple ipv4 addresses
		      console.log(ifname + ':' + alias, iface.address);
		      
		    } else {
		      // this interface has only one ipv4 adress
		      
		      console.log(ifname, iface.address);
		    }
		    if(desired.indexOf(ifname) >= 0){
	      		intIP = iface.address;
	      	}
		    ++alias;
		  });
		});
		http.get(options, function(res) {
		  console.log("status: " + res.statusCode);

		  res.on("data", function(chunk) {
		  	extIP = chunk.toString('utf8');
		  	callback(null,{external:extIP,internal:intIP});
		    console.log("BODY: " + chunk);
		  });
		}).on('error', function(e) {
			callback(e,e.message);
		  console.log("error: " + e.message);
		});
	}
	queryGPUs(){
		//testdata
		this.showLoading();
		$('.modalContent').html('<ul />');
		console.log('query gpus?',nw.__dirname+'/submodules/HandyMiner-CLI');
		process.env.HANDYRAW = 'true';
		let executable = process.platform.toLowerCase().indexOf('darwin') == 0 ? process.execPath : nw.global.__dirname+'/externals/node.exe';
		
		let queryProcess = spawn(executable,
			['./mine.js','-1',$('#gpuPlatform option:selected').val() || '0','amd'	],
			{
				cwd:nw.__dirname+'/submodules/HandyMiner-CLI/',
				env:process.env
			});
		console.log('qp isset???',queryProcess);
		queryProcess.stderr.on('data',function(d){
			console.log('data err',d);
			//$('.gpuPlatformNote').html('No GPUs found, try another platform').addClass('err');
		})
		let hasFoundGPUs = false;
		queryProcess.stdout.on('data',(d)=>{
			console.log('data returned',d.toString('utf8'));
			let dN = d.toString('utf8').split('\n');
			
			dN.map((line)=>{
				try{
					let json = JSON.parse(line.toString('utf8'));
					console.log('data back',json);
					if(json.type == 'registration'){
						console.log('will show devices now');
						hasFoundGPUs = true;
						showDevices(json.data);
						$('.gpuPlatformNote').html(' ').removeClass('err');
						this.pushToLogs(JSON.stringify(json),'stdout','miner');
						setTimeout(()=>{
							queryProcess.kill();
						},5000)
					}
					if(json.type == 'error'){
						if(json.message != 'not up to date'){
							if(!hasFoundGPUs){
								$('.gpuPlatformNote').html('No GPUs found, try another platform').addClass('err');
							}
							this.hideLoading();
						}
						this.pushToLogs(JSON.stringify(json),'error','miner');
					}
				}
				catch(e){

				}
			})
			
		})
		queryProcess.stderr.on('data',(d)=>{
			console.log('error????',d.toString('utf8'))
			//$('.gpuPlatformNote').html('No GPUs found, try another platform').addClass('err');
			this.hideLoading();
			this.pushToLogs(d.toString('utf8'),'error','miner');
			$ul.html('There was an error.. Check the logs (top right icon) for more details.')
		})
		queryProcess.on('close',()=>{
			//done
			console.log('spawn finished, yay');
			setTimeout(()=>{
				this.hideLoading();
			},3000)
			
		});
		function showDevices(data){
			let $tmpl = $('#gpuTemplate').clone();
			$tmpl.removeAttr('id');
			let $ul = $('.modalContent ul');//$('<ul></ul>');
			data.map(function(d){
				/*
				<div class="checkbox-container">
		        <label class="checkbox-label">
		            <input type="checkbox" id="muteFanfare" value="1" />
		            <span class="checkbox-custom rectangular"></span>
		        </label>
		        <label id="fflabel" for="muteFanfare">Mute Fanfare Winning Song</label>
		    </div>
				*/
				let cbWrap = $('<div class="checkbox-container"></div>')
				let $label = $('<label class="checkbox-label"></label>')
				$label.append('<input type="checkbox" id="gpu'+d.id+'" value="'+d.id+'" class="checks" />')
				$label.append('<span class="checkbox-custom rectangular"></span>');
				cbWrap.append($label);
				let gpuStringName = d.name;
				if(d.name.toLowerCase().indexOf('gfx900') >= 0){
					gpuStringName = 'AMD Vega Series';					
				}
				if(d.name.toLowerCase().indexOf('ellesmere') >= 0){
					gpuStringName = 'AMD RX**0 Series';
				}
				let $tLabel = $('<label class="tLabel" for="gpu'+d.id+'">GPU'+d.id+': '+gpuStringName+'</label>');
				cbWrap.append($tLabel);
				console.log('gpu name?',d.name,d.name.toLowerCase().indexOf('intel'))
				
				//$ul.append('<li><input type="checkbox" value="'+d.id+'" class="checks" /> GPU'+d.id+': '+d.name+'</li>')
				let $li = $('<li />')
				$li.append(cbWrap);
				$ul.append($li);
				if(d.name.toLowerCase().indexOf('intel') >= 0 && d.name.toLowerCase().indexOf('hd graphics') >= 0){
					$tLabel.addClass('isIntel')
					$li.append('<small class="isIntel">Note: Using this GPU Will Impact Computer Performance</small>')
				}
			});
			//$('.modalContent').html($ul);

			$('#modal .save').off('click').on('click',function(){
				let outStr = [];
				$('input:checked',$ul).each(function(){
					var v = $(this).val();
					let t = $tmpl.clone();
					t.attr('data-id',v);
					t.addClass('gpuIcon');
					$('li',t).eq(0).html('GPU'+v);
					$('li',t).eq(1).html('0MH');
					$('.gpuStatus').append(t)
					outStr.push(v);
				});
				$('#gpuList').val(outStr.join(','));

				$('#modal').hide();
			})
			$('#modal .close').off('click').on('click',function(){
				$('#modal').hide();
			})
			$('#modal').show();
		}
		/*let data = [ 
			{ event: 'registerDevice',
		    id: '0',
		    name: 'Intel(R) HD Graphics 630',
		    platform: '0' },
		  { event: 'registerDevice',
		    id: '1',
		    name: 'AMD Radeon Pro 560 Compute Engine',
		    platform: '0' 
		  } 
		];*/
		
	}
	getHSDNetworkInfo(isAttempt2){
		const _this = this;
		let info = {};
		let qL = 4;
		let qC = 0;
		let hasFired = false;
		$.post('http://x:'+this.hsdConfig.apiKey+'@'+this.hsdURL,JSON.stringify({params:[],method:'getmininginfo'}),function(d){
			console.log('got mining info?',d);
			info['mining'] = d.result;
			_this.pushToLogs('MINING INFO::  '+JSON.stringify(d.result)+'\r\n','stdout','hsd')
			qC++;
			if(qC == qL && !hasFired){
				hasFired = true;
				done();
			}
		}).fail(function(){
			console.log('something failed????')
			

			//try stratum host if solo mode then
			_this.hideLoading();
			console.log('and modes info',_this.miningMode,_this.config.host+':'+_this.config.port,_this.hsdURL);
			if(_this.miningMode == 'solo' && _this.config.host+':'+_this.config.port != _this.hsdURL && _this.config.host != ""){
				_this.hsdConfig.url = _this.config.host+':'+_this.hsdURL.split(':')[1];
				_this.hsdConfig.apiKey = _this.config.stratum_pass;
				_this.hsdURL = _this.hsdConfig.url;
				console.log('set garbage params',_this.hsdURL);
				$('.statusPrefix').html('Remote Node ');
				if(!isAttempt2){
					_this.getHSDNetworkInfo(true);
				}
				else{
					$('.syncedButton .statusLabel').html('Failed to initialize remote HSD');
					if(_this.macUseDocker && process.platform.indexOf('darwin') >= 0){
						$('.statusPrefix').html('Local Node ')
						$('.syncedButton .statusLabel').html('Trying to Start Local Docker...');
					}
				}
				return;
			}
		})
		let respCount = 0;
		let respTarget = 2;
		$.post('http://x:'+this.hsdConfig.apiKey+'@'+this.hsdURL,JSON.stringify({params:[],method:'getblockchaininfo'}),function(d){
			console.log('got chain info?',d);
			info['chain'] = d.result;
			_this.pushToLogs('CHAIN INFO:: '+JSON.stringify(d.result)+'\r\n','stdout','hsd')
			qC++;
			if(qC == qL && !hasFired){
				hasFired = true;
				respCount++;
				done();
			}
		});
		$.post('http://x:'+this.hsdConfig.apiKey+'@'+this.hsdURL,JSON.stringify({params:[],method:'getnetworkinfo'}),function(d){
			console.log('got mining info?',d);
			info['network'] = d.result;
			_this.pushToLogs('NETWORK INFO:: '+JSON.stringify(d.result)+'\r\n','stdout','hsd')
			qC++;
			if(qC == qL && !hasFired){
				hasFired = true;
				respCount++;
				done();
			}
		});
		
		$.post('http://x:'+this.hsdConfig.apiKey+'@'+this.hsdURL,JSON.stringify({params:[],method:'getpeerinfo'}),function(d){
			console.log('peers are set',d);
			let greatestHeight = 0;
			info['peers'] = d.result;
			d.result.map(peer=>{
				if(peer.startingheight > greatestHeight){
					greatestHeight = peer.startingheight;
				}
			});
			_this.peersGreatestHeight = greatestHeight;
			_this.pushToLogs('PEERS INFO:: '+JSON.stringify(d.result)+'\r\n','stdout','hsd');
			qC++;
			if(qC == qL && !hasFired){
				hasFired = true;
				respCount++;
				done();
			}

		});

		function done(){
			
			console.log('got network info',info);
			_this.hsdInfo = info;

			if(info.mining.blocks == 0 /*&& info.mining.chain == 'test'*/){
				console.log('garbage time');
				//assume this is bogus unsynced garbage and try to sync w solo pool host
				if(isAttempt2){
					$('.syncedIcon').addClass('alert');
					$('.syncedButton .statusLabel').html('Dockerized HSD Started, but Block Height is 0');
					_this.hideLoading();
				}
				if(_this.miningMode == 'solo' && _this.config.host+':'+_this.config.port != _this.hsdURL && _this.config.host != ""){
					_this.hsdConfig.url = _this.config.host+':'+(_this.hsdURL.split(':')[_this.hsdURL.split(':').length-1]);
					_this.hsdConfig.apiKey = _this.config.stratum_pass;
					_this.hsdURL = _this.hsdConfig.url;
					console.log('set garbage params',_this.hsdURL);
					if(!isAttempt2){
						_this.getHSDNetworkInfo(true);
					}
					if(info.peers.length == 0 && (info.chain.chain == 'simnet' || info.chain.chain == 'regtest') && info.chain.blocks == 0){
						//dont return, it's simnet
					}
					else{
						return;
					}
					
				}
			}
			let heightNow = info.mining.blocks;
			if(typeof _this.lastKnownHeight	== "undefined"){
				_this.lastKnownHeight = _this.peersGreatestHeight || 0;
			}
			$('.title a').attr('href','http://hnscan.com/block/'+heightNow).html(heightNow)
			let bI = 0;
			let bC = 100;
			let blocks = {}
			//setTimeout(()=>{
			//if(_this.canFetchNetworkTimeline){
				//},1000)
				if(Math.abs(_this.lastKnownHeight - heightNow) < 5 && Math.abs(heightNow - _this.peersGreatestHeight) < 10){

					console.log("FETCHING SOME TOOOONS OF TX")
					let hnStart = heightNow-100 < 0 ? 0 : heightNow-100;
					if(hnStart == 0){
						bC = _this.lastKnownHeight;
						console.log('last known height is small',bC);
					}
					
					for(let i=hnStart;i<=heightNow;i++){
						$.post('http://x:'+_this.hsdConfig.apiKey+'@'+_this.hsdURL,JSON.stringify({params:[i,true,false],method:'getblockbyheight'}),function(d){
							//console.log('got block info?',d);
							blocks[i] = d.result;
							setTimeout(function(){
								_this.hideLoading();
							},1000)
							let tx = d.result.tx[0];
							$.get('http://x:'+_this.hsdConfig.apiKey+'@'+_this.hsdURL+'/tx/'+tx,function(d){
								blocks[i]._txDetail = d;
								if(d.outputs[0].address == _this.hsdWallet){
									blocks[i].isMyBlock = true;
								}
								bI++;
								if(bI == bC){
									blocksDone(blocks,heightNow);
								}
							});

							
						});
						if(i == 0 && bC == 0){
							blocksDone(blocks,heightNow);
						}
					}
				}
				else{
					console.log('last known height is fuckin huge',_this.lastKnownHeight,heightNow,Math.abs(_this.lastKnownHeight - heightNow))
				}
			//}
			_this.lastKnownHeight = heightNow;
		}
		function blocksDone(blocks,heightNow){
			
			console.log('loaded 100 blocks',blocks);
			_this.hideLoading();
			_this.last100Blocks = blocks;
			let timeMin = new Date().getTime() - (24 * 60 * 60 * 1000);
			let blocksTotal = 0;
			Object.keys(_this.last100Blocks).map((blockKey)=>{
				let blockD = _this.last100Blocks[blockKey];
				if(blockD.time*1000 >= timeMin && blockD.isMyBlock){
					console.log('blocks are mine!');
					blocksTotal++;
				}
			})
			_this.blocksSolvedLast24 = blocksTotal;
			let alltime = 0;
			try{
				alltime = fs.readFileSync(process.env.HOME+'/.HandyMiner/allTimeBlocks.txt','utf8');
				alltime = parseFloat(alltime);
			}
			catch(e){
				alltime = 0;
			}
			if(isNaN(alltime)){
				alltime = 0;
			}
			if(parseFloat(_this.blocksSolvedLast24) > parseFloat(alltime)){
				alltime = _this.blocksSolvedLast24;
			}
			console.log('alltime and not',alltime,_this.blocksSolvedLast24)
			_this.allTimeBlocks = alltime;
			$('.blocksToday .number').html(numeral(_this.blocksSolvedLast24).format('0a'))
			$('.blocksAllTime .number').html(numeral(_this.allTimeBlocks).format('0a'));
			_this.canFetchNetworkTimeline = true;
			//_this.getHSDNetworkInfo();
			setTimeout(function(){
				$('.syncedIcon').removeClass('alert').addClass('success');
				$('.syncedButton .statusLabel').html('synced at block: '+heightNow);
				$('.syncedButton').fadeOut(5000);
			},500)
			_this.renderLastBlocks(blocks);
			_this.renderHashrate();
			

		}
	}
	renderHashrate(){
		let globalFn = process.env.HOME+'/.HandyMiner/globalHashrate.csv';
		let localFn = process.env.HOME+'/.HandyMiner/localHashrate.json';

		let lines;
		let localLines;
		try{
			localLines = fs.readFileSync(localFn,'utf8');
		}
		catch(e){
			console.log('caught error in locallines');
			localLines = '';
		}
		try{
			lines = fs.readFileSync(globalFn,'utf8');
		}
		catch(e){
			lines = '';
		}
		
		localLines = localLines.split('\n');
		lines = lines.split('\n');
		if(lines.length > 300){
			lines = lines.slice(-300);
			fs.writeFileSync(globalFn,lines.join('\n'),'utf8');
		}
		if(localLines.length > 300){
			localLines = localLines.slice(-300);
			fs.writeFileSync(localFn,localLines.join('\n'),'utf8');
		};

		
		lines = lines.filter(function(d){return d.length > 0;}).map(function(line){
			return line.split(',').map(function(d){return parseFloat(d);});
		});
		let llIndex = {};
		localLines = localLines.filter(function(d){
			return d.length > 0;
		}).map(function(d){
			var json = JSON.parse(d);
			let sumRates = 0;
			Object.keys(json.rates).map(function(k){
				sumRates += json.rates[k];
			});
			llIndex[Math.floor(json.time/1000)*1000] = sumRates;
			return [sumRates,Math.floor(json.time/1000)*1000];
		});
		/*let localExtent = d3.extent(localLines,(dd)=>{
			return dd[1];
		});
		let zeroedLines = [];
		for(let i=localExtent[0];i<=localExtent[1];i+=1000){
			if(typeof llIndex[i] == "undefined"){
				zeroedLines.push([0,i]);
			}
			else{
				zeroedLines.push([llIndex[i],i]);
			}
		}
		localLines = zeroedLines;*/
		var svg = d3.select('#right.halfChart svg');
		let bData = Object.keys(lines);
		svg.selectAll('g').remove();
		let w = $('#right.halfChart').width();
		let h = $('#right.halfChart').height();

		let padding = {l:36,t:5,r:40,b:20};
		let xExtent = d3.extent(lines,function(d){
			return d[1];
		});

		let xExtent1 = d3.extent(localLines,function(d){
			return d[1];
		})

		
		let hrExtent0 = d3.extent(lines,function(d){
			return d[0];
		});
		hrExtent0[1] *= 1.25 // give some room up top
		let hrExtent1 = d3.extent(localLines,function(d){
			return d[0];
		});
		hrExtent1[1] *= 1.25; // give room up top
		let rec0 = [0,xExtent[0]-1];
		let rec1 = [0,xExtent[1]+1];
		
		lines = [rec0].concat(lines);
		lines = lines.concat([rec1]);
		let path = svg.selectAll('path.line').data([lines]);
		
		/*let recL0 = [hrExtent1[0]-1,xExtent[0]-1]
		let recL1 = [hrExtent1[0]-1,xExtent[1]+1]
		localLines = [recL0].concat(localLines);
		localLines = lines.concat([recL1]);;*/
		let path1 = svg.selectAll('path.localHR').data([localLines]);
		
		let xScale = d3.scaleLinear()
			.range([padding.l,w-padding.r])
			.domain(xExtent)
			.clamp(true);
		let yScale = d3.scaleLinear()
			.range([h-padding.b,padding.t])
			.domain([0,hrExtent0[1]]);

		let yScaleLocal = d3.scaleLinear()
			.range([h-padding.b,padding.t])
			.domain(hrExtent1);

		let axisL = d3.axisLeft(yScale).ticks(5).tickFormat(function(d){
			return numeral(d).format('0b').replace('B','H');
		})
		let axisB = d3.axisBottom(xScale).ticks(5).tickFormat(function(d){
			
			return moment(d,'x').format('HH:mm');
		})
		let axisR = d3.axisRight(yScaleLocal).ticks(5).tickFormat(function(d){
			return numeral(d).format('0b').replace('B','H');
		});

		let line = d3.line()
			.x(function(d){
				return xScale(d[1]);
			})
			.y(function(d){
				return yScale(d[0]);
			});

		let lineLocal = d3.line()
			.x(function(d){
				return xScale(d[1]);
			})
			.y(function(d){
				return yScaleLocal(d[0]);
			})
			.curve(d3.curveStepBefore);

		svg.append('g')
			.attr('transform','translate(35,0)')
			.call(axisL);
		svg.append('g')
			.attr('transform','translate(0,'+(h-20)+')')
			.call(axisB);
		svg.append('g')
			.classed('localHRAxis',true)
			.attr('transform','translate('+(w-40)+',0)')
			.call(axisR);

		path.transition()
			.attr('d',line);
		path.enter()
			.append('path')
			.classed('line',true)
			.transition()
				.attr('d',line);
		path.exit().remove();

		svg.selectAll('path.localHR').transition()
			.attr('d',lineLocal);

		path1.enter()
			.append('path')
			.classed('localHR',true)
			.transition()
				.attr('d',lineLocal);

		path1.exit().remove();



	}
	renderLastBlocks(blocks){
		let tempBlocks = {};
		let filtered = Object.keys(blocks).filter(k=>{
			return blocks[k] != null;
		}).map(k=>{
			tempBlocks[k] = blocks[k];
		});
		blocks = tempBlocks;
		

		//render chart of the last 100 blocks
		var svg = d3.select('#left.halfChart svg');
		svg.selectAll('g').remove();
		let bData = Object.keys(blocks);
		bData = bData.map(function(k){
			return blocks[k];
		});
		let w = $('#left.halfChart').width();
		let h = $('#left.halfChart').height();
		let padding = {l:36,t:5,r:5,b:20};
		let newblocks = {};
		Object.keys(blocks).map(k=>{
			if(typeof blocks[k] != "undefined"){
				newblocks[k] = blocks[k];
			}
		});
		blocks = newblocks;
		let xExtent = d3.extent(Object.keys(blocks),function(d){
			return blocks[d].height;
		});
		
		let diffExtent = d3.extent(Object.keys(blocks),function(d){
			return blocks[d].difficulty;
		});
		bData = [{height:xExtent[0],difficulty:diffExtent[0]}].concat(bData);
		bData = bData.concat([{height:xExtent[1],difficulty:diffExtent[0]}]);
		let path = svg.selectAll('path').data([bData]);
		
		
		let xScale = d3.scaleLinear()
			.range([padding.l,w-padding.r])
			.domain(xExtent);
		let yScale = d3.scaleLinear()
			.range([h-padding.b,padding.t])
			.domain(diffExtent);
		let axisL = d3.axisLeft(yScale).ticks(5).tickFormat(d=>numeral(d).format('0.0a'));
		let axisB = d3.axisBottom(xScale).ticks(5);

		let line = d3.line()
			.x(function(d){
				return xScale(d.height);
			})
			.y(function(d){
				return yScale(d.difficulty);
			});
		svg.append('g')
			.attr('transform','translate(35,0)')
			.call(axisL);
		svg.append('g')
			.attr('transform','translate(0,'+(h-20)+')')
			.call(axisB);

		path.transition()
			.attr('d',line);
		path.enter()
			.append('path')
			.classed('line',true)
			.transition()
				.attr('d',line);
		path.exit().remove();
	}
	startTimer(){
		const _this = this;
		if(typeof this.timer != "undefined"){
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(function(){

			if(_this.canFetchNetworkTimeline){
				$.post('http://x:'+_this.hsdConfig.apiKey+'@'+_this.hsdURL,JSON.stringify({params:[],method:'getmininginfo'}),function(d){
					//console.log('got mining info?',d);
					let hr = d.result.networkhashps;
					let time = new Date().getTime();
					let line = [hr,time].join(',')+'\n'
					fs.appendFile(process.env.HOME+'/.HandyMiner/globalHashrate.csv',line,function(err,d){});
					
					_this.syncBlocks(d.result.blocks);
					let heightNow = d.result.blocks;
					
					$('.title a').attr('href','http://hnscan.com/block/'+heightNow).html(heightNow);

					_this.renderHashrate();
					$('#logs.required').hide(); //means we can hide install logs
					
				});
				if(Object.keys(_this.hashRates).length > 0){
					let hrLine = JSON.stringify({rates:_this.hashRates,time:new Date().getTime()})+'\n';
					fs.appendFile(process.env.HOME+'/.HandyMiner/localHashrate.json',hrLine,function(err,d){})
				}
			}
			else{
				$.post('http://x:'+_this.hsdConfig.apiKey+'@'+_this.hsdURL,JSON.stringify({params:[],method:'getmininginfo'}),function(d){
					//console.log('got mining info?',d);
					console.log('mining infos?',d);
					let heightNow = d.result.blocks;
					if(typeof _this.syncHeight == "undefined"){
						_this.syncHeight = 0;
					}
					if(_this.syncHeight == heightNow && heightNow != 0 && (Math.abs(heightNow - _this.peersGreatestHeight) < 10) || (_this.peersGreatestHeight == 0 && _this.hsdInfo.peers.length == 0)){
						console.log('might be done syncing me thinks..');

						_this.lastKnownHeight = heightNow;
						_this.getHSDNetworkInfo();
						
					}
					else{
						console.log('syncheight ',_this.syncHeight,heightNow);
					}
					_this.syncHeight = heightNow;
					
				});

			}
			_this.startTimer();

		},20000);

		
	}
	showLoading(){
		$('#loading').show();
	}
	hideLoading(){
		$('#loading').hide();
	}
	syncBlocks(startAtBlock){
		const _this = this;
		let blocks = this.last100Blocks;
		console.log('syncBlock startat',startAtBlock);
		$.post('http://x:'+this.hsdConfig.apiKey+'@'+this.hsdURL,JSON.stringify({params:[startAtBlock,true,false],method:'getblockbyheight'}),function(d){
			//console.log('got block info?',d);
			_this.last100Blocks[startAtBlock] = d.result;
			
			let tx = d.result.tx[0];
			$.get('http://x:'+_this.hsdConfig.apiKey+'@'+_this.hsdURL+'/tx/'+tx,function(d){
				_this.last100Blocks[startAtBlock]._txDetail = d;
				if(d.outputs[0].address == _this.hsdWallet){
					_this.last100Blocks[startAtBlock].isMyBlock = true;
				}
				console.log('startat block is defined?',parseInt(startAtBlock)-1,blocks[parseInt(startAtBlock)-1]);
				if(typeof blocks[parseInt(startAtBlock)-1] == "undefined"){
					_this.syncBlocks(parseInt(startAtBlock)-1);
				}
				else{
					//done!
					_this.renderLastBlocks(_this.last100Blocks);
				}
			});
			
		});
	}
	startMiner(){
		this.isMining = true;
		process.env.HANDYRAW = 'true';
		if(typeof this.minerProcess != "undefined"){
			this.minerProcess.kill();
			this.hashRates = {};
		}
		const handyMinerParams = [
			'./mine.js',
			this.config.gpus,
			this.config.gpu_platform,
			this.config.gpu_mfg,
			'authorize',
			this.hsdConfig.wallet,
			this.config.stratum_user,
			this.config.stratum_pass,
			this.config.host,
			this.config.port,
			this.config.intensity || "10",
			this.config.mode || "pool",
			this.config.poolDifficulty || -1,
			(this.config.muteFanfareSong ? "1" : "0")
		];
		let executable = process.platform.toLowerCase().indexOf('darwin') == 0 ? process.execPath : nw.global.__dirname+'/externals/node.exe';
		let minerProcess = spawn(executable,
			handyMinerParams,
			{
				cwd:nw.__dirname+'/submodules/HandyMiner-CLI/',
				env:process.env
			});
		this.minerProcess = minerProcess;
		//console.log('miner process isset???',minerProcess);
		
		minerProcess.stderr.on('data',(d)=>{
			this.pushToLogs(d.toString('utf8'),'error','miner');
			console.log('data err',d.toString('utf8'));
		})

		minerProcess.stdout.on('data',(d)=>{
			let t = 'stdout';

			if(d.toString('utf8').indexOf('"type":"error"') >= 0){
				t = 'error';
			}
			this.pushToLogs(d.toString('utf8'),t,'miner');
			this.parseMinerOut(d.toString('utf8'));
			
		});
		minerProcess.on('close',function(){
			//done
			_this.isMining = false;
			console.log('miner process closed?');
		});
	}
	stopMiner(){
		if(typeof this.minerProcess != "undefined"){
			this.minerProcess.kill();
			this.isMining = false;
			this.hashRates = {};
			$('.gpuIcon').each(function(){
				$('li',this).eq(1).html('0MH')
			})
		}
	}
	parseMinerOut(text){
		const _this = this;
		let lines = text.split('\n');
		//console.log('parse miner output',lines);
		lines.map(function(line){
			let lineD;
			try{
				lineD = JSON.parse(line.trim());
			}
			catch(e){

			}
			if(lineD){
				//console.log('lineD isset',lineD);
				switch(lineD.type){
					case 'job':
					//got a new job
					//should query/update charts?
					break;
					case 'solution':
						//epic, get ready for confirmation
						_this.awaitingConfirmation = true;
					break;
					case 'status':
						//gpu status
						let gpuID = lineD.data[0].gpuID;
						let hashRate = lineD.data[0].hashRate;
						//
						
						if(hashRate > 0 && hashRate < 1000000000){
							_this.hashRates[gpuID] = hashRate;
							//console.log('hashrate: ',hashRate);
							$('.gpuIcon[data-id="'+gpuID+'"] li').eq(1).html(numeral(hashRate).format('0.000b').replace('B','H'))
						}
					break;

					case 'stratumLog':
						//just logs
					break;
					case 'confirmation':
						//won a block/share
						//if(_this.awaitingConfirmation){
						if(typeof lineD.granule != "undefined"){
							//it sends out 2 messages with confirmation
							//we just want to fire this 1x
							_this.tickBlockConfirmation();
							_this.awaitingConfirmation = false;
						}
						/*}
						else{
							$.post('http://x:'+apiKey+'@'+_this.hsdURL,JSON.stringify({params:[],method:'getmininginfo'}),function(d){
								console.log('got mining info?',d);
								//do nothing
								
								//success, we can just leave things hidden
							}).fail(function(){
								_this.tickBlockConfirmation();
								_this.awaitingConfirmation = false;
							})
						}*/
					break;
				}
			}
		})
	}
	tickBlockConfirmation(){

		this.blocksSolvedLast24++;
		this.allTimeBlocks++;
		$('.blocksToday .number').html(numeral(this.blocksSolvedLast24).format('0a'))
		$('.blocksAllTime .number').html(numeral(this.allTimeBlocks).format('0a'));
		let bc = parseInt($('.title a').html())+1;
		$('.title a').attr('href','http://hnscan.com/block/'+bc).html(bc)

		fs.writeFileSync(process.env.HOME+'/.HandyMiner/allTimeBlocks.txt',this.allTimeBlocks,'utf8');

	}
	checkDockerSupport(isFirstTimeLaunch){
		//check if we have docker support
		const _this = this;
		let checker = spawn('docker',['ps','-a']);
		let resp = '';
		/*
		let hsdLogs = '';
		console.log('should cwd to ',nw.__dirname+'/submodules/HandyMiner-CLI/node_modules/hsd')
		this.hsdProcess = hsdProcess;
		this.hsdProcess.stderr.on('data',function(d){
			console.log('hsd stderr',d.toString('utf8'))
			$('#logOutput').append(d.toString('utf8'));
			$('#logs').removeClass('required');
		})
		this.hsdProcess.stdout.on('data',function(d){
			console.log('hsd stdout',d.toString('utf8'));
			hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			if(isFirstTimeLaunch){
				$('#logOutput').html(hsdLogs);
			}
		});
		*/
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
		})
		checker.on('close',d=>{
			//checker is done, lets look around
			console.log('checker is done');
			let lines = resp.split('\n');
			let earthLine = lines.filter(l=>{
				return l.indexOf('earthlabHSD') >=0;
			});
			console.log('earthLine len',earthLine.length)
			if(earthLine.length > 0){
				if(earthLine[0].indexOf('Exited') >= 0){
					//this machine was exited
					console.log('machine is down');
					_this.pushToLogs('#### DOCKER:: BOOTING HSD DOCKER CONTAINER #####','stdout','hsd')
					$('.syncedIcon').removeClass('alert');
					$('.syncedButton .statusLabel').html('Booting Docker Container')
					this.startExistingDockerMachine();
				}
				else{
					//heyo machine is running
					console.log('docker machine is already running');
					_this.pushToLogs('#### DOCKER:: STARTING HSD ON DOCKER CONTAINER #####','stdout','hsd')
					$('.syncedIcon').removeClass('alert');
					$('.syncedButton .statusLabel').html('Starting HSD in Docker')
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
	pushToLogs(line,type,context){
		//context = miner | hsd
		if(context == 'hsd'){
			if(type == 'stdout' && line.indexOf('[debug]') >= 0){
				return;
			}
			this.hsdLogs += line;
			if(line.indexOf('chain/LOCK:') >= 0 && line.indexOf('Resource temporarily unavailable') >= 0){
				///left off here
				this.hsdLogs += '\r\n #############################################################';
				this.hsdLogs += '\r\n ########## WARNING HSD IS ALREADY RUNNING LOCALLY ###########';
				this.hsdLogs += '\r\n #############################################################\r\n';
				this.hsdIsRunningLocally = true;
				$('.syncedIcon').removeClass('alert');
				$('.syncedButton .statusLabel').html('Found Running HSD Instance Locally');
			}
			else{
				if(!this.hsdIsRunningLocally && (process.platform.indexOf('darwin') >= 0 && !this.macUseDocker)){
					$('.syncedIcon').addClass('alert');
					$('.syncedButton .statusLabel').html('Failed to start HSD');
				}
			}
			if(this.hsdLogs.length >= 100000){
				this.hsdLogs = this.hsdLogs.slice(-5000);
			}
			if(this.logsVisible){
				$('#logs pre#logOutput').html(this.hsdLogs);
				$('#logs pre#logOutput')[0].scrollTop = $('#logs pre#logOutput')[0].scrollHeight;
			}
		}
		if(context == 'miner'){
			this.minerLogs += line;
			
			if(this.minerLogs.length >= 20000){
				this.minerLogs = this.minerLogs.slice(-10000);
			}
			//if(this.logsVisible){
				//console.log('logs vis?????')
				$('#logs pre#minerOutput').html(this.minerLogs);
				$('#logs pre#minerOutput')[0].scrollTop = $('#logs pre#minerOutput')[0].scrollHeight;
			//}
		}
		if(type == 'error'){
			
			$('.logs').addClass('alerted');
		}
		//console.log('line pushed',line,line.indexOf('chain/LOCK:'),line.indexOf('Resource temporarily unavailable'));

		
		//TODO: make notication button to show logs
	}
	startDockerizedHSD(){
		this.hasLogged = false;
		let envVars = process.env;
		//envVars.PATH = "C:\\Program\ Files\\mingw-w64\\x86_64-8.1.0-posix-seh-rt_v6-rev0\\bin"+';'+process.env.PATH;
		//let hsdProcess = spawn('docker',['exec','earthlab','sh','-c','"./bin/hsd '+(this.hsdParams.join(' '))+'"']/*,{env:envVars}*/);
		let wallet = this.hsdConfig.wallet || this.hsdWallet;
		console.log('docker is set to mine to wallet:: ',wallet,this.config.network);
		//if no wallet fill in with one
		if(wallet == ''){
			wallet = this.defaultWallet
		}
		let hsdProcess = spawn('docker',['exec','-i','earthlabHSD','sh','-c','"./run.sh\ '+wallet+'\ '+(this.config.network || 'main')+'"'],{shell:true})
		//let hsdLogs = '';
		hsdProcess.stdout.on('data',d=>{
			//console.log('hsd data',d.toString('utf8'));
			if(!this.hasLogged){
				this.hsdIsRunningLocally = true;
				this.hasLogged = true;
				this.hideLoading();
				setTimeout(()=>{
					this.addPeers();
				},1000);
			}
			
				
				
			this.pushToLogs(d.toString('utf8'),'stdout','hsd');


		})
		hsdProcess.stderr.on('data',d=>{
			//console.log('hsd error',d.toString('utf8'));
			//hsdLogs += d.toString('utf8');
			this.pushToLogs(d.toString('utf8'),'error','hsd');
		})
		hsdProcess.on('close',d=>{
			console.log('hsd process closed');
		});
		this.hsdProcess = hsdProcess;
		this.initLogo();
		setTimeout(()=>{
			this.getHSDNetworkInfo();
			
			//_this.startTimer();
		},3000)
	}
	stopDockerizedHSD(){
		this.restartDockerContainer(false);
		this.hsdProcess.kill();
	}
	stopDockerMachine(){
		this.restartDockerContainer(false);
		let fin = spawn('docker',['stop','earthlabHSD']);
		fin.on('close',d=>{
			return;
		});
	}
	startExistingDockerMachine(){
		let startD = spawn('docker',['start','earthlabHSD']);
		startD.stdout.on('data',d=>{
			console.log('startD data',d.toString('utf8'));
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'stdout','hsd');
		})
		startD.stderr.on('data',d=>{
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
		//first lets check if docker ls lists any eartlabs...
		let hsdLogs = '';
		let listData = '';
		let listD = spawn('docker',['image','ls']);
		listD.stdout.on('data',d=>{
			listData += d.toString('utf8');
			hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			//$('#logOutput').html(hsdLogs);
			$('.syncedButton .statusLabel').html('Building Brand New Docker Machine. This will take 2-5 minutes only once..')
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'stdout','hsd');
		});
		/*listD.stderr.on('dtaa',d=>{

		})*/
		listD.on('close',d=>{
			$('.syncedButton .statusLabel').html('Built Docker Container!')
			console.log('start listD stdout',listData,listData.indexOf('earthlab'));
			if(listData.indexOf('earthlab') == -1){
				//we dont need to build image
				this.createDockerImage();
			}
			else{
				this.createDockerContainer();
			}
		});

		
	}
	
	createDockerImage(){
		let wasError = false;
		let createD = spawn('docker',['build', '-t', 'earthlab', '.'],{cwd:nw.__dirname+'/submodules/HandyMiner-CLI/windows_utils'});
		console.log('create image was called');
		let hsdLogs = '';
		createD.stdout.on('data',d=>{
			console.log('creating docker machine',d.toString('utf8'));
			//here
			/*hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}*/
			//$('#logOutput').html(hsdLogs);
			$('.syncedIcon').removeClass('alert');
			$('.syncedButton .statusLabel').html('Creating Docker Image. This may take 2-5 minutes only once..');
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'stdout','hsd');
		})
		createD.stderr.on('data',d=>{	
			wasError = true;
			/*hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			$('#logOutput').html(hsdLogs);*/
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'error','hsd');
			$('.syncedIcon').addClass('alert');
			$('.syncedButton .statusLabel').html('ERROR CREATING DOCKER IMAGE')
			$('#logs').removeClass('required');
			console.log('err create docker machine',d.toString('utf8'));
		})
		createD.on('close',d=>{
			//we should now make our container
			console.log('createD is closed now',wasError);
			if(!wasError){
				this.createDockerContainer();
			}
		})
	}
	createDockerContainer(){
		let wasContainerError = false;
		let hsdLogs = '';
		console.log('create docker container called');
		let containerD = spawn('docker', ['run', '-p', '13937:13037', '-p', '13938:13038', '-p', '14937:14037','-p','14938:14038', '-p', '12937:12037', '-p', '12938:12038', '-p', '3008:3008', '-p', '15937:15037', '-p', '15938:15038', '-p', '5301:5301', '-p', '13038:13038', '-p', '15359:15359', '--expose', '3008', '--name', 'earthlabHSD', '-td', 'earthlab'],{cwd:nw.__dirname+'/submodules/HandyMiner-CLI/windows_utils'});
		containerD.stdout.on('data',d=>{
			/*hsdLogs += d.toString('utf8')+'\r\n';
			if(hsdLogs.length >= 15000){
				hsdLogs = hsdLogs.slice(-10000);
			}
			$('#logOutput').html(hsdLogs);*/
			$('.syncedIcon').removeClass('alert');
			$('.syncedButton .statusLabel').html('Creating Docker Container. This may take 2-5 minutes only once..')
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'stdout','hsd');
			console.log('container creation data',d.toString('utf8'));
		})
		containerD.stderr.on('data',d=>{
			wasContainerError = true;
			/*hsdLogs += d.toString('utf8');
			$('#logOutput').html(hsdLogs);
			$('#logs').removeClass('required');*/
			this.pushToLogs('## DOCKER:: '+d.toString('utf8'),'error','hsd');
			$('.syncedIcon').addClass('alert');
			$('.syncedButton .statusLabel').html('Error creating Docker container')
			console.log('container creation ERROR',d.toString('utf8'));
		});
		containerD.on('close',d=>{
			console.log('containerD was closed');
			if(!wasContainerError){
				//lets start
				this.startDockerizedHSD();
			}
		})
	}
	restartDockerContainer(doRestart){
		const _this = this;
		let containerD = spawn('docker',['exec','-i','earthlabHSD','sh','-c','"./stop.sh"'],{shell:true});
		console.log('stop docker is called then')
		containerD.on('close',d=>{
			//console.log('finished docker close cmd',d.toString('utf8'));
			
		});
		containerD.stderr.on('data',d=>{
			console.log('docker close error??',d.toString('utf8'));
			if(d.toString('utf8').indexOf('No such container') >= 0){
				//just initializing then
				console.log('starting container')
				_this.checkDockerSupport(true);
			}
		})
		containerD.stdout.on('data',d=>{
			//
			if(doRestart){
				console.log('docker close data',d.toString('utf8'))
				console.log('should do docker stopping process')
				setTimeout(function(){
					_this.startDockerizedHSD();
				},1000);
			}
		})
		
	}
	nukeDockerContainer(){
		const _this = this;
		console.log('nuke docker container was called');
		let containerD = spawn('docker',['stop','earthlabHSD','&&','docker','rm','earthlabHSD','&&','docker','image','rm','earthlab'],{shell:true});
		containerD.on('close',d=>{
			console.log('removed docker container, now make it again')
			_this.checkDockerSupport(true);
		})
		containerD.stdout.on('data',d=>{
			console.log('nuke docker continer msg',d.toString('utf8'))
		})
		containerD.stderr.on('data',d=>{
			console.log('cant nuke docker continer',d.toString('utf8'))
		})
	}
	animateLogo(){
		window.requestAnimationFrame(()=>{
			if(this.shouldRenderLogo){
				this.animateLogo();
			}

		});
		//this.controls.update();
		this.renderer.render(this.scene,this.camera);
	}
	initLogo(){
		this.shouldRenderLogo = true;
		this.scene = new THREE.Scene();
		this.scene.background =  new THREE.Color(0xeeeeee)
		this.timeGroup = new THREE.Object3D();
		this.scene.add(this.timeGroup);
		this.highlightLinesGroup = new THREE.Object3D();
		this.timeGroup.add(this.highlightLinesGroup);
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100000 );
		//this.camera.position.z = -100;
		this.controls = new THREE.TrackballControls(this.camera,$('#introLogo')[0]);
		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.clock = new THREE.Clock();
		this.camera.position.x = -window.innerWidth * 2;
		this.controls.target = new THREE.Vector3(0,0,0)
		this.camera.lookAt(this.controls.target);
		this.controls.target0 = this.controls.target.clone();
		this.controls.update();
		this.toggle = 0;
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.$el = $('#introLogo');
		$('#introLogo').append( this.renderer.domElement );
		this.animateLogo();
		var geometry = new THREE.Geometry();//new createGeom(complex)
		//var bufferGeometry = new THREE.BufferGeometry();
		geometry.dynamic = true;
		for(var i = 0;i<577;i++){
			var f0 = i *3 +0;
			var f1 = i*3 + 1;
			var f2 = i*3 + 2;
			var face = new THREE.Face3(f0,f1,f2)
			geometry.faces.push(face);
		}
		var bufferGeometry;
		console.log('geo isset logo',bufferGeometry)
		var _this = this;
		
		$.getJSON('./glsl/handshake.json',function(d){
			console.log('handshake attrs back',d);
			
			var directions = new Float32Array(d.direction.value.length*3);
			var centroids = new Float32Array(d.centroid.value.length*3);
			var vertices = d.vertices;

			d.direction.value.map(function(v,i){
				directions[i*3+0] = v.x;
				directions[i*3+1] = v.y;
				directions[i*3+2] = v.z;
				geometry.vertices.push(new THREE.Vector3(vertices[i*3+0],vertices[i*3+1],vertices[i*3+2]))
			});
			d.centroid.value.map(function(c,i){
				centroids[i*3+0] = c.x;
				centroids[i*3+1] = c.y;
				centroids[i*3+2] = c.z;
			})

				//console.log('three geometry isset',geometry);
			//console.log('centroids',centroids,directions);
			bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry)
			bufferGeometry.addAttribute( 'direction', new THREE.BufferAttribute( directions, 3 ) );
			bufferGeometry.addAttribute( 'centroid', new THREE.BufferAttribute( centroids, 3 ) );
			// our shader 
			
			const material = new THREE.ShaderMaterial({
				vertexShader: document.getElementById('logoVertexShader').textContent,
				fragmentShader: document.getElementById('logoFragmentShader').textContent,
				wireframe: false,
				transparent: true,
				opacity:0.5,
				color:new THREE.Color(0xffffff),
				side:THREE.DoubleSide,
				//attributes: bufferGeometry,
				uniforms: {
				  opacity: { type: 'f', value: 1 },
				  scale: { type: 'f', value: 0 },
				  animate: { type: 'f', value: 0 
				}			}
			})
			bufferGeometry.computeBoundingSphere();
			const mesh = new THREE.Mesh(bufferGeometry, material)
			mesh.rotation.setFromVector3(new THREE.Vector3(0,-Math.PI/2,0))
			_this.scene.add(mesh);
			setTimeout(function(){
				addLogoTransition(mesh);
			},100)
			
			function addLogoTransition(mesh){
				var i = 0;
				var si = setInterval(function(){
					if(i >= 1.0){
						i = 0;
						mesh.material.uniforms.animate.value = 1.0;
						mesh.material.uniforms.scale.value = 1.0;

						clearInterval(si);
						setTimeout(function(){
							removeLogo(mesh);
						},500)
						return false;
					}
					i+= 0.04;
					mesh.material.uniforms.animate.value = i;
					mesh.material.uniforms.scale.value = i;
					mesh.position.set(_this.camera.position.x+2.15,_this.camera.position.y + 0.1,_this.camera.position.z);
					//mesh.lookAt(_this.camera.position);
				},21)	
			}
			
			_this.logoMesh = mesh;
			//console.log('logo mesh',mesh)
		})
		function removeLogo(mesh){
			var i = 0;
			mesh.material.wireframe = true;
			//$('#nameList').addClass('showing');

			var si2 = setInterval(function(){
				if(i >= 1.0){
					mesh.material.uniforms.animate.value = 1.0 - i;
					mesh.material.uniforms.scale.value = 1.0 - i;

					clearInterval(si2);
					_this.cameraUnlocked = true;
					_this.shouldRenderLogo = false;
					$('#introLogo').addClass('hidden');
					/*$('#nameList li').eq(1).trigger('mouseenter');
					$('#instructions').fadeIn();
					$('#modes').fadeIn();
					setTimeout(function(){
						$('#nameList li').eq(1).trigger('mouseenter');
					},250)*/
					//ok hide logo and stop rendering three here
					return false;
				}
				i += 0.03;
				
				mesh.material.uniforms.animate.value = 1.0-i;
				mesh.material.uniforms.scale.value = 1.0-i;
				mesh.position.set(_this.camera.position.x+2.15,_this.camera.position.y + 0.1,_this.camera.position.z);
				//mesh.lookAt(_this.camera.position);
			},21)
		}
	}
}
