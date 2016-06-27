angular.module('app.controllers', [])

.filter('ldate', function() {
    'use strict';
    return function(date) {
        return moment(date).format('llll');
    };
})

.filter('duration', function() {
    'use strict';
    return function(date) {
        return moment(date).format('HH:mm');
    };
})

.filter('translatei18', function($filter) {
    'use strict';
    return function(text) {
        return $filter('translate')(text.replace('-', ''));
    };
})

.filter('unsafe', function($sce) {
    'use strict';
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})

.directive('navBarClass', function() {
    'use strict';
    return {
        restrict: 'A',
        compile: function(element, attrs) {

            // We need to be able to add a class the cached nav-bar
            // Which provides the background color
            var cachedNavBar = document.querySelector('.nav-bar-block[nav-bar="cached"]');
            var cachedHeaderBar = cachedNavBar.querySelector('.bar-header');

            // And also the active nav-bar
            // which provides the right class for the title
            var activeNavBar = document.querySelector('.nav-bar-block[nav-bar="active"]');
            var activeHeaderBar = activeNavBar.querySelector('.bar-header');
            var barClass = attrs.navBarClass;
            var ogColors = [];
            var colors = ['positive', 'stable', 'light', 'royal', 'dark', 'assertive', 'calm', 'energized'];
            var cleanUp = function() {
                for (var i = 0; i < colors.length; i++) {
                    var currentColor = activeHeaderBar.classList.contains('bar-' + colors[i]);
                    if (currentColor) {
                        ogColors.push('bar-' + colors[i]);
                    }
                    activeHeaderBar.classList.remove('bar-' + colors[i]);
                    cachedHeaderBar.classList.remove('bar-' + colors[i]);
                }
            };
            return function($scope) {
                $scope.$on('$ionicView.beforeEnter', function() {
                    cleanUp();
                    cachedHeaderBar.classList.add(barClass);
                    activeHeaderBar.classList.add(barClass);
                });

                $scope.$on('$stateChangeStart', function() {
                    for (var j = 0; j < ogColors.length; j++) {
                        activeHeaderBar.classList.add(ogColors[j]);
                        cachedHeaderBar.classList.add(ogColors[j]);
                    }
                    cachedHeaderBar.classList.remove(barClass);
                    activeHeaderBar.classList.remove(barClass);
                    ogColors = [];
                });
            };
        }
    };
})

