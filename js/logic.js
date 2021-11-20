//globals
var searchMethod = "auto";
var manual_coords = null;


//listens for change on .method-select dynamic element
$(document).on('click', ".dropdown-menu li", function () {
	ga('send', 'event', 'dropdown', 'select', 'choose new uber method: ' + this.textContent + '');
	document.getElementById("results-container-price").innerHTML = "Chipotle is only " + this.id + " away" ;
	$(".method-button").text(this.textContent);
});

function selectMethodInfo() {
	var option = $(".method-button").text();
	if (option === "uberX") {
		window.open('http://blog.uber.com/tag/uberX/');
    }
    else if (option === "uberXL") {
	    window.open('http://blog.uber.com/tag/uberXL/');
    }
    else if (option === "UberBLACK") {
	    window.open('http://blog.uber.com/tag/uberBLACK/');
    }
    else if (option === "UberSUV") {
		window.open('http://blog.uber.com/tag/uberSUV/');
    }
    else {
	    window.open('http://blog.uber.com/');
    }
}

function autoComplete() {
	$('.info').hide()
    var input = document.getElementById('searchTextField');
    var autocomplete = new google.maps.places.Autocomplete(input);
    var infowindow = new google.maps.InfoWindow();

    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      infowindow.close();
      var place = autocomplete.getPlace();
      
      //build an object
      position = {};
      position.coords = {};
      position.coords.latitude = place.geometry.location.k;
      position.coords.longitude = place.geometry.location.B;
	  manual_coords = position;
    });

}

function switchInputMode(source) {
	if ($('.address-autocomplete-form').is(":visible")) {
		//user has selected auto detect mode
		ga('send', 'event', 'button', 'click', 'switch input mode to automatic');
		$(".micro-button").text('Enter Address Manually');
		$('.address-autocomplete-form').hide();
		searchMethod = "auto";
		if (source === 1) {
			$('body').scrollTo('#home', {duration:'slow', offset: 325});
		}
		
	}
	else{
		//user has selected manual mode
		ga('send', 'event', 'button', 'click', 'switch input mode to manual');
		autoComplete();
		$(".micro-button").text('Auto Detect Location');
		$('.address-autocomplete-form').show();
		searchMethod = "manual";
		if (source === 1) {
			$('body').scrollTo('#home', {duration:'slow', offset: 325});
		}
			
	}
}

function startProcess() {
	$('.info').hide()
	$('.error').hide()
	$('.loader').show();
	ga('send', 'event', 'conversion', 'click', 'FINDING BURRITOS');
	if (searchMethod === "auto") {
		//get users location
	    if (navigator.geolocation) {
	    	//call main on success, processError on failure
	        navigator.geolocation.getCurrentPosition(main, processError);
	    } else {
	    	//if browser not supported, let the user know
	        processError("browser_error")
	    }
	}
	else {
		if (manual_coords != null) {
			main(manual_coords)
		}
		else {
			processError("no_address")
		}
		
	}

}

function main(position) {
	//get the current users lat and lng
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    //make sure Uber works in the area
    var uberProductURL = getFindUberProductsURL(lat, lng);
	var rawUberProductData = makeCall(uberProductURL);
	var uberProducts = jQuery.parseJSON(rawUberProductData.responseText)
	if (uberProducts.products.length != 0) {
	    //build URL with the lat and lng to find closest chipotle
		var googleURL = getFindChipotleURL(lat, lng);
		//get results with Google API
		var rawGoogleResults = makeCall(googleURL);
		//make sure the call is successful we go some results back
		if (rawGoogleResults.status == 200) {
			googleJSON = jQuery.parseJSON(rawGoogleResults.responseText)
			//make sure there are some results to check
			if (googleJSON.status != "ZERO_RESULTS")
			{
				googleResults = googleJSON.results;
				//get the long and lat for the closest chipotle
				var chipotle_lat = googleResults[0].geometry.location.lat;
				var chipotle_lng = googleResults[0].geometry.location.lng;
				//generate an image of a map drawing a line from point A to point B
				var mapImage = getMapImage(lat, lng, chipotle_lat, chipotle_lng);
				//build URL with the lat and lng from current location and closest chipotle for Uber
				var uberURL = getFindUberCarsURL(lat, lng, chipotle_lat, chipotle_lng);
				//get results with Uber API
				var rawUberResults = makeCall(uberURL);
				//make sure the call is successful we go some results back
				if (rawUberResults.status == 200) {
					uberResults = jQuery.parseJSON(rawUberResults.responseText)
					
					//make sure some cars are available
					if (uberResults.prices.length != 0) {
						//build a selector for all the available methods and their prices					
						var sel = $('.btn-group ul');
						$.each(uberResults.prices, function(index, method) {
							if (method.localized_display_name != 'uberTAXI') {
								sel.append('<li id= ' + method.estimate + '><a href="#fancy">' + method.localized_display_name + '</a></li>');
							}
						});
		
						//get the cheapest available price
						var price = uberResults.prices[0].estimate
						var method = uberResults.prices[0].localized_display_name
						
						//output the resulting data
						document.getElementById("results-container-price").innerHTML = "Chipotle is only " + price + " away" ;
						$(".method-button").text(method);
						document.getElementById("results-container-map").innerHTML = "<img class='img-responsive imageClip' src="+ mapImage +">"
						$('.loader').hide()
						$('.info').show()
						$('body').scrollTo('#info', {duration:'slow'});
					}
					else {
						processError('no_uber');
					}
				}
				else {
					processError('uber_error');
				}
			}
			else {
				processError('no_results_error');
			}
		}
		else {
			processError('google_error');
		}
	}
	else {
		processError('no_uber');
	}		
}

