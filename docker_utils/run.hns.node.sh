#!/bin/bash

APIKEY=HandyBrowser
if [ $1 ]
then
	APIKEY=$1
fi

cd /usr/hsd && \
./bin/hsd --network=main \
--cors=true \
--ns-port=5351 \
--api-key=$APIKEY \
--http-host=0.0.0.0