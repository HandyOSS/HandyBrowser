const spawn = require('child_process').spawn;
let option = process.argv[2];

if(option == 'pre'){
	//check if we are administrator, warn if not
	var platform = require("os").platform();

	if (platform == "win32" || platform == "win64") {
    require('child_process').exec('net session', function(err, stdout, stderr) {
      if (err || !(stdout.indexOf("There are no entries in the list.") > -1)) {
        console.log('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░');
				console.log('░░░░░░░░░░░░░\x1b[36m▄▄▄▄▄▄▄\x1b[0m░░░░░░░░░');
				console.log('░░░░░░░░░\x1b[36m▄▀▀▀░░░░░░░▀▄\x1b[0m░░░░░░░');
				console.log('░░░░░░░\x1b[36m▄▀░░░░░░░░░░░░▀▄\x1b[0m░░░░░░');
				console.log('░░░░░░\x1b[36m▄▀░░░░░░░░░░▄▀▀▄▀▄\x1b[0m░░░░░');
				console.log('░░░░\x1b[36m▄▀░░░░░░░░░░▄▀░░██▄▀▄\x1b[0m░░░░');
				console.log('░░░\x1b[36m▄▀░░▄▀▀▀▄░░░░█░░░▀▀░█▀▄\x1b[0m░░░');
				console.log('░░░\x1b[36m█░░█▄▄░░░█░░░▀▄░░░░░▐░█\x1b[0m░░░');
				console.log('░░\x1b[36m▐▌░░█▀▀░░▄▀░░░░░▀▄▄▄▄▀░░█\x1b[0m░░');
				console.log('░░\x1b[36m▐▌░░█░░░▄▀░░░░░░░░░░░░░░█\x1b[0m░░');
				console.log('░░\x1b[36m▐▌░░░▀▀▀░░░░░░░░░░░░░░░░▐▌\x1b[0m░');
				console.log('░░\x1b[36m▐▌░░░░░░░░░░░░░░░▄░░░░░░▐▌\x1b[0m░');
				console.log('░░\x1b[36m▐▌░░░░░░░░░▄░░░░░█░░░░░░▐▌\x1b[0m░');
				console.log('░░░\x1b[36m█░░░░░░░░░▀█▄░░▄█░░░░░░▐▌\x1b[0m░');
				console.log('░░░\x1b[36m▐▌░░░░░░░░░░▀▀▀▀░░░░░░░▐▌\x1b[0m░');
				console.log('░░░░\x1b[36m█░░░░░░░░░░░░░░░░░░░░░█\x1b[0m░░');
				console.log('░░░░\x1b[36m▐▌▀▄░░░░░░░░░░░░░░░░░▐▌\x1b[0m░░');
				console.log('░░░░░\x1b[36m█░░▀░░░░░░░░░░░░░░░░▀\x1b[0m░░░');
				console.log('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░');
				console.log('░░░░\x1b[31m RUN AS ADMINISTRATOR \x1b[0m░░░');
				console.log('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░');
				console.log('');
        console.log("\x1b[31mYOU MUST RUN THE INSTALLER AS ADMINISTRATOR.\x1b[0m");
        console.log("\x1b[31m1. Close This Installer.\x1b[0m");
        console.log("\x1b[31m2. Right Click and 'Run as Administrator'\x1b[0m");

        doExit();
      }
      else{
      	//continue install
      	process.exit(0);
      	
      }
    });
	}
}

if(option == 'post'){
	//post install riffraff
	const fs = require('fs');
	fs.readdir('./node_modules',(err,d)=>{
		if(!err){
			//success!!!!!
			unicornsYay();
		}
		else{
			console.log("THERE WAS A PROBLEM DURING INSTALL. TRY AGAIN.")
		}
	})
}

function doExit(){
	//JUST HOLD FOREVER TO PREVENT BASH FROM GOING ANYWHERE IN THE NEXT LONG TIME
	process.exit(1);
}
function unicornsYay(){

	console.log('                         \x1b[95m_________\x1b[0m')
	console.log('                      \x1b[95m.##\x1b[0m\x1b[36m@@\x1b[0m\x1b[32m&&&&\x1b[0m\x1b[36m@@\x1b[0m\x1b[95m##.\x1b[0m')
	console.log('                   \x1b[95m,##\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m::\x1b[0m\x1b[38;5;9m%&&&%%\x1b[0m\x1b[33m::\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m##.\x1b[0m')
	console.log('                  \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%%\x1b[0m\x1b[38;5;1mHANDYMINER\x1b[0m\x1b[38;5;9m%%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	console.log('                \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[38;5;1m00\'\x1b[0m         \x1b[38;5;1m\'00\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	console.log('               \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[38;5;1m0\'\x1b[0m             \x1b[38;5;1m\'0\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	console.log('              \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[38;5;1m0\x1b[0m                 \x1b[38;5;1m0\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	console.log('             \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[38;5;1m0\x1b[0m                   \x1b[38;5;1m0\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	console.log('             \x1b[95m#\x1b[0m\x1b[36m@\x1b[0m\x1b[32m&\x1b[0m\x1b[33m:\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[38;5;1m0\x1b[0m                   \x1b[38;5;1m0\x1b[0m\x1b[38;5;9m%\x1b[0m\x1b[33m:\x1b[0m\x1b[32m&\x1b[0m\x1b[36m@\x1b[0m\x1b[95m#\x1b[0m')
	//console.log('             \x1b[95m"\x1b[0m" \x1b[33m\'\x1b[0m "                   " \' "\x1b[95m"\x1b[0m')
	console.log('           \x1b[33m_oOoOoOo_\x1b[0m                    \x1b[92mTHE\x1b[0m ')
	console.log('          (\x1b[33moOoOoOoOo\x1b[0m)                \x1b[92mHANDSHAKE\x1b[0m')
	console.log('           )\`"""""\`(                 \x1b[92mCOMMUNITY\x1b[0m')
	console.log('          /          \\              ')   
	console.log('         |    \x1b[92mHNS\x1b[0m     |              ')
	console.log('         \\           /              ')
	console.log('          \`=========\`')
	console.log('')
	console.log('');
	console.log("  \x1b[92mINSTALLER WAS SUCCESSFUL!!!!\x1b[0m")
	process.exit(0);
}