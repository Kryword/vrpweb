Parse.initialize('vrpparse', 'unused');
Parse.serverURL = 'https://vrpparse.herokuapp.com/parse';

function guardaSolucionParse(solucion){
    const Store = Parse.Object.extend("Soluciones");
    var query = new Parse.Query(Store);
    query.equalTo("name", solucion.name);
    query.first().then(result => {
        if (result != undefined){
            // Actualizamos la solución con el mismo nombre
            result.save({
                customerList: solucion.customerList,
                distance: solucion.distance,
                feasible: solucion.feasible,
                vehicleRouteList: solucion.vehicleRouteList
            });
        }else{
            // Subimos la solución a Parse
            const nuevaSolucion = new Store();
            nuevaSolucion.save({
                name: solucion.name,
                customerList: solucion.customerList,
                distance: solucion.distance,
                feasible: solucion.feasible,
                vehicleRouteList: solucion.vehicleRouteList
            });
        }
    }, (error) => {
        alert("Se produjo un error al subir la solución a Parse: " + error.number + " " + error.message);
    });
}

function listaSolucionesParse(){
    $('.vrpSolutions').remove();
    const Store = Parse.Object.extend("Soluciones");
    var query = new Parse.Query(Store);
    query.find().then((results)=>{
        for (var i = 0; i < results.length; i++) {
            let solucion = results[i];
            var nuevoElemento = $('<a />',{
                text: solucion.get('name'),
                title: solucion.get('name'),
                href: '#',
                class: 'vrpSolutions',
            })
            nuevoElemento.on('click', function (){
                cargaSolucion(solucion.id)
            });
            nuevoElemento.appendTo('#sideNav');

            console.log("Solucion: " + solucion.get('name') + ", " + solucion.get('vehicleRouteList') + ', ' + solucion.get('distance'));
        }
        $("#loadingImg").hide();
    });
}

function cargaSolucion(id){
    const Store = Parse.Object.extend("Soluciones");
    var query = new Parse.Query(Store);
    query.get(id).then(solucion => {
        //console.log(solucion);
        var oSol = new Object({
            name: solucion.get('name'),
            customerList: solucion.get('customerList'),
            vehicleRouteList: solucion.get('vehicleRouteList'),
            distance: solucion.get('distance'),
            feasible: solucion.get('feasible')
        });
        oSol = JSON.stringify(oSol);
        //console.log("Sending ajax request: " + oSol);
        $.ajax({
            url: ipREST+"/rest/vehiclerouting/solution/update",
            type: "POST",
            data : oSol,
            dataType : "json",
            xhrFields: {
                withCredentials: true
            },
            contentType: "application/json; charset=utf-8",
            success: function( message ) {
                console.log(message);
                loadSolution();
            }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
        });
    })
}

function openNav() {
    $("#loadingImg").show();
    listaSolucionesParse();
    document.getElementById("sideNav").style.width = "300px";
}

function closeNav(){
    document.getElementById("sideNav").style.width = "0";
}

$("form#subirFichero").submit(function(e){
    e.preventDefault();
    var formData = new FormData(this);
    $.ajax({
        url: ipREST + "/rest/vehiclerouting/solution/upload",
        type: 'POST',
        data: formData,
        success: function(data){
            clearSolution();
        },
        cache: false,
        contentType: false,
        processData: false
    });

    var fileToUpload = $("#fileToUpload")[0];
    if (fileToUpload.files.length > 0){
        var file = fileToUpload.files[0];
        var name = file.name;
        var parseFile = new Parse.File(name, file);

        const Problema = Parse.Object.extend("Problema");
        var query = new Parse.Query(Problema);
        query.equalTo("name", name);
        query.first().then(result => {
            if (result != undefined){
                // Actualizamos la solución con el mismo nombre
                // En el futuro deberían borrarse los archivos que ya existan
                //result.fetch().then(res => console.log(res.get("file").))
                parseFile.save()
                .then(function (data){
                    result.save({
                        "file": parseFile
                    });
                }, function(){
                    alert("Se ha producido un error al guardar el fichero en parse.");
                });
            }else{
                // Subimos la solución a Parse
                parseFile.save()
                .then(function (data){
                    var problema = new Parse.Object("Problema");
                    problema.set("name", name);
                    problema.set("file", parseFile);
                    problema.save();
                }, function(){
                    alert("Se ha producido un error al guardar el fichero en parse.");
                });
            }
        }, (error) => {
            alert("Se produjo un error al subir el archivo a Parse: " + error.number + " " + error.message);
        });
    }
});