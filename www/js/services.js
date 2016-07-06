angular.module('app.services', [])

.factory('FileFactory', function($q) {
    'use strict';
    var self = this;
    var File = function() { };

    File.prototype = {

       getDefaultPath: function() {
            var stordir = '';
            try {
                stordir = cordova.file.externalDataDirectory;
                if (!stordir) {
                    stordir = cordova.file.dataDirectory;
                }
            } catch(err) {console.warn(err);}
            return stordir;
       },

       createFolder: function(name) {
            var deferred = $q.defer();

            try {
                window.resolveLocalFileSystemURL(self.getDefaultPath, function(fileSystem) {
                    fileSystem.getDirectory(name,
                        {create: true, exclusive: false},
                        function(result) {
                            deferred.resolve(result);
                        }, function(error) {
                            deferred.resolve(error);
                        });
                }, function(error) {
                    deferred.reject(error);
                });
            } catch(error) {
                deferred.reject(error);
            }
            return deferred.promise;
       },

       getParentDirectory: function(path) {
            var deferred = $q.defer();
            window.resolveLocalFileSystemURL(path, function(fileSystem) {
                fileSystem.getParent(function(result) {
                    deferred.resolve(result);
                }, function(error) {
                    deferred.reject(error);
                });
            }, function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
       },

       getEntriesAtRoot: function() {
            var deferred = $q.defer();
            window.resolveLocalFileSystemURL(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
                var directoryReader = fileSystem.root.createReader();
                directoryReader.readEntries(function(entries) {
                    deferred.resolve(entries);
                }, function(error) {
                    deferred.reject(error);
                });
            }, function(error) {
                deferred.reject(error);
            });
        },

       getEntries: function(path) {
            var deferred = $q.defer();
            window.resolveLocalFileSystemURL(path, function(fileSystem) {
                if (fileSystem.isDirectory) {
                    var directoryReader = fileSystem.createReader();
                    directoryReader.readEntries(function(entries) {
                        deferred.resolve(entries);
                    }, function(error) {
                        deferred.reject(error);
                    });
                } else {
                    deferred.resolve(fileSystem);
                }
            }, function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
       },

       write: function(path, name, obj) {
            var deferred = $q.defer();
            //var path = this.getDefaultPath;

            if (window.resolveLocalFileSystemURL) {

                window.resolveLocalFileSystemURL(path, function(fileSystem) {
                    if (fileSystem.isDirectory) {
                        fileSystem.getFile(name, {
                            create: true
                        }, function(fileEntry) {
                            fileEntry.createWriter(function(writer) {
                                // Already in JSON Format
                                writer.onwrite = function() {
                                    deferred.resolve();
                                };
                                writer.onerror = function(error) {
                                    deferred.reject(error);
                                };
                                writer.fileName = name;
                                writer.write(new Blob([obj], {
                                    type: 'text/plain'
                                }));
                            }, function(error) {
                                deferred.reject(error);
                            });
                        }, function(error) {deferred.reject(error);});
                        } else {
                            deferred.resolve(fileSystem);
                        }
                    }, function(error) {
                    deferred.reject(error);
                });
                return deferred.promise;
            } else {
                // NO FILE API, FALLBACK ON LocalStorage
                console.warn('No file api, fallback to LocalStorage');
                try {
                    deferred.resolve(localStorage.setItem(name, JSON.stringify(obj)));
                } catch(err) {
                    deferred.reject(err);
                }
            }
            return deferred.promise;
        },


       writeJSON: function(path, name, obj) {
            var deferred = $q.defer();
            //var path = this.getDefaultPath;

            if (window.resolveLocalFileSystemURL) {

                window.resolveLocalFileSystemURL(path, function(fileSystem) {
                    if (fileSystem.isDirectory) {
                        fileSystem.getFile(name, {
                            create: true
                        }, function(fileEntry) {
                            fileEntry.createWriter(function(writer) {
                                // Already in JSON Format
                                writer.onwrite = function() {
                                    deferred.resolve();
                                };
                                writer.onerror = function(error) {
                                    deferred.reject(error);
                                };
                                writer.fileName = name;
                                writer.write(new Blob([JSON.stringify(obj)], {
                                    type: 'text/plain'
                                }));
                            }, function(error) {
                                deferred.reject(error);
                            });
                        }, function(error) {deferred.reject(error);});
                        } else {
                            deferred.resolve(fileSystem);
                        }
                    }, function(error) {
                    deferred.reject(error);
                });
                return deferred.promise;
            } else {
                // NO FILE API, FALLBACK ON LocalStorage
                console.warn('No file api, fallback to LocalStorage');
                try {
                    deferred.resolve(localStorage.setItem(name, JSON.stringify(obj)));
                } catch(err) {
                    deferred.reject(err);
                }
            }
            return deferred.promise;
        },


        dateTimeReviver: function(key, value) {
            if ((key === 'duration') || (key === 'pace')) {
                if (typeof value === 'string') {
                    return new Date(value);
                }
            }
            return value;
        },


        readJSON: function(p, name) {
            var deferred = $q.defer();
            var path = p + name;

            if (window.resolveLocalFileSystemURL) {

                window.resolveLocalFileSystemURL(path, function(fileEntry){
                    fileEntry.file(function(file) {
                        var reader = new FileReader();
                        reader.onloadend = function() {
                            deferred.resolve(JSON.parse(this.result,
                                                        this.dateTimeReviver));
                        }; reader.readAsText(file);
                    });
                }, function(err){deferred.reject(err);});

            } else {

                // NO FILE API, FALLBACK ON LocalStorage
                console.warn('No file api, fallback to LocalStorage for ' + name);
                try {
                    deferred.resolve(JSON.parse(localStorage.getItem(name), this.dateTimeReviver));
                } catch(err) {
                    deferred.reject(err);
                }

            }
            return deferred.promise;
        }
    };

    return File;
})


// Service to store sessions
.factory('Prefs', ['$translate', 'FileFactory', function($translate, FileFactory) {
    'use strict';
    var prefs = {
        minrecordingaccuracy:14,
        minrecordinggap:1000,
        minrecordingspeed:3,
        maxrecordingspeed:38,
        unit: 'kms',
        first_run: true,
        timevocalannounce: true,
        distvocalannounce: true,
        avgpacevocalannounce: true,
        avgspeedvocalannounce: true,
        heartrateannounce: false,
        gpslostannounce: true,
        delay: 10 * 1000,
        usedelay: true,
        debug: false,
        keepscreenon: true,

        togglemusic: true,
        distvocalinterval: 0, //en km (0 == None)
        timevocalinterval: 5, //en minutes
        timefastvocalinterval: 0, //en minutes
        timelowvocalinterval: 0, //en minutes

        heartratemax: 190,
        heartratemin: 70,
        registeredBLE: {},

        usegoogleelevationapi: false,
        language: 'English'};
    var loaded = false;

    this.get = function(opt) {
        if (!loaded) {
            try {
                this.load(); }
            catch(err) {
                console.log('Can t load prefs : ' + err); }
        }
        return prefs[opt];
    };

    this.getPrefs = function() {
        return prefs;
    };

    this.set = function(opt, value) {
        if (!this.loaded) {
            this.load();
        }
        prefs[opt] = value;
        this.save();
    };


    this.save = function(){
        localStorage.setItem('prefs', JSON.stringify(prefs));
    };

    this.load = function(){
        try {
            var sprefs = JSON.parse(localStorage.getItem('prefs'), FileFactory.dateTimeReviver);
            //To update instead of erasing
            for (var prop in sprefs) {
                prefs[prop] = sprefs[prop];
            }

        } catch(err) {
            console.log(err);
        }
    };

    this.setLang = function(){
        var lang = 'en-US';
        if (prefs.language) {
            lang = prefs.language;
        }
        $translate.use(lang);
        moment.locale(lang);
    };

    return this;
}])

.factory('Speech', ['Prefs', function(Prefs) {
    'use strict';

    var self = this;
    var utterance;

    this.speak = function(text){
      try {
        if (!utterance) {
          utterance = new SpeechSynthesisUtterance();
          utterance.volume = 1;
          utterance.lang = Prefs.get('language');
        }
        utterance.text = text;

        if (Prefs.get('togglemusic')) {
          utterance.onend = function(event) {
              musicControl.togglepause(function(err, cb) {
                  if (err) {
                      console.error(err, event, cb);
                  }
                  return;
              });
          };
          musicControl.togglepause(function(err, cb) {
              if (err) {
                  console.error(err, event, cb);
              }
              speechSynthesis.speak(self.utterance);
              return;
          });
        } else {
          utterance.onend = function() {};
          speechSynthesis.speak(utterance);
        }
      } catch(err) {
        console.warn('speechSynthesis probably not available:' + err);
      }
    };

    return this;

}])

.factory('Bluetooth', ['$q', 'Prefs', function($q, Prefs) {
    'use strict';
    
    var self = this;
    var bluetooth_scanning = false;
    var connected = false;
    var ble_services = {
        heartRate: {
            service: '180d',
            measurement: '2a37'
        },
        cadence: {
            service: '1814',
            measurement: '2a53'
        },
        power: {
            service: '1818',
            measurement: '2a63'
        }
    };

    this.startBLEScan = function() {
        var registered_devices = Prefs.get('registeredBLE');
        // https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.heart_rate.xml
        if ((Object.keys(registered_devices.length > 0) && (!connected))) {
            ble.scan([ble_services.heartRate.service], 5,
                //onScan
                function(peripheral) {
                    console.debug('Found ' + JSON.stringify(peripheral));
                    if (peripheral.id in registered_devices) {
                        ble.connect(peripheral.id,
                            self.onConnect,
                            self.onDisconnect);
                    } else {
                        console.debug('Device ' + peripheral.id + ' not registered');
                    }

                }, function() {
                    console.error('BluetoothLE scan failed');
                }
            );
        }
    };

    this.setDataCallback = function(onHeartRateDatas, onHeartRateError,
                                    onPowerDatas, onPowerError,
                                    onCadenceDatas, onCadenceError,
                                    onStrideDatas, onStrideError) {
        self.onHeartRateDatas = onHeartRateDatas;
        self.onPowerDatas = onPowerDatas;
        self.onCadenceDatas = onCadenceDatas;
        self.onStrideDatas = onStrideDatas;

        self.onHeartRateError = onHeartRateError;
        self.onPowerError = onPowerError;
        self.onCadenceError = onCadenceError;
        self.onStrideError = onStrideError;
    };

    this.onDisconnect= function() {
        self.onHeartRateError();
        self.onCadenceError();
        self.onPowerError();
        self.onStrideError();
    };

    this.onConnect= function(peripheral) {
        //HEARTRATE
        ble.notify(peripheral.id,
            ble_services.heartRate.service,
            ble_services.heartRate.measurement,
            function(buffer) {
                var data = new DataView(buffer);
                if (data.getUint8(0) === 0x1000) { 
                    self.onHeartRateDatas(data.getUint16(1)); }
                else {
                    self.onHeartRateDatas(data.getUint8(1));}
            },
            self.onHeartRateError);

        //CADENCE
        ble.notify(peripheral.id,
            ble_services.cadence.service,
            ble_services.cadence.measurement,
            function(buffer) {
                var data = new DataView(buffer);
                self.onCadenceDatas(data.getUint8(1));
                if (data.getUint8(0) === 0x1000) {
                    self.onStrideDatas(data.getUint16(4));
                } else {
                    self.onStrideDatas(undefined);
                }
            },
            self.onCadenceError);

        //POWER
        ble.notify(peripheral.id,
            ble_services.power.service,
            ble_services.power.measurement,
            function(buffer) {
                var data = new DataView(buffer);
                self.onPowerDatas(data.getInt16(2, true));
            },
            self.onPowerError);
    };

    this.discoverDevices = function() {
        var deferred = $q.defer();
        var bluetooth_devices = {};
        var registered_bluetooth = Prefs.get('registeredBLE');

        for (var prop in registered_bluetooth) {
            bluetooth_devices[prop] = {
                'id': prop,
                'name': registered_bluetooth[prop].name,
                'registered': true
            };
        }
        bluetooth_scanning = true;

        try {
            ble.startScan([], function(bledevice) {
                if (!(bledevice.id in bluetooth_devices)) {
                    if (bledevice.id in registered_bluetooth) {
                        bluetooth_devices[bledevice.id] = {
                            'id': bledevice.id,
                            'name': bledevice.name ? bledevice.name : 'Unknow',
                            'registered': true
                        };

                    } else {
                        bluetooth_devices[bledevice.id] = {
                            'id': bledevice.id,
                            'name': bledevice.name ? bledevice.name : 'Unknow',
                            'registered': false
                        };
                    }
                }
            }, function(err) {
                bluetooth_scanning = false;
                deferred.reject(err);
           });

            setTimeout(function() {
                ble.stopScan(
                    function() {
                        bluetooth_scanning = false;
                        deferred.resolve(bluetooth_devices);
                    },
                    function() {
                        bluetooth_scanning = false;
                        deferred.resolve(bluetooth_devices);
                    }
                );
            }, 5000);
        } catch (exception) {
            bluetooth_scanning = false;
            console.info('BluetoothLE not available');
            deferred.reject(exception);
       }
 
        return deferred.promise;
    };

    return this;
}])

// Service to store sessions
.factory('Session', ['Prefs','leafletBoundsHelpers', '$filter', '$q', '$http', 'FileFactory', 'Speech', function(Prefs, leafletBoundsHelpers, $filter, $q, $http, FileFactory, Speech) {
    'use strict';
    var session = {};
    var self = this;
    var recording = {};

    this.initWith = function(sess) {
        session = sess;
    };

    this.recordPosition = function(position) {
      recording.new_lat = position.coords.latitude;
      recording.new_lon = position.coords.longitude;
      recording.new_time = position.timestamp;
      recording.new_newalt = undefined;
      recording.elapsed = 0;
      recording.gps_speed = undefined;

      if (typeof position.coords.altitude === 'number') {
          recording.new_alt = position.coords.altitude;
      }
      if (typeof position.coords.speed === 'number') {
          recording.gps_speed = position.coords.speed;
      }

      recording.new_accuracy = position.coords.accuracy;
      recording.accuracy_fixed = recording.new_accuracy.toFixed(0);

      //Test recovering of gps signal
      if ((recording.new_accuracy <= Prefs.get('minrecordingaccuracy') &&
          (recording.new_time > recording.recclicked) &&
          (recording.old_lat) &&
          (recording.old_pos))) {
            recording.gps_signal_status = true;
            if (Prefs.get('gpslostannounce')) {
              recording.gps_signal_time = recording.new_time;
          }
      }

      //Test lost of gps signal
      if ((recording.new_accuracy >= Prefs.get('minrecordingaccuracy')) &&
          (recording.gps_signal_status === true) &&
          (recording.new_time > recording.recclicked)) {
          // In case we lost gps we should announce it
          recording.gps_signal_status = false;
          if (Prefs.get('gpslostannounce') && ((recording.new_time - 30) > recording.gps_signal_time)) {
              Speech.speak($filter('translate')('_gps_lost'));
              recording.gps_signal_time = recording.new_time;
          }
      }

      if ((recording.new_time - recording.lastrecordtime >= Prefs.get('minrecordinggap')) &&
          (recording.new_accuracy <= Prefs.get('minrecordingaccuracy'))) {
          //console.log('Should record');
          var pointData = [
              recording.new_lat.toFixed(6),
              recording.new_lon.toFixed(6),
              new Date(recording.new_time).toISOString(),
              recording.new_alt.toFixed(6),
              recording.bpms.toFixed(0),
              recording.cadence.toFixed(0),
              recording.power.toFixed(0),
              recording.strike.toFixed(2)
          ];
          recording.gpxData.push(pointData);
          recording.lastrecordtime = recording.new_time;
      }

      if (recording.firsttime === 0) {
        recording.firsttime = recording.new_time;
        recording.lastdisptime = recording.new_time;
        recording.lastdistvocalannounce = 0;
        recording.lasttimevocalannounce = recording.new_time;
        recording.lastslowvocalannounce = recording.new_time;
        recording.lastfastvocalannounce = -1;
        recording.old_lat = recording.new_lat;
        recording.old_lon = recording.new_lon;

        recording.time = '00:00:00';
        recording.distance = '0';
        recording.maxspeed = '0';
        recording.speed = '0';
        recording.avspeed = '0';
        recording.elapsed = 0;
        recording.minalt = 99999;
        recording.maxalt = 0;
        recording.elevation = '0';
        recording.smoothed_speed = [];
        recording.bpms = undefined;
        recording.cadence = undefined;
        recording.power = undefined;
        recording.strike= undefined;
      } else {
        recording.elapsed = recording.time_new - recording.firsttime;
        var hour = Math.floor(recording.elapsed / 3600000);
        var minute = ('0' + (Math.floor(recording.elapsed / 60000) - hour * 60)).slice(-2);
        var second = ('0' + Math.floor(recording.elapsed % 60000 / 1000)).slice(-2);
        recording.time = hour + ':' + minute + ':' + second;

        if ((recording.accuracy <= Prefs.get('minrecordingaccuracy'))) {
            // Instant speed
            if ((recording.gps_speed) && (recording.gps_speed>0)){
                recording.speeds.push(recording.gps_speed);
                if (recording.speeds.length > 5) {
                    recording.speeds.shift();
                }
                recording.speed = average(recording.speeds,0);
                var currentPace = 16.6667 / recording.speed;
                //converts metres per second to minutes per mile or minutes per km
                recording.pace = Math.floor(currentPace) + ':' + ('0' + Math.floor(currentPace % 1 * 60)).slice(-2);
                recording.speed = (recording.speed * 3.6).toFixed(1);
            }

            // Not first point
            if (recording.old_lat && recording.old_lon) {
                //Limit ok
                if ((recording.new_time - recording.lastdisptime) >= Prefs.get('minrecordinggap')) {
                    recording.elapsed = recording.new_time - recording.firsttime;
                    recording.lastdisptime = recording.new_time;

                    //calc total distance
                    recording.gpxPoints = simplifyGPX(self.computeKalmanLatLng(recording.gpxData), 0.00001);
                    recording.equirect = 0;

                    recording.equirect = self.calcDistance(recording.gpxPoints);
                    recording.distance = recording.equirect.toFixed(1);

                    //calc average pace & average speed
                    var averagePace = recording.elapsed / (recording.equirect * 60000);
                    recording.avpace = Math.floor(averagePace) + ':' + ('0' + Math.floor(averagePace % 1 * 60)).slice(-2);
                    recording.avspeed = (recording.equirect / recording.elapsed * 3.6).toFixed(1);

                    recording.old_lat = recording.new_lat;
                    recording.old_lon = recording.new_lon;
                    recording.old_alt = recording.new_alt;
                    recording.old_time = recording.new_time;

                    //Alert and Vocal Announce
                    if (parseInt(Prefs.get('distvocalinterval')) > 0) {
                        recording.lastdistvocalannounce = 0;
                        if ((recording.equirect - recording.lastdistvocalannounce) > Prefs.get('distvocalinterval') * 1000) {
                            recording.lastdistvocalannounce = recording.equirect;
                            self.runSpeak();
                        }
                    }

                    if (parseInt(Prefs.get('timevocalinterval')) > 0) {
                        if ((recording.new_time - recording.lasttimevocalannounce) > Prefs.get('timevocalinterval') * 60000) /*fixme*/ {
                            recording.lasttimevocalannounce = recording.new_time;
                            self.runSpeak();
                        }
                    }

                    if (parseInt(Prefs.get('timeslowvocalinterval')) > 0) {
                        if ((recording.lastslowvocalannounce !== -1) &&
                            ((recording.new_time - recording.lastslowvocalannounce) > Prefs.get('timeslowvocalinterval') * 60000)) /*fixme*/ {
                            recording.lastslowvocalannounce = -1;
                            recording.lastfastvocalannounce = recording.new_time;
                            Speech.speak($filter('translate')('_run_fast'));
                        }
                    }
                    if (parseInt(Prefs.get('timefastvocalinterval')) > 0) {
                        if ((recording.lastfastvocalannounce !== -1) &&
                            ((recording.time_new - recording.lastfastvocalannounce) > Prefs.get('timefastvocalinterval') * 60000)) /*fixme*/ {
                            recording.lastslowvocalannounce = recording.new_time;
                            recording.lastfastvocalannounce = -1;
                            Speech.speak($filter('translate')('_run_slow'));
                        }
                    }
                }
            }
        }
      }
    };

    this.computeKalmanLatLng = function(datas) {
        var Q_metres_per_second = 3;
        var TimeStamp_milliseconds;
        var tinc;
        var lat;
        var lng;
        var newlat;
        var newlng;
        var variance = -1; // P matrix.  Negative means object uninitialised.  NB: units irrelevant, as long as same units used throughout
        var K;
        var accuracy;
        var kalmanEle = new KalmanFilter(0.2, 3, 10);

        return datas.map(function(item, idx) {
            accuracy = parseFloatOr(item[5]);
            newlat = parseFloat(item[0]);
            newlng = parseFloat(item[1]);
            if (accuracy < 1) {
                accuracy = 1;}
            if (variance < 0) {
                TimeStamp_milliseconds = (new Date(item[2])).getMilliseconds();
                lat = newlat;
                lng = newlng;
                variance = accuracy * accuracy;
            } else {
                tinc = (new Date(item[2])).getMilliseconds() - TimeStamp_milliseconds;
                if (tinc > 0) {
                    variance += tinc * Q_metres_per_second * Q_metres_per_second / 1000;
                    TimeStamp_milliseconds = (new Date(item[2])).getMilliseconds();
                }
                K = variance / (variance + (accuracy * accuracy));
                lat += K * (newlat - lat);
                lng += K * (newlng - lng);
                variance = (1 - K) * variance * Q_metres_per_second;
            }

            if (isNaN(item[3]) && (idx-1 > 0)) {
                console.log(idx+':'+parseFloatOr(item[3]));
                item[3] = datas[idx-1][3];
            }

            return { lat: lat,
                     lng: lng,
                     timestamp: item[2],
                     ele: (kalmanEle.update(parseFloatOr(item[3])))[0],
                     hr: parseFloatOr(item[4]),
                     accuracy: parseFloatOr(item[5]),
                     cadence: parseFloatOr(item[6]),
                     power: parseFloatOr(item[7]),
                     strike: parseFloatOr(item[8]) };
        });

    };

    this.fixElevation = function(gpxPoints) {
        var deferred = $q.defer();

        if (!Prefs.get('usegoogleelevationapi')) {
            deferred.reject('Dont use google elevation api');
            return deferred.promise;
        }

        //Build a array of chunk of encoded paths
        var gpx_path = gpxPoints.map(function(item){
                return [item.lat, item.lng];});
        var gpx_paths = [];
        var i,j,chunk = 100;
        for (i=0,j=gpx_path.length; i<j; i+=chunk) {
            gpx_paths.push(gpx_path.slice(i,i+chunk));
        }
        var encpaths = gpx_paths.map(function(path){
            return L.polyline(path).encodePath();
        });

        encpaths.map(function(encpath, encidx){
            $http({url:'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyCIxn6gS4TePkbl7Pdu49JHoMR6POMafdg&locations=enc:' + encpath ,
                method:'GET',
                }).then(function(response) {
                   if (response.data.status === 'OK') {
                        for (var idx = 0; idx < response.data.results.length; idx++) {
                            gpxPoints[encidx*100 + idx].ele = response.data.results[idx].elevation;
                        }
                        if (encidx === (encpaths.length -1)) {
                            session.fixedElevation = true;
                            deferred.resolve(gpxPoints);
                        }
                    } else {
                        deferred.reject(response.data.message);
                    }
            }, function(error) {
                deferred.reject(error);
            });
        });

        // Return a promise.
        return deferred.promise;
    };

    this.calcDistance = function(gpxPoints) {
      var oldLat = gpxPoints[0].lat;
      var oldLng = gpxPoints[0].lng;
      var dLat;
      var dLon;
      var dLat1;
      var dLat2;
      var curLat;
      var curLng;
      var distance = 0;
      var a;var c;

      for (var p = 0; p < gpxPoints.length; p++) {
          curLat = gpxPoints[p].lat;
          curLng = gpxPoints[p].lng;
          //Distances
          dLat = (curLat - oldLat) * Math.PI / 180;
          dLon = (curLng - oldLng) * Math.PI / 180;
          dLat1 = (oldLat) * Math.PI / 180;
          dLat2 = (curLat) * Math.PI / 180;
          a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(dLat1) * Math.cos(dLat1) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
          c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance += 6371 * c;
          oldLng = gpxPoints[p].lng;
          oldLat = gpxPoints[p].lat;
      }
    };

    this.compute = function(session) {
        var deferred = $q.defer();
        var gpxPoints = [];
        gpxPoints = simplifyGPX(self.computeKalmanLatLng(session.gpxData), 0.00001);

        self.fixElevation(gpxPoints)
            .then(function(newGpxPoints) {gpxPoints = newGpxPoints;})
            .finally(function() {
            var hrZ1 = parseInt(Prefs.get('heartratemin')) + (parseInt(Prefs.get('heartratemax') - Prefs.get('heartratemin')) * 0.60);
            var hrZ2 = parseInt(Prefs.get('heartratemin')) + (parseInt(Prefs.get('heartratemax') - Prefs.get('heartratemin')) * 0.70);
            var hrZ3 = parseInt(Prefs.get('heartratemin')) + (parseInt(Prefs.get('heartratemax') - Prefs.get('heartratemin')) * 0.80);
            var hrZ4 = parseInt(Prefs.get('heartratemin')) + (parseInt(Prefs.get('heartratemax') - Prefs.get('heartratemin')) * 0.90);
            var hrZ = [0, 0, 0, 0, 0];
            var hr_color = 0;
            session.hhr_colors = ['#dcdcdc', '#97BBCD', '#46BFBD', '#FDB45C', '#F7464A'];
            session.hr_colors = ['rgba(220,220,220,0.5)', 'rgba(151, 187, 205, 0.5)', 'rgba(70, 191, 189, 0.5)', 'rgba(253, 180, 92, 0.5)', 'rgba(247, 70, 74, 0.5)'];
            session.hhr_colors = [{
                fillColor: 'rgba(220,220,220,0.5)',
                strokeColor: 'rgba(220,220,220,0.7)'
            }, {
                fillColor: 'rgba(151, 187, 205, 0.5)',
                strokeColor: 'rgba(151, 187, 205, 0.7)'
            }, {
                fillColor: 'rgba(70, 191, 189, 0.5)',
                strokeColor: 'rgba(70, 191, 189, 0.7)'
            }, {
                fillColor: 'rgba(253, 180, 92, 0.5)',
                strokeColor: 'rgba(253, 180, 92, 0.7)'
            }, {
                fillColor: 'rgba(247, 70, 74, 0.5',
                strokeColor: 'rgba(247, 70, 74, 0.7'
            }];

            //Max and min for leaflet and ele
            var minHeight = gpxPoints[0].ele;
            var maxHeight = minHeight;
            var lonMin = gpxPoints[0].lng;
            var lonMax = lonMin;
            var latMax = gpxPoints[0].lat;
            var latMin = latMax;
            var eleDown = 0;
            var eleUp = 0;
            var maxHeartRate = 0;

            //For calc
            var curLat = gpxPoints[0].lat;
            var curLng = gpxPoints[0].lng;
            var curDate = gpxPoints[0].timestamp;
            var curEle = gpxPoints[0].ele;
            var curHeartRate = gpxPoints[0].hr;
            var curAcc = gpxPoints[0].accuracy;
            var curCadence = gpxPoints[0].cadence;
            var curPower = gpxPoints[0].power;
            var curstrike = gpxPoints[0].strike;

            var oldLat = curLat;
            var oldLng = curLng;
            var oldDate = curDate;
            var oldEle = curEle;

            var timeStartTmp = new Date(gpxPoints[0].timestamp);
            var timeEndTmp = 0;

            var mz = 1;
            var dTemp = 0;
            var dTotal = 0;
            var dMaxTemp = 1000; // kilometer marker
            var stepDetails = [];

            var mz2 = 1;
            var eleStartTmp = curEle;
            var heartRatesTmp = [];
            var heartRatesTmp2 = [];
            var cadenceTmp = [];
            var cadenceTmp2 = [];
            var powerTmp = [];
            var powerTmp2 = [];
            var strikeTmp = [];
            var strikeTmp2 = [];
            var dTemp2 = 0;
            var smallStepDetail = [];
            var timeStartTmp2 = new Date(gpxPoints[0].timestamp);
            var timeEndTmp2 = 0;
            var dMaxTemp2 = 250;

            var paths = {};
            paths.p1 = {
                color: '#3F51B5',
                weight: 2,
                latlngs: []
            };
            var markers = {};
            markers.s = {
                lat: curLat,
                lng: curLng,
                icon: {
                    type: 'div',
                    className: 'leaflet-circle-marker-start',
                    html: 'S',
                    iconSize: [20, 20]
                },
                message: 'S',
                draggable: false,
                opacity: 0.8
            };
            markers.e = {
                lat: gpxPoints[gpxPoints.length - 1].lat,
                lng: gpxPoints[gpxPoints.length - 1].lng,
                icon: {
                    type: 'div',
                    className: 'leaflet-circle-marker-end',
                    html: 'E',
                    iconSize: [20, 20]
                },
                message: 'S',
                draggable: false,
                opacity: 0.8
            };
            //var dists = [];
            var gpxspeedtmp;
            var gpxpacetmp;
            var timeDiff;
            var dLat;
            var dLon;
            var dLat1;
            var dLat2;
            var dtd;
            var dspeed;
            var a, c, d;
            var idx = 0;
            var dwithoutpause = 0;

            for (var p = 0; p < gpxPoints.length; p++) {
                curLat = gpxPoints[p].lat;
                curLng = gpxPoints[p].lng;
                curEle = gpxPoints[p].ele;
                curDate = gpxPoints[p].timestamp;
                curHeartRate = gpxPoints[p].hr;
                curAcc = gpxPoints[p].accuracy;
                curCadence = gpxPoints[p].cadence;
                curPower = gpxPoints[p].power;
                curstrike = gpxPoints[p].strike;
                //Distances
                dLat = (curLat - oldLat) * Math.PI / 180;
                dLon = (curLng - oldLng) * Math.PI / 180;
                dLat1 = (oldLat) * Math.PI / 180;
                dLat2 = (curLat) * Math.PI / 180;
                a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(dLat1) * Math.cos(dLat1) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                d = 6371 * c;
                //Speed between this and previous point
                dtd = new Date(curDate) - new Date(oldDate);
                dspeed = (Math.round((d) * 100) / 100) / (dtd / 1000 / 60 / 60);
                if (d < 0.0001) {
                    console.log('stop point');
                } else {

                    //Leaflet
                    paths.p1.latlngs.push({
                        lat: curLat,
                        lng: curLng
                    });
                    if (curLat < latMin) {
                        latMin = curLat;
                    }
                    if (curLat > latMax) {
                        latMax = curLat;
                    }
                    if (curLng < lonMin) {
                        lonMin = curLng;
                    }
                    if (curLng > lonMax) {
                        lonMax = curLng;
                    }

                    //Max elevation
                    if (curEle > maxHeight) {
                        maxHeight = curEle;
                    }
                    if (curEle < minHeight) {
                        minHeight = curEle;
                    }
                    if (curHeartRate > maxHeartRate) {
                        {
                            maxHeartRate = curHeartRate;
                        }
                    }

                    if (p > 0) {
                        //Time without same
                        if (dspeed > 0.01) {
                            dwithoutpause += dtd;
                        }

                        dTotal += d;
                        gpxPoints[p].dist = dTotal;

                        if (curHeartRate) {
                            heartRatesTmp.push(curHeartRate);
                            heartRatesTmp2.push(curHeartRate);

                            if (curHeartRate > hrZ4) {
                                idx = 4;
                            } else {
                                if (curHeartRate > hrZ3) {
                                    idx = 3;
                                } else {
                                    if (curHeartRate > hrZ2) {
                                        idx = 2;
                                    } else {
                                        if (curHeartRate > hrZ1) {
                                            idx = 1;
                                        } else {
                                            idx = 0;
                                        }
                                    }
                                }
                            }
                            hrZ[idx] += dtd / 60000;
                        }

                        if (curPower) {
                            powerTmp.push(curPower);
                            powerTmp2.push(curPower);
                        }

                        if (curCadence) {
                            cadenceTmp.push(curCadence);
                            cadenceTmp2.push(curCadence);
                        }

                        if (curstrike) {
                            strikeTmp.push(curstrike);
                            strikeTmp2.push(curstrike);
                        }

                        dTemp += (d * 1000);
                        if (((dTotal - (mz - 1)) * 1000) >= dMaxTemp) {
                            markers[mz] = {
                                lat: curLat,
                                lng: curLng,
                                icon: {
                                    type: 'div',
                                    className: 'leaflet-circle-marker',
                                    html: mz,
                                    iconSize: [20, 20]
                                },
                                message: mz + ' Km(s)',
                                draggable: false,
                                opacity: 0.8
                            };
                            timeEndTmp = new Date(gpxPoints[p].timestamp);
                            timeDiff = timeEndTmp - timeStartTmp;
                            gpxpacetmp = (timeDiff) / (dTemp / 1000);
                            gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                            gpxspeedtmp = (Math.round((dTemp / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                            gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                            stepDetails.push({
                                pace: new Date(gpxpacetmp),
                                speed: gpxspeedtmp,
                                km: (mz * dMaxTemp) / 1000,
                                hr: average(heartRatesTmp, 0),
                                cadence: average(cadenceTmp, 0),
                                power: average(powerTmp, 0),
                                strike: average(strikeTmp,1)
                            });
                            timeStartTmp = new Date(gpxPoints[p].timestamp);
                            mz++;
                            dTemp = 0;
                            heartRatesTmp = [];
                            powerTmp = [];
                            cadenceTmp = [];

                        }
                        dTemp2 += (d * 1000);
                        if (((dTotal * 1000 - mz2 * 250)) >= dMaxTemp2) {

                            timeEndTmp2 = new Date(gpxPoints[p].timestamp);
                            timeDiff = timeEndTmp2 - timeStartTmp2;
                            gpxpacetmp = (timeDiff) / (dTemp / 1000);
                            gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                            gpxspeedtmp = (Math.round((dTemp2 / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                            gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                            smallStepDetail.push({
                                pace: new Date(gpxpacetmp),
                                speed: gpxspeedtmp,
                                km: (mz2 * dMaxTemp2 / 10) / 100,
                                ele: (eleStartTmp + curEle) / 2,
                                hr: average(heartRatesTmp2, 0),
                                cadence: average(cadenceTmp2, 0),
                                power: average(powerTmp2, 0),
                                strike: average(strikeTmp2, 1)
                            });
                            timeStartTmp2 = new Date(gpxPoints[p].timestamp);
                            mz2++;
                            dTemp2 = 0;
                            eleStartTmp = curEle;
                            heartRatesTmp2 = [];
                        }
                    }
                    if ((gpxPoints.length - 1) === p) {
                        timeEndTmp = new Date(gpxPoints[p].timestamp);
                        timeDiff = timeEndTmp - timeStartTmp;
                        gpxpacetmp = (timeDiff) / (dTemp / 1000);
                        gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                        gpxspeedtmp = (Math.round((dTemp / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                        gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                        stepDetails.push({
                            pace: new Date(gpxpacetmp),
                            speed: gpxspeedtmp,
                            km: Math.round(dTotal * 10) / 10,
                            hr: average(heartRatesTmp, 0),
                            cadence: average(cadenceTmp, 0),
                            power: average(powerTmp, 0)
                        });
                        timeEndTmp2 = new Date(gpxPoints[p].timestamp);
                        timeDiff = timeEndTmp2 - timeStartTmp2;
                        if (timeDiff > 0) {
                            gpxpacetmp = (timeDiff) / (dTemp / 1000);
                            gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                            gpxspeedtmp = (Math.round((dTemp2 / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                            gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                            smallStepDetail.push({
                                pace: new Date(gpxpacetmp),
                                speed: gpxspeedtmp,
                                km: Math.round(dTotal * 10) / 10,
                                ele: (eleStartTmp + curEle) / 2,
                                hr: average(heartRatesTmp2, 0),
                                cadence: average(cadenceTmp2, 0),
                                power: average(powerTmp2, 0),
                                strike: average(strikeTmp2, 0)
                            });
                        }
                    }



                }
                oldLat = curLat;
                oldLng = curLng;
                oldDate = curDate;
                oldEle = curEle;
            }

            //Date
            session.date = moment(new Date(gpxPoints[0].timestamp)).format('llll');

            //Points
            session.gpxPoints = gpxPoints;

            //Maps markers
            if (session.map === undefined) {
                session.map = {
                    center: {
                        lat: 48,
                        lng: 4,
                        zoom: 5,
                        autoDiscover: false
                    },
                    paths: {},
                    bounds: {},
                    controls: {
                        scale: true
                    },
                    markers: {},
                    tiles: {
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                };
            }
            session.map.markers = markers;
            session.map.paths = paths;

            //Maps bounds
            session.map.bounds = leafletBoundsHelpers.createBoundsFromArray([
                [latMin, lonMin],
                [latMax, lonMax]
            ]);
            session.map.defaults = {
                scrollWheelZoom: false
            };

            //Pace by km
            session.paceDetails = stepDetails;

            //Heart Rate OK ?
            if ((hrZ[0] === 0) && (hrZ[1] === 0) &&
                (hrZ[2] === 0) && (hrZ[3] === 0) && (hrZ[4] === 0)) {
                session.heartRate = false;
            } else {
                session.heartRate = true;
            }

            //Graph speed / ele
            session.chart_options = {
                animation: false,
                showTooltips: false,
                showScale: true,
                scaleIntegersOnly: true,
                bezierCurve: true,
                pointDot: false,
                responsive: true,
                scaleUse2Y: true,
                legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
            };
            session.chart2_options = {
                animation: false,
                showTooltips: false,
                showScale: true,
                scaleIntegersOnly: true,
                bezierCurve: true,
                pointDot: false,
                responsive: true,
                legendTemplate: '' //'<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
            };
            session.chart4_options = {
                animation: false,
                showTooltips: false,
                showScale: true,
                scaleIntegersOnly: true,
                bezierCurve: true,
                pointDot: false,
                responsive: true,
                legendTemplate: '' //'<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
            };
            session.chart3_labels = [$filter('translate')('_hr_zone0') + ' < 60%',
                $filter('translate')('_hr_zone1') + ' > 60%',
                $filter('translate')('_hr_zone2') + ' > 70%',
                $filter('translate')('_hr_zone3') + ' > 80%',
                $filter('translate')('_hr_zone4') + ' > 90%'
            ];
            for (var i = 0; i < hrZ.length; i++) {
                hrZ[i] = hrZ[i].toFixed(1);
            }
            session.chart3_data = hrZ;

            session.chart_labels = [];
            session.chart2_labels = [];
            session.chart4_labels = [];
            session.chart_data = [
                [],
                []
            ];
            session.chart2_data = [
                []
            ];
            session.chart4_data = [
                []
            ];
            session.chart2_type = 'Heartrate';
            session.chart_series = [$filter('translate')('_speed_kph'), $filter('translate')('_altitude_meters')];
            session.chart2_series = [$filter('translate')('_speed_kph'), $filter('translate')('_bpms_label')];
            session.chart4_type = 'Heartrate';
            session.chart4_series = [$filter('translate')('_altitude_meters'), $filter('translate')('_bpms_label')];
            session.avg_hr = [];
            session.avg_cadence = [];
            session.avg_power = [];
            session.chart3_type = 'DoughnutWithValue';
            for (var stepIdx = 0; stepIdx < smallStepDetail.length; stepIdx++) {
                var step = smallStepDetail[stepIdx];
                if (step.hr > hrZ4) {
                    hr_color = 4;
                } else {
                    if (step.hr > hrZ3) {
                        hr_color = 3;
                    } else {
                        if (step.hr > hrZ2) {
                            hr_color = 2;
                        } else {
                            if (step.hr > hrZ1) {
                                hr_color = 1;
                            } else {
                                hr_color = 0;
                            }
                        }
                    }
                }
                if (Math.round(step.km) === step.km) {
                    session.chart_labels.push(step.km);
                    session.chart2_labels.push(step.km + '|' + session.hr_colors[hr_color]);
                    session.chart4_labels.push(step.km + '|' + session.hr_colors[hr_color]);
                } else {
                    session.chart_labels.push('');
                    session.chart2_labels.push('|' + session.hr_colors[hr_color]);
                    session.chart4_labels.push('|' + session.hr_colors[hr_color]);
            }

                session.chart_data[0].push(step.speed);
                session.chart_data[1].push(step.ele);
                session.chart2_data[0].push(step.speed);
                session.chart4_data[0].push(step.ele);
                //session.chart2_data[1].push(step.hr); // was step.hr

                //Calc avg hr
                session.avg_hr.push(step.hr);

                //Calc avg power & cadence
                session.avg_power.push(step.power);
                session.avg_cadence.push(step.cadence);
            }

            session.avg_hr = average(session.avg_hr, 0);
            session.avg_power = average(session.avg_power, 0);
            session.avg_cadence = average(session.avg_cadence, 0);

            session.chart3_options = {
                animation: false,
                animationEasing : 'easeOutBounce',
                showTooltips: true,
                showScale: false,
                showLegend: true,
                scaleIntegersOnly: true,
                responsive: true,
                legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>',
                averageValue: session.avg_hr
            };

            eleUp = 0; //parseFloat(elePoints[0][3]);
            eleDown = 0; //parseFloat(elePoints[0][3]);
            for (p = 0; p < gpxPoints.length; p++) {
                curEle = gpxPoints[p].ele;

                if (p > 0) {

                    oldEle = gpxPoints[p - 1].ele;

                    if (curEle > oldEle) {
                        eleUp += (curEle) - (oldEle);
                    } else if (curEle < oldEle) {
                        eleDown += (oldEle) - (curEle);
                    }

                }
            }

            var gpxStart = gpxPoints[0].timestamp;
            var gpxEnd = gpxPoints[gpxPoints.length - 1].timestamp;

            var d1 = new Date(gpxStart);
            var d2 = new Date(gpxEnd);
            var miliseconds = d2 - d1;


            var tmpMilliseconds = miliseconds;

            var seconds = miliseconds / 1000;
            var minutes = seconds / 60;
            var hours = minutes / 60;
            var days = hours / 24;

            days = tmpMilliseconds / 1000 / 60 / 60 / 24;
            days = Math.floor(days);

            tmpMilliseconds = tmpMilliseconds - (days * 24 * 60 * 60 * 1000);
            hours = tmpMilliseconds / 1000 / 60 / 60;
            hours = Math.floor(hours);

            tmpMilliseconds = tmpMilliseconds - (hours * 60 * 60 * 1000);
            minutes = tmpMilliseconds / 1000 / 60;
            minutes = Math.floor(minutes);

            tmpMilliseconds = tmpMilliseconds - (minutes * 60 * 1000);
            seconds = tmpMilliseconds / 1000;
            seconds = Math.floor(seconds);

            //var gpxdur = new Date("Sun May 10 2015 " + hours + ":" + minutes + ":" + seconds + " GMT+0200");

            var gpxpace = (miliseconds) / dTotal;
            gpxpace = (Math.round(gpxpace * 100) / 100) * 1;
            gpxpace = new Date(gpxpace);

            var gpxspeed = (Math.round(dTotal * 100) / 100) / (miliseconds / 1000 / 60 / 60);
            gpxspeed = Math.round(gpxspeed * 100) / 100;
            var gpxspeedwithoutpause = Math.round(((Math.round(dTotal * 100) / 100) / (dwithoutpause / 1000 / 60 / 60))*100) / 100;
            var gpxpacewithoutpause = new Date(dwithoutpause / dTotal);
            session.gpxMaxHeight = Math.round(maxHeight);
            session.gpxMinHeight = Math.round(minHeight);
            session.distance = Math.round(dTotal * 100) / 100;
            session.pace = gpxpace;
            session.speed = gpxspeed;
            session.speedinmvt = gpxspeedwithoutpause;
            session.paceinmvt = gpxpacewithoutpause;
            session.eleUp = Math.round(eleUp);
            session.eleDown = Math.round(eleDown);
            session.distk = session.distance.toFixed(0);

            session.duration = new Date(d2 - d1);

            session.start = gpxPoints[0].timestamp;
            session.end = gpxPoints[gpxPoints.length - 1].timestamp;

            session.overnote = (parseInt(gpxspeed) * 1000 * (miliseconds / 1000 / 60) * 0.000006 + ((Math.round(eleUp) - Math.round(eleDown)) * 0.02)).toFixed(1);

            deferred.resolve(session);
        });

        // Return a promise.
        return deferred.promise;
    };

    this.exportGPX = function()  {
        var gpxHead = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n';
        gpxHead += '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" creator="ForRunners" version="1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">';
        gpxHead += '<metadata>\n';
        gpxHead += '<link href="http://www.khertan.net">\n';
        gpxHead += '<text>Khertan Software</text>\n';
        gpxHead += '</link>\n';
        gpxHead += '<time>' + moment().format() + '</time>\n';
        gpxHead += '</metadata>\n';
        gpxHead += '<trk>\n';
        gpxHead += '<trkseg>\n';

        var gpxSubHead = '';
        var gpxFoot = '</trkseg></trk>\n</gpx>';
        var filename = moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx';

        gpxSubHead = '<name>' + session.date + '</name>\n';

        var gpxPoints = '';
        session.gpxData.map(function(pts) {
            gpxPoints += '<trkpt lat=\"' + pts[0] + '\" lon=\"' + pts[1] + '\">\n';
            gpxPoints += '<ele>' + pts[3] + '</ele>\n';
            gpxPoints += '<time>' + pts[2] + '</time>\n';
            if (pts[4] || pts[5] || pts[6] || pts[7] || pts[8]) {
                gpxPoints += '<extensions><gpxtpx:TrackPointExtension>';
                if (pts[4]) {
                    gpxPoints += '<gpxtpx:hr>' + pts[4] + '</gpxtpx:hr>\n';
                }
                if (pts[5]) {
                    gpxPoints += '<gpxtpx:accuracy>' + pts[5] + '</gpxtpx:accuracy>\n';
                }
                if (pts[6]) {
                    gpxPoints += '<gpxtpx:cad>' + pts[6] + '</gpxtpx:cad>\n';
                }
                if (pts[7]) {
                    gpxPoints += '<gpxtpx:power>' + pts[7] + '</gpxtpx:power>\n';
                }
                if (pts[8]) {
                    gpxPoints += '<gpxtpx:strike>' + pts[8] + '</gpxtpx:strike>\n';
                }
                gpxPoints +=  '</gpxtpx:TrackPointExtension></extensions>';
            }
            gpxPoints += '</trkpt>\n';
        });

        var sf = new FileFactory();
        sf.createFolder('GPXs');
        return sf.writeJSON(sf.getDefaultPath() + 'GPXs/', filename, gpxHead + gpxSubHead + gpxPoints + gpxFoot);
    };

    this.parseFromGPX = function() {

    };

    this.parseFromFIT = function() {

    };

    return this;
}])

// Service to store resumegraph
.factory('Resume', ['FileFactory', 'Sessions', '$filter', function(FileFactory, Sessions, $filter) {
    'use strict';
    var self = this;
    var resume = {};

    this.save = function() {
        var sf = new FileFactory();
        sf.writeJSON(sf.getDefaultPath(), 'resume', resume);
    };

    this.getResume = function() {
        return resume;
    };

    this.load = function() {
        var sf = new FileFactory();
        return sf.readJSON(sf.getDefaultPath(), 'resume').then(function(obj){
            if (obj) {
                resume = obj; }
            else {
                self.compute(); }
        });
    };

    this.compute = function() {
        resume = {};
        resume.chart_labels = [];
        resume.chart_series = [$filter('translate')('_overnote'), $filter('translate')('_duration_minutes')];
        resume.chart_data = [
            [],
            []
        ];
        resume.chart_options = {
            responsive: true,
            animation: false,
            showScale: false,
            scaleShowLabels: false,
            pointHitDetectionRadius: 10,
            scaleUse2Y: true,
            legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
        };

        resume.overnote = 0;

        resume.elapsed = 0;
        resume.equirect = 0;
        resume.avspeed = 0;

        resume.longesttime = new Date(0);
        resume.bestdistance = 0;
        resume.bestspeed = 0;

        Sessions.getSessions().map(function(item) {

            resume.chart_labels.push(item.date);
            try {
             resume.chart_data[1].push(item.duration.getUTCMinutes() + item.duration.getUTCHours() * 60);
             resume.chart_data[0].push(item.overnote);
             resume.elapsed += item.duration.getTime();
            } catch(err) {console.error('item.duration.getUTCMinutes'); }
            resume.avspeed += item.speed;
            resume.equirect += item.distance;
            resume.overnote += parseFloat(item.overnote);


            if (item.speed > resume.bestspeed) {
                resume.bestspeed = item.speed;
            }
            if (item.duration > resume.longesttime) {
                resume.longesttime = item.duration;
            }
            if (item.distance > resume.bestdistance) {
                resume.bestdistance = item.distance;
            }

        });

        if (resume.chart_labels.length > 25) {
            resume.chart_labels = resume.chart_labels.slice(0, 24);
            resume.chart_data[0] = resume.chart_data[0].slice(0, 24);
            resume.chart_data[1] = resume.chart_data[1].slice(0, 24);
        }
        resume.chart_labels.reverse();
        resume.chart_data[0].reverse();
        resume.chart_data[1].reverse();

        resume.flatdistance = (resume.equirect / Sessions.getSessions().length).toFixed(1);
        resume.avspeed = (resume.avspeed / Sessions.getSessions().length).toFixed(1);
        resume.avduration = new Date(resume.elapsed / Sessions.getSessions().length);
        resume.overnote = Math.round((resume.overnote / Sessions.getSessions().length), 1);

        resume.bestspeed = resume.bestspeed.toFixed(1);
        resume.bestdistance = resume.bestdistance.toFixed(1);

        self.save();
    };

    return this;
}])

// Service to store sessions
.factory('Equipments', ['FileFactory', function(FileFactory) {
    'use strict';
    var equipments = [];
    var self = this;

    this.save = function() {
        var sf = new FileFactory();
        return sf.writeJSON(sf.getDefaultPath(), 'equipments', equipments);
    };

    this.getEquipments = function() {
        return equipments;
    };

    this.load = function() {
        var sf = new FileFactory();
        return sf.readJSON(sf.getDefaultPath(), 'equipments')
                 .then(function(obj){
                    if (obj) {
                      equipments = obj;
                    } else {
                      equipments = [];
                    }
                  });
    };

    this.getAt = function(idx) {
        return equipments[idx];
    };

    this.remove = function(idx) {
        equipments.splice(idx,1);
    };

    this.appendOrWrite = function(eq) {
        var fnd = -1;
        for (var idx = 0; idx < equipments.length; idx++) {
            if (equipments[idx].uuid === eq.uuid) {
                fnd = idx;
            }
        }

        if (fnd >= 0) {
            equipments[fnd] = eq;
        } else {
            equipments.push(eq);
        }

        try {
            return self.save();
        } catch(err) {
            console.warn(err);
        }
    };

    this.compute = function(sessions) {
        var distance = {};
        if (equipments) {
            sessions.map(function(session){
                if (session.equipments === undefined) {
                    session.equipments = equipments.filter(function(eq){
                        return eq.isDefault === true;
                    });
                }
                session.equipments.map(function(eq){
                    if (eq.uuid) {
                        if (!distance[eq.uuid]) {
                            distance[eq.uuid] = 0; }
                        distance[eq.uuid] += session.distance;
                    }
                });
            });

            equipments = equipments.map(function(eq) {
                if (distance[eq.uuid]) {
                    eq.distance = distance[eq.uuid].toFixed(1); }
                else {
                    eq.distance = 0; }
                return eq;
            });
        }
    };

    return this;
}])


// Service to store sessions
.factory('Sessions', ['FileFactory', 'Session', 'Equipments', function(FileFactory, Session, Equipments) {
    'use strict';
    var sessions = [];
    var self = this;

    this.save = function() {
        var sf = new FileFactory();
        return sf.writeJSON(sf.getDefaultPath(), 'sessions', sessions);
    };

    this.importFIT = function(file) {
        console.log('importing FIT:'+file);
        var reader = new FileReader();
        var session = {};

        // Require the module
        var EasyFit = window.easyFit.default;

        reader.onloadend = function() {

            // Create a EasyFit instance (options argument is optional)
            var easyFit = new EasyFit({
                force: true,
                speedUnit: 'km/h',
                lengthUnit: 'km',
                temperatureUnit: 'celcius',
                elapsedRecordField: true,
                mode: 'cascade',
            });

            easyFit.parse(this.result, function (error, data) {
                if (error) {
                console.log(error);
                } else {
                    console.log(JSON.stringify(data));

                   for (var sessions_idx in data.activity.sessions) {
                        session = {};
                        session.gpxData = [];

                        for (var lap_idx in data.activity.sessions[sessions_idx].laps) {
                            for (var record_idx in data.activity.sessions[sessions_idx].laps[lap_idx].records) {
                                var pnt = data.activity.sessions[sessions_idx].laps[lap_idx].records[record_idx];
                                session.gpxData.push([pnt.position_lat, pnt.position_long, pnt.timestamp, pnt.altitude, pnt.heart_rate, 0, pnt.cadence, pnt.power, pnt.vertical_oscillation]);
                            }
                        }

                        session.recclicked = new Date(session.gpxData[0][2]).getTime();
                        Session.compute(session).then(self.appendOrWrite);
                   }
               }
            });
        };
        reader.readAsArrayBuffer(file);
    };


    this.importGPX = function(fileuri){
        console.log('importing GPX:'+fileuri.name);
        var reader = new FileReader();
        var session = {};

        reader.onloadend = function() {
            var x2js = new X2JS();
            var json = x2js.xml_str2json(this.result);

            var gpxPoints = [];

            if (json.gpx.trk.trkseg instanceof Array) {
                json.gpx.trk.trkseg.map(function(item) {
                    gpxPoints = gpxPoints.concat(item.trkpt);
                });
            } else {
                gpxPoints = json.gpx.trk.trkseg.trkpt;
            }

            //NOW RECOMPUTE AND CREATE
            session.gpxData = [];

            gpxPoints.map(function(item) {
                var bpms;
                var accuracy;
                var power;
                var cadence;
                var strike;

                try {
                    bpms = parseFloat(item.extensions.TrackPointExtension.hr.__text);
                } catch (exception) {
                    try {
                        bpms = parseFloat(item.extensions.hr.__text);
                    } catch (exception2) {
                        bpms = undefined;
                    }
                }
                try {
                    power = parseFloat(item.extensions.TrackPointExtension.power.__text);
                } catch (exception) {
                    try {
                        power = parseFloat(item.extensions.power.__text);
                    } catch (exception2) {
                        power = undefined;
                    }
                }
                try {
                    cadence = parseFloat(item.extensions.TrackPointExtension.cad.__text);
                } catch (exception) {
                    try {
                        cadence = parseFloat(item.extensions.cad.__text);
                    } catch (exception2) {
                        cadence = undefined;
                    }
                }
                try {
                    accuracy = parseFloat(item.extensions.TrackPointExtension.accuracy.__text);
                } catch (exception) {
                    try {
                        accuracy = parseFloat(item.extensions.accuracy.__text);
                    } catch (exception2) {
                        accuracy = undefined;
                    }
                }
                try {
                    strike = parseFloat(item.extensions.TrackPointExtension.strike.__text);
                } catch (exception) {
                    try {
                        strike = parseFloat(item.extensions.strike.__text);
                    } catch (exception2) {
                        strike = undefined;
                    }
                }
                
                session.gpxData.push([item._lat, item._lon, item.time, item.ele, bpms, accuracy, cadence, power, strike]);
            });

            session.recclicked = new Date(gpxPoints[0].time).getTime();
            //Save session already compute session
            Session.compute(session).then(self.appendOrWrite);
        };

        reader.readAsText(fileuri);

    };

    this.clean = function() {
        //Cleaning
        if (sessions !== null) {
            sessions = sessions.filter(function(item) {
                return (parseFloat(item.overnote) > 0.1);
            });
        }

        // Remove Duplicate recclicked (already sorted)
        if (sessions !== null) {
            sessions = sessions.filter(function(item, pos, self) {
                if (pos > 0)
                    {return item.recclicked !== self[pos-1].recclicked;}
                else
                    {return true;}
            });
        }
    };

    this.sort = function() {
         sessions.sort(function(a, b) {
                var x = parseInt(a.recclicked);
                var y = parseInt(b.recclicked);
                    return (((x < y) ? -1 : ((x > y) ? 1 : 0)) * -1);
         });
    };

    this.getSessions = function() {
        return sessions;
    };

    this.load = function() {
        var sf = new FileFactory();
        return sf.readJSON(sf.getDefaultPath(), 'sessions')
                 .then(function(obj){
                    if (obj) {
                        sessions = obj;
                    } else {
                        sessions = [];
                    }
                 })
                 .then(this.sort)
                 .then(this.clean);
    };

    this.getAt = function(idx) {
        var session = sessions[idx];

        //Check sanity
        if ((session.map === undefined)) {
            session.map = {
                center: {
                    lat: 48,
                    lng: 4,
                    zoom: 5,
                    autoDiscover: false
                },
                paths: {},
                bounds: {},
                controls: {
                    scale: true
                },
                markers: {},
                tiles: {
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
            };
        }

        if (session.equipments) {
            var eqs;
            Equipments.load().then(function() {eqs = Equipments.getEquipments();})
                .then(function() {
                    session.equipments = eqs.filter(function(eq) {
                        return eq.isDefault === true;
                    });
                });
        }

        return session;
    };

    this.deleteByID = function(session_id) {
        if ((sessions === undefined) || (sessions === null)) {
            self.load().then(self.deleteByID(session_id)); }
        else {
            var fnd = -1;
            for (var idx = 0; idx < sessions.length; idx++) {
                if (sessions[idx].recclicked === session_id) {
                    fnd = idx;
                }
            }
            if (fnd >= 0) {
               sessions.splice(fnd, 1);
            } 

            try {
                return self.save();
            } catch(err) {
                console.warn(err);
            }
        }
    };

    this.appendOrWrite = function(session) {
        if ((sessions === undefined) || (sessions === null)) {
            self.load().then(self.appendOrWrite(session)); }
        else {
            var fnd = -1;
            for (var idx = 0; idx < sessions.length; idx++) {
                if (sessions[idx].recclicked === session.recclicked) {
                    fnd = idx;
                }
            }

            if (fnd >= 0) {
                sessions[fnd] = session;
            } else {
                sessions.push(session);
            }

            try {
                return self.save();
            } catch(err) {
                console.warn(err);
            }
            Session.initWith(session);
            Session.exportGPX();
        }
    };

    return this;
}])

// Service to communicate with OpenWeatherMap API.
.factory('$weather', function($q, $http) {
    'use strict';
    var API_ROOT = 'http://api.openweathermap.org/data/2.5/';
    this.byCityName = function(query) {
        var deferred = $q.defer();
        // Call the API using JSONP.
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&q=' + encodeURI(query)).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                // Call successful.
                deferred.resolve(response.data);
            } else {
                // Something went wrong. Probably the city doesn't exist.
                deferred.reject(response.data.message);
            }
        }, function(error) {
            // Unable to connect to API.
            deferred.reject(error);
        });
        // Return a promise.
        return deferred.promise;
    };
    this.byCityId = function(id) {
        var deferred = $q.defer();
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&id=' + id).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                deferred.resolve(response.data);
            } else {
                deferred.reject(response.data.message);
            }
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };
    this.byLocation = function(coords) {
        var deferred = $q.defer();
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&lat=' + coords.latitude + '&lon=' + coords.longitude).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                deferred.resolve(response.data);
            } else {
                deferred.reject(response.data.message);
            }
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };

    return this;
});