.controller('AppCtrl', function($state, $scope, $ionicModal, $ionicPopup, $timeout, $interval, $ionicPlatform,
    $ionicHistory, $weather, $http, $translate, $filter, $ionicScrollDelegate,
    leafletData, leafletBoundsHelpers, Sessions, Resume, Session, Prefs) {
    'use strict';

    // Version, Platform
    $scope._version = '0.12.1';
    $timeout(function(){
    try {
        $scope.platform = window.device.platform;
        $scope.android_version = window.device.version.toLowerCase();
        if ($scope.platform === 'android') {
            if (parseInt(window.device.version) < 5) {
               $scope.platform = 'oldandroid';
            }
        }
    } catch(err) {
        $scope.platform = 'Browser';
        console.warn(err);
    }}, 1000);
    $scope.weather = $weather;

    // Try to manage Android Intent from other app (open as)
    try {
        window.plugins.intent.getCordovaIntent(function (intent) {
            console.debug(intent);
        }, function () {});
    } catch(err) {
        console.warn(err);
    }
    
    //GLOBALS
    $scope.running = false;
    $scope.bluetooth_scanning = false;

    //Load Prefs
    Prefs.load();

    //Language
    try {
        navigator.globalization.getPreferredLanguage(
        function (language) { $scope.prefs.language = language.value; console.log('Prefered language: ' + $scope.prefs.language);},
        function () {console.error('Error getting language\n');}
    );} catch(err) {
         console.info('Globalization module probably not available: ' + err);
    }

    $scope.updateSessionsList = function() {
        $scope.sessions = Sessions.getSessions();
    };


    // Load Sessions
    Sessions.load().then(function(){
        if(navigator && navigator.splashscreen) {
            navigator.splashscreen.hide();}
    })
    .then($scope.updateSessionsList)
    .then(Resume.load).then(function(){
        if (Resume.getResume()) {
            Resume.compute(); }
        $scope.resume = Resume.getResume();
    });

    $timeout(function() {
        //$scope.detectBLEDevice();
    }, 2000);

    $scope.iosFilePicker = function() {
        var utis = ['public.data', 'public.item', 'public.content', 'public.file-url', 'public.text'];
        window.FilePicker.pickFile(function(url) {
            Sessions.importGPX(url);
        }, function(err){
            $ionicPopup.alert({
            title: $scope.translateFilter('_gpx_import_title'),
            template: err
        }, utis);});
    };

    $scope.doFileChooser = function() {
       if ($scope.platform === 'iOS') {
            $scope.iosFilePicker();
        } else if ($scope.platform === 'OldAndroid' ) {
              $state.go('app.filepicker');
        } else {
           $timeout(function(){document.getElementById('gpxFile').click();},100);
        }  
     };

    $scope.doFITChooser = function() {
       if ($scope.platform === 'iOS') {
            $scope.iosFilePicker();
        } else if ($scope.platform === 'OldAndroid' ) {
              $state.go('app.filepicker');
        } else {
           $timeout(function(){document.getElementById('fitFile').click();},100);
        }  
     };

    $scope.sendLogs = function() {
        window.open('mailto:khertan@khertan.net?subject=ForRunners Log&body=' + JSON.stringify(window.initialLogs.slice(-100), null, 2));
    };

    $scope.importGPXs = function(element) {
        for (var idx in element.files) {
            if (typeof element.files[idx] === 'object') {
                Sessions.importGPX(element.files[idx]);
            }
        }

        $ionicPopup.alert({
            title: $scope.translateFilter('_gpx_import_title'),
            template: $scope.translateFilter('_gpx_file_imported')
        });

    };

    $scope.importFITs = function(element) {
        for (var idx in element.files) {
            if (typeof element.files[idx] === 'object') {
                Sessions.importFIT(element.files[idx]);
            }
        }

        $ionicPopup.alert({
            title: $scope.translateFilter('_gpx_import_title'),
            template: $scope.translateFilter('_gpx_file_imported')
        });

    };

    /*
    $scope.writeGPX = function(dirEntry, filename, session) {
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

        dirEntry.getFile(filename, {
            create: true
        }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
                // Already in JSON Format
                writer.onwrite = function() {
                };
                writer.onerror = function(e) {
                    $ionicPopup.alert({
                        title: $scope.translateFilter('_gpx_error_title'),
                        template: $scope.translateFilter('_gpx_error_content')
                    });
                    console.error(e);
                    console.error(writer.error);
                };
                writer.fileName = filename; //moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx';
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
                            gpxPoints += '<gpxtpx:stryde>' + pts[8] + '</gpxtpx:stryde>\n';
                        }
                        gpxPoints +=  '</gpxtpx:TrackPointExtension></extensions>';
                    }
                    gpxPoints += '</trkpt>\n';
                });
                writer.write(gpxHead + gpxSubHead + gpxPoints + gpxFoot, {
                    type: 'text/plain'
                });
            }, function() {
                console.log('failed can t create writer');
            });
        }, function() {
            console.log('failed to get file');
        });

    };*/

    $scope.exportAGPX = function(session) {
        Session.initWith(session);
        Session.exportGPX();
    };

    $scope.exportAsGPX = function() {
        try {
            Sessions.getSessions().map(function(session) {
                $scope.exportAGPX(session);
            });
        } catch(err) {
            console.error('Export as GPX failed : ' + err);
        }
    };

    $scope.translateFilter = $filter('translate');
    Prefs.setLang();

    $scope.glbs = {
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
        },
        radius: {
            miles: 3959,
            kms: 6371
        },
        tounit: {
            miles: 1609.344,
            kms: 1000
        },
        pace: {
            miles: 26.8224,
            kms: 16.6667
        },
        speed: {
            miles: 2.2369,
            kms: 3.6
        },
        pacelabel: {
            miles: ' min/mile',
            kms: ' min/km'
        },
        speedlabel: {
            miles: ' mph',
            kms: ' kph'
        },
        distancelabel: {
            miles: ' miles',
            kms: ' km'
        }
    };

    $ionicPlatform.registerBackButtonAction(function() {
        if ($scope.running === false) {
            var view = $ionicHistory.backView();
            if (view) {
                view.go();
            }
        } else {
            $state.go('app.running');
        }
    }, 100);

    $scope.openModal = function() {
        $state.go('app.running');

    };

    $scope.closeModal = function() {
        $state.go('app.sessions');
    };

    $scope.registerBluetoothDevice = function(id) {
        if (id in $scope.prefs.registeredBLE) {
             delete $scope.prefs.registeredBLE[id];
       } else {
             $scope.prefs.registeredBLE[id] = $scope.bluetooth_devices[id];
        }
        $scope.savePrefs();
    };

    $scope.detectBLEDevice = function() {
        $scope.bluetooth_devices = {};
        
        for (var prop in $scope.prefs.registeredBLE) {
            $scope.bluetooth_devices[prop] = {
                'id': prop,
                'name': $scope.prefs.registeredBLE[prop].name,
                'registered': true
            };
        }
        $scope.bluetooth_scanning = true;

        try {
            ble.startScan([], function(bledevice) {
                $scope.$apply(function() {
                    if (!(bledevice.id in $scope.bluetooth_devices)) {
                        if (bledevice.id in $scope.prefs.registeredBLE) {
                            $scope.bluetooth_devices[bledevice.id] = {
                                'id': bledevice.id,
                                'name': bledevice.name ? bledevice.name : 'Unknow',
                                'registered': true
                            };

                        } else {
                            $scope.bluetooth_devices[bledevice.id] = {
                                'id': bledevice.id,
                                'name': bledevice.name ? bledevice.name : 'Unknow',
                                'registered': false
                            };
                        }
                    }
                });
            }, function() {
                $scope.$apply(function() {
                    $scope.bluetooth_scanning = false;
                });
            });

            setTimeout(function() {
                ble.stopScan(
                    function() {
                        $scope.$apply(function() {
                            $scope.bluetooth_scanning = false;
                        });
                    },
                    function() {
                        $scope.$apply(function() {
                            $scope.bluetooth_scanning = false;
                        });
                    }
                );
            }, 5000);
        } catch (exception) {                                                   
            $scope.bluetooth_scanning = false;
            console.info('BluetoothLE not available');   
        }  
    };

    $scope.heartRateOnConnect = function(peripheral) {
        //HEARTRATE
        ble.notify(peripheral.id,
            $scope.glbs.heartRate.service,
            $scope.glbs.heartRate.measurement,
            $scope.heartRateOnData,
            function(err) {
                console.error('BLE HR error :' + err);
                $scope.session.beatsPerMinute = null;
            });
 
        //CADENCE
        ble.notify(peripheral.id,
            $scope.glbs.cadence.service,
            $scope.glbs.cadence.measurement,
            $scope.cadenceOnData,
            function(err) {
                console.error('BLE Cadence error :' + err);
                $scope.session.instantCadence = null;
            });
        
        //POWER
        ble.notify(peripheral.id,
            $scope.glbs.power.service,
            $scope.glbs.power.measurement,
            $scope.powerOnData,
            function(err) {
                console.error('BLE Power error :' + err);
                $scope.session.instantPower = null;
                $scope.session.intantStride = null;
            });
        
    };

    $scope.heartRateOnData = function(buffer) {
        var data = new DataView(buffer);
        // https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
        if (data.getUint8(0) === 0x1000) {
            $scope.session.beatsPerMinute = data.getUint16(1);
        } else {
            $scope.session.beatsPerMinute = data.getUint8(1);
        }
    };


    $scope.cadenceOnData = function(buffer) {
        //
        var data = new DataView(buffer);
        $scope.session.instantCadence = data.getUint8(3);
        console.log('Instant Cadence' + $scope.session.instantCadence);
        console.log('Data1' + data.getUint8(1));
        console.log('Data2' + data.getUint8(2));
        console.log('Data3' + data.getUint8(3));
        console.log('Data4' + data.getUint8(4));

        if (data.getUint8(0) === 0x1000) {
            $scope.session.instantStride = data.getUint16(4);}
    };

    $scope.powerOnData = function(buffer) {
        //https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.cycling_power_measurement.xml
        var data = new DataView(buffer);
        $scope.session.instantPower = data.getInt16(2, true);
    };

    $scope.heartRateOnDisconnect = function(reason) {
        console.debug('BLE Disconnected:' + reason);
        $scope.session.beatsPerMinute = null;
    };

    $scope.heartRateScan = function() {
        // https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.heart_rate.xml
        if ((Object.keys($scope.prefs.registeredBLE).length > 0) && ($scope.session.beatsPerMinute === null)) {
            ble.scan([$scope.glbs.heartRate.service], 5,
                //onScan
                function(peripheral) {
                    console.debug('Found ' + JSON.stringify(peripheral));

                    if (peripheral.id in $scope.prefs.registeredBLE) {
                        //foundHeartRateMonitor = true;
                        ble.connect(peripheral.id,
                            $scope.heartRateOnConnect,
                            $scope.heartRateOnDisconnect);
                    } else {
                        console.debug('Device ' + peripheral.id + ' not registered');
                    }

                }, function() {
                    console.error('BluetoothLE scan failed');
                }
            );
        }
    };

    $scope.stopSession = function() {
        $scope.session.saving = true;
        $timeout(function() {
            if ($scope.platform === 'android') {
                GPSLocation.clearWatch($scope.session.watchId);
                console.debug('Session recording stopped');
            } else {
                navigator.geolocation.clearWatch($scope.session.watchId);
                console.debug('Session recording stopped');
            }
            //backgroundGeoLocation.stop();
            $interval.cancel($scope.runningTimeInterval);
            if ($scope.session.gpxData.length > 0) {
                //Session cleaning
                delete $scope.session.accuracy;
                delete $scope.session.elapsed;
                delete $scope.session.firsttime;
                delete $scope.session.elevation;
                delete $scope.session.time;
                delete $scope.session.pace;
                delete $scope.session.speed;
                delete $scope.session.maxspeed;
                delete $scope.session.equirect;
                delete $scope.session.eledist;
                delete $scope.session.altold;
                delete $scope.session.latold;
                delete $scope.session.lonold;
                delete $scope.session.latold;
                delete $scope.session.lastdisptime;
                delete $scope.session.maxalt;
                delete $scope.session.minalt;
                delete $scope.session.hilldistance;
                delete $scope.session.flatdistance;
                delete $scope.session.avpace;
                delete $scope.session.avspeed;
                delete $scope.session.lastdistvocalannounce;
                delete $scope.session.lasttimevocalannounce;
                delete $scope.session.timeslowvocalinterval;
                delete $scope.session.lastfastvocalannounce;
                delete $scope.session.kalmanDist;
                $scope.session.fixedElevation = undefined;
                $scope.saveSession();
                Resume.compute();
                //$scope.updateList();
            }
            $scope.running = false;
            try {
                cordova.plugins.backgroundMode.disable();
            } catch (exception) {
                console.debug('ERROR: cordova.plugins.backgroundMode disable');
            }
            try {
                window.plugins.insomnia.allowSleepAgain();
            } catch (exception) {
                console.debug('ERROR: cordova.plugins.insomnia allowSleepAgain');
            }

            try {
                window.powerManagement.release(function() {
                        console.log('Wakelock released');
                }, function() {
                        console.log('Failed to release wakelock');
                });
            } catch (exception) {}

            try {
                clearInterval($scope.btscanintervalid);
            } catch (exception) {
            }

            if ($scope.platform === 'firefoxos') {
                try {
                    $scope.screen_lock.unlock();
                } catch(exception) {}
                try {
                    $scope.gps_lock.unlock();
                } catch(exception) {}
            }

            $scope.closeModal();
            $scope.session.saving = false;
        }, 10);
    };

    $scope.speakText = function(text) {
        try {

            musicControl.isactive(function(err, cb) {
                if (err) {
                    console.error(err);
                }

                var stopMusic = (cb && $scope.prefs.togglemusic);

                var utterance = new SpeechSynthesisUtterance();

                utterance.text = text;
                utterance.volume = 1;
                utterance.lang = ($scope.prefs.language);


                if (stopMusic) {
                    utterance.onend = function(event) {
                        if (stopMusic) {
                            musicControl.togglepause(function(err, cb) {
                                if (err) {
                                    console.error(err, event, cb);
                                }
                                return;
                            });
                        }
                    };
                    musicControl.togglepause(function(err, cb) {
                        if (err) {
                            console.error(err, event, cb);
                        }
                        speechSynthesis.speak(utterance);
                        return;
                    });
                } else {
                    speechSynthesis.speak(utterance);
                }
            });
        } catch (exception) {
            console.debug('SpeechSynthesisUtterance not available : ' + exception);
        }
    };

    $scope.testRunSpeak = function() {
        $scope.session = {};
        $scope.session.equirect = 3.24;
        $scope.session.avspeed = 10.21;
        $scope.session.avpace = '5:48';
        $scope.session.time = '1:28:23';
        $scope.session.beatsPerMinute = 160;
        $scope.runSpeak();
    };

    $scope.runSpeak = function() {
        var speechText = '';
        if ($scope.prefs.distvocalannounce) {
            speechText += $scope.session.equirect.toFixed(2) + ' ' + $scope.translateFilter('_kilometers') + ' ';
        }
        if ($scope.prefs.timevocalannounce) {
            speechText += ', ';
            var hs = $scope.session.time.split(':')[0];
            if (parseInt(hs, 10) > 0) {
                speechText += hs + ' ' + $scope.translateFilter('_hours') + ' ' + $scope.translateFilter('_and') + ' ';
            }
            speechText += $scope.session.time.split(':')[1] + ' ' + $scope.translateFilter('_minutes');
        }

        if ($scope.prefs.avgspeedvocalannounce) {
            speechText += ', ' + $scope.session.speed + ' ' + $scope.translateFilter('_kilometers_per_hour') + ' ';
        }
        if ($scope.prefs.avgpacevocalannounce) {
            speechText += ', ';
            speechText += $scope.session.avpace.split(':')[0] + ' ' + $scope.translateFilter('_minutes') + ' ' + $scope.translateFilter('_and') + ' ';
            speechText += $scope.session.avpace.split(':')[1] + ' ' + $scope.translateFilter('_seconds_per_kilometers');
        }
        if (($scope.prefs.heartrateannounce === true) && ($scope.session.beatsPerMinute > 0)) {
            speechText += ', ' + $scope.session.beatsPerMinute + ' ' + $scope.translateFilter('_bpms') + ' ';
        }
 
        $scope.speakText(speechText);
    };

    $scope.recordPosition = function(pos) {
        console.debug('recordPosition');
        if ($scope.mustdelay === false) {
            var latnew = pos.coords.latitude;
            var lonnew = pos.coords.longitude;
            var timenew = pos.timestamp;
            var altnew = 'x';
            var elapsed = 0;

            if (typeof pos.coords.altitude === 'number') {
                altnew = pos.coords.altitude;
            }

            $scope.$apply(function() {
                $scope.session.accuracy = pos.coords.accuracy;
                $scope.session.accuracy_fixed = pos.coords.accuracy.toFixed(0);

                if ((pos.coords.accuracy <= $scope.prefs.minrecordingaccuracy) &&
                    (timenew > $scope.session.recclicked) &&
                    ($scope.session.latold !== 'x') &&
                    ($scope.session.lonold !== 'x')) {
                    $scope.session.gpsGoodSignalToggle = true;
                    if (($scope.prefs.gpslostannounce)) {
                            //$scope.speakText($scope.translateFilter('_gps_got'));
                            $scope.gpslostlastannounce = timenew;
                    }
                }

                if ((pos.coords.accuracy >= $scope.prefs.minrecordingaccuracy) &&
                    ($scope.session.gpsGoodSignalToggle === true) &&
                    (timenew > $scope.session.recclicked)) {
                    // In case we lost gps we should announce it
                    $scope.session.gpsGoodSignalToggle = false;
                    if (($scope.prefs.gpslostannounce) && ((timenew - 30) > $scope.gpslostlastannounce)) {
                        $scope.speakText($scope.translateFilter('_gps_lost'));
                        $scope.gpslostlastannounce = timenew;
                    }
                }

                if ($scope.session.firsttime !== 0) {
                    //Elapsed time
                    elapsed = timenew - $scope.session.firsttime;
                    var hour = Math.floor(elapsed / 3600000);
                    var minute = ('0' + (Math.floor(elapsed / 60000) - hour * 60)).slice(-2);
                    var second = ('0' + Math.floor(elapsed % 60000 / 1000)).slice(-2);
                    $scope.session.time = hour + ':' + minute + ':' + second;
                    $scope.session.elapsed = elapsed;

                    if ((pos.coords.accuracy <= $scope.prefs.minrecordingaccuracy)) {
                        // Instant speed
                        if (pos.coords.speed) {
                            console.debug('GPS give us a speed');
                            $scope.session.speeds.push(pos.coords.speed);
                            if ($scope.session.speeds.length > 5) {
                                $scope.session.speeds.shift();
                            }
                            $scope.session.speed = average($scope.session.speeds,0);
                            var currentPace = $scope.glbs.pace[$scope.prefs.unit] / $scope.session.speed;
                            //converts metres per second to minutes per mile or minutes per km
                            $scope.session.pace = Math.floor(currentPace) + ':' + ('0' + Math.floor(currentPace % 1 * 60)).slice(-2);
                            $scope.session.speed = ($scope.session.speed * $scope.glbs.speed[$scope.prefs.unit]).toFixed(1);
                            if ($scope.session.maxspeed < $scope.session.speed) {
                                $scope.session.maxspeed = $scope.session.speed;
                            }
                        }

                        // Not first point
                        if ($scope.session.latold !== 'x' && $scope.session.lonold !== 'x') {

                            //Limit ok
                            if (timenew - $scope.session.lastdisptime >= $scope.prefs.minrecordinggap) {
                                $scope.session.lastdisptime = timenew;

                                //Distances
                                var dLat;
                                var dLon;
                                var dLat1;
                                var dLat2;
                                var a, c, d;
                                var dtd;
                                var dspeed;

                                dLat = (latnew - $scope.session.latold) * Math.PI / 180;
                                dLon = (lonnew - $scope.session.lonold) * Math.PI / 180;
                                dLat1 = ($scope.session.latold) * Math.PI / 180;
                                dLat2 = (latnew) * Math.PI / 180;
                                a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                    Math.cos(dLat1) * Math.cos(dLat1) *
                                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                d = $scope.session.kalmanDist.update(6371 * c)[0];
                                //Speed between this and previous point
                                dtd = new Date(timenew) - new Date($scope.session.timeold);
                                dspeed = (d) / (dtd / 1000 / 60 / 60);

                                elapsed = timenew - $scope.session.firsttime;
                                //console.log(ispeed);
                                if ((dspeed > 1)) {
                                    $scope.session.equirect += d;
                                    $scope.session.eledist += d;
                                }

                                //Elevation?
                                if ($scope.session.altold !== 'x') {
                                    $scope.session.altold = altnew;
                                    if (altnew > $scope.session.maxalt) {
                                        $scope.session.maxalt = altnew;
                                        $scope.session.elevation = ($scope.session.maxalt - $scope.session.minalt).toFixed(1);
                                    }
                                    if (altnew < $scope.session.minalt) {
                                        $scope.session.minalt = altnew;
                                        $scope.session.elevation = ($scope.session.maxalt - $scope.session.minalt).toFixed(1);
                                    }
                                }
                                $scope.session.hilldistance = $scope.session.eledist.toFixed(2);
                                $scope.session.flatdistance = $scope.session.equirect.toFixed(2);
                                $scope.session.distk = $scope.session.equirect.toFixed(1);
                                if ($scope.session.equirect > 0) {
                                    var averagePace = elapsed / ($scope.session.equirect * 60000);
                                    $scope.session.avpace = Math.floor(averagePace) + ':' + ('0' + Math.floor(averagePace % 1 * 60)).slice(-2);
                                    if (dspeed) {
                                        $scope.session.avspeed = dspeed.toFixed(1);
                                    } else {
                                        $scope.session.avspeed = '0';
                                    }
                                }

                                $scope.session.latold = latnew;
                                $scope.session.lonold = lonnew;
                                $scope.session.altold = altnew;
                                $scope.session.timeold = timenew;

                                //Alert and Vocal Announce
                                if (parseInt($scope.prefs.distvocalinterval) > 0) {
                                    $scope.session.lastdistvocalannounce = 0;
                                    if (($scope.session.equirect - $scope.session.lastdistvocalannounce) > $scope.prefs.distvocalinterval * 1000) {
                                        $scope.session.lastdistvocalannounce = $scope.session.equirect;
                                        $scope.runSpeak();
                                    }
                                }

                                if (parseInt($scope.prefs.timevocalinterval) > 0) {
                                    if ((timenew - $scope.session.lasttimevocalannounce) > $scope.prefs.timevocalinterval * 60000) /*fixme*/ {
                                        $scope.session.lasttimevocalannounce = timenew;
                                        $scope.runSpeak();
                                    }
                                }

                                if (parseInt($scope.prefs.timeslowvocalinterval) > 0) {
                                    if (($scope.session.lastslowvocalannounce !== -1) &&
                                        ((timenew - $scope.session.lastslowvocalannounce) > $scope.prefs.timeslowvocalinterval * 60000)) /*fixme*/ {
                                        $scope.session.lastslowvocalannounce = -1;
                                        $scope.session.lastfastvocalannounce = timenew;
                                        $scope.speakText($scope.translateFilter('_run_fast'));
                                    }
                                }
                                if (parseInt($scope.prefs.timefastvocalinterval) > 0) {
                                    if (($scope.session.lastfastvocalannounce !== -1) &&
                                        ((timenew - $scope.session.lastfastvocalannounce) > $scope.prefs.timefastvocalinterval * 60000)) /*fixme*/ {
                                        $scope.session.lastslowvocalannounce = timenew;
                                        $scope.session.lastfastvocalannounce = -1;
                                        $scope.speakText($scope.translateFilter('_run_slow'));
                                    }
                                }
                            }
                        }
                    }
                } else {
                    $scope.session.firsttime = timenew;
                    $scope.session.lastdisptime = timenew;
                    $scope.session.lastdistvocalannounce = 0;
                    $scope.session.lasttimevocalannounce = timenew;
                    $scope.session.lastslowvocalannounce = timenew;
                    $scope.session.lastfastvocalannounce = -1;
                    $scope.session.latold = latnew;
                    $scope.session.lonold = lonnew;
                    $scope.session.time = '00:00:00';
                    $scope.session.hilldistance = '0';
                    $scope.session.flatdistance = '0';
                    $scope.session.maxspeed = '0';
                    $scope.session.speed = '0';
                    $scope.session.avspeed = '0';
                    $scope.session.elapsed = 0;
                    $scope.session.minalt = 99999;
                    $scope.session.maxalt = 0;
                    $scope.session.elevation = '0';
                    $scope.session.smoothed_speed = [];
                }
                if ((timenew - $scope.session.lastrecordtime >= $scope.prefs.minrecordinggap) &&
                    (pos.coords.accuracy <= $scope.prefs.minrecordingaccuracy)) {
                    //console.log('Should record');
                    var pointData = [
                        latnew.toFixed(6),
                        lonnew.toFixed(6),
                        new Date(timenew).toISOString() //.replace(/\.\d\d\d/, '')
                    ];

                    if (typeof pos.coords.altitude === 'number') {
                        pointData.push(pos.coords.altitude);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.beatsPerMinute) {
                        pointData.push($scope.session.beatsPerMinute);
                    } else {
                        pointData.push('x');
                    }

                    pointData.push(pos.coords.accuracy);
 
                    if ($scope.session.instantCadence) {
                        pointData.push($scope.session.instantCadence);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.instantPower) {
                        pointData.push($scope.session.instantPower);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.instantStride) {
                        pointData.push($scope.session.instantStride);
                    } else {
                        pointData.push('x');
                    }


                    $scope.session.gpxData.push(pointData);
                    $scope.session.lastrecordtime = timenew;
                }

                // Record Weather
                if ($scope.session.weather === '') {
                    $scope.weather.byLocation({
                        'latitude': latnew,
                        'longitude': lonnew
                    }).then(function(weather) {
                        $scope.session.weather = weather;
                    });
                }

            });
        }
    };

    $scope.toRad = function(x) {
        return x * Math.PI / 180;
    };

    $scope.errorPosition = function(err) {
        console.debug('errorPosition:' + err.message + ':' + err.code);
        $scope.session.gpsGoodSignalToggle = false;
        console.debug('gpsGoodSignalToggle set to false');
        if (($scope.prefs.gpslostannounce)) {
                $scope.speakText($scope.translateFilter('_gps_lost'));
                $scope.gpslostlastannounce = $scope.session.lastrecordtime;
        }
    };


    $scope.startSession = function() {
        $scope.running = true;

        $scope.session = {};
        $scope.session.gpsGoodSignalToggle = true;
        $scope.gpslostannounced = false;
        $scope.session.recclicked = new Date().getTime();
        $scope.session.date = moment().format('llll');

        $scope.session.mdate = moment().format('MMMM YYYY');
        $scope.session.ddate = new Date().getDate();
        $scope.session.gpxData = [];

        $scope.session.unit = $scope.prefs.unit;
        $scope.session.speedlabel = $scope.glbs.speedlabel[$scope.prefs.unit];
        $scope.session.pacelabel = $scope.glbs.pacelabel[$scope.prefs.unit];
        $scope.session.distancelabel = $scope.glbs.distancelabel[$scope.prefs.unit];

        $scope.session.lastrecordtime = 0;
        $scope.session.elapsed = 0;
        $scope.session.firsttime = 0;

        $scope.session.latold = 'x';
        $scope.session.lonold = 'x';
        $scope.session.altold = 'x';

        $scope.session.time = '00:00:00';
        $scope.session.dist = 0;
        $scope.session.kalmanDist = new KalmanFilter(0.2, 3, 10);
        $scope.session.equirect = 0;
        $scope.session.eledist = 0;
        $scope.session.hilldistance = '0';
        $scope.session.flatdistance = '0';
        $scope.session.elevation = '0';
        $scope.session.maxspeed = '0';
        $scope.session.speed = '0';
        $scope.session.avspeed = '0';
        $scope.session.avpace = '00:00';
        $scope.session.speeds = [];

        $scope.session.weather = '';
        $scope.session.temp = '';

        $scope.screen_lock = null;
        $scope.gps_lock = null;
        $scope.gpslostlastannounce = 0;

        $scope.mustdelay = ($scope.prefs.useDelay === true);
        $scope.delay = new Date().getTime();
        if ($scope.mustdelay === true) {
            $scope.mustdelaytime = new Date().getTime();
            $scope.mustdelayintervalid = setInterval($scope.delayCheck, 500);
        }
        try {
            cordova.plugins.backgroundMode.setDefaults({
                title: 'ForRunners',
                ticker: $scope.translateFilter('_notification_slug'),
                text: $scope.translateFilter('_notification_message')
            });
            cordova.plugins.backgroundMode.enable();
            cordova.plugins.backgroundMode.onactivate = function() {
                console.log('backgroundMode onActivate');
                $scope.session.watchBgId = GPSLocation.watchPosition(
                    $scope.recordPosition,
                    $scope.errorPosition, {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 3000
                });
 
            };


            cordova.plugins.backgroundMode.ondeactivate = function(){
                  // after several times of interval log, this get called
                  console.log('backgroundMode.ondeactivate');
            };
        
        } catch (exception) {
            console.debug('ERROR: cordova.plugins.backgroundMode not enabled');
        }

        try {
            window.powerManagement.dim(function() {
                console.log('Wakelock acquired');
            }, function() {
                console.log('Failed to acquire wakelock');
            });

            window.powerManagement.setReleaseOnPause(false, function() {
                console.log('setReleaseOnPause successfully');
            }, function() {
                console.log('Failed to set');
            });
        } catch (exception) {
            console.warn('ERROR: cordova powerManagement not enabled');
        }
        if ($scope.prefs.keepscreenon === true) {
            try {
                window.plugins.insomnia.keepAwake();
            } catch (exception) {
                console.debug('ERROR: window.plugins.insomnia keepAwake');
            }
        }

        try {
            $scope.session.beatsPerMinute = null;
            $scope.btscanintervalid = setInterval($scope.heartRateScan, 10000);
        } catch (exception) {
            console.debug('ERROR: BLEScan:' + exception);
        }


        if ($scope.prefs.debug) {
            $scope.prefs.minrecordingaccuracy = 22;
        } else {
            $scope.prefs.minrecordingaccuracy = 22;
        }
        
        if ($scope.platform === 'firefoxos') {
            try {
                $scope.gps_lock = window.navigator.requestWakeLock('gps');
                if ($scope.prefs.keepscreenon === true) {
                    $scope.screen_lock = window.navigator.requestWakeLock('screen');
                }
            } catch (exception) {
                console.debug('ERROR: Can\'t set background GPS or keep screen on setting for FirefoxOS:' + exception);
            }
        }
        
        if ($scope.platform === 'android') {
            $scope.session.watchId = GPSLocation.watchPosition(
                $scope.recordPosition,
                $scope.errorPosition, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 3000
            });
        } else {
             $scope.session.watchId = navigator.geolocation.watchPosition(
                $scope.recordPosition,
                $scope.errorPosition, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 3000
            });
        }

        //Timer to update time
        $scope.runningTimeInterval = $interval(function() {
                if ($scope.session.firsttime > 0) {
                var elapsed = Date.now() - $scope.session.firsttime;
                var hour = Math.floor(elapsed / 3600000);                   
                var minute = ('0' + (Math.floor(elapsed / 60000) - hour * 60)).slice(-2);
                var second = ('0' + Math.floor(elapsed % 60000 / 1000)).slice(-2);
                $scope.session.time = hour + ':' + minute + ':' + second;   
                $scope.session.elapsed = elapsed; 
                }
        }, 2000);

        $scope.openModal();

    };


    $scope.delayCheck = function() {
        if ((new Date().getTime() - $scope.mustdelaytime) < $scope.prefs.delay) {
            $scope.delay = (new Date().getTime() - $scope.mustdelaytime);
            $scope.session.time = (-($scope.prefs.delay - $scope.delay) / 1000).toFixed(0);
            $scope.$apply();
        } else {
            $scope.mustdelay = false;
            $scope.speakText($scope.translateFilter('go'));
            $scope.session.time = '00:00:00';
            clearInterval($scope.mustdelayintervalid);
            $scope.$apply();
        }
    };

    $scope.saveSession = function() {
        Sessions.appendOrWrite(Session.session)
            .then($scope.updateSessionsList)
            .then(Resume.compute);
    };

    $scope.computeEquipmentsDatas = function() {
    };

})

