
let hbTray;
$(document).ready(()=>{
	hbTray = new Tray();
})
class Tray{
	constructor(){
		this.$bookmarksBar = $('#bookmarksBar');
		this.bookmarks = new BookmarkManager(this);
		this.appHasFocus = true;
		this._globalShortcuts = {};
		this._tabs = [];
		this.isCreatingNewTab = false;
		this.trayIsFull = true;
		this.initLogo();
		this.initEvents();
		this.initKeyboardShortcuts();
		this.trayWindow = nw.Window.get();
		this.initUrlBarLogo();
		setTimeout(()=>{
			this.checkNodeStatusTimer();
		},30000)
		
		/*this.trayWindow.on('document-start',()=>{
			if(window.localStorage.getItem('windowState') != null){
				let state = JSON.parse(window.localStorage.getItem('windowState'));
				console.log('window state is here',state);
				if(!this.trayIsFull){
					this.trayWindow.moveTo(state.x,state.y);
					let winHeight = state.height - $('#toolbar').outerHeight()+10;
					this.activeWindow.moveTo(state.x,state.y+$('#toolbar').outerHeight()+10);
					this.activeWindow.resizeTo(state.width,winHeight)
				}
				else{
					this.trayWindow.moveTo(state.x,state.y);
					this.trayWindow.resizeTo(state.width,state.height);
				}
				if(state.isFull){
					$('.button#full').addClass('isFull');
				}
				else{
					$('.button#full').removeClass('isFull');
				}
			}
		})*/
		this.handleTrayResize();

		//force windows fullscreen/non movable
		if(process.platform == 'win32'){
			let $full = $('#appNavigation #full');
			$full.prev('.button').before($full);
			$('#appNavigation').append('<div class="button" id="move">✥</div>');
			$('#appNavigation .button#full').html('<div class="max m0">🗖</div><div class="max m1">🗖</div>');
			$('#dragHandle').hide();
		}
		if(process.platform == 'win32'){
			//$('#dragHandle').hide();
			$('#appNavigation').addClass('windows');
			$('#toolbar').addClass('windows');
			setTimeout(()=>{
				//deal with sizing overflow on windows, sheeesh..
				this.bookmarks.createBookmarksMenu();
			},5000)
		}
		if(process.platform == 'linux'){
			//$('#dragHandle').hide();
			$('#appNavigation').addClass('linux');
			$('#toolbar').addClass('linux');
			setTimeout(()=>{
				//deal with sizing overflow on windows, sheeesh..
				this.bookmarks.createBookmarksMenu();
			},5000)
		}
		if(process.platform == 'darwin'){
			setTimeout(()=>{
				//deal with sizing overflow on windows, sheeesh..
				this.bookmarks.createBookmarksMenu();
			},5000)
		}
		
		this.handleTrayResize();
		
		this.trayWindow.on('minimize',()=>{
			this.isMinimized = true;
		})
		
		this.trayWindow.on('restore',()=>{
			this.isMinimized = false;

	    this.trayWindow.focus();
	    this.activeWindow.show(true);
		})
		this.trayWindow.on('focus',()=>{
			console.log('tray is focused')
			if(this.isMinimized){
				return;
			}
			this.windowGetFocus(this.trayWindow);
		});
		this.trayWindow.on('blur',()=>{
			console.log('tray is blurred');
			if(this.isMinimized){
				return;
			}
			this.windowGetBlur(this.trayWindow);
		});

		this.trayWindow.on('close',()=>{
			this.beforeQuit();
			return;
		});

		$('.button#close').off('click').on('click',()=>{
			this.beforeQuit();
			
		});
		$('.button#full').off('click').on('click',()=>{
			//do maximization
			let windowDimensionState = window.localStorage.getItem('windowState');
			if(windowDimensionState == null || $('.button#full').hasClass('isFull')){
				//not set, we should go to semi-maximized state then
				$('.button#full').removeClass('isFull');
				let width = screen.availWidth;
				let height = screen.availHeight;
				let x = this.trayWindow.x;
				let y = this.trayWindow.y;
				let newx = 100;
				let newy = 100;
				let newWidth = screen.availWidth - 200;
				let newHeight = screen.availHeight - 200;
				
				this.trayWindow.moveTo(newx,newy);
				this.trayWindow.resizeTo(newWidth,newHeight);
				
				let winState = {
					x:newx,
					y:newy,
					width:newWidth,
					height:newHeight,
					isFull:false
				}
				window.localStorage.setItem('windowState',JSON.stringify(winState))
			}
			else{
				//has state, lets do things with it.
				let state = JSON.parse(windowDimensionState);
				if(!$('.button#full').hasClass('isFull')){
					//make it full then
					state.width = screen.availWidth;
					state.height = screen.availHeight;
					state.x = screen.availLeft;
					state.y = screen.availTop;
					state.isFull = true;
					$('.button#full').addClass('isFull');
				}
				console.log('state then',state)
				
				window.localStorage.setItem('windowState',JSON.stringify(state))
				console.log('window state',state);
				
				this.trayWindow.moveTo(state.x,state.y);
				this.trayWindow.resizeTo(state.width,state.height);
				
				if(state.isFull){
					$('.button#full').addClass('isFull');
				}
				else{
					$('.button#full').removeClass('isFull');
				}
			}
		})
		$('.button#hide').off('click').on('click',()=>{
			/*this._tabs.map(tab=>{
				tab.window.hide();
			})*/
			this.deregisterKeyboardShortcuts();
			
			let state = localStorage.getItem('windowState');
	    let h = screen.availHeight;
	    if(state != null){
	    	state = JSON.parse(state);
	    	h = state.height;
	    }
	    
	    this.trayWindow.height = h;
			//this.trayIsFull = true;
    	this.trayWindow.focus();
    	this.shatterI = 0.7;
    	this.shatterAnimation();
    	nw.Window.get().minimize();
			
		})
		this.calcTabSize();
	}
	handleTrayResize(){
		//let bmSi;
		this.trayWindow.on('resize',(width,height)=>{
			
			let h = this.trayWindow.height;
			let logoMarginTop = (h-$('#introLogo canvas').height()) / 2;
			logoMarginTop += $('#toolbar').outerHeight()+5;
			$('#introLogo canvas').css('margin-top',logoMarginTop);
			this.resizeActive(false);
			this.calcTabSize();
			if(typeof this.bmSi != "undefined"){
				clearTimeout(this.bmSi);
				delete this.bmSi;
			}
			this.bmSi = setTimeout(()=>{
				this.bookmarks.generateBookmarksMenu(this.bookmarks._localBookmarksData);
				this.calcTabSize();
			},400)
			
		})
		this.trayWindow.on('move',(width,height)=>{
			
			if(this.trayIsFull){
				this.shatterAnimation();
			}
			this.resizeActive(true);
			this.calcTabSize();
		})
		
	}
	resizeActive(isMove){
		let y = this.trayWindow.y;
		let h = $('#toolbar').outerHeight()+5;
		let w = this.trayWindow.width;
		let x = this.trayWindow.x;
		let trayHeight = this.trayWindow.height;
		if(!isMove){
			$('#contentPanel').css({
				height:'calc(100% - '+($('#toolbar').outerHeight()+5)+'px)',
				top: ($('#toolbar').outerHeight()+5)
			})
		}
		
		//set state
		let state = localStorage.getItem('windowState');
		if(state == null){
			state = {};
		}
		else{
			state = JSON.parse(state);
		}
		state.x = x;
		state.y = y;
		state.width = w;
		state.height = trayHeight;
		state.isFull = state.isFull || $('.button#full').hasClass('isFull');
		localStorage.setItem('windowState',JSON.stringify(state));
	}
	shatterAnimation(isLinuxInit){
		this.logoMesh.material.wireframe = true;
			//$('#nameList').addClass('showing');
			let i = this.shatterI || 0.0;
			if(typeof this.shatterInterval != "undefined"){
				clearInterval(this.shatterInterval);
				delete this.shatterInterval;
			}
			let isGoing = true;
			this.shatterInterval = setInterval(()=>{
				if(i <= 0.7 && isGoing){
					this.logoMesh.material.uniforms.animate.value = 1.0 - i;
					this.logoMesh.material.uniforms.scale.value = 1.0 - i;
					this.animateLogo();
					i += 0.05;
					this.shatterI = i;
				}
				else{
					isGoing = false;

					this.logoMesh.material.uniforms.animate.value = 1.0 - i;
					this.logoMesh.material.uniforms.scale.value = 1.0 - i;
					this.animateLogo();
					if(i <= 0){
						this.logoMesh.material.wireframe = false;
						this.logoMesh.material.uniforms.animate.value = 1.0;
						this.logoMesh.material.uniforms.scale.value = 1.0;
						this.animateLogo();
						clearInterval(this.shatterInterval);
						if(isLinuxInit){
							setTimeout(()=>{
								this.finishLogo();
							},500)
						}
						
					}
					i -= 0.05;
					this.shatterI = i;
				}
				
				},21);
	}
	deregisterKeyboardShortcuts(){
		this.appHasFocus = false;
		Object.keys(this._globalShortcuts).map(key=>{
			nw.App.unregisterGlobalHotKey(this._globalShortcuts[key]);
			delete this._globalShortcuts[key];
		}); //unregister all shortcuts
		/*if(process.platform == 'darwin'){
			nw.Window.get().setAlwaysOnTop(false);
			if(typeof this.trayWindow != "undefined"){
				setTimeout(()=>{
					this.trayWindow.setAlwaysOnTop(false);
					this.trayWindow.blur();
				},100)
			}

		}*/
		console.log('deregistered',this._globalShortcuts,this.trayWindow);
	}
	initKeyboardShortcuts(){
		const _this = this;
		let newTabCmd;
		let closeTabCmd;
		let showDevToolsCmd;
		if(process.platform == 'darwin'){
			this.deregisterKeyboardShortcuts();
		}
		this.appHasFocus = true;
		
		/*if(process.platform == 'darwin'){
			nw.Window.get().setAlwaysOnTop(true);
		}*/
		if(process.platform == 'darwin'){
			console.log('darwin');
			newTabCmd = {
			  key : "Command+T",
			  active : activeFunction,
			  failed : function(msg) {
			    // :(, fail to register the |key| or couldn't parse the |key|.
			    console.log(msg);
			  }
			};
			closeTabCmd = {
			  key : "Command+W",
			  active : closeFunction,
			  failed : function(msg) {
			    // :(, fail to register the |key| or couldn't parse the |key|.
			    console.log(msg);
			  }
			};
			showDevToolsCmd = {
				key : 'Command+Alt+I',
				active: showTools,
				failed: function(msg) {
					console.log(msg);
				}
			}
			
		}
		else{
			newTabCmd = {
			  key : "Ctrl+T",
			  active : activeFunction,
			  failed : function(msg) {
			    // :(, fail to register the |key| or couldn't parse the |key|.
			    console.log(msg);
			  }
			};
			closeTabCmd = {
			  key : "Ctrl+W",
			  active : closeFunction,
			  failed : function(msg) {
			    // :(, fail to register the |key| or couldn't parse the |key|.
			    console.log(msg);
			  }
			};
			showDevToolsCmd = {
				key : 'Ctrl+Shift+I',
				active: showTools,
				failed: function(msg) {
					console.log(msg);
				}
			}
			
		}
		let newTabShortcut = new nw.Shortcut(newTabCmd);
		this._globalShortcuts.newTabShortcut = newTabShortcut;
		nw.App.registerGlobalHotKey(newTabShortcut);

		let closeTabShortcut = new nw.Shortcut(closeTabCmd);
		this._globalShortcuts.closeTabShortcut = closeTabShortcut;
		nw.App.registerGlobalHotKey(closeTabShortcut);

		let showDevToolsShortcut = new nw.Shortcut(showDevToolsCmd);
		this._globalShortcuts.showDevToolsShortcut = showDevToolsShortcut;
		nw.App.registerGlobalHotKey(showDevToolsShortcut);
		
		$('#addTabButton').off('click').on('click',function(){
			activeFunction();
		})

		let $li = $('#tabs li.init');
    $li.off('click').on('click',function(){
    	onLiClick($(this));
    });
    $li.off('mouseenter').on('mouseenter',function(){
    	emptyMouseEnter($(this));
    })
    $li.off('mouseleave').on('mouseleave',function(){
    	$('.closeTab',$li).remove();
    })
		function activeFunction(){
			//if(_this._tabs.length > 0){
			_this.isAddingNewTab = true;
			$('#bookmarkPage').removeClass('clicked');
			$('#tabs ul li').removeClass('tabtarget');
      $li = $('<li class="notactivated tabtarget"><span class="faviconWrap rippleDisabled"><div class="lds-ripple"><div></div><div></div></div></span><span class="pageTitle">New Tab</span></li>')
      $('#tabs ul').append($li);
      $li.off('mouseenter').on('mouseenter',function(){
      	emptyMouseEnter($(this));
      });
      $li.on('mouseleave',function(){
      	$('.closeTab',$li).remove();
      })
      $li.off('click').on('click',function(){
      	onLiClick($(this));
      });
      //}
			console.log('active event',this);
			console.log("Global desktop keyboard shortcut: cmdT active."); 
	    let state = localStorage.getItem('windowState');
	    let h = screen.availHeight;
	    if(state != null){
	    	state = JSON.parse(state);
	    	h = state.height;
	    }
	    _this.trayWindow.height = h;
	    _this.trayIsFull = true;
	    _this.trayWindow.focus();
	    _this.shatterI = 0.7;
	    _this.shatterAnimation();
	    $('#miniLogo').removeClass('active').removeClass('secure');
	    _this.isCreatingNewTab = true;
	    if(typeof _this.activeWindow != "undefined"){
	    	_this.activeWindow.hide();
	  	}


	  	//resize some tabs
	  	_this.calcTabSize();
	    $('#urlQuery').val('').focus();
		}
		function closeFunction(){
			console.log('closeFunction called')
			if(typeof _this.activeTab != "undefined"){
				console.log('close tab by id',_this.activeTab.id,_this._tabs.map(t=>{return t.id;}));
				_this.activeTab.window[0].remove();
				_this.activeTab.$el.remove();
				_this._tabs = _this._tabs.filter(tab=>{
    			return tab.id != _this.activeTab.id;
    		});
				_this.focusOnTabAfterRemove();
			}
			else{
				_this.beforeQuit();
			}
			_this.calcTabSize();
			
		}
		function showTools(){
			if(typeof _this.activeTab != "undefined"){
				_this.activeTab.window[0].showDevTools(true);
			}
			else{
				_this.trayWindow.showDevTools();
			}
		}
		function emptyMouseEnter(liElem){
			$('#tabs li .closeTab').off('click').remove();
    	liElem.append('<div class="closeTab">x</div>')
    	$('.closeTab',liElem).off('click').on('click',()=>{
    		console.log('closetab is clicked');
    		if(liElem.hasClass('notactivated')){
    			liElem.remove();
    			_this.focusOnTabAfterRemove();
    			_this.calcTabSize();
    		}
    	});
		}
		function onLiClick(liElem){
			console.log('on li click');

			if(liElem.hasClass('notactivated')){
				$('#urlQuery').val('')
      	console.log('click fn active')
      	$('#tabs li').removeClass('tabtarget');
      	liElem.addClass('tabtarget');

      	let state = localStorage.getItem('windowState');
		    let h = screen.availHeight;
		    if(state != null){
		    	state = JSON.parse(state);
		    	h = state.height;
		    }
		    _this.trayWindow.height = h;
		    _this.trayIsFull = true;
		    _this.shatterI = 0.7;
		    _this.shatterAnimation();
		    _this.trayWindow.focus();
		    _this.isCreatingNewTab = true;
		    if(typeof _this.activeWindow != "undefined"){
		    	_this.activeWindow.hide();
		  	}
		  	_this.isAddingNewTab = true;
		  }
		}
		//add H
	}
	focusOnTabAfterRemove(){
		console.log('after rem tabs len, before',this._tabs.length);
		if($('#tabs li').length == 0){
			// no tab elems, remove hanging tabs
			this._tabs.map(tab=>{
				tab.window[0].remove();
			})
			this._tabs = [];
			$('#addTabButton').trigger('click');
			delete this.activeWindow;
			delete this.activeTab;
			return false;
		}
		console.log('after rem tabs len, after',this._tabs.length);
		if(this._tabs.length > 0){
			this._tabs = this._tabs.sort((a,b)=>{
				return a.id - b.id;
			});
  		let activeTab = this._tabs[this._tabs.length-1];
  		console.log('active tab isset',activeTab);
  		this.activeWindow = activeTab.window;
  		this.activeTab = activeTab;
  		this.activeWindow.show();
  		$('#urlQuery').val(activeTab.url);
  		$('#miniLogo').removeClass('active').removeClass('secure')
  		//add H icon styles
  		if(typeof this.activeTab.nameResource != "undefined"){
  			let d = this.activeTab.nameResource;
  			this.update_H_Icon(d,this.activeTab.id);
  		}
  	}
  	else{
  		delete this.activeWindow;
  		delete this.activeTab;
  		//make new tab 
  		if($('#tabs li.notactivated').length > 0){
  			let len = $('#tabs li.notactivated').length-1;
  			$('#tabs li.notactivated').eq(len).trigger('click');
  		}
  		else{
  			$('#addTabButton').trigger('click');
  		}
  		
  	}
  	this.calcTabSize();
	}
	calcTabSize(){
		let areaWidth = $('#tabs').width();
		let pxw;
		let bestCase = areaWidth / $('#tabs li').length;
		if(bestCase > 100){
			pxw = 100;
		}
		else{
			pxw = Math.floor(bestCase);
			if(bestCase <= 30){
				//resize ul
				pxw = 30;
			}
		}
		$('#tabs li').css('width',pxw);
		let newW = (pxw+11) * $('#tabs li').length + $('#addTabButton').width() - 9;
		$('#tabs ul').css('width',Math.ceil(newW));
		let marginLeft = 0;
		console.log('new Width',newW,pxw,marginLeft)
		if(Math.ceil(newW) > $('#tabs').width()){
			marginLeft = Math.ceil($('#tabs').width() - ($('#tabs ul').width() + Math.ceil($('#addTabButton').outerWidth())+1));
  		
	  	}

	  	if(marginLeft < 0){
	  		$('#tabs').addClass('addAbsolute');
	  	}
	  	else{
	  		$('#tabs').removeClass('addAbsolute');
	  	}
	  	$('#tabs ul').css('margin-left',marginLeft)

	  	let natDimensions = $('#tabs ul')[0].getBoundingClientRect();
	  	let xEnd;
	  	if(Math.ceil(newW) > $('#tabs').width()){
	  		natDimensions = $('#tabs')[0].getBoundingClientRect();
	  	}
	  	if(Math.ceil(newW) > $('#tabs').width()){
	  		xEnd = natDimensions.x + natDimensions.width
	  	}
	  	else{
	  		xEnd = natDimensions.x + natDimensions.width + Math.ceil($('#addTabButton').outerWidth())+1;
	  	}
		
		let totalX = $('body').width() - xEnd;
		console.log('newW',newW,'tabs.width',$('#tabs').width());
		console.log('marginLeft',marginLeft)
		console.log('totalX',totalX);
		console.log('tabs ul dims',natDimensions);
		console.log('xEnd',xEnd);
		console.log('body width',$('body').width());

		$('#dragHandle').css('width',totalX);
		if($('#bookmarksBar').hasClass('visible')){
			$('#dragHandle').addClass('bookmarksBarShowing');
		}
		else{
			$('#dragHandle').removeClass('bookmarksBarShowing');
		}
		
		return false;

		/*let ulWidth = $('#tabs ul').width();
  	console.log('ulwidth calc',ulWidth,$('#tabs li').length,ulWidth/$('#tabs li').length)
  	let pxw;
  	if(ulWidth > $('#tabs').width()){
  		ulWidth = $('#tabs').width();
  	}
  	if(ulWidth/$('#tabs li').length >= 30 && ulWidth/$('#tabs li').length < 100){
  		//resize natural width
  		pxw = Math.floor(ulWidth/($('#tabs li').length));
  		console.log('resize tabs',pxw);
  		$('#tabs ul li').css('width',pxw);
  		let natDimensions = $('#tabs ul')[0].getBoundingClientRect();
  		let xEnd = natDimensions.x + natDimensions.width + 70 + $('#addTabButton').outerWidth()*2;
  		let totalX = $('body').width() - xEnd;
  		$('#dragHandle').css('width',totalX);
  		
  	}
  	if(ulWidth/$('#tabs li').length < 30){
  		//add arrows
  		pxw = Math.floor(ulWidth/$('#tabs li').length);
  		$('#tabs ul li').css('width',30);
  	}
  	if(ulWidth/$('#tabs li').length >= 100){
  		pxw = $('#tabs li').width();
  	}
  	let newW = (pxw+11)*$('#tabs li').length+$('#addTabButton').width()-9;
  	console.log('new w for ul',newW,pxw);
  	$('#tabs ul').css('width',Math.ceil(newW)+'px');
  	if(Math.ceil(newW) > $('#tabs').width()){
  		$('#tabs ul').css('margin-left',Math.ceil($('#tabs').width() - ($('#tabs ul').width() + $('#addTabButton').outerWidth()+1)))
  	}
  	else{
  		$('#tabs ul').css('margin-left',0);
  	}*/
	}
	initEvents(){
		$('#urlQuery').focus();
		let winState = window.localStorage.getItem('windowState');
		if(winState != null){
			winState = JSON.parse(winState);
			if(winState.isFull){
				$('.button#full').addClass('isFull');
			}
			else{
				$('.button#full').removeClass('isFull');
			}
		}

		$('body').on('mouseenter',()=>{
			//this.trayWindow.focus();
			if(!this.appHasFocus){
				return false;
			}
			if(this.trayIsFull){
				return false;
			}
			if(typeof this.focusTO != "undefined"){
				clearTimeout(this.focusTO)
				delete this.focusTO;
			}

			this.focusTO = setTimeout(()=>{
				this.trayWindow.focus();
			},20);
		});
		$('body').on('mouseleave',()=>{
			/*if(isDragging){
				return false;
			}*/
			if(!this.appHasFocus){
				return false;
			}
			if(this.isMinimized){
				return;
			}
			if(this.trayIsFull){
				//tray is lready full, dont focus then
				return false;
			}
			if(this.bookmarkManagerIsShowing){
				return false;
			}
			if(typeof this.activeWindow != "undefined"){
				if(typeof this.leaveTO != "undefined"){
					clearTimeout(this.leaveTO)
					delete this.leaveTO;
				}
				this.leaveTO = setTimeout(()=>{
					this.activeWindow.focus();
				},10);
				
			}
		})

		$("#urlQuery").on('keyup', (e) => {
		    if (e.keyCode === 13) {
		        // Do something
		        $('#bookmarkPage').removeClass('clicked');
		        $('#urlQuery').blur();
		        let val = $('#urlQuery').val();
		        if(val.indexOf('http') != 0){
		        	val = 'http://'+val;
		        }
		        $('#sessionNotification').hide();
		       	this.addNewTab(val);
		        //$('#urlQuery').val(val);
		        
						//nwWin.moveTo(0,$('#toolbar').outerHeight()+5);
		        
		    }
		});
		$('.navButton#back').on('click',()=>{
			if(typeof this.activeWindow != "undefined"){
				this.activeWindow[0].back()
			}
		})
		$('.navButton#forward').on('click',()=>{
			if(typeof this.activeWindow != "undefined"){
				this.activeWindow[0].forward()
			}
		})
		$('.navButton#reload').on('click',()=>{
			if(typeof this.activeWindow != "undefined"){
				this.activeWindow[0].reload()
			}
		})

		$('#tabs').on('mousewheel',(e)=>{
			console.log('wheel',e);
			let deltaX = e.originalEvent.deltaX;
			if(process.platform == 'win32'){
				deltaX = e.originalEvent.deltaY/10;
			}
			console.log('deltaX',deltaX);
			if($('#tabs ul').width() > $('#tabs').width()){
				//move margins around
				let ml = parseFloat($('#tabs ul').css('margin-left').split('px')[0])
				let visibleX = $('#tabs').width();
				if( (ml + deltaX <= 0) ){
					$('#tabs').addClass('addAbsolute');
					if(($('#tabs ul').width() + (ml + deltaX) >= visibleX - Math.ceil($('#addTabButton').outerWidth()+1))){
						console.log('tab width comp',$('#tabs ul').width() + (ml + deltaX) ,'>', visibleX + Math.ceil($('#addTabButton').outerWidth()+1))
						ml += deltaX;
						$('#tabs ul').css('margin-left',ml+'px');
						$('#addTabButton').removeClass('isZero');
					}

					else{
						if($('#tabs ul').width() + Math.ceil($('#addTabButton').outerWidth()+1) <= visibleX){
							$('#tabs').removeClass('addAbsolute');
						}
						else{
							$('#addTabButton').addClass('isZero');
						}
					}
					$('#tabs').removeClass('atZero');

				}
				else{
					if(ml + deltaX > 0){
						$('#tabs ul').css('margin-left','0px');
						ml = 0;
					}
					if(ml < 0){
						$('#tabs').addClass('addAbsolute');
						$('#tabs').removeClass('atZero');
					}
					else if(Math.abs(ml) <= 5){
						$('#tabs').addClass('atZero');
					}
					else{
						$('#tabs').removeClass('addAbsolute');
						$('#tabs').removeClass('atZero');
					}
				}
			}
		})
	}
	addNewTab(url,$newLI,tabIndex){
		let windowState = window.localStorage.getItem('windowState');
		if(windowState != null){
			windowState = JSON.parse(windowState);
		}
		this.calcTabSize();
		let isNewTab = this.isCreatingNewTab;
    if(this._tabs.length == 0){
    	//default to create new tab
    	isNewTab = true;
    }

    
    console.log('IS NEW TAB???',isNewTab,this.isAddingNewTab,this._tabs);
    if(isNewTab || this.isAddingNewTab){
    	let w = windowState == null ? screen.availWidth : windowState.width;
    	let h = windowState == null ? screen.availHeight-($('#toolbar').outerHeight()+5) : windowState.height-($('#toolbar').outerHeight()+5);// - ($('#toolbar').outerHeight()+28);
    	let xState = windowState == null ? screen.availLeft : windowState.x;
    	let yState = windowState == null ? screen.availTop : windowState.y;
    	//create new window
        let isResizable = true;
        //disable resize/non fullscreen in windows
        /*if(process.platform == 'win32'){
      	  isResizable = false;
        }*/

      //append new webview
      
      $('#contentPanel').css({
      	top:$('#toolbar').outerHeight()+5,
      	height: 'calc(100% - '+($('#toolbar').outerHeight()+5)+'px)',
      	width:'100%'
      });
      let $webview = $('<webview src="'+url+'" id="tab'+(tabIndex || this._tabs.length)+'" partition="persist:handybrowser"></webview>')
      $('#contentPanel').append($webview);
      $('#contentPanel').find('webview:not(#'+$webview.attr('id')+')').hide();

      /*update tab data*/
      let tabNumID = $('#tabs ul li').index($('li.tabtarget'))//this.isAddingNewTab ? $('#tabs ul li').length-1 : this._tabs.length;
      let tabData = {
      	url:url,
      	window:$webview,
      	title:'',
      	$el: $newLI || $('#tabs ul li').eq(tabNumID),
      	id: tabIndex || this._tabs.length//(this._tabs.length-1 == -1 ? 0 : this._tabs.length-1)/*$('#tabs ul li').length*/
      };
      tabData.$el.find('.faviconWrap').removeClass('rippleDisabled');
      this.activeWindow = $webview;
      this.trayIsFull = false;
      console.log('set webview events');
      //webview events
      $webview[0].onnewwindow = (e)=>{
      	let newURL = e.targetUrl;
      	console.log('nav to new window',newURL);
      	$('#bookmarkPage').removeClass('clicked');
			  this.isAddingNewTab = true;
			  $('#tabs ul li').removeClass('tabtarget');
	      let $li = $('<li class="notactivated tabtarget"><span class="faviconWrap"><div class="lds-ripple"><div></div><div></div></div></span><span class="pageTitle">New Tab</span></li>')
	      $('#tabs ul').append($li);
			  this.addNewTab(newURL);
				
      }
      let isFirstResult = true;
      $webview[0].onloadstart = (e)=>{
      	console.log('onload start',isFirstResult,e);
      	if(e.isTopLevel){
      		console.log('istoplevel')
      		isFirstResult = false;
      		tabData.url = e.url;
      		this.setTabInfoOnLoad(tabData.url,tabData,false);
      	}
      	
      	//load tab favicon and tld info
      }
      $webview[0].onloadredirect = (e)=>{
      	console.log('on loadreirect',e);
      	if(tabData.url == e.oldUrl){
    			tabData.url = e.newUrl;
    		}
    		this.setTabInfoOnLoad(tabData.url,tabData,false);
    	
      }
      $webview[0].oncontentload = (e)=>{
      	console.log('on contentload',e);
      }
      $webview[0].onloadstop = (e)=>{
      	console.log('onload stop',e);

      	$webview[0].executeScript({
	        code: `document.title`
	      }, result => {
	      	//if(data[1] == tabData.url){
      		tabData.title = result[0];
	      	//set tab title
	      	this.setTabInfoOnLoad(tabData.url,tabData,true);
	      	//}
	      	

	      });
      }
      //tabdata events
	    tabData.$el.removeClass('tabtarget').removeClass('notactivated').removeClass('init');  
      tabData.$el.off('mouseenter').on('mouseenter',()=>{
      	$('#tabs li .closeTab').remove();
      	tabData.$el.append('<div class="closeTab">x</div>')
      	$('.closeTab',tabData.$el).off('click').on('click',()=>{
      		console.log('closetab');
      		//this.activeWindow.close();
      		tabData.window.remove();
      		tabData.$el.remove();
      		console.log('close tab by id',tabData.id,this._tabs.map(t=>{return t.id;}));
			
      		this._tabs = this._tabs.filter(tab=>{
      			return tab.id != tabData.id;
      		});
      		this.calcTabSize();
      		this.focusOnTabAfterRemove();
      	})	
      }).on('mouseleave',()=>{
      	$('.closeTab',tabData.$el).remove();
      })
      tabData.$el.off('click').on('click',()=>{
      	console.log('on click of tab');
      	let id = tabData.window.attr('id');
      	tabData.window.show();
      	$('#bookmarkPage').removeClass('clicked')
      	$('#contentPanel webview:not(#'+id+')').hide()
      	//move/resize too
      	let windowState = window.localStorage.getItem('windowState');
				if(windowState != null){
					windowState = JSON.parse(windowState);
				}
			
	    	$('#contentPanel').css({
	    		top:($('#toolbar').outerHeight()+5),
	    		height:'calc(100% - '+($('#toolbar').outerHeight()+5)+'+px)'
	    	})
      	
      	$('#urlQuery').val(tabData.url);

      	//add H logo things
      	$('#miniLogo').removeClass('active').removeClass('secure');
		    	
      	if(tabData.nameResource){
		    	let d = tabData.nameResource;
		    	this.update_H_Icon(d,tabData.id);
		    }
      	
      })
      
      this.activeTab = tabData;
      this._tabs.push(tabData);
      
    }
    else{
    	$('span.faviconWrap',this.activeTab.$el).html('<div class="lds-ripple"><div></div><div></div></div>');
    	this.activeWindow.attr('src',url);

    	this.activeTab.url = url;
    	delete this.activeTab.icon;
    	delete this.activeTab.nameResource;
    	delete this.activeTab.nameInfo;
    	$('#miniLogo').removeClass('active').removeClass('secure');

    	/*this.activeWindow.window.location.href = url;
    	this.activeTab.window.on('loading',()=>{
    		console.log('on loading');
    	})
    	$('#bookmarkPage').removeClass('clicked')
    	this.activeTab.$el.html(url);
    	this.setTabInfoOnLoad(url,this.activeTab);
    	if(typeof this.activeTab != "undefined"){
    		delete this.activeTab.icon;
    		
    	}*/
    }
	}
	setTabInfoOnLoad(url,activeNow,shouldSetTitle){
		console.log('setTabInfoOnLoad',activeNow.id,activeNow.title,shouldSetTitle);
    if(!$('#urlQuery').is(":focus") && !shouldSetTitle){
  		$('#urlQuery').val(url);
  	}
  	if(shouldSetTitle){
  		let title = activeNow.title == '' ? activeNow.url : activeNow.title;
    	activeNow.$el.find('span.pageTitle').html(title);
    }
    
    
    if(typeof activeNow.fetchingIcon == "undefined" && typeof activeNow.icon == "undefined"){
  		activeNow.fetchingIcon = true;
  		console.log('get icon',url)
  		let toLoad = typeof url != "undefined" ? url : activeNow.url;
    	
    	$.getJSON('http://__handybrowser_getfavicon__/'+encodeURIComponent(toLoad),(d)=>{
      	activeNow.icon = d.icon;
      	delete activeNow.fetchingIcon;
      	//this.activeTab.$el.html(this.activeTab.window.title);
      	activeNow.$el.find('span.faviconWrap').html('<img class="favicon" src="'+d.icon+'"/>')
    		console.log('active now id',activeNow.id)
    		//this._tabs[activeNow.id].title = activeNow.window.title;
      })
      let guid = localStorage.getItem('guid');
      let tld = activeNow.url;
      tld = tld.split('://')[1];
      tld = tld.split('/')[0];
      tld = tld.split('.');
      console.log('tld after split',tld);
      if(tld[tld.length-1] == ''){
      	//it's blank, probably http://tld./ format
      	tld = tld[tld.length-2];
      }
      else{
      	tld = tld[tld.length-1];
      }
      console.log('should fetch tld now',tld);

      $.post('http://x:'+guid+'@127.0.0.1:12937',JSON.stringify({method:"getnameinfo",params:[tld]}),(d)=>{
      	console.log('got tld info',d);
      	if(d.result){
      		this._tabs[activeNow.id].nameInfo = d;
      	}
      })
      	
      $.post('http://x:'+guid+'@127.0.0.1:12937',JSON.stringify({method:"getnameresource",params:[tld]}),(d)=>{
      	console.log('got tld resource rec',d,d.result);
      	$('#miniLogo').removeClass('active').removeClass('secure').off('click');
      	this.update_H_Icon(d,activeNow.id);
      	
      })
    }
    else if(typeof activeNow.icon != "undefined"){
    	console.log('icon isset already');
    	//this.activeTab.$el.html(this.activeTab.window.title);
    	activeNow.$el.find('span.faviconWrap').html('<img class="favicon" src="'+activeNow.icon+'"/>')
  		//this._tabs[activeNow.id].title = activeNow.window.title;	
  		if(this._tabs[activeNow.id].nameResource){
	    	$('#miniLogo').removeClass('active').removeClass('secure');
	    	let d = this._tabs[activeNow.id].nameResource;
	    	this.update_H_Icon(d,activeNow.id);
	    }
    }
    
	}
	windowGetFocus(win){
		this.initKeyboardShortcuts()
	}
	windowGetBlur(win){

		this.deregisterKeyboardShortcuts();
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
		this.scene.background =  new THREE.Color(0x111111)
		this.timeGroup = new THREE.Object3D();
		this.scene.add(this.timeGroup);
		this.highlightLinesGroup = new THREE.Object3D();
		this.timeGroup.add(this.highlightLinesGroup);
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100000 );
		//this.camera.position.z = -100;
		//this.controls = new THREE.TrackballControls(this.camera,$('#introLogo')[0]);
		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.clock = new THREE.Clock();
		this.camera.position.x = -window.innerWidth * 2;
		//this.controls.target = new THREE.Vector3(0,0,0)
		this.camera.lookAt(new THREE.Vector3(0,0,0));
		//this.controls.target0 = this.controls.target.clone();
		//this.controls.update();
		this.toggle = 0;
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.$el = $('#introLogo');
		$('#introLogo').append( this.renderer.domElement );
		$('#introLogo canvas').css({width:'100%',height:'auto'})
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
				if(process.platform == 'linux'){
					_this.shouldRenderLogo = false;
					mesh.material.uniforms.animate.value = 0.0;
					mesh.material.uniforms.scale.value = 0.0;
					mesh.position.set(_this.camera.position.x+2.15,_this.camera.position.y + 0.1,_this.camera.position.z);
					_this.shatterI = 1.0
					_this.shatterAnimation(true);
				}
				else{
					var si = setInterval(function(){
					if(i >= 1.0){
						i = 0;
						mesh.material.uniforms.animate.value = 1.0;
						mesh.material.uniforms.scale.value = 1.0;

						clearInterval(si);
						/*setTimeout(function(){
							removeLogo(mesh);
						},500)*/
						setTimeout(function(){
							_this.finishLogo();
						},500)
						
						_this.shouldRenderLogo = false;
						return false;
					}
					i+= 0.01;
					mesh.material.uniforms.animate.value = i;
					mesh.material.uniforms.scale.value = i;
					mesh.position.set(_this.camera.position.x+2.15,_this.camera.position.y + 0.1,_this.camera.position.z);
					//mesh.lookAt(_this.camera.position);
				},21)	
				}
				
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
					$('#logo').addClass('showing');
					setTimeout(()=>{
						$('#content').addClass('showing');
					},300)
					
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
	finishLogo(){
		const _this = this;
		
		let lastKnownState = localStorage.getItem('tabState');
		if(lastKnownState != null){
			lastKnownState = JSON.parse(lastKnownState);
			console.log('last state',lastKnownState);
			$('#sessionNotification').removeClass('hidden');
			$('#sessionNotification .option').off('click').on('click',function(){
				$('#sessionNotification').addClass('hidden');
				let opt = $(this).attr('id');
				if(opt == 'yes'){
					//refresh sesh
					lastKnownState.map((url,i)=>{
						_this.isAddingNewTab = true;
						$('#tabs ul li').removeClass('tabtarget');
			      let $li = $('<li class="notactivated tabtarget">'+url.split('://')[1]+'</li>')
			      if(i == 0){
			      	$li = $('#tabs ul li').eq(0)
			      }
			      $('#tabs ul').append($li);
					  _this.addNewTab(url,$li,i);
					
					  
					})
				}
			})
		}
	}
	hideLoading(){
		$('#loading').hide();
	}
	update_H_Icon(d,activeID){
		$('#miniLogo').removeClass('active').removeClass('secure').off('click');
		if(d.result){
  		console.log('has result');
  		if(d.result != null){
  			$('#miniLogo').addClass('active');
  			d.result.records.map(rec=>{
  				if(rec.type == 'DS'){
  					//is secure???
  					console.log('minilogo show secure')
  					$('#miniLogo').addClass('secure');
  				}
  			})
  		}
  		this._tabs[activeID].nameResource = d;
  		$('#miniLogo').off('click').on('click',()=>{
  			this.showNameInfoPanel(this._tabs[activeID].nameResource.result,this._tabs[activeID].nameInfo.result);
  		})
  	}
	}
	initUrlBarLogo(){
		$.get('./icons/logo_min.svg',(d)=>{
			console.log('data',$('svg',d));
			$('#miniLogo').append($('svg',d));
		})
	}
	showNameInfoPanel(nameResource,nameInfo){
		console.log('show name info panel',nameResource,nameInfo);
		let state = localStorage.getItem('windowState');
		let x = 0;
		let y = 0;
		let w = screen.availWidth;
		let h = screen.availHeight;

		if(state != null){
			state = JSON.parse(state);
			x = state.x;
			y = state.y;
			w = state.width;
			h = state.height;
		}
		fs.readFile('./viewNameRecord.html','utf8',(err,snippet)=>{
			$('#modal').html($(snippet));

			$('pre#nameRecords',$('#modal')).text(JSON.stringify(nameResource,null,2));
			$('pre#nameInfo',$('#modal')).text(JSON.stringify(nameInfo,null,2));
			switch(process.platform){
		  	case 'win32':
		  		$('#modalNav').addClass('windows');
		  		$('.preWrap').addClass('windows');
		  	break;
		  	case 'linux':
		  		$('#modalNav').addClass('linux');
		  	break;
		  }
		  $('#modal').show();
			$('#modal #closeMap').on('click',()=>{
				$('#modal').hide();
			})
			function selectText(node) {
		    node = document.getElementById(node);
		    if (document.body.createTextRange) {
	        const range = document.body.createTextRange();
	        range.moveToElementText(node);
	        range.select();
		    } else if (window.getSelection) {
	        const selection = window.getSelection();
	        const range = document.createRange();
	        range.selectNodeContents(node);
	        selection.removeAllRanges();
	        selection.addRange(range);
		    } else {
		        console.warn("Could not select text in node: Unsupported browser.");
		    }
			}
			$('#modal .selectMe').off('click').on('click',function(){
				selectText($(this).attr('id'))
			})
		
			$('#modal .close').off('click').on('click',()=>{
				$('#modal').hide();
			});
		})
		
	}
	beforeQuit(){
		if(this._tabs.length > 0){
			let urls = this._tabs.map(tab=>{
				return tab.url;
			});
			localStorage.setItem('tabState',JSON.stringify(urls));
			nw.App.quit();
		}
		else{
			nw.App.quit();
		}
		return;	
	}

