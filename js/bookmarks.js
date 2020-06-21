const spawn = require('child_process').spawn;
const fs = require('fs');
class BookmarkManager{
	constructor(tray){
		this.tray = tray;
		this.faviconData = {};
		this.checkForChromeBookmarks()
		this.addEvents();
		this.createBookmarksMenu();
	}
	checkForChromeBookmarks(){
		let chromeBookmarksBase = process.env.HOME+'/Library/Application\ Support/Google/Chrome/';
		if(process.platform == 'win32'){
			chromeBookmarksBase = process.env.HOMEDRIVE+process.env.HOMEPATH+'/AppData/Local/Google/Chrome/User\ Data/';
		}
		if(process.platform == 'linux'){
			chromeBookmarksBase = process.env.HOME+'/.config/google-chrome/';
		}

		//check base first
		this.hasChromeBookmarksPresent = false;
		if(!fs.existsSync(chromeBookmarksBase)){
			return false;
		}

		let chromeBookmarksDefault = '/Default/Bookmarks';
		let chromeBookmarksPath;

		let dirList = fs.readdirSync(chromeBookmarksBase);
		if(dirList.indexOf('Default') == -1){
			dirList.map(dir=>{
				if(dir.toLowerCase().indexOf("profile") == 0){
					chromeBookmarksDefault = '/'+dir+'/Bookmarks';
				}
			})
		}
		
		this.hasChromeBookmarksPresent = false;
		if(fs.existsSync(chromeBookmarksBase + chromeBookmarksDefault)){
			this.hasChromeBookmarksPresent = true;
			chromeBookmarksPath = chromeBookmarksBase + chromeBookmarksDefault;
		}
		this.chromeBookmarksPath = chromeBookmarksPath;
	}
	createBookmarksMenu(){
		let menuType = process.platform == 'darwin' ? 'menubar' : 'contextmenu';
		let topMenu = new nw.Menu({type:menuType});
		this.mainMenu = new nw.Menu();
		

		let mapOption = nw.MenuItem({label:'Network Map',click:()=>{
			this.showNetworkMap();
		}});
		if(process.platform == 'darwin'){
			this.mainMenu.append(mapOption);
		}
		//showDonate()

		let donateOption = nw.MenuItem({label:'Donate HNS 🤝',click:()=>{
			this.showDonate();
		}});
		if(process.platform == 'darwin'){
			this.mainMenu.append(donateOption);
		}

		this.bookmarksObj = {};
		this.bookmarkFolder = process.env.HOME+'/Library/Application\ Support/HandyBrowser/Bookmarks';
		if(process.platform == 'win32'){
			this.bookmarkFolder = process.env.HOMEDRIVE+process.env.HOMEPATH+'/AppData/Local/HandyBrowser/User\ Data/Default/Bookmarks';
		}
		if(process.platform == 'linux'){
			this.bookmarkFolder = process.env.HOME+'/.config/HandyBrowser/Default/Bookmarks';
		}
		if (!fs.existsSync(this.bookmarkFolder)){
	    fs.mkdirSync(this.bookmarkFolder);
		}
		this.bookmarksMenu = new nw.Menu();
		let showBookmarksBar = localStorage.getItem('showBookmarksBar') != null ? localStorage.getItem('showBookmarksBar') : true;
		let checkboxItem = new nw.MenuItem({label: 'Show Bookmarks Bar',checked:showBookmarksBar,type:'checkbox',click:(item)=>{
			localStorage.setItem('showBookmarksBar',checkboxItem.checked);
			if(!checkboxItem.checked){
				this.tray.$bookmarksBar.removeClass('visible');
				$('#dragHandle',this.tray.trayWindow.window.document).removeClass('bookmarksBarShowing');
			}
			else{
				$('#dragHandle',this.tray.trayWindow.window.document).addClass('bookmarksBarShowing');
				this.generateBookmarksMenu(this._localBookmarksData);
			}
			this.tray.resizeActive(false);
			this.tray.calcTabSize();
		}});
		this.bookmarksMenu.append(checkboxItem);
		let bookmarkManagerOption = nw.MenuItem({label:'Bookmark Manager',click:()=>{
			this.showBookmarksManager();
		}})
		this.bookmarksMenu.append(bookmarkManagerOption);

		this.importFromLocal();
		this.importFromChrome();
		if(process.platform == 'darwin'){
			let topItem = new nw.MenuItem({
				label:'Bookmarks',
				submenu:this.mainMenu
			})
			topMenu.append(
				topItem
	  	);

			topItem.submenu.append(new nw.MenuItem({label:'Bookmarks',submenu:this.bookmarksMenu}))
		}
		else{
			topMenu.append(
				new nw.MenuItem({
					label:'Bookmarks',
					submenu:this.bookmarksMenu
				})
			)
		}

		if(process.platform == 'win32' || process.platform == 'linux'){
			topMenu.append(mapOption);
			topMenu.append(donateOption);
		}
		let restartDockerOption = nw.MenuItem({label:'Restart Docker HSD',click:()=>{
			this.restartDocker();
		}});
		let nukeOption = nw.MenuItem({label:'Nuke & Rebuild Docker HSD',click:()=>{
			let didConfirm = confirm('⚠️ Docker rebuild will take a few minutes to Rebuild and Sync HSD.\nAre you sure?');
			if(didConfirm){
				this.nukeDocker();

			}
		}});
  	this.tray.getHSDNodeStatus().then((d)=>{

  		let syncStatus = d.status;
  		let symbol = d.symbol;
  		
  		if(process.platform == 'darwin'){
  			this.mainMenu.append(new nw.MenuItem({label:symbol+'HNS Node: '+syncStatus}))
  			this.mainMenu.append(restartDockerOption);
  			this.mainMenu.append(nukeOption);
  		}
  		else{
  			topMenu.append(new nw.MenuItem({label:symbol+'HNS Node: '+syncStatus}))
  			topMenu.append(restartDockerOption)
  			topMenu.append(nukeOption);
  		}
  	}).catch(e=>{
  		if(process.platform == 'darwin'){
  			this.mainMenu.append(new nw.MenuItem({label:'🔴 HNS Node Not Responding'}))
  			this.mainMenu.append(restartDockerOption);
  			this.mainMenu.append(nukeOption);
  		}
  		else{
  			topMenu.append(new nw.MenuItem({label:'🔴 HNS Node Not Responding'}));
  			topMenu.append(restartDockerOption);
  			topMenu.append(nukeOption);
  		}
  	});
  	
		
	  
		if(process.platform == 'darwin'){
		  	this.mainMenu.createMacBuiltin("HandyBrowser");
		  	nw.Window.get().menu = topMenu;
		}
		else{
			this.tray.popupMenu = topMenu;
		}
		if(process.platform == 'darwin'){
	  		nw.Window.get().menu.items[0].submenu.items[3].label = 'Options';
	  	}
		

		if(process.platform == 'win32' || process.platform == 'linux'){
		  $('#winBookmarks',nw.Window.get().window.document).off('click').on('click',function(e){
		  	let dim = $(this)[0].getBoundingClientRect();
		  	topMenu.popup(Math.floor(dim.left+dim.width), Math.floor(dim.top));
		  	return false;
		  }).show();
		}
	  	
  	
	}
	addEvents(){
		$('#bookmarkPage').off('click').on('click',()=>{
			if(typeof this.tray.activeTab != "undefined"){
				this.addNewBookmark();
				$('#bookmarkPage').addClass('clicked');
			}
		})
	}
	showNetworkMap(){
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
		this.tray.bookmarkManagerIsShowing = true;
		fs.readFile('./networkMap.html','utf8',(err,snippet)=>{
			$('#modal').html($(snippet))
		  switch(process.platform){
		  	case 'win32':
		  		$('#modalNav').addClass('windows');
		  	break;
		  	case 'linux':
		  		$('#modalNav').addClass('linux');
		  	break;
		  }

		  	$.getScript('https://api.mapbox.com/mapbox-gl-js/v1.11.0/mapbox-gl.js',()=>{
		  		$('#modal').show();
				this.mapApp = new NetworkMap();
				$('#closeMap',$('#modal')).on('click',()=>{
					$('#modal').hide().html('');
					delete this.mapApp;
				})
		  	});
			
		});
		
	}
	showDonate(){
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
		this.tray.bookmarkManagerIsShowing = true;
		fs.readFile('./donate.html','utf8',(err,snippet)=>{
			$('#modal').html($(snippet));
			switch(process.platform){
		  	case 'win32':
		  		$('#modalNav').addClass('windows');
		  	break;
		  	case 'linux':
		  		$('#modalNav').addClass('linux');
		  	break;
		  }
		  $('#modal').show();
			$('#modal #closeMap').on('click',()=>{
				$('#modal').hide();
			})
			$('#modal .selectMe').off('click').on('click',function(){
				$(this).focus();
				$(this).select();
			})
		})
		
	}
	showBookmarksManager(){
		let localPath = process.env.HOME+'/Library/Application\ Support/HandyBrowser/Bookmarks/bookmarks.json';
		let chromeBookmarksPath = this.chromeBookmarksPath 
		if(process.platform == 'win32'){
			localPath = process.env.HOMEDRIVE+process.env.HOMEPATH+'/AppData/Local/HandyBrowser/User\ Data/Default/Bookmarks/bookmarks.json';
		}
		if(process.platform == 'linux'){
			localPath = process.env.HOME+'/.config/HandyBrowser/Default/Bookmarks/bookmarks.json';
		}
		let bookmarks = [];
		let chromeBookmarks = [];
		if(fs.existsSync(localPath)){
			bookmarks = JSON.parse(fs.readFileSync(localPath,'utf8'));
		}

		if(this.hasChromeBookmarksPresent){
			let cbookmarks = JSON.parse(fs.readFileSync(chromeBookmarksPath,'utf8'));
			chromeBookmarks = cbookmarks.roots['bookmark_bar'].children || [];
		}
		let bmId = 0;
		
		
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
		this.tray.bookmarkManagerIsShowing = true;
		fs.readFile('./bookmarkManager.html','utf8',(err,snippet)=>{
			$('#modal').html($(snippet));
			$('.bookmarksManager',$('#modal')).addClass('showing');
			const _this = this;
			chromeBookmarks.map(bm=>{
				processBookmark(bm,$('.bookmarksManager .panel.chrome',$('#modal')),'chrome')
			});
			if(chromeBookmarks.length == 0){
				$('.panel.chrome',$('#modal')).hide();
				$('.panel.local',$('#modal')).css('width','100%');
				$('.bookmarksManager',$('#modal')).css({
					width:'50%',
					left:'25%'
				})
				$('.bookmarksManager .subtitle',$('#modal')).eq(0).hide();
				$('.bookmarksManager .subtitle',$('#modal')).eq(1).css({
					width: 'calc(100% - 10px)'
				})
			}
			bookmarks.map(bm=>{
				processBookmark(bm,$('.bookmarksManager .panel.local',$('#modal')),'local');
			});
			function processBookmark(bm,$parent,listType){
				let fid = '';
				let sortOpts = {
					group:'localItem',
					fallbackOnBody: true
				};
				if(listType == 'chrome'){
					sortOpts.group = {
						name:'localItem',
						pull:'clone',
						put:'false'
					}
					sortOpts.sort = false;
				}
				if(typeof _this.faviconData[encodeURIComponent(bm.url)] != "undefined"){
					fid = _this.faviconData[encodeURIComponent(bm.url)];
				}
				let pre = bm.type == 'folder' ? '<span class="folderIcon">&#x1F4C1;</span>' : '<img src="'+fid+'" />'
				let $li = $('<div class="'+bm.type+' localItem">'+pre+'<input type="text" value="'+bm.name+'" /><div class="delete">x</div></div>');
				$('.delete',$li).on('click',()=>{
					$li.remove();
				})
				$li.data(bm);
				if(listType == 'local')
				
				if(bm.type == 'folder'){
					let $listArea = $('<div class="listArea"></div>');
					$li.append($listArea);
					bm.children.map(child=>{
						let fid2 = '';
						if(typeof _this.faviconData[encodeURIComponent(child.url)] != "undefined"){
							fid2 = _this.faviconData[encodeURIComponent(child.url)];
						}
						let pre2 = child.type == 'folder' ? '<span class="folderIcon">&#x1F4C1;</span>' : '<img src="'+fid2+'" />'
						let $li2 = $('<div class="'+child.type+' localItem">'+pre2+'<input type="text" value="'+child.name+'" /><div class="delete">x</div></div>');
						
						$('.delete',$li2).on('click',()=>{
							$li2.remove();
						})
						$li2.data(child);
						if(listType == 'local')
						
						$listArea.append($li2);

						if(child.type == 'folder' && child.children){
							let $listArea2 = $('<div class="listArea"></div>');
							$li2.append($listArea2);
							child.children.map(child=>{
								processBookmark(child,$listArea2,listType);
							})

							new Sortable($listArea2[0],sortOpts);
						}
						//mouse events
						if(listType == 'local'){
							$('input',$li2).on('mouseenter',function(){
								$('.panel .delete',$('#modal')).hide();
								let dim2 = $(this).position();
								$(this).siblings('.delete').css({
									left: dim2.left + $(this).width() - 3,// - $('.delete',$li2).outerWidth(),
									top: dim2.top+ 3
								});
								$(this).siblings('.delete').show()
							}).on('mouseleave',function(e){
								if(!$(e.relatedTarget).hasClass("delete")){
									$(this).siblings('.delete').hide()
								}
							})
						}
					});
					new Sortable($('.listArea',$li)[0],sortOpts);
				};
				$parent.append($li);
				//mouse event on parent
				if(listType == 'local'){
					$('input',$li).on('mouseenter',function(){
						$('.panel .delete',$('#modal')).hide();
						let dim = $(this).position()
						$(this).siblings('.delete').css({
							left: dim.left + $(this).width() - 3,// - $('.delete',$li).outerWidth(),
							top: dim.top+ 3
						});
						$(this).siblings('.delete').show()
					}).on('mouseleave',function(e){
						if(!$(e.relatedTarget).hasClass("delete")){
							$(this).siblings('.delete').hide()
						}
					})
				}
			}
			let sortOptsMain = {
				group:'localItem',
				fallbackOnBody: true
			};
			let sortOptsMainChrome = {
				group:{
					name:'localItem',
					pull:'clone',
					put:false
				},
				sort:false
				
			}
			
			if(chromeBookmarks.length > 0){
				let s = $('#modal .bookmarksManager .panel.chrome')[0];
				new Sortable(s,sortOptsMainChrome);
			}
			//if(bookmarks.length > 0){
				let s = $('#modal .bookmarksManager .panel.local')[0];
				new Sortable(s,sortOptsMain);
			//}
			
			let dims = $('.bookmarksManager',$('#modal'))[0].getBoundingClientRect();
			$('.bookmarksManager',$('#modal')).height(this.tray.trayWindow.height-dims.top-20)
			

			$('.bookmarksManager .save',$('#modal')).on('click',()=>{
				let newBookmarkData = [];
				
				processElement($('.bookmarksManager .panel.local',$('#modal')));
				//save bookmarks data
				fs.writeFileSync(localPath,JSON.stringify(newBookmarkData),'utf8');
				//win.close();
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
				this.createBookmarksMenu();
				
				function processElement($el,parentItem){
					//process new bookmarks data
					if($el.hasClass('folder')){
						$el = $el.children('.listArea');
					}
						
					$el.children('.localItem').each(function(){
						let data = $(this).data();
						let type = $(this).hasClass('folder') ? 'folder' : 'url'
						let name = $(this).find('input').eq(0).val();
						let url = data['url'];
						
						let item = {
							type:type,
							name:name,
							url:url
						};
						if(type == 'folder'){
							//get children
							item.children = [];
							
							processElement($(this),item);
							if(typeof parentItem != "undefined"){
								parentItem.children.push(item)
							}
							else{
								newBookmarkData.push(item);
							}
						}
						else{
							if(typeof parentItem == "undefined"){
								newBookmarkData.push(item);
							}
							else{
								parentItem.children.push(item);
							}
							
						}
					});
					
				}
			})
			$('.bookmarksManager .cancel',$('#modal')).on('click',()=>{
				//win.close();
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			});
			$('.backgroundImage',$('#modal')).on('click',()=>{
				//win.close();
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			})
			$('#modal').show();
		});
		
	}
	addNewBookmark(){
		let localPath = process.env.HOME+'/Library/Application\ Support/HandyBrowser/Bookmarks/bookmarks.json';
		if(process.platform == 'win32'){
			localPath = process.env.HOMEDRIVE+process.env.HOMEPATH+'/AppData/Local/HandyBrowser/User\ Data/Default/Bookmarks/bookmarks.json';
		}
		if(process.platform == 'linux'){
			localPath = process.env.HOME+'/.config/HandyBrowser/Default/Bookmarks/bookmarks.json';
		}
		let title = this.tray.activeTab.title == "" ? this.tray.activeTab.url : this.tray.activeTab.title;
		let url = this.tray.activeTab.url;
		let obj = {
			type:'url',
			name:title,
			url:url
		};
		let bmData;
		if(fs.existsSync(localPath)){
			bmData = JSON.parse(fs.readFileSync(localPath,'utf8'))
			//bmData.push(obj);
		}
		else{
			bmData = [];
			//bmData.push(obj);
		}
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
		
		this.tray.bookmarkManagerIsShowing = true;
		fs.readFile('./bookmarkManager.html','utf8',(e,snippet)=>{
			$('#modal').html($(snippet));
			let folderNames = bmData.filter(d=>{
				return d.type == 'folder';
			}).map(d=>{
				$('#bmFolder',$('#modal')).append('<option value="'+d.name+'">'+d.name+'</option>')
			});
			$('#bmName',$('#modal')).val(title);
			$('#bmFolder',$('#modal')).on('change',()=>{
				let val = $('#bmFolder option:selected',$('#modal')).val();
				if(val == '__new__'){
					$('#folderName',$('#modal')).show();
				}
				else if(val == '__none__'){
					$('#folderName',$('#modal')).val(val).hide()
				}
				else{
					$('#folderName',$('#modal')).val(val);
				}
			})
			$('.content',$('#modal')).addClass('showing');
			$('#cancel',$('#modal')).on('click',()=>{
				$('#bookmarkPage',this.tray.trayWindow.window.document).removeClass('clicked')
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			})
			$('.backgroundImage',$('#modal')).on('click',()=>{
				$('#bookmarkPage',this.tray.trayWindow.window.document).removeClass('clicked')
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			})	
			$('#done',$('#modal')).on('click',()=>{
				

				obj.name = $('#bmName',$('#modal')).val();
				let folder = $('#folderName',$('#modal')).val();
				if(folder == '__none__' || folder == ''){
					//push at top level
					obj.type = 'url';
					bmData.push(obj);
				}
				else{
					//is folder
					obj.type = 'folder';
					obj.name = folder;
					obj.children = [];
					let childObj = {
						type:'url',
						url:url,
						name: $('#bmName',$('#modal')).val()
					}
					let existingFolder = bmData.find(d=>{
						let isMatch = d.type == 'folder' && d.name == obj.name;
						if(isMatch){
							d.children.push(childObj);
						}
						return isMatch;
					});
					
					if(!existingFolder){
						
						obj.children.push(childObj);
						bmData.push(obj);
					}
					
				}
				
				$('#modal').hide();
				fs.writeFileSync(localPath,JSON.stringify(bmData,null,2),'utf8');
				this.createBookmarksMenu();
			});
			$('#modal').show();
		})
		
	}
	importFromLocal(){
		let localPath = process.env.HOME+'/Library/Application\ Support/HandyBrowser/Bookmarks/bookmarks.json';
		if(process.platform == 'win32'){
			localPath = process.env.HOMEDRIVE+process.env.HOMEPATH+'/AppData/Local/HandyBrowser/User\ Data/Default/Bookmarks/bookmarks.json';
		}
		if(process.platform == 'linux'){
			localPath = process.env.HOME+'/.config/HandyBrowser/Default/Bookmarks/bookmarks.json';
		}
		let localBookmarkMenu = new nw.MenuItem({label:'HandyBrowser Bookmarks',submenu:new nw.Menu()})
		localBookmarkMenu.submenu.append(new nw.MenuItem({label:'Add New Bookmark...',click:()=>{
			this.addNewBookmark();
		}}))
		if(fs.existsSync(localPath)){
			
			let bookmarks = JSON.parse(fs.readFileSync(localPath,'utf8'));
			if(typeof bookmarks == "undefined"){
				bookmarks = {};
			}
			this.generateBookmarksMenu(bookmarks);
			Object.keys(bookmarks).map(key=>{
				let bm = bookmarks[key];
				if(bm.type == 'folder'){
					let bmFolder = new nw.MenuItem({label:bm.name,submenu:new nw.Menu()});

					if(bm.children.length > 0){
						//import this folder
						this.recurseChromeChildren(bm,bmFolder);
						
					}
					localBookmarkMenu.submenu.append(bmFolder);
				}
				if(bm.type == 'url'){
					//individual sloppy urls
					localBookmarkMenu.submenu.append(nw.MenuItem({label:bm.name,icon:'https://www.google.com/s2/favicons?domain='+bm.url,click: () => {
				    this.addNewTrayTab(bm.url);
				  }}))
				}
			});
			
		}
		else{
			//this.tray.$bookmarksBar.removeClass('visible');
			//no bookmarks, use/save local defaults and start over
			let defaults = $.getJSON('./js/bookmarks_default.json',d=>{
				fs.writeFileSync(localPath,JSON.stringify(d,null,2),'utf8');
				this.importFromLocal();
				return false;
			})
		}
		this.bookmarksMenu.append(localBookmarkMenu);
	}
	importFromChrome(){
		//TODO get/cache favicons:: https://www.google.com/s2/favicons?domain=
		
		let chromeBookmarksPath = this.chromeBookmarksPath;
		
		if(this.hasChromeBookmarksPresent){
			let chromeBookmarkMenu = new nw.MenuItem({label:'Chrome Bookmarks',submenu:new nw.Menu()})
			let bookmarks = JSON.parse(fs.readFileSync(chromeBookmarksPath,'utf8'));
			Object.keys(bookmarks.roots).map(key=>{
				let bm = bookmarks.roots[key];
				if(bm.type == 'folder'){
					let bmFolder = new nw.MenuItem({label:bm.name,submenu:new nw.Menu()});

					if(bm.children.length > 0){
						//import this folder
						this.recurseChromeChildren(bm,bmFolder);
						
					}
					chromeBookmarkMenu.submenu.append(bmFolder);
				}
				if(bm.type == 'url'){
					//individual sloppy urls
					chromeBookmarkMenu.submenu.append(nw.MenuItem({label:child.name,icon:'https://www.google.com/s2/favicons?domain='+child.url,click: () => {
				    this.addNewTrayTab(bm.url);
				  }}))
				}
			});
			this.bookmarksMenu.append(chromeBookmarkMenu)
		}
	}
	recurseChromeChildren(bookmarkFolder,menuFolder){
		bookmarkFolder.children.map(child=>{
			if(child.type == 'folder'){
				let bmFolder = new nw.MenuItem({label:child.name,submenu:new nw.Menu()});
				this.recurseChromeChildren(child,bmFolder);
				menuFolder.submenu.append(bmFolder);
			}
			else{
				menuFolder.submenu.append(nw.MenuItem({label:child.name,icon:'https://www.google.com/s2/favicons?domain='+child.url,click: () => {
			    this.addNewTrayTab(child.url);
			  }}))
			}
		});
		
		
	}
	generateBookmarksMenu(bookmarks){
		if(typeof bookmarks == "undefined"){
			bookmarks = {};
		}
		let shouldShow = localStorage.getItem('showBookmarksBar');
		if(shouldShow != null){
			if(shouldShow){
				this.tray.$bookmarksBar.addClass('visible');
			}
			else{
				this.tray.$bookmarksBar.removeClass('visible');
				return;
			}
		}
		else{
			this.tray.$bookmarksBar.addClass('visible');
			localStorage.setItem('showBookmarksBar',true);
			this.tray.$bookmarksBar.addClass('visible');
		}
		$('ul.bookmarksUl',this.tray.$bookmarksBar).html('');
		let barWidth = this.tray.$bookmarksBar.width();
		
		this._localBookmarksData = bookmarks;
		let $truncatedUl = $('<ul class="bookmarkFolderUl" />');
		Object.keys(bookmarks).map(key=>{
			let bm = bookmarks[key];
			let liW = 0;//$('li',this.tray.$bookmarksBar).length > 0 ? $('li',this.tray.$bookmarksBar).last().outerWidth()+ : 0;
			if($('li',this.tray.$bookmarksBar).length > 0){
				let liDims = $('li',this.tray.$bookmarksBar).last()[0].getBoundingClientRect();
				liW = liDims.left + liDims.width+ 130;
			}
			if(bm.type == 'folder'){
				//let bmFolder = new nw.MenuItem({label:bm.name,submenu:new nw.Menu()});
				
				let $li = $('<li class="folder"><span class="folder">&#x1F4C1;</span>'+bm.name+'</li>');
				
				if(bm.children.length > 0){
					//import this folder
					//this.recurseChromeChildren(bm,bmFolder);
					this.recurseIntoBookmarkBarFolder(bm,$li);
				}
				$li.on('click',()=>{
					let $childUl = $($li).children('ul.bookmarkFolderUl').clone(true,true);
					this.openBookmarksWindowOnClick($childUl,$li,bm.name);
				})

				if(liW > barWidth){
					//time to truncate
					$truncatedUl.append($li);
				}
				else{
					$('ul.bookmarksUl',this.tray.$bookmarksBar).append($li);
				}
				
			}
			if(bm.type == 'url'){
				
			
				let $li
				if(typeof this.faviconData[encodeURIComponent(bm.url)] == "undefined"){

					$li = $('<li class="url"><span class="iconPlaceholder"></span>'+bm.name+'</li>');
					$.getJSON('http://__handybrowser_getfavicon__/'+encodeURIComponent(bm.url),(d)=>{
						this.faviconData[encodeURIComponent(bm.url)] = d.icon;
						$('.iconPlaceholder',$li).remove();
						$li.prepend('<img src="'+d.icon+'" class="icon" />')
					});
				}
				else{
					$li = $('<li class="url"><img src="'+this.faviconData[encodeURIComponent(bm.url)]+'" class="icon" />'+bm.name+'</li>');
				}
				$li.on('click',()=>{
					this.addNewTrayTab(bm.url);
				})
				if(liW > barWidth){
					//time to truncate
					$truncatedUl.append($li)
				}
				else{
					$('ul.bookmarksUl',this.tray.$bookmarksBar).append($li)
				}
			
			}
		});
		if($('li',$truncatedUl).length > 0){
			let $li = $('<li class="folder"><span class="folder"></span>&raquo;</li>');
			//$li.append($truncatedUl);
			$li.on('click',()=>{
				this.openBookmarksWindowOnClick($truncatedUl.clone(true,true),$li,'...');
			})
			$('ul.bookmarksUl',this.tray.$bookmarksBar).append($li)
		}
	}
	openBookmarksWindowOnClick($childUl,$li,name){
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
		let pos = $li[0].getBoundingClientRect();
		let liH = $li.outerHeight();
		
		this.tray.bookmarkManagerIsShowing = true;
		fs.readFile('./bookmarkManager.html','utf8',(err,snippet)=>{
			$('#modal').html($(snippet));

			$('#modal').show();
			$('.bookmarkListContent .title',$('#modal')).html(name);
			$('.bookmarkListContent .listContainer',$('#modal')).html($childUl);
			$('.bookmarkListContent .listContainer',$('#modal')).css({
				'max-height':h-160
			})
			let nativeW = $('.bookmarkListContent',$('#modal')).width();
			let posX = pos.x;
			if(pos.x + $('.bookmarkListContent',$('#modal')).width() > w){
				$('.bookmarkListContent',$('#modal')).css('width',$('.bookmarkListContent',$('#modal')).width());
				posX = w - ($('.bookmarkListContent',$('#modal')).width()+20);
			}
			
			$('.bookmarkListContent .listContainer li',$('#modal')).on('click',()=>{
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			})
			$('.bookmarkListContent',$('#modal')).css({
				'max-height':h-100,
				'left':posX,
				'top':pos.y+liH+5
			}).addClass('showing');;
			$('.bookmarkListContent .close',$('#modal')).on('click',()=>{
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			})
			$('.backgroundImage',$('#modal')).on('click',()=>{
				$('#modal').hide();
				this.tray.bookmarkManagerIsShowing = false;
			});
			$('#modal .bookmarkFolderUl').css("display",'block');
			
		});
		
	}
	recurseIntoBookmarkBarFolder(bm,$li){
		let $ul = $('<ul class="bookmarkFolderUl" />')
		
		bm.children.map(child=>{
			let li;

			if(child.type == 'folder'){
				li = $('<li class="url"><span class="folder">&#x1F4C1;</span>'+child.name+'</li>');
			}
			else{
				if(typeof this.faviconData[encodeURIComponent(child.url)] == "undefined"){

					li = $('<li class="url"><span class="iconPlaceholder"></span>'+child.name+'</li>');
					$.getJSON('http://__handybrowser_getfavicon__/'+encodeURIComponent(child.url),(d)=>{
						this.faviconData[encodeURIComponent(child.url)] = d.icon;
						$('.iconPlaceholder',li).remove();
						li.prepend('<img src="'+d.icon+'" class="icon" />')
					});
				}
				else{
					li = $('<li class="url"><img src="'+this.faviconData[encodeURIComponent(child.url)]+'" class="icon" />'+child.name+'</li>');
				}
				li.on('click',()=>{
					this.addNewTrayTab(child.url);
				})
			}
			
			if(child.children){
				//import this folder
				//this.recurseChromeChildren(bm,bmFolder);
				this.recurseIntoBookmarkBarFolder(child,li);
			}
			
			$ul.append(li);
		})
		$li.append($ul);
	}
	addNewTrayTab(url){
		$('#sessionNotification',this.tray.trayWindow.window.document).hide();
		this.tray.isAddingNewTab = true;
		$('#tabs ul li',this.tray.trayWindow.window.document).removeClass('tabtarget');
    let $liTarget = $('<li class="notactivated tabtarget"><span class="faviconWrap"><div class="lds-ripple"><div></div><div></div></div></span><span class="pageTitle">New Tab</span></li>')
    
    if($('#tabs ul li').length == 1 && this.tray._tabs.length == 0){
    	//hasnt init yet
    	$liTarget = $('#tabs ul li').eq(0);
    }
    else{
    	$('#tabs ul',this.tray.trayWindow.window.document).append($liTarget);
    }
    
	  let i = $('#tabs li',this.tray.trayWindow.window.document).length -1;
    let activeWin = this.tray.activeWindow
	  
	  this.tray.addNewTab(url,$liTarget,i);
	  if(typeof activeWin != "undefined"){
		  setTimeout(()=>{

		  	activeWin.hide();
		  },1000);
		}
	}
	restartDocker(){
		$('#restartDockerNotification').html('Restarting HSD Container');
		$('#restartDockerNotification').show();
		let hasError = false;
		let s = spawn('docker',['restart','HandyBrowserHSD']);
		s.stdout.on('data',d=>{})
		s.stderr.on('data',d=>{
			hasError = true;
			$('#restartDockerNotification').html('Error Restarting HSD Container')
		})
		s.on('close',()=>{
			if(!hasError){
				//$('#restartDockerNotification').html('Successfully Restarted');
				//restart hsd then
				this.restartHSD();
			}
			/*setTimeout(()=>{
				$('#restartDockerNotification').hide();
			},2000);*/
		})
	}
	nukeDocker(){
		localStorage.setItem('isRebuildingDockerNode','true');
		nw.Window.open('./boot.html',{
	    "width": 480,
	    "frame":false,
	    "resizable":false,
	    "position":"center",
	    "height": 240
		},(win)=>{
			win.focus();
		});
	}
	restartHSD(){
		let guid = localStorage.getItem('guid');
		let hsdProcess = spawn('docker',['exec','-i','HandyBrowserHSD','sh','-c','"./run.hns.resolver.sh\ '+guid+'"'],{shell:true})
		let hsdLogged = false;
		//let hsdLogs = '';
		hsdProcess.stdout.on('data',d=>{
			if(!hsdLogged && d.toString('utf8').indexOf('listening on port 53') >= 0){
				hsdLogged = true;
				$('#restartDockerNotification').html('Restarted HSD');
					this.tray.checkHSDStatus();
				setTimeout(()=>{
					$('#restartDockerNotification').hide();
					this.tray.checkHSDStatus();
				},2000);
				setTimeout(()=>{
					this.createBookmarksMenu(); // sync for menus
				},10000)
				
			}
			
		})
		hsdProcess.stderr.on('data',d=>{
			$('#restartDockerNotification').html('Error Restarting HSD');
		})
		hsdProcess.on('close',d=>{
			setTimeout(()=>{
				$('#restartDockerNotification').hide();
			},2000);
		});
	}
}