.controller('SessionsCtrl', function($scope, $timeout, ionicMaterialInk, ionicMaterialMotion, $state, Sessions, Prefs) {
    'use strict';

    $timeout(function() {
        //Get position a first time to get better precision when we really
        //start running
        navigator.geolocation.getCurrentPosition(function() {}, function() {}, {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
        });
       
        if (Prefs.get('first_run') === true) {
            Prefs.set('first_run', false);
            $state.go('app.help');        
        }
    }, 5000);

    // Compute Resume Graph
    $timeout(function() {
        ionicMaterialInk.displayEffect();
    }, 4000);

})

.controller('EquipmentsCtrl', function($scope, $ionicPopup, Equipments) {
    'use strict';
    if (!$scope.equipments) {
        Equipments.load().then(function() {
            Equipments.compute();
            $scope.equipments = Equipments.getEquipments();});
    }

    $scope.fakeGuid = function(){
        /*jslint bitwise: true*/
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
        });
        /*jslint bitwise: false*/
    };

    $scope.addEquipment = function(){
        Equipments.appendOrWrite({
           'uuid': $scope.fakeGuid(),
           'name':'Untitled Shoes',
           'distance':0,
           'photo':'img/defaultshoes.png' 
        }).then(function() {
            $scope.equipments = Equipments.getEquipments();
        });
    };

    $scope.deleteEquipment = function(idx) {
        // confirm dialog
        var confirmPopup = $ionicPopup.confirm({
            title: $scope.translateFilter('_delete_eq'),
            template: $scope.translateFilter('_confirm_delete_eq')
        });
        confirmPopup.then(function(res) {
            if (res) {
                Equipments.remove(idx).then(function() {
                    $scope.equipments = Equipments.getEquipments();
                });

            } else {
                console.error('Error confirm delete equipment');
            }
        });
    };


    $scope.setName = function(idx) {
        $scope.equipment = Equipments.getAt(idx);
        $ionicPopup.show({
            template: '<input type="text" ng-model="equipment.name">',
            title: 'Edit the name',
            subTitle: 'Example: Sketchers Go Run Sprint',
            scope: $scope,
            buttons: [
            { text: 'Cancel' },
            {
                text: '<b>Save</b>',
                type: 'button-positive',
                onTap: function(e) {
                if (!$scope.equipment.name) {
                    e.preventDefault();
                } else {
                    console.log($scope.equipment.name);
                    Equipments.appendOrWrite($scope.equipment).then(function() {
                    $scope.equipments = Equipments.getEquipments();
                });
                    return $scope.equipment.name;
                }
                }
            }
            ]
        });
    };

    $scope.setDefault = function(idx) {
        $scope.equipment = Equipments.getAt(idx);
        $scope.equipment.isDefault = !$scope.equipment.isDefault;
        Equipments.appendOrWrite($scope.equipment).then(function() {
                    $scope.equipments = Equipments.getEquipments();
                });
    };

    $scope.savePicture = function(uri, uuid){
        var stordir = cordova.file.externalDataDirectory;
        if (!stordir) {
            stordir = cordova.file.dataDirectory;
        }

        window.resolveLocalFileSystemURL(stordir,
            function(dirEntry) {
                dirEntry.getDirectory('images', { create: true }, function (subDirEntry) {
                     window.resolveLocalFileSystemURI(uri, function(file) {
                        file.moveTo(subDirEntry,uuid+'.jpg');
                     });
                }, function() {console.log('failed can t open fs');});

            },
            function() {
                console.log('failed can t open fs');
            });

        
        return stordir+'images/'+uuid+'.jpg';
    };

    $scope.setPhoto = function(idx) {
        try {
            navigator.camera.getPicture(function(pictureURI){
            $scope.equipment = Equipments.getAt(idx);
            var newURI = $scope.savePicture(pictureURI, $scope.equipment.uuid);
            $scope.equipment.photo = newURI;
            Equipments.appendOrWrite($scope.equipment).then(function() {
                    $scope.equipments = Equipments.getEquipments();
                });
        }, function(err){
            $ionicPopup.alert({
               title: $scope.translateFilter('_camera_picture_error_title'),
                template: err});
        }, { destinationType: Camera.DestinationType.FILE_URL});
        } catch(err) {
          $ionicPopup.alert({
               title: $scope.translateFilter('_camera_picture_error_title'),
                template: $scope.translateFilter('_camera_not_available')});
 
        }
    };

    Equipments.compute();
})

