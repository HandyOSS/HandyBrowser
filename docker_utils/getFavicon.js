const getFavicons = require('get-website-favicon');
const url = require('url');
const fs = require('fs');
const request = require('request');
const icoToPng = require('ico-to-png')

Object.defineProperty(String.prototype, 'hashCode', {
  value: function() {
    var hash = 0, i, chr;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
});
let failImage = 'data:image/png;base64,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';
		
module.exports = {
	getFaviconData(url,callback){
		return new Promise((resolve,reject)=>{
			let hostName = new URL(url).host;
			let b64;
			
			let pathHash = hostName.hashCode();
			if (!fs.existsSync(__dirname+'/favicon_cache/'+pathHash)) {
		    //get favicon
		    getFavicons(url).then(data=>{
		    	console.log('favicons',data);
		    	if(data.icons.length == 0 && url.indexOf("http:") == 0){
		    		//try https
		    		let newURL = url.replace('http:','https:');
		    		pathHash = newURL.hashCode();
		    		getFavicons(newURL).then(data2=>{
			    		this.cacheFavicon(pathHash,data2).then(b64Response=>{
								b64 = b64Response;
								//callback(b64);
								resolve(b64);
							});
			    	});
		    	}
					else{
						this.cacheFavicon(pathHash,data).then(b64Response=>{
							b64 = b64Response;
							//callback(b64);
							resolve(b64);
						});
					}
				});
			}
			else{
				//get from cache
				try{
					b64 = fs.readFileSync(__dirname+'/favicon_cache/'+pathHash+'/favicon.txt','utf8');
				}
				catch(e){
					resolve(failImage);
				}
				//callback(b64);
				resolve(b64);
			}
		})
		
		
		
	},
	cacheFavicon(pathHash,iconData,callback){
		//find correct image
		/*iconData.icons.map(icon=>{

		})*/
		
		return new Promise((resolve,reject)=>{
			if(typeof iconData.icons != "undefined"){
				let icon = iconData.icons.find(d=>{
					return d.src.indexOf('.ico') >= 0;// == 'image/x-icon';
				});
				if(typeof icon == "undefined"){
					resolve(failImage);
				}
				if(icon.length > 1){
					icon = icon[0];
				}
				if(icon.src.indexOf('.ico') >= 0){
					//is favicon
					fs.mkdirSync(__dirname+'/favicon_cache/'+pathHash);
					try{
						this.downloadFile(icon.src,__dirname+'/favicon_cache/'+pathHash+'/favicon.ico',()=>{
							const source = fs.readFileSync(__dirname+'/favicon_cache/'+pathHash+'/favicon.ico');
							icoToPng(source, 32).then((png) => {
								let b64String = 'data:image/png;base64,'+png.toString('base64')
							  fs.writeFileSync(__dirname+'/favicon_cache/'+pathHash+'/favicon.txt',b64String,'utf8');
							  //callback(b64String);
							  
							  resolve(b64String);
							  
							}).catch(err=>{
								resolve(failImage);
							})

						})
					}
					catch(e){
						resolve(failImage);
					}
				}
				else{
					//callback(failImage);
					resolve(failImage);
				}
			}
			else{
				//callback(failImage);
				resolve(failImage);
			}
		})
		
	},
	downloadFile(uri, filename, callback){
	  request.head(uri, function(err, res, body){
	    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	  });
	}
}