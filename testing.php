<?php 

	$target_file = "/home/cristian/optaplanner/prueba-n15-k1.vrp";
	$upload_ok = 1;

	if (isset($_POST["submit"])){
		if ($_FILES["fileToUpload"]["error"] != ""){
			$msg = $_FILES["fileToUpload"]["error"];
			$upload_ok = 0;
		}else if ($_FILES["fileToUpload"]["name"] == ""){
			$msg = "Archivo vacío, error." . $_FILES["fileToUpload"]["name"];
			$upload_ok = 0;
		}else if($_FILES["fileToUpload"]["size"] > 100000){
			$msg = "Fichero demasiado grande.";
			$upload_ok = 0;
		}else if ($upload_ok == 0){
			$msg = "El fichero no ha sido subido.";

		}else{
			echo "Subiendo archivo ".$_FILES["fileToUpload"]["tmp_name"];
			if (move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file)) {
            	$msg = "The file " . basename($_FILES["fileToUpload"]["name"]) . " has been uploaded.";
            	echo '<script type="text/javascript">
		           window.location = "leaflet.html"
		      </script>';
        	}
		}
	}


 ?>