<?php  
header("access-control-allow-origin: *");

if(isset($_POST['action']) && !empty($_POST['action'])) {
    $url = $_POST['url'];
    makeCall($url);
}

function makeCall($url) {
	$response = file_get_contents($url);
	echo $response;
}

?>