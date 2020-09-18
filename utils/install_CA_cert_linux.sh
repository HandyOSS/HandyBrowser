#!/bin/bash
### Mozilla uses cert8, Chromium and Chrome use cert9

###
### Requirement: apt install libnss3-tools
###


###
### CA file to install (CUSTOMIZE!)
###

certfile="$1"
certname="HandyBrowser"
homedir="$2" ##sudo-prompt loses env vars, sweet
###
### For cert8 (legacy - DBM)
###

for certDB in $(find ${homedir} -name "cert8.db")
do
    certdir=$(dirname ${certDB});
    certutil -D -n "${certname}" -d sql:${certdir};
    certutil -A -n "${certname}" -t "TCu,Cu,Tu" -i ${certfile} -d sql:${certdir};
    #certutil -L -d sql:${certdir};
done


###
### For cert9 (SQL)
###

for certDB in $(find ${homedir} -name "cert9.db")
do
    certdir=$(dirname ${certDB});
    certutil -D -n "${certname}" -d sql:${certdir};
    certutil -A -n "${certname}" -t "TCu,Cu,Tu" -i ${certfile} -d sql:${certdir};
    #certutil -L -d sql:${certdir};
done