Parse.initialize('vrpparse', 'unused');
Parse.serverURL = 'http://vrpparse.herokuapp.com/parse';

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
});