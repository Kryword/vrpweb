/**
 * Author: Cristian Berner
 * Date: 01/03/2019 - 19/11/2019
 * Description: This handles the map specific functions and
 *              how the Optaplanner solution is displayed on the map
 */
let savedSolution;
let map;
let vehicleRouteLayerGroup;
let markers = [];
let intervalTimer;

const initMap = function() {
    map = L.map('map');
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    loadSolution();
    updateSolution();
};

const ajaxError = function(jqXHR, textStatus, errorThrown) {
    console.error("Error: " + errorThrown);
    console.error("TextStatus: " + textStatus);
    console.error("jqXHR: " + jqXHR);
};

const loadSolution = function() {
    $.ajax({
        url: optaplannerBackendUrl + "/rest/vehiclerouting/solution",
        type: "GET",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function(solution) {
            if (!(markers === undefined || markers.length === 0)){
                for (let i = 0; i < markers.length; i++) {
                    map.removeLayer(markers[i]);
                }
            }

            markers = [];
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
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

const updateSolution = function() {
    $.ajax({
        url: optaplannerBackendUrl+"/rest/vehiclerouting/solution",
        type: "GET",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function(solution) {
            savedSolution = solution;
            if (vehicleRouteLayerGroup !== undefined) {
                map.removeLayer(vehicleRouteLayerGroup);
            }
            const vehicleRouteLines = [];
            $.each(solution.vehicleRouteList, function(index, vehicleRoute) {
                const locations = [[vehicleRoute.depotLatitude, vehicleRoute.depotLongitude]];
                $.each(vehicleRoute.customerList, function(innerIndex, customer) {
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

const solve = function() {
    $('#solveButton').prop("disabled", false);
    $.ajax({
        url: optaplannerBackendUrl + "/rest/vehiclerouting/solution/solve",
        type: "POST",
        dataType : "json",
        data : "",
        xhrFields: {
            withCredentials: true
        },
        success: function(message) {
            loadSolution();
            console.info(message.text);
            intervalTimer = setInterval(function () {
                updateSolution()
            }, 2000);
            $('#solveButton').prop("disabled", true);
            $('#terminateEarlyButton').prop("disabled", false);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

const terminateEarly = function () {
    $('#terminateEarlyButton').prop("disabled", false);
    window.clearInterval(intervalTimer);
    $.ajax({
        url: optaplannerBackendUrl+"/rest/vehiclerouting/solution/terminateEarly",
        type: "POST",
        data : "",
        dataType : "json",
        xhrFields: {
            withCredentials: true
        },
        success: function( message ) {
            console.info(message.text);
            $('#solveButton').prop("disabled", false);
            $('#terminateEarlyButton').prop("disabled", true);
        }, error : function(jqXHR, textStatus, errorThrown) {ajaxError(jqXHR, textStatus, errorThrown)}
    });
};

const clearSolution = function () {
    window.clearInterval(intervalTimer);
    savedSolution = null;
    $.ajax({
        url: optaplannerBackendUrl + "/rest/vehiclerouting/solution/clear",
        type: "POST",
        data: "",
        dataType: "json",
        xhrFields: {
            withCredentials: true
        },
        success: function (message) {
            console.info(message.text);
            loadSolution();
            $('#solveButton').prop("disabled", false);
            $('#terminateEarlyButton').prop("disabled", true);
        }, error: function (jqXHR, textStatus, errorThrown) {
            ajaxError(jqXHR, textStatus, errorThrown)
        }
    });
};

const guardarSolucion = function(){
    if (savedSolution !== undefined && savedSolution != null){
        guardaSolucionParse(savedSolution);
        let blob = new Blob([JSON.stringify(savedSolution)], {type: "text/json;charset=utf-8"})
        saveAs(blob, "solucion.json");
    }
};

initMap();
