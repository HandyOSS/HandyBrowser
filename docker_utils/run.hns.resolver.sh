#!/bin/bash
APIKEY=HandyBrowser
if [ $1 ]
then
	APIKEY=$1
fi

./bin/hsd --network=main \
--rs-host 0.0.0.0 \
--rs-port 53 \
--cors=true \
--api-key=$APIKEY \
--http-host=0.0.0.0