/*.controller('EquipmentCtrl', function($scope, $stateParams, $ionicPopup, $ionicHistory) {
    'use strict';
    $scope.deleteEquipment = function(idx) {
        // confirm dialog
        var confirmPopup = $ionicPopup.confirm({
            title: $scope.translateFilter('_delete'),
            template: $scope.translateFilter('_confirm_delete')
        });
        confirmPopup.then(function(res) {
            if (res) {
                $scope.equipments.splice(idx, 1);
                $scope.writeEquipmentsToFile($scope.equipments);
                if ($scope.platform === 'Browser') {
                    $scope.storageSetObj('equipments', $scope.equipments); }
                //Back
                var view = $ionicHistory.backView();
                if (view) {
                    view.go();
                }
            } else {
                console.error('Error confirm delete equipment');
            }
        });
    };

    $scope.saveEquipmentModifications = function() {
        $scope.equipments[$stateParams.equipmentId] = $scope.equipment;
        $scope.writeEquipmentsToFile($scope.equipments);
        if ($scope.platform === 'Browser') {
            $scope.storageSetObj('equipments', $scope.equipments);}
        $scope.storageSetObj('version', $scope._version);
    };

    $scope.deleteEquipmentByID = function(sid) {
        $scope.equipments.map(function(value, indx) {
            if (value.recclicked === sid) {
                $scope.deleteEquipment(indx);
            }
        });
    };

    $scope.equipment = $scope.equipments[$stateParams.equipmentId];

})*/


