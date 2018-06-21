var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');
var Platform = require('platform');
var Feature = require('platform/feature');
var util = require("utils");
var Vibe = require('ui/vibe');

var res = Feature.resolution();
var map = [];			// bus data array
var menu;					// station list
var foreColor = Feature.color('black', 'white');
var backColor = Feature.color('IslamicGreen', 'black');
var name = [];
var value = [];
var intervalId;
var timeoutId;
var detailFontFamily = 'gothic-24-bold';
if(Settings.data('detailFontFamily')){
	detailFontFamily = Settings.data('detailFontFamily');
}
var showURL = false;

console.log("Settings data: " + JSON.stringify(Settings));

var splashScreen = new UI.Window({
	backgroundColor: 'white'
});

splashScreen.add(new UI.Image({
	position: new Vector2(res.x / 2 - 126 / 2, res.y / 2 - 47 / 2),
	size: new Vector2(126, 47),
	image: 'IMAGES_SPLASH_LOGO_PNG'
}));

splashScreen.show();

setTimeout(function() {
  // Display the mainScreen
  mainMenu();
  // Hide the splashScreen to avoid showing it when the user press Back.
  splashScreen.hide();
}, 400);

if(Settings.data('busData')){
	map = Settings.data('busData');
	// 		console.log("getData: "+JSON.stringify(Settings.data()));
	//migration
	if (!map && !map[0].stationNm) {
		console.log("migration");
		var temp = [];
		for (var i = 0; i < map.length; i++) {
			var subItem = [];
			for (var k = 0; k < map[i][2].length; k++) {
				subItem[k] = {
					routeId : map[i][2][k],
					routeNm : map[i][3][k]
				};
				if (map[i][5] !== undefined) {
					subItem[k].ord = map[i][5][k];
				}
			}
			temp[i] = {
				stationNm : map[i][0],
				stationId : map[i][1],
				routes : subItem,
				region : map[i][4]
			};
		}
		Settings.data('busData', temp);
		map = Settings.data('busData');
	}
}

function mainMenu(){
	console.log("getData: "+JSON.stringify(Settings.data('busData')));
	var items = [];
	items[0] = {
		title: '가까운 정류장'
	};
	for(var i = 0; i < map.length; i++){
		var station = map[i];
		items[i + 1] = {
			title: station.stationNm !== undefined ? station.stationNm : 'none',
			subtitle: util.getAreaName(station.region, station.cityCode) + ((station.stationNum !== undefined && station.stationNum.length > 2) ? ": " + util.getStationNo(station.stationNum) : '')
		};
	}
	menu = new UI.Menu({
		highlightTextColor: foreColor,
		highlightBackgroundColor: backColor,
		status: {
			separator: 'none'
		},
		sections: [{
			title: 'G bus v2.7',
			items: items
		}]
	});
	menu.on('select', function(e) {
		console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
		console.log('The item is titled "' + e.item.title + '"');
		if (e.itemIndex == 0) {
			openNearby();
		} else {
			openSection(map[e.itemIndex - 1]);
		}
	});
	menu.show();
}

var nearbyView;

function openNearby(){
	// Create a text object 
	var infotext = new UI.Card(
	{
		title : 'Loading',
		body : '현재 위치의 주변 가까운 정류장을 확인중입니다.',
		font: 'Gothic 28',
		color: 'white',
		textAlign: 'center'
	});
	infotext.show();
	
	navigator.geolocation.getCurrentPosition(
		function(pos){//success
			console.log('\n****** START ******\nhere I am:\nlat= ' +     pos.coords.latitude + ' lon= ' + pos.coords.longitude + '\n'); // Just to se     that it works fine
			var myLat = pos.coords.latitude;
			var myLong = pos.coords.longitude;
			console.log('My location\n' + myLat + ' and ' + myLong + '\n****** THE END  01 ******\n'); // This does work fine
			
			nearbyView = new UI.Menu({
				highlightTextColor: foreColor,
				highlightBackgroundColor: backColor,
				status: {
					separator: 'none'
				}
			});
			var url = util.serverAddress + '/bus/nearby.php?lon='+myLong+'&lat='+myLat;
			if(showURL) console.log("get nearby stops: "+url);
			ajax({ url: url, method:'get', type: 'json'}, 
					 function (data){
						 if(data.length > 0){
							 //현재위치와 가까운 순으로 정렬
							 for(var d = 0; d < data.length; d++){
								 data[d].distance = util.getDistanceFromLatLonInKm(myLat, myLong, data[d].lat, data[d].lon);
								 //console.log("distance: "+data[d].distance);
							 }
							 data.sort(function(left, right){
								 return left.distance - right.distance;
							 });
							 if(showURL) console.log("stops: "+JSON.stringify(data));
							 nearbyView.section(0, {
								 title: 'Nearby stops',
								 items: data
							 });
							 nearbyView.on('select', function(e) {
								 console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
								 openSection(data[e.itemIndex]);
							 });
							 nearbyView.show();
							 infotext.hide();
						 }else{
							 infotext.title('Error');
							 infotext.body('가까운 정류장이 없습니다.');
						 }
					 }, function(error, status, request){
						 console.log('error: ' + error + ', status: ' + status + ', request: ' + request);
						 infotext.title('Error');
						 infotext.body('가까운 정류장이 없습니다.');
					 });
		}, function(err){//error
			console.log('location error (' + err.code + '): ' + err.message);
			//modify the text within infotext to alert user of error
			infotext.title('Error');
			infotext.body('현재 위치를 모르겠습니다.');
		}, {//options
			enableHighAccuracy: true, 
			maximumAge: 10000, 
			timeout: 10000
		}
	);
}

