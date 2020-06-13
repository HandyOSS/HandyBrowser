const fs = require('fs');
const geoIP = require('geoip-lite');
module.exports = {
	getNetworkHosts(){
		//var geo = geoip.lookup(ip);
		return new Promise((resolve,reject)=>{
			let networkData = fs.readFileSync(process.env.HOME+'/.hsd/hosts.json','utf8');
			networkData = JSON.parse(networkData);
			let uniqueIPs = {};
			networkData.addrs.map(addressData=>{
				let ip = addressData.addr.indexOf('@') >= 0 ? addressData.addr.split('@')[1] : addressData.addr;
				ip = ip.split(':')[0];
				if(ip != '0.0.0.0' || ip != '127.0.0.1' && !uniqueIPs[ip]){
					uniqueIPs[ip] = {hsdInfo: addressData};
				}
			});
			Object.keys(uniqueIPs).map(ip=>{
				let ipData = geoIP.lookup(ip);
				uniqueIPs[ip].geo = ipData;
			});
			resolve(uniqueIPs);
		});
	}
}