//    Displays Google map with a given 'center[lat, lng]' and 'zoom'.

(function () {
     window.GMapsApp = Backbone.View.extend({
         
         // you should provide 'el' like '#map_canvas' to attach Google Map to a required HTML object.
         initialize: function () {
             this.map = this.initGoogleMap();
         },

         initGoogleMap: function () {
             var mapOptions = {
		 zoom: this.options.zoom || 15,
                 center: new google.maps.LatLng(this.options.center[0], this.options.center[1]),
		 mapTypeId: google.maps.MapTypeId.HYBRID,
		 mapTypeIds: [google.maps.MapTypeId.HYBRID]
             };
             var map = new google.maps.Map(this.el[0], mapOptions);
             var bikeLayer = new google.maps.BicyclingLayer();
             bikeLayer.setMap(map);
             return map;
         }

    });
     

})();