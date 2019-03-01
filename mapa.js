var ipREST = "http://192.168.56.101:8080";
//var ipREST = "http://localhost:8080";
var savedSolution;
var map;
var vehicleRouteLayerGroup;
var markers = [];
var intervalTimer;

initMap = function() {
    map = L.map('map');
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    loadSolution();
    updateSolution();
};

ajaxError = function(jqXHR, textStatus, errorThrown) {
    console.log("Error: " + errorThrown);
    console.log("TextStatus: " + textStatus);
    console.log("jqXHR: " + jqXHR);
    alert("Error: " + errorThrown);
};

loadSolution = function() {
    $.ajax({
        url: ipREST+"/optaplanner-webexamples/rest/vehiclerouting/solution",
        type: "GET",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function(solution) {
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
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

updateSolution = function() {
    $.ajax({
        url: ipREST+"/optaplanner-webexamples/rest/vehiclerouting/solution",
        type: "GET",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function(solution) {
            savedSolution = solution;
            if (vehicleRouteLayerGroup != undefined) {
                map.removeLayer(vehicleRouteLayerGroup);
            }
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
            $('#scoreValue').text(solution.feasible ? solution.distance : "Not solved");
            guardaSolucionParse(solution);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

solve = function() {
    $('#solveButton').prop("disabled", false);
    $.ajax({
        url: ipREST+"/optaplanner-webexamples/rest/vehiclerouting/solution/solve",
        type: "POST",
        dataType : "json",
        data : "",
        xhrFields: {
            withCredentials: true
        },
        success: function(message) {
            loadSolution();
            console.log(message.text);
            intervalTimer = setInterval(function () {
                updateSolution()
            }, 2000);
            $('#solveButton').prop("disabled", true);
            $('#terminateEarlyButton').prop("disabled", false);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

terminateEarly = function () {
    $('#terminateEarlyButton').prop("disabled", false);
    window.clearInterval(intervalTimer);
    $.ajax({
        url: ipREST+"/optaplanner-webexamples/rest/vehiclerouting/solution/terminateEarly",
        type: "POST",
        data : "",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function( message ) {
            console.log(message.text);
            //updateSolution();
            $('#solveButton').prop("disabled", false);
            $('#terminateEarlyButton').prop("disabled", true);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

clearSolution = function () {
    window.clearInterval(intervalTimer);
    savedSolution = null;
    $.ajax({
        url: ipREST+"/optaplanner-webexamples/rest/vehiclerouting/solution/clear",
        type: "POST",
        data : "",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function( message ) {
            console.log(message.text);
            //updateSolution();
            //initMap();
            loadSolution();
            $('#solveButton').prop("disabled", false);
            $('#terminateEarlyButton').prop("disabled", true);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

guardarSolucion = function(){
    if (savedSolution != undefined && savedSolution != null){
        guardaSolucionParse(savedSolution);
        saveTextAs(JSON.stringify(savedSolution), "solucion.json");
    }
}

initMap();