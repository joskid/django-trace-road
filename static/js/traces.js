// Quick and dirty solution for GPS tracing system.
// It stores Points in local storage and PUTs Trace object with points to a server only on 'stop/pause' events. 
// That happens if user clicks 'stop' button or leaves the window.


(function () {
     // Server-side Trace instance. The stucture: trace['points']
     var Trace = Backbone.Model.extend({urlRoot: '/traces/'});
     
     // Point and colletion of Points are working with local storage.
     var Point = Backbone.Model.extend({});    
     var Points = Backbone.Collection.extend({
             model: Point,
             localStorage: new Backbone.LocalStorage("PointCollection"),
             initialize: function (options) {
                 this.options = options;
             }                                                    
         }
     );
     

     var TraceView = Backbone.View.extend(
         {
             events: {
                 "click a": "toggle_record"
             },

             toggle_record: function () {
                 if (this.status === 'off') {
                     this.status = 'on';
                     this.start_record();
                     this.el.find('span').text("pause || stop");
                     this.toggle_color(this.el.find('a'), '#E84C38', '#FFC300');
                 } else {
                     this.status = 'off';
                     this.stop_record();
                     this.el.find('span').text("resume");
                     this.toggle_color(this.el.find('a'), '#FFC300', '#E84C38');
                 }
                 return false;
             },


             toggle_color: function (a, back, hover) {
                 return a.css({background: back}).hover(
                     function () {
                         $(this).css('background', hover);
                     },
                     function () {
                         $(this).css('background', back);
                     });
             },

             initialize: function () {
                 var self = this;
                 this.el = $(this.el);
                 this.status = 'off';
                 //this.collection.bind('add', this.track_change);
                 this.map = this.options.map;
                 this.geocoder = new google.maps.Geocoder();
                 this.polyline = new google.maps.Polyline({map: this.map, path: []});
                 this.infowindow = new google.maps.InfoWindow();
                 // do not lose results on window 'unload'.
                 $(window).bind('beforeunload', function () {
                     if (this.status == 'on'){
                         self.toggle_record();
                     }
                 }); 
             },                                               
             
             track_change: function () {
                //TODO: add info window logic.
             },

             renderInfoWindow: function (model) {
                 var self = this;
                 var location = new google.maps.LatLng(model.get('lat'),  model.get('lng'));
                 var marker = new google.maps.Marker({
                         map: this.map,
                         position: location
                     });

                 // geocode the location to make it human readable.
                 this.geocoder.geocode({
                         'latLng': location
                     }, 
                     function (results, status) {
                         if (status === google.maps.GeocoderStatus.OK) {
                             // set formatted_address to later use on server-side.
                             model.set({formatted_address: results[0].formatted_address});
                             self.infowindow.setPosition(location);
                             self.infowindow.setContent(
                                 '<p>' + results[0].formatted_address + '</p>' + 
                                     '<span>' + moment(model.get('timestamp').format("MMM Do, h:mm:ss a")) + '</span>');
                             self.infowindow.open(self.map);
                         } 
                     });
                 this.map.setCenter(location);
                 this.map.setZoom(14);
             },

             render: function () {
                 var self = this;
                 var the_path = this.polyline.getPath();
                 this.collection.each(function(model, index) {
                     the_path.push(new google.maps.LatLng(model.get('lat'),  model.get('lng')));
                 });
                 this.polyline.setPath(the_path);
                 // just render InfoWindow at the last point.
                 if (this.collection.length > 0) {
                     this.renderInfoWindow(this.collection.at(
                                           this.collection.length -1));
                 }
                 return this.el;
             },
                          
             start_record: function () {
                 var self = this;
                 var model_dict = {};
                 // Native 'watchPosition' is not working on my env.
                 this.updater = $.periodic(
                     function() {
                         navigator.geolocation.getCurrentPosition(
                             function (position) {
                                 if (position.coords.latitude !== model_dict.lat && position.coords.longitude !== model_dict.lng) {
                                     model_dict = {lat: position.coords.latitude,
                                                   lng: position.coords.longitude,
                                                   speed: position.coords.longitude,
                                                   timestamp: position.timestamp};
                                     var model = self.collection.create(model_dict); 
                                     if (self.collection.length === 1) {
                                         self.renderInfoWindow(model);
                                     }
                                 }
                             }, 

                             function () {
                                 //error handler here.
                             },

                             {
                                 enableHighAccuracy: true
                             }
                         );
                     });
             },

             stop_record: function () {
                 this.updater.cancel();
                 this.render();
                 // do actual PUT to the server
                 this.model.save({points: this.collection.toJSON()});
                 this.collection.reset([]);
             }

         });


     // Main App - entry point.
     window.TraceApp = Backbone.View.extend(
         {
             initialize: function () {
                 var trace = new Trace({id: this.options.uuid});
                 var points = new Points(this.options.points);
                 var view = new TraceView({model: trace,
                                           map: this.options.gmaps_app.map,
                                           collection: points,
                                           el: 'nav'});
                 view.render();
                 if (this.options.fire_start){
                     view.toggle_record();
                 }
                     
             }

         });
     
})();