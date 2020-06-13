let mapApp;
$(document).ready(()=>{
	mapApp = new NetworkMap();
})
class NetworkMap{
	constructor(){
		$.getJSON('http://__handybrowser_get_hosts__',(data)=>{
			this.mapData = data;
			this.modelData();
		})
		
		
	}
	modelData(){
		let timeExtent = d3.extent(Object.keys(this.mapData),(k)=>{
			return this.mapData[k].hsdInfo.lastSuccess;
		});
		
		let colorScale = d3.scaleOrdinal()
			.range(d3.range(3))
			.domain(timeExtent);
		Object.keys(this.mapData).map(k=>{
			let d = this.mapData[k];
			d.color = colorScale(d.hsdInfo.lastSuccess);
		});
		this.drawMap();
	}
	drawMap(){
		const _this = this;
		let map = new mapboxgl.Map({
      "container":"map",
      "style":"mapbox://styles/earthlab/cjzobhdr311pu1cmvwovwkea9",
      "accessToken":"pk.eyJ1IjoiZWFydGhsYWIiLCJhIjoiY2p6b2JmNTRhMDB3dDNubHpyN2NnMTZ3cyJ9.2llpYjPArFZJdl9FBaqtDw",
      "zoom":1.128,
      "center":[37.8,9.03],
      hash: true,
      transformRequest: function(url, resourceType){
        if(resourceType === 'Source' && url.startsWith('http://myHost')) {
          return {
           url: url.replace('http', 'https'),
           headers: { 'my-custom-header': true},
           credentials: 'include'  // Include cookies for cross-origin requests
         }
        }
      }

    });
    this.map = map;
    map.on('load', function() {
      // Insert the layer beneath any symbol layer.
      var layers = map.getStyle().layers;

      var labelLayerId;
      for (var i = 0; i < layers.length; i++) {
	      if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
		      labelLayerId = layers[i].id;
		      break;
      	}
      }

      map.addLayer({
	      'id': '3d-buildings',
	      'source': 'composite',
	      'source-layer': 'building',
	      'filter': ['==', 'extrude', 'true'],
	      'type': 'fill-extrusion',
	      'minzoom': 15,
	      'paint': {
	      'fill-extrusion-color': '#aaa',

	      // use an 'interpolate' expression to add a smooth transition effect to the
	      // buildings as the user zooms in
	      'fill-extrusion-height': [
	      "interpolate", ["linear"], ["zoom"],
	      15, 0,
	      15.05, ["get", "height"]
	      ],
	      'fill-extrusion-base': [
	      "interpolate", ["linear"], ["zoom"],
	      15, 0,
	      15.05, ["get", "min_height"]
	      ],
	      'fill-extrusion-opacity': .6
	      }
      }, labelLayerId);

      var size = 156/* * (map.getZoom()/5)*/;
      var pulsingDot = {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),

        onAdd: function() {
	        var canvas = document.createElement('canvas');
	        canvas.width = this.width;
	        canvas.height = this.height;
	        this.context = canvas.getContext('2d');
	        canvas.addEventListener('click',function(err,d){
	          console.log('canvas clicked');
	        })
        },

        render: function() {
	        var duration = 1500;
	        var t = (performance.now() % duration) / duration;

	        var radius = size / 2 * 0.3;// * (map.getZoom()/5);
	        radius = radius > size/4 ? size/4 : radius;
	        var outerRadius = size / 2 * 0.7 * t + radius;
	        var context = this.context;

	        // draw outer circle
	        context.clearRect(0, 0, this.width, this.height);
	        context.beginPath();
	        context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
	        context.fillStyle = 'rgba(255, 200, 200,' + (1 - t) + ')';
	        context.fill();

	        // draw inner circle
	        context.beginPath();
	        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
	        context.fillStyle = 'rgba(255, 200, 100, 1)';
	        context.strokeStyle = 'white';
	        context.lineWidth = 2 + 4 * (1 - t);
	        context.fill();
	        context.stroke();

	        // update this image's data with data from the canvas
	        this.data = context.getImageData(0, 0, this.width, this.height).data;

	        // keep the map repainting
	        map.triggerRepaint();

	        // return `true` to let the map know that the image was updated
	        return true;
        }
      };
      map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
      	_this.plotPoints();
      //requestGeolocation(peers);
    	});
    	
  	}

    plotPoints(){
    	let clickedFrom;
	    let allMarkerCount = 0;
    	let map = this.map;
    	let featureData = [];
    	Object.keys(this.mapData).sort((a,b)=>{
    		return this.mapData[a].hsdInfo.lastSuccess - this.mapData[b].hsdInfo.lastSuccess;
    	}).map(ip=>{
    		let data = this.mapData[ip];
    		let geoData = data.geo;
    		//addMarkers(data,geoData.ll,data);
    		featureData.push({
          "type": "Feature",
          "geometry": {
	          "type": "Point",
	          "coordinates": [geoData.ll[1], geoData.ll[0]]
	          
	         },
	        "properties":{
	        	"color":data.color,
	        	"meta":data
	        }
        })
    		allMarkerCount++;
    	})
    	addMarkers(featureData);
    	
	    //function addMarkers(geo, coords, markerData) {
	    	function addMarkers(featuresData) {
	      //could be cleaner i bet

	      /*var marker = new mapboxgl.Marker()
					.setLngLat([coords[1], coords[0]])
					.addTo(map);
					return false;*/
	      let markerID = 'markers';
	      let color = d3.interpolateLab('#aaa','#00f513');
	      let range = d3.range(3);
	      let mS = d3.scaleLinear()
	      	.range([0.7,1])
	      	.domain([1,2]);
	      let mapboxColorVals = ['match',['get','color']];
	      range.map(v=>{
	      	let col = v == 0 ? '#aaa' : color(mS(v));
	      	mapboxColorVals.push(v,col);
	      });
	      mapboxColorVals.push('#000');
	      console.log('colors',mapboxColorVals);
	      var layer = map.addLayer({
	        "id": markerID,
	        "type": "circle",
	        "source": {
		        "type": "geojson",
		        "cluster":false,
		        "data": {
		          "type": "FeatureCollection",
		          "features": featuresData
		          /*[
		              {
		                "type": "Feature",
		                "geometry": {
		                "type": "Point",
		                "coordinates": [coords[1], coords[0]],
		                "meta":geo
		                }
		              }
		            ]*/
		          }
		        },

		        /*"layout": {
		        "icon-image": "pulsing-dot"
	        }*/
	        'paint': {
						// make circles larger as the user zooms from z12 to z22
						'circle-radius': {
							'base': 1,
							'stops': [
								[0, 3],
								[20, 40]
							]
						},
						// color circles by ethnicity, using a match expression
						// https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
						'circle-color': mapboxColorVals,
						'circle-stroke-color': 'rgba(255,255,255,1.0)',
						'circle-stroke-width': 1.0
					}
	      });
	      

	      animateCircles();
	      function animateCircles(){
	      	let size = 20;
	      	let opacity = 0.7;
	      	var duration = 1500;
	        var t = (performance.now() % duration) / duration;

	        var radius = size / 2 * 0.3 * (map.getZoom()/5);
	        radius = radius > size/20 ? size/20 : radius;
	        var outerRadius = size / 2 * 0.7 * t + radius;
	        let newOpacity = 0.7-(opacity * t);
	        let innerOpacity = (opacity * (t +0.5));
	        innerOpacity = innerOpacity > 1.0 ? 1.0 : innerOpacity;
	        
	        map.setPaintProperty(markerID,'circle-opacity',innerOpacity);
	        map.setPaintProperty(markerID,'circle-stroke-width',outerRadius);
	        map.setPaintProperty(markerID,'circle-stroke-color',`rgba(255,255,255,${newOpacity})`);
	        
	        requestAnimationFrame(()=>{
	        	animateCircles();
	        })
	      }
	      map.on('click','markers',(e)=>{
	      	clickedFrom = {
	          zoom:map.getZoom(),
	          center:map.getCenter(),
	          bearing:map.getBearing(),
	          pitch:map.getPitch()
	        }
	      	let flyData = e.features[0].geometry.coordinates.slice();
	      	console.log('marker click',e.features[0]);
	      	map.flyTo({center:flyData,zoom: 14, pitch:60});
	        //now add the popup
	        doPopup(flyData,JSON.parse(e.features[0].properties.meta));
	      })
	      /*map.on('click',markerID,function(e){
	        //notate where we came from so we can zoom back out later
	        clickedFrom = {
	          zoom:map.getZoom(),
	          center:map.getCenter(),
	          bearing:map.getBearing(),
	          pitch:map.getPitch()
	        }
	        let flyData = {
	          curve:1,
	          minZoom:map.getZoom(),
	          speed:1.25,
	          zoom:15.3,
	          pitch:60,
	          center:[coords[1],coords[0]]
	        }
	        map.flyTo(flyData);
	        //now add the popup
	        doPopup(coords,JSON.stringify(markerData.hsdInfo));

	      });*/
	    }
	    function doPopup(coords,label){
	    	console.log('do popup',coords,label);
	      //add the popup with our label
	      const markerHeight = 20, markerRadius = 40, linearOffset = 25;
	      const popupOffsets = {
	        'top': [0, 0],
	        'top-left': [0,0],
	        'top-right': [0,0],
	        'bottom': [0, -markerHeight],
	        'bottom-left': [linearOffset, (markerHeight - markerRadius + linearOffset) * -1],
	        'bottom-right': [-linearOffset, (markerHeight - markerRadius + linearOffset) * -1],
	        'left': [markerRadius, (markerHeight - markerRadius) * -1],
	        'right': [-markerRadius, (markerHeight - markerRadius) * -1]
	      };
	      let lastSeenTime = label.hsdInfo.lastSuccess == 0 ? 'Never' : moment(label.hsdInfo.lastSuccess,'X').format('MMM DD')
	      let placeName = label.geo.city+','+label.geo.region+' '+label.geo.country;
	      let formattedLabel = '<div class="geoInfo">'+placeName+'</div>';
	      formattedLabel += '<div class="ipInfo">IP: '+(label.hsdInfo.addr.split(':')[0])+'</div>';
	      formattedLabel += '<div class="timeLabel">Last Seen: '+lastSeenTime+'</div>';
	      let popup = new mapboxgl.Popup({offset: popupOffsets, className: 'mapPopup'})
	        .setLngLat([coords[0],coords[1]])
	        .setHTML('<div class="resp">'+formattedLabel+'</div>')
	        .addTo(map);
	      popup.on('close',(e)=>{
	        //zoom back out when we close the popup
	        if(typeof clickedFrom != "undefined"){
	          map.flyTo({
	            curve:1,
	            speed:1.618,
	            zoom:clickedFrom.zoom,
	            pitch:clickedFrom.pitch,
	            bearing:clickedFrom.bearing,
	            center:clickedFrom.center
	          })
	        }
	      });
	    }
	    function markerTooltip(e) {
	      var el = document.getElementById(e.target.options.title);
	      el.scrollIntoView();
	    }

	    function applyGeolocation(geo,coords,peerData) {
	      return false;
	      // var location = document.getElementById("location-" + peerData.addr.split(':')[0]);
	      // var country = document.getElementById("country-" + peerData.addr.split(':')[0]);
	      // //TODO: Generating a static link with onClick here is not ideal. Probably a much cleaner well in this pug file yay
	      // location.innerHTML = '<a href="#" onClick="map.flyTo({center:['+coords[1]+','+coords[0]+'],zoom:15,pitch:60}); window.scrollTo(0,0); doPopup(['+coords[0]+','+coords[1]+'],\''+peerData.addr+'\');clickedFrom = {zoom:map.getZoom(),center:map.getCenter(),bearing:map.getBearing(),pitch:map.getPitch()};">'+geo.city + ", " + geo.state_prov+'</a>';
	      // country.innerHTML = geo.country_name;
	    }
    }

	
}