	getHSDNodeStatus(){

		let guid = localStorage.getItem('guid');
		return new Promise((resolve,reject)=>{
			//get peers height
			$.post('http://x:'+guid+'@127.0.0.1:12937',JSON.stringify({method:"getpeerinfo",params:[]}),(d)=>{
	    	let maxHeight = 0;
	    	if(d.result){
	    		d.result.map(peer=>{
	    			let heightCompare = peer.bestheight == -1 ? peer.startingheight : peer.bestheight;
	    			maxHeight = Math.max(heightCompare,maxHeight);
	    		})
	    	}
	    	//get my height
	    	$.post('http://x:'+guid+'@127.0.0.1:12937',JSON.stringify({method:"getinfo",params:[]}),(d)=>{
		    	let myHeight = 0;
		    	if(d.result){
		    		myHeight = d.result.blocks;
		    	}
		    	resolve({peerHeight:maxHeight,myHeight:myHeight});
		    })
		    .fail(()=>{
		    	reject({error:'not connected'});
		    })
	    }).fail(()=>{
	    	reject({error:'not connected'});
	    })
	  });
	}
	checkNodeStatusTimer(){
		if(typeof this.nodeStatusInterval != "undefined"){
			clearInterval(this.nodeStatusInterval);
			delete this.nodeStatusInterval;
		}
		this.nodeStatusInterval = setInterval(()=>{
			this.getHSDNodeStatus().then((d)=>{

	  		let h = 0;
	  		let p = 0;
	  		h = d.myHeight;
	  		p = d.peerHeight;
	  		let syncStatus = 'Not Synced';
	  		let symbol = '⚪ ';
	  		if(Math.abs(d.myHeight - d.peerHeight) <= 2){
	  			//close to height
	  			symbol = '🟢 ';
	  			syncStatus = 'Synced ['+d.myHeight+']'
	  		}
	  		else{	

	  			syncStatus += ' ['+h+':'+p+']';
	  		}
	  		
	  		if(process.platform == 'darwin'){
	  			nw.Window.get().menu.items[0].submenu.items.map((item,i)=>{
	  				if(item.label.indexOf('HNS Node') >= 0){
	  					//update label;
	  					nw.Window.get().menu.items[0].submenu.items[i].label = symbol+'HNS Node: '+syncStatus;
	  				}
	  			})
		  	}
		  	else{
		  		if(typeof this.popupMenu != "undefined"){
		  			this.popupMenu.items.map((item,i)=>{
		  				if(item.label.indexOf('HNS Node') >= 0){
		  					//update label;
		  					this.popupMenu.items[i].label = symbol+'HNS Node: '+syncStatus;
		  				}
		  			})
		  		}
		  	}
	  		
	  	}).catch(e=>{
	  		
	  		if(process.platform == 'darwin'){
	  			nw.Window.get().menu.items[0].submenu.items.map((item,i)=>{
	  				if(item.label.indexOf('HNS Node') >= 0){
	  					//update label;
	  					nw.Window.get().menu.items[0].submenu.items[i].label = '🔴 HNS Node Not Responding';
	  				}
	  			})
		  	}
		  	else{
		  		if(typeof this.popupMenu != "undefined"){
		  			this.popupMenu.items.map((item,i)=>{
		  				if(item.label.indexOf('HNS Node') >= 0){
		  					//update label;
		  					this.popupMenu.items[i].label = '🔴 HNS Node Not Responding';
		  				}
		  			})
		  		}
		  	}
	  	});
			/*if(process.platform == 'darwin'){
	  		nw.Window.get().menu.items[0].submenu.items[3].label = 'Options';
	  	}*/
		},10000)
	}
}
