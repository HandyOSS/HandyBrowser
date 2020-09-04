#!/bin/bash

APIKEY=HandyBrowser
if [ $1 ]
then
	APIKEY=$1
fi

cd /usr/godane && \
./godane -addr :5301 -dns udp://:53 -pass $APIKEY