function openSection(station){
	var detailView = new UI.Window({
		scrollable: true,
		backgroundColor: 'white',
		status:{
			color: foreColor,
			backgroundColor: backColor,
			separator: 'none'
		}
	});
	detailView.add(new UI.Text({
		position: new Vector2(0, 0),
		size: new Vector2(res.x, 24),
		text: station.stationNm ? station.stationNm : station.title,
		font: 'gothic-18-bold',
		textOverflow: 'ellipsis',
		textAlign: 'center',
		color: foreColor,
		backgroundColor: backColor
	}));
	detailView.on('click', 'select', function(e) {
		clearLooper();
		connect(detailView, station);
	});
	detailView.on('hide', function(){
		clearLooper();
	});
	detailView.show();
	
	if(station.region == 0){
		var url = util.serverAddress + '/bus/getBusList.php?stationId='+station.stationId;
		if(showURL) console.log("routes: "+url);
		ajax({ url: url, method:'get', type: 'json'}, 
				 function (data){
					 console.log("getBusList");
					 console.log("result: "+JSON.stringify(data));
					 if(data.constructor === [].constructor && data.length > 0){
						 station.routeIds = data;
					 }else if (data.constructor === {}.constructor){
						 station.routeIds = [data];
					 }
					 connect(detailView, station);
				 }, function(error, status, request){
					 console.log('error: ' + error + ', status: ' + status + ', request: ' + request);
					 connect(detailView, station);
				 });
	}else{
		//subitem
		connect(detailView, station);
	}
}

