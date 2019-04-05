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
            })
            .then(function(data){
                listaSolucionesParse();
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
            })
            .then(function(data){
                listaSolucionesParse();
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
            nuevoElemento.appendTo('#soluciones');

            console.log("Solucion: " + solucion.get('name') + ", " + solucion.get('vehicleRouteList') + ', ' + solucion.get('distance'));
        }
        $("#loadingImg").hide();
    });
}

function listaProblemasParse(){
    $('.vrpProblemas').remove();
    const Store = Parse.Object.extend("Problema");
    var query = new Parse.Query(Store);
    query.find().then((results)=>{
        for (var i = 0; i < results.length; i++) {
            let problema = results[i];
            var nuevoElemento = $('<a />',{
                text: problema.get('name'),
                title: problema.get('name'),
                href: '#',
                class: 'vrpProblemas',
            })
            nuevoElemento.on('click', function (){
                cargaProblema(problema.id)
            });
            nuevoElemento.appendTo('#problemas');
            console.log(problema);
            //console.log("Problema: " + solucion.get('name') + ", " + solucion.get('vehicleRouteList') + ', ' + solucion.get('distance'));
        }
        $("#loadingImg").hide();
    });
}

function cargaProblema(id){
    const Store = Parse.Object.extend("Problema");
    var query = new Parse.Query(Store);
    query.get(id).then(problema => {
        let file = problema.get('file');
        var formData = new FormData();
        let url = file.url();
        url = url.replace(/^http:\/\//i, 'https://');
        $.ajax({
            url: url,
            type: "GET",
            responseType: "blob",
            success: function(message){
                formData.append("fileToUpload", message);
                formData.append("fileName", "ficheroPrueba.vrp");
                $.ajax({
                    url: ipREST + "/rest/vehiclerouting/solution/upload",
                    type: 'POST',
                    data: formData,
                    success: function(data){
                        clearSolution();
                        loadSolution();
                    },
                    cache: false,
                    contentType: false,
                    processData: false
                });
            }
        });
    });
}

function cargaSolucion(id){
    const Store = Parse.Object.extend("Soluciones");
    var query = new Parse.Query(Store);
    query.get(id).then(solucion => {
        var solution = new Object({
            name: solucion.get('name'),
            customerList: solucion.get('customerList'),
            vehicleRouteList: solucion.get('vehicleRouteList'),
            distance: solucion.get('distance'),
            feasible: solucion.get('feasible')
        });

        // Muestro los nuevos puntos en el mapa, copiado y modificado de "loadSolution"
        if (!(markers === undefined || markers.length === 0)){
            for (var i = 0; i < markers.length; i++) {
                map.removeLayer(markers[i]);
            }
        }

        markers = [];
        console.log(solution);
        $.each(solution.customerList, function(index, customer) {
            var customerIcon = L.divIcon({
                iconSize: new L.Point(20, 20),
                className: "vehicleRoutingCustomerMarker",
                html: "<span>" + customer.demand + "</span>"
            });
            var marker = L.marker([customer.latitude, customer.longitude], {icon: customerIcon});
            marker.addTo(map).bindPopup(customer.locationName + "</br>Deliver " + customer.demand + " items.");
            markers.push(marker);
        });
        map.fitBounds(L.featureGroup(markers).getBounds());

        // Muestro el camino, copiado de "updateSolution"
        map.removeLayer(vehicleRouteLayerGroup);
        var vehicleRouteLines = [];
        $.each(solution.vehicleRouteList, function(index, vehicleRoute) {
            var locations = [[vehicleRoute.depotLatitude, vehicleRoute.depotLongitude]];
            $.each(vehicleRoute.customerList, function(index, customer) {
                locations.push([customer.latitude, customer.longitude]);
            });
            locations.push([vehicleRoute.depotLatitude, vehicleRoute.depotLongitude]);
            vehicleRouteLines.push(L.polyline(locations, {color: vehicleRoute.hexColor}));
        });
        vehicleRouteLayerGroup = L.layerGroup(vehicleRouteLines).addTo(map);
    })
}

function openNav() {
    $("#loadingImg").show();
    listaSolucionesParse();
    listaProblemasParse();
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
                // Actualizamos el problema con el mismo nombre
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
                // Subimos el problema a Parse
                parseFile.save()
                .then(function (data){
                    var problema = new Parse.Object("Problema");
                    problema.set("name", name);
                    problema.set("file", parseFile);
                    problema.save()
                        .then(function(data){
                            listaProblemasParse();
                        });
                }, function(){
                    alert("Se ha producido un error al guardar el fichero en parse.");
                });
            }
        }, (error) => {
            alert("Se produjo un error al subir el archivo a Parse: " + error.number + " " + error.message);
        });
    }
});

$(document).ready(function(){
    listaSolucionesParse();
    listaProblemasParse();
    $("#loadingImg").hide();
});