.controller('RecordsCtrl', function($scope, Sessions) {
    'use strict';
    $scope.computeRecords = function() {
        $scope.records = {};
        var sessions = Sessions.getSessions();
        $scope.total_kms = 0;
        
        if (sessions) {
            for (var idx = 0; idx < sessions.length; idx++) {
                var session = sessions[idx];

                if ($scope.records[session.distk] === undefined) {
                    $scope.records[session.distk] = {
                        distk: session.distk,
                        speed: 0,
                        pace: undefined,
                        duration: new Date(),
                        speeds: [],
                        durations: [],
                        paces: [],
                        av_speed: undefined,
                        av_duration: undefined,
                        av_pace: undefined

                    };

                }
                $scope.total_kms += session.distance;

                if ($scope.records[session.distk].speed < session.speed) {
                    $scope.records[session.distk].speed = session.speed;
                }
                if ($scope.records[session.distk].pace === undefined) {
                    $scope.records[session.distk].pace = session.pace;

                } else {
                    if ($scope.records[session.distk].pace > session.pace) {
                        $scope.records[session.distk].pace = session.pace;
                    }
                }
                if ($scope.records[session.distk].duration > session.duration) {
                    $scope.records[session.distk].duration = session.duration;
                }

                $scope.records[session.distk].paces.push(session.pace);
                $scope.records[session.distk].speeds.push(session.speed);
                $scope.records[session.distk].durations.push(session.duration);
                $scope.records[session.distk].av_pace = average($scope.records[session.distk].paces, 0);
                $scope.records[session.distk].av_speed = average($scope.records[session.distk].speeds, 1);
                $scope.records[session.distk].av_duration = average($scope.records[session.distk].durations, 0);
            }
        }

        $scope.total_kms = $scope.total_kms.toFixed(1);
   };

    $scope.computeRecords();

    //$timeout(function() {
        //ionicMaterialInk.displayEffect();
    //}, 300);

})