function connect(detailView, station){
	var routes = station.routes;
	var uri = util.getURL(station);
	if(showURL) console.log('get url: ' + uri.url);
	ajax(uri,
		function(data, status, request){
			console.log('connect server success!');
			if(showURL) console.log('xmlString:'+data);
			var items = data;
			switch(station.region){
				case 0:
					items = util.sliceData(items, routes, station.region);
					break;
				case 1:
					break;
				case 2:
					items = util.sliceData(items, routes, station.region);
					break;
				case 3://부산
					items = util.sliceData(items, routes, station.region);
					break;
				case 4://국토교통부
					items = util.sliceData(items, routes, station.region);
					break;
			}
			console.log("items: "+JSON.stringify(items));
			for(var n = 0; n < name.length; n++){
				detailView.remove(name[n]);
				detailView.remove(value[n]);
			}
			name = [];
			value = [];
			if(items.length > 0){
				clearLooper();
				items.sort(function(left, right){
					//도착시간이 빠른 순으로 정렬
					return parseInt(left.time) - parseInt(right.time);
				});
				var divider;
				for(var i = 0; i < items.length; i++){
					var item = items[i];
					if(routes !== undefined){
						for(var k = 0; k < routes.length; k++){
							var route = routes[k];
							if(item.routeId === route.routeId || item.busRouteId === route.routeId || item.lineid === route.routeId || item.routeid === route.routeId){

								divider = 24 * (name.length + 1);
								name[name.length] = new UI.Text({
									position: new Vector2(4, divider),
									size: new Vector2(res.x / 2 - 4, 24),
									font: detailFontFamily,
									color: 'black',
									textOverflow: 'fill',
									textAlign: Feature.round('right', 'left'),
									backgroundColor: 'clear'
								});
								if(Platform.version() === 'chalk'){
									name[name.length - 1].text(((item.remainSeatCnt !== undefined && item.remainSeatCnt > -1) ? '(' + item.remainSeatCnt + ')' : '') + route.routeNm + ' :');
								}else{
									name[name.length - 1].text(route.routeNm + ((item.remainSeatCnt !== undefined && item.remainSeatCnt > -1) ? '(' + item.remainSeatCnt + ')' : ''));
								}
								detailView.add(name[name.length - 1]);

								value[value.length] = new UI.Text({
									position: new Vector2(Feature.rectangle(0, res.x / 2 + 4), divider),
									size: new Vector2(res.x - 4, 24),
									text: util.getTime(item),
									font: detailFontFamily,
									color:'black',
									textOverflow:'ellipsis',
									textAlign:Feature.round('left', 'right'),
									backgroundColor:'clear'
								});
								detailView.add(value[value.length-1]);
							}
						}
					}else{
						var routeNm;
						if(item.rtNm){
							routeNm = item.rtNm;
						}else if(item.routeId && station.routeIds){
							for(var r = 0; r < station.routeIds.length; r++){
								if(station.routeIds[r].routeId === item.routeId){
									routeNm = station.routeIds[r].routeName;
									break;
								}
							}
						}else if(item.routeno){
							routeNm = decodeURI(item.routeno);
						}
						divider = 24 * (name.length + 1);
						name[name.length] = new UI.Text({
							position: new Vector2(4, divider),
							size: new Vector2(res.x / 2 - 4, 24),
							font: detailFontFamily,
							color: 'black',
							textOverflow: 'fill',
							textAlign: Feature.round('right', 'left'),
							backgroundColor: 'clear'
						});
						if(Platform.version() === 'chalk'){
							name[name.length - 1].text(((item.remainSeatCnt !== undefined && item.remainSeatCnt > -1) ? '(' + item.remainSeatCnt + ')' : '') + routeNm + ' :');
						}else{
							name[name.length - 1].text(routeNm + ((item.remainSeatCnt !== undefined && item.remainSeatCnt > -1) ? '(' + item.remainSeatCnt + ')' : ''));
						}
						detailView.add(name[name.length - 1]);

						value[value.length] = new UI.Text({
							position: new Vector2(Feature.rectangle(0, res.x / 2 + 4), divider),
							size: new Vector2(res.x - 4, 24),
							text: util.getTime(item),
							font: detailFontFamily,
							color:'black',
							textOverflow:'ellipsis',
							textAlign:Feature.round('left', 'right'),
							backgroundColor:'clear'
						});
						detailView.add(value[value.length-1]);
					}
				}
				
				intervalId = setInterval(function(){
					for(var i = 0; i < items.length; i++){
						var item = items[i];
						item.time -= 1;
						value[i].text(util.getTime(item));
					}
				}, 1000);
				timeoutId = setTimeout(function(){
					connect(detailView, station);
				}, 60000);
				Vibe.vibrate('short');
			}else{
				name[0] = new UI.Text({
					position: new Vector2(0, 25),
					size: new Vector2(res.x, res.y - 25),
					text: '\n\n도착 정보 없음',
					font:'gothic-18',
					color:'black',
					textOverflow:'wrap',
					textAlign:'center',
					backgroundColor: Feature.color('yellow', 'white')
				});
				detailView.add(name[0]);
				Vibe.vibrate('double');
			}
		},
		function(error, status, request){
			console.log('error: ' + error + ', status: ' + status + ', request: ' + request);
			Vibe.vibrate('double');
			var alert = new UI.Card({
				title: '연결실패!',
				titleColor: Feature.color('red', 'black'),
				body: '현재 기기의 네트워크 불안정 또는 해당 정보 제공 기관 서버 오류',
				icon: 'IMAGES_WARNING_PNG',
				status: false
			});
			alert.show();
		}
	);
}

function clearLooper(){
	if(intervalId !== undefined)
		clearInterval(intervalId);//이 함수를 쓸 수 없다는건 클라우드페블의 버그
	if(timeoutId !== undefined)
		clearTimeout(timeoutId);
}

// 설정
Settings.config(
	{ url: util.serverAddress + "/bus/bus-setting.html" },
	function(e){
		console.log('opening configurable');
		Settings.data('busData', map);
		Settings.data('bigText', detailFontFamily);
		console.log('detailFontFamily: '+JSON.stringify(Settings.data()));
	},
  function(e) {
    console.log('closed configurable');
		// 설정 저장이 실패일 경우
    if (e.failed) {
			console.log('setting error: '+e.response);
    }else{
			//정상일 경우
			var configuration = JSON.parse(decodeURIComponent(e.response));
			console.log('save data: '+JSON.stringify(configuration));
			Settings.data(configuration);
			
			map = Settings.data('busData');
			detailFontFamily = Settings.data('detailFontFamily');
			menu.hide();
			mainMenu();
		}
  }
);