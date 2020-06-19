/*let mapApp;
$(document).ready(()=>{
	mapApp = new NetworkMap();
})*/
class NetworkMap{
	constructor(){
		this.mapIsLoaded = false;
		this.hasPlotted = false;
		this.drawMap();
		$.getJSON('http://__handybrowser_get_hosts__',(data)=>{
			this.mapData = data;
			this.modelData();
			//this.plotPoints();
			if(this.mapIsLoaded && !this.hasPlotted){
				this.plotPoints();
			}
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
		//this.drawMap();
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
    map.on('load', () => {
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

  		if(typeof this.mapData != "undefined"){
				this.plotPoints();
			}
			else{
				this.mapIsLoaded = true;
			}
    });
    	
  }

  plotPoints(){
  	this.hasPlotted = true;
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
  	
    function addMarkers(featuresData) {
      //could be cleaner i bet

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
	        }
	      },
        'paint': {
					// make circles larger as the user zooms from z12 to z22
					'circle-radius': {
						'base': 1,
						'stops': [
							[0, 3],
							[20, 40]
						]
					},
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
  }

	
}