.controller('SessionCtrl', function($scope, $stateParams, $ionicPopup, $ionicHistory, $timeout, $ionicScrollDelegate, Sessions, Session, Resume, Prefs, Equipments) {
    'use strict';
    $scope.deleteSession = function(idx) {
        // confirm dialog
        var confirmPopup = $ionicPopup.confirm({
            title: $scope.translateFilter('_delete'),
            template: $scope.translateFilter('_confirm_delete')
        });
        confirmPopup.then(function(res) {
            if (res) {
                Sessions.sessions.splice(idx, 1);
                Sessions.save()
                    .then($scope.updateSessions)
                    .then(Resume.compute);
                
                //Back
                var view = $ionicHistory.backView();
                if (view) {
                    view.go();
                }
            } else {
                console.error('Error confirm delete session');
            }
        });
    };

    $scope.saveSessionModifications = function() {
        Sessions.appendOrWrite($scope.session);
    };

    $scope.deleteSessionByID = function(sid) {
        Sessions.sessions.map(function(value, indx) {
            if (value.recclicked === sid) {
                $scope.deleteSession(indx);
            }
        });
    };


    $scope.addEquipment = function(newEq) {
        $scope.session.equipments.push(newEq);
        $scope.saveSessionModifications();
    };

    $scope.removeEquipment = function(idx) {
        var confirmPopup = $ionicPopup.confirm({
            title: $scope.translateFilter('_delete_eq'),
            template: $scope.translateFilter('_confirm_delete_eq')
        });
        confirmPopup.then(function(res) {
            if (res) {
                $scope.session.equipments.splice(idx,1);
                $scope.saveSessionModifications();   
            } else {
                console.error('Error confirm delete equipment');
            }
        });
    };

    $scope.sharePieceOfDOM = function(){

        //share the image via phonegap plugin
        window.plugins.socialsharing.share(
            $scope.session.distance + ' Kms in ' + moment($scope.session.duration).utc().format('HH:mm') + ' ( '+ $scope.session.speed+' Kph ) tracked with #ForRunners',
            'ForRunners',
            document.getElementById('speedvsalt').toDataURL(),
            'http://khertan.net/#forrunners',
            function(){ 
                //success callback
            },
            function(err){
                //error callback
                console.error('error in share', err);
            }
        );

    };

    $scope.session = Sessions.getAt($stateParams.sessionId);
    Session.initWith(Sessions.getAt($stateParams.sessionId));

    if (!$scope.equipments) {
        Equipments.load()
            .then(function() {$scope.equipments = Equipments.getEquipments(); })
            .then(function() {
                //If session has no equipments push defaults in
                if ((!$scope.session.equipments) && ($scope.equipments)) {
                    $scope.session.equipments = $scope.equipments.map(function(eq){
                        if (eq.isDefault) {
                            return eq;}
                    });
                }
            });
    }

    // Horrible hack to workarround a resize issue with chart.js and ng
    angular.element(document).ready(function () {
       $timeout(function() {
            $ionicScrollDelegate.resize();   
       }, 100);  
    });
    
    // Check if session need to be computed
    if ((($scope.session.fixedElevation === undefined) && (Prefs.get('usegoogleelevationapi') === true)) || 
             ($scope.session.overnote === undefined) ||
             ($scope.session.gpxPoints === undefined) ||
             (Prefs.get('debug') === true) ||
             ($scope.session.paceDetails === undefined) ||
             ($scope.session.map.paths === undefined) ||
             ($scope.session.map.bounds === undefined) ||
             ($scope.session.map.markers === undefined)||
             ($scope.session.version !== $scope._version)) {
        
            Session.compute().then(function(session) {
                $scope.session = session;   
                Sessions.appendOrWrite(session).then(function() {
                    $scope.sessions = Sessions.getSessions();
                    $scope.updateSessionsList();
                });
            });
    }
})

