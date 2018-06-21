this.exports = {
	serverAddress : 'Your server address',
	getURL : function(data){
		var url = this.serverAddress + '/bus/getArrivingBus.php?region='+data.region;
		switch(data.region){
			case 0://경기버스
				url += '&stationId='+data.stationId;
						break;
			case 1://창원버스
						break;
			case 2://서울버스
				url += '&arsId='+data.stationNum;
				break;
			case 3://부산
				url += '&stationId='+data.stationId;
				break;
			case 4://국토교통부
				url += '&stationId='+data.stationId+'&cityCode='+data.cityCode+"&numOfRows=99";
				break;
		}
		return {url:url, method:'get', type:'json'};
	},
	xmlToJson: function xmlToJson(xml){
		var json = {};
		var index = 0;
		while(index < xml.length){
			var startTag = "";
			var endTag = "";
			if(xml.indexOf("<", index) > -1){
				startTag = xml.substring(xml.indexOf("<", index), xml.indexOf(">", index) + 1);
				endTag = "</" + startTag.substring(1);
				if(xml.indexOf(startTag, index) > -1 && xml.indexOf(endTag, index) > -1){
					var key = startTag.substring(1, startTag.length-1);
					var value = xml.substring(xml.indexOf(startTag, index) + startTag.length, xml.indexOf(endTag, index));
					var valueParser = xmlToJson(value);
					if(valueParser !== undefined){
						if(json.hasOwnProperty(key)){
							if(json[key] instanceof Array){
								json[key].push(valueParser);
							}else{
								json[key] = [json[key], valueParser];
							}
						}else{
							json[key] = valueParser;
						}
					}else{
						json[key] = value;
					}
					index = xml.indexOf(endTag, index) + endTag.length;
				}else{
					index = xml.indexOf(startTag, index) + startTag.length;
				}
			}else{
				index++;
			}
		}
		if(json.rtNm === '341') console.log(JSON.stringify(json));
		return JSON.stringify(json) === JSON.stringify({}) ? undefined : json;
	},
	sliceData: function(items, routes, region){
		var temp = [];
		var size = items[0] === undefined ? 1 : items.length;
		for(var i = 0; i < size; i++){
			var item = items[i] === undefined ? items : items[i];
			var exist = false;
			if(routes !== undefined){
				for(var r = 0; r < routes.length; r++){
					var routeId = routes[r].routeId;
					if(item.routeId === routeId || item.busRouteId === routeId || item.lineid === routeId || item.routeid === routeId){
						exist = true;
						break;
					}
				}
			}else{
				exist = true;
			}
			if(exist){
				var newItem1 = {};
				var newItem2 = {};
				for(var key in item){
					if(key.indexOf('1', key.length - 1) > -1){
						if(key.indexOf('predictTime') > -1){
							newItem1.time = item[key] * 60;
						}else if(key.indexOf('traTime') > -1){
							newItem1.time = item[key];
						}else{
							newItem1[key.substring(0, key.length - 1)] = item[key];
						}
					}else{
						newItem1[key] = item[key];
						if(key.indexOf('min') > -1){
							newItem1.time = item[key] * 60;
						}else if(key.indexOf('arrtime') > -1){
							newItem1.time = item[key];
						}
					}
					if(key.indexOf('2', key.length - 1) > -1){
						if(key.indexOf('predictTime') > -1){
							newItem2.time = item[key] * 60;
						}else if(key.indexOf('traTime') > -1){
							newItem2.time = item[key];
						}else{
							newItem2[key.substring(0, key.length - 1)] = item[key];
						}
					}else{
						newItem2[key] = item[key];
					}
				}
				if(newItem1.time){
					temp[temp.length] = newItem1;
				}
				if(newItem2.time && (region === 0 || region === 2)){
					temp[temp.length] = newItem2;		
				}
			}
		}
		return temp;
	},
	getTime:function (item){
		var t;
		if (item.hasOwnProperty('arrmsg') && item.arrmsg.indexOf('출발대기') > -1) {
			t = '출발대기';
		} else if (item.hasOwnProperty('arrmsg') && item.arrmsg.indexOf('운행종료') > -1) {
			t = '운행종료';
		} else {
			if (item.time) {
				if (item.time > 60) {
					if (item.time % 60 === 0) {
						t = parseInt(item.time / 60) + '분';
					} else {
						t = parseInt(item.time / 60) + '분' + parseInt(item.time % 60) + '초';
					}
				} else {
					t = '곧 도착';
				}
				if (item.isLast === 1) {
					t += ',막차';
				}
			} else {
				t = '정보없음';
			}
		}
		return t;
	},
	getStationNo:function(no){
		if(no.length === 4){
			no = '0' + no;
		}
		return no.substring(0, 2) + "-" + no.substring(2);
	},
	
	getAreaName: function (region, cityCode){
		switch(region){
			case 0:
				return '경기';
			case 1:
				return '창원';
			case 2:
				return '서울';
			case 3:
				return '부산';
			case 4:
				switch(cityCode){
					case 22:
						return '대구광역시';
					case 23:
						return '인천광역시';
					case 24:
						return '광주광역시';
					case 25:
						return '대전광역시';
					case 26:
						return '울산광역시';
					case 39:
						return '제주도';
					case 32010:
						return '춘천시';
					case 32020:
						return '원주시';
					case 33010:
						return '청주시';
					case 34010:
						return '천안시';
					case 34040:
						return '아산시';
					case 35010:
						return '전주시';
					case 35020:
						return '군산시';
					case 36020:
						return '여수시';
					case 36030:
						return '순천시';
					case 36060:
						return '광양시';
					case 37010:
						return '포항시';
					case 437100:
						return '경산시';
					case 38010:
						return '창원시';
					case 38030:
						return '진주시';
					case 38050:
						return '통영시';
					case 38070:
						return '김해시';
					case 38080:
						return '밀양시';
					case 38090:
						return '거제시';
					case 38100:
						return '양산시';
				}
		}
	},
	getError: function(returnCode){
		var result = "error "+returnCode;
		switch(returnCode){
			case 22:
				result = "LIMITED";
				break;
			case 30:
				result = "REGISTERED_ERROR";
				break;
			default:
				result = "정보없음";
		}
		return result;
	},
	getDistanceFromLatLonInKm : function (lat1,lng1,lat2,lng2) {
		function deg2rad(deg) {
			return deg * (Math.PI/180);
		}

		var R = 6371; // Radius of the earth in km
		var dLat = deg2rad(lat2-lat1);  // deg2rad below
		var dLon = deg2rad(lng2-lng1);
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c; // Distance in km
		return d;
	}
};
