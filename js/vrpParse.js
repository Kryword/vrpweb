/**
 * Author: Cristian Berner
 * Date: 01/03/2019 - 19/11/2019
 * Description: This handles the Parse Server specific functionality,
 *              it handles both save and retrieve from Parse and some
 *              extra functionality to pass information from Parse to
 *              the Optaplanner backend
 */

Parse.initialize(parseServerName, 'unused');
Parse.serverURL = parseServerUrl;

function guardaSolucionParse(solucion){
    const Store = Parse.Object.extend("Soluciones");
    const query = new Parse.Query(Store);
    query.equalTo("name", solucion.name);
    query.first().then(result => {
        if (result !== undefined){
            // Actualizamos la solución con el mismo nombre
            result.save({
                customerList: solucion.customerList,
                distance: solucion.distance,
                feasible: solucion.feasible,
                vehicleRouteList: solucion.vehicleRouteList
            })
            .then(function(){
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
            .then(function(){
                listaSolucionesParse();
            });
        }
    }, (error) => {
        console.error("Se produjo un error al subir la solución a Parse: " + error.number + " " + error.message);
    });
}

function listaSolucionesParse(){
    $('.vrpSolutions').remove();
    const Store = Parse.Object.extend("Soluciones");
    const query = new Parse.Query(Store);
    query.find().then((results)=>{
        for (let i = 0; i < results.length; i++) {
            let solucion = results[i];
            const nuevoElemento = $('<a />', {
                text: solucion.get('name'),
                title: solucion.get('name'),
                href: '#',
                class: 'vrpSolutions',
            });
            nuevoElemento.on('click', function (){
                cargaSolucion(solucion.id)
            });
            const li = $('<li>').append(nuevoElemento);
            li.appendTo('#soluciones');

            console.debug("Solucion: " + solucion.get('name') + ", " + solucion.get('vehicleRouteList') + ', ' + solucion.get('distance'));
        }
        $("#loadingImg").hide();
    });
}

function listaProblemasParse(){
    $('.vrpProblemas').remove();
    const Store = Parse.Object.extend("Problema");
    const query = new Parse.Query(Store);
    query.find().then((results)=>{
        for (let i = 0; i < results.length; i++) {
            let problema = results[i];
            const nuevoElemento = $('<a />', {
                text: problema.get('name'),
                title: problema.get('name'),
                href: '#',
                class: 'vrpProblemas',
            });
            nuevoElemento.on('click', function (){
                cargaProblema(problema.id)
            });
            const li = $('<li>').append(nuevoElemento);
            li.appendTo('#problemas');
            console.debug(problema);
        }
        $("#loadingImg").hide();
    });
}

function cargaProblema(id){
    const Store = Parse.Object.extend("Problema");
    const query = new Parse.Query(Store);
    query.get(id).then(problema => {
        let file = problema.get('file');
        const formData = new FormData();
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
                    url: optaplannerBackendUrl + "/rest/vehiclerouting/solution/upload",
                    type: 'POST',
                    data: formData,
                    success: function(){
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
    const query = new Parse.Query(Store);
    query.get(id).then(solucion => {
        const solution = new Object({
            name: solucion.get('name'),
            customerList: solucion.get('customerList'),
            vehicleRouteList: solucion.get('vehicleRouteList'),
            distance: solucion.get('distance'),
            feasible: solucion.get('feasible')
        });
        // Muestro los nuevos puntos en el mapa, copiado y modificado de "loadSolution"
        for (let i = 0; i < markers.length; i++) {
            map.removeLayer(markers[i]);
        }

        console.debug(solution);
        $.each(solution.customerList, function(index, customer) {
            const customerIcon = L.divIcon({
                iconSize: new L.Point(20, 20),
                className: "vehicleRoutingCustomerMarker",
                html: "<span>" + customer.demand + "</span>"
            });
            const marker = L.marker([customer.latitude, customer.longitude], {icon: customerIcon});
            marker.addTo(map).bindPopup(customer.locationName + "</br>Deliver " + customer.demand + " items.");
            markers.push(marker);
        });
        map.fitBounds(L.featureGroup(markers).getBounds());

        // Muestro el camino, copiado de "updateSolution"
        map.removeLayer(vehicleRouteLayerGroup);
        const vehicleRouteLines = [];
        $.each(solution.vehicleRouteList, function(index, vehicleRoute) {
            const locations = [[vehicleRoute.depotLatitude, vehicleRoute.depotLongitude]];
            $.each(vehicleRoute.customerList, function(internalIndex, customer) {
                locations.push([customer.latitude, customer.longitude]);
            });
            locations.push([vehicleRoute.depotLatitude, vehicleRoute.depotLongitude]);
            vehicleRouteLines.push(L.polyline(locations, {color: vehicleRoute.hexColor}));
        });
        this.vehicleRouteLayerGroup = L.layerGroup(vehicleRouteLines).addTo(map);
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
    const formData = new FormData(this);
    $.ajax({
        url: optaplannerBackendUrl + "/rest/vehiclerouting/solution/upload",
        type: 'POST',
        data: formData,
        success: function(){
            clearSolution();
        },
        cache: false,
        contentType: false,
        processData: false
    });
    const fileToUpload = $("#fileToUpload")[0];
    if (fileToUpload.files.length > 0){
        const file = fileToUpload.files[0];
        const name = file.name;
        const parseFile = new Parse.File(name, file);

        const Problema = Parse.Object.extend("Problema");
        const query = new Parse.Query(Problema);
        query.equalTo("name", name);
        query.first().then(result => {
            if (result !== undefined){
                // Actualizamos el problema con el mismo nombre
                // En el futuro deberían borrarse los archivos que ya existan
                parseFile.save()
                .then(function (){
                    result.save({
                        "file": parseFile
                    });
                }, function(){
                    console.error("Se ha producido un error al guardar el fichero en parse.");
                });
            }else{
                // Subimos el problema a Parse
                parseFile.save()
                .then(function (){
                    const problem = new Parse.Object("Problema");
                    problem.set("name", name);
                    problem.set("file", parseFile);
                    problem.save()
                        .then(function(){
                            listaProblemasParse();
                        });
                }, function(){
                    console.error("Se ha producido un error al guardar el fichero en parse.");
                });
            }
        }, (error) => {
            console.error("Se produjo un error al subir el archivo a Parse: " + error.number + " " + error.message);
        });
    }
});

$(document).ready(function(){
    listaSolucionesParse();
    listaProblemasParse();
    $("#loadingImg").hide();
});