.controller('FilePickerController', function($scope, $ionicPlatform, FileFactory, $ionicHistory) {
    'use strict';
    var fs = new FileFactory();

    $ionicPlatform.ready(function() {
        fs.getEntries('file:///storage').then(function(result) {
            $scope.files = result;
        }, function(error) {
            console.error(error);
        });

        $scope.getContents = function(path) {
            fs.getEntries(path).then(function(result) {
                if (result instanceof FileEntry) {
                    var view = $ionicHistory.backView();
                    if (view) {
                        view.go();
                    }
                    result.file(function(gotFile) {
                        $scope.importGPX(gotFile);
                    }, function(err) {console.error(err);});
                        
                } else {
                    $scope.files = result;
                    $scope.files.unshift({name: '[parent]'});
                    fs.getParentDirectory(path).then(function(result) {
                        result.name = '[parent]';
                        $scope.files[0] = result;
                    });
                }
            });
        };
    });

})


.controller('SettingsCtrl', function($scope, Prefs) {
    'use strict';
    //$scope.promptForRating = function() {
        //AppRate.preferences.storeAppURL.android = 'market://details?id=net.khertan.forrunners';
        //AppRate.preferences.promptAgainForEachNewVersion = false;
        //AppRate.promptForRating();
    //};
    
    //if (Sessions.sessions.length > 5) {
    //    $scope.promptForRating();
    //
    //}
    //
    $scope.prefs = Prefs.getPrefs();
}) 

.controller('HelpCtrl', function($scope, $state, $ionicScrollDelegate) {
    'use strict';
    $scope.help_cur = 1;
    $scope.next = function() {
        $scope.help_cur += 1;
        $scope.go();
        $ionicScrollDelegate.scrollTop();
    };
    $scope.previous = function() {
        $scope.help_cur -= 1;
        if ($scope.help_cur <= 0) {
            $scope.help_cur = 1;
        }
        $scope.go();
        $ionicScrollDelegate.scrollTop();
    };


    $scope.go = function() {
        if (($scope.help_cur >= 1) || ($scope.help_cur <= 6)){
            $scope.help_path = 'img/help_'+$scope.help_cur+'.svg';
            $scope.help_subtitle = $scope.translateFilter('_help_subtitle_'+$scope.help_cur);
            $scope.help_desc = $scope.translateFilter('_help_desc_'+$scope.help_cur); 
        } else if ($scope.help_cur === 7) {
            $state.go('app.sessions');            
        }
    };
    $scope.go();
});
