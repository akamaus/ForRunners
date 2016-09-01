function average(arr, prec) {
    'use strict'; 
    var cnt = 1;
	var len = arr.length;
	var av;
	if (arr[0] instanceof Date) {
			av = arr[0].getTime();
	} else {av = arr[0]; }
	for (var i = 1; i < len; i++) {
		if (arr[0] instanceof Date) {
			av += arr[i].getTime();
		} else {av += arr[i]; }
	    cnt++;
	}
	if (arr[0] instanceof Date) {
		return new Date(av/cnt);
	}
	return Math.round(av/cnt * (prec+1)) / (prec+1);
}

function parseFloatOr(shouldbefloat) {
    'use strict';
    try {
        return parseFloat(shouldbefloat);
    } catch(err) { 
        console.info('shouldbefloat:'+err);
        return 0.0;
    }
}