function processError(error) {
	
	var error_div = document.getElementById("error-container-message");
	var errorOutput = "We're sorry, we experienced an error.";

	//process any errors while connecting to the two API's 
	if (error == 'google_error') {
		errorOutput = "There was a problem connecting to Google's API.";
	}
	if (error == 'uber_error') {
		errorOutput = "There was a problem connecting to Uber's API";
	}
	//if there are no chipotles close by
	if (error == 'no_results_error') {
		errorOutput = "Oh No! There are no Chipotle's close by, you should move.";
	}
	//if uper doesn't work in the area
	if (error == 'no_uber') {
		errorOutput = "Oh No! Uber hasn't reached your area yet! <a href='https://support.uber.com/hc/en-us/requests/new'>Let them know!</a>";
	}
	//if no location is entered
	if (error == 'no_address') {
		errorOutput = "We can't find Cars and Burritos without your location!</a>";
	}
	//if the browser isn't supported
	if (error == 'browser_error') {
		errorOutput = "Your browser isn't supported! Get out of the dark ages!";
	}

	//process any errors encountered while auto retreving location
    if (error.PERMISSION_DENIED){
    	errorOutput = "We can't find Cars and Burritos without your location! </br> <a href='#fail' onclick='javascript:switchInputMode(1);'>Enter Address Manually</a>";
    }
    if (error.POSITION_UNAVAILABLE){
    	ga('send', 'event', 'error', 'logged', 'location unavailable');
    	errorOutput = "We're sorry, we couldn't determine your location! </br> <a href='#fail' onclick='javascript:switchInputMode(1);'>Enter Address Manually</a>";
    }
    if (error.TIMEOUT){
    	errorOutput = "We're sorry, we couldn't determine your location! </br> <a href='#fail' onclick='javascript:switchInputMode(1);'>Enter Address Manually</a>";
    }
    if (error.UNKNOWN_ERROR){
    	errorOutput = "We're sorry, we experienced a problem! </br> <a href='#fail' onclick='javascript:switchInputMode(1);'>Enter Address Manually</a>";
    }

    //output errors
    error_div.innerHTML = errorOutput;
    $('.loader').hide()
    $('.error').slideDown()
    $('body').scrollTo('#error', {duration:'slow', offset: -60});
    
}

function closeError() {
	ga('send', 'event', 'button', 'click', 'close error button');
	$('.error').slideUp();
	//document.getElementById("error").style.display = "none";
}

function makeCall(input_url) {
	//wrapper for making AJAX calls to Uber and Google's API
	data = $.ajax({ 
		url: 'http://www.uber2chipotle.com/receive_ajax.php',
		data: {action: 'get', url: input_url},
		type: 'post',
		async: false
	});
	return data;
}


 
function getFindChipotleURL(lat, lng) {
	//Builds Google Maps API URL to find the closest Chipotle given the users location
	var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=';
	var parameters = {
		rankby: 'distance',
		type: 'Food',
		name: 'Chipotle',
		key: process.env.GOOGLE_API_KEY
	};
	var coords = lat+","+lng + '&';
	return url + coords + $.param( parameters );
}

function getFindUberProductsURL(lat, lng) {
	//Builds Uber API URL to find price estimage to go from given start to given end
	var url = 'https://api.uber.com/v1/products?';
	var parameters = {
		server_token: process.env.UBER_API_KEY,
		latitude: lat,
		longitude: lng
	};
	return url + $.param( parameters );
}

function getFindUberCarsURL(start_lat, start_lng, end_lat, end_lng) {
	//Builds Uber API URL to find price estimage to go from given start to given end
	var url = 'https://api.uber.com/v1/estimates/price?';
	var parameters = {
		server_token: process.env.UBER_API_KEY,
		start_latitude: start_lat,
		start_longitude: start_lng,
		end_latitude: end_lat,
		end_longitude: end_lng
	};

	return url + $.param( parameters );
}

function getMapImage(start_lat, start_lng, end_lat, end_lng) {
	//Builds Google Maps API to generate a map image of the start and end locations
	var start = start_lat+","+start_lng;
	var end = end_lat+","+end_lng;
	var combined = start+"|"+end;
	var url_part_one = 'http://maps.google.com/maps/api/staticmap?size=900x400&markers=';
	var url_part_two = "&path=color:0xff0000ff|weight:5|";
	return url_part_one + combined + url_part_two + combined;
}