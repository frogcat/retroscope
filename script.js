$.getJSON("layers.json").then(function(json) {

  var tmpl = "http://cyberjapandata.gsi.go.jp/xyz/{id}/{z}/{x}/{y}.{ext}";

  var MyAnnoLayer = L.LayerGroup.extend({
    getAttribution: function() {
      return "<a href='https://github.com/gsi-cyberjapan/experimental_anno/'>注記(ベクトルタイル提供実験)</a>)";
    },
    getEvents: function() {
      return {
        zoomend: this._update,
        moveend: this._update,
        viewreset: this._update
      };
    },
    _update: function() {
      var map = this._map;
      if (map.getZoom() < 15) {
        this.clearLayers();
        this._loading = {};
        return;
      }
      var zoom = 15;
      var b = this._map.getBounds();
      var tl = map.project(b.getNorthWest(), 15).divideBy(256).floor();
      var br = map.project(b.getSouthEast(), 15).divideBy(256).ceil();
      for (var y = tl.y; y < br.y; y++) {
        for (var x = tl.x; x < br.x; x++) {
          this._load(L.Util.template(tmpl, {
            x: x,
            y: y,
            z: zoom,
            id: "experimental_anno",
            ext: "geojson"
          }));
        }
      }
    },
    _load: function(url) {
      if (!this._loading)
        this._loading = {};
      if (this._loading[url])
        return;
      this._loading[url] = true;
      var that = this;
      $.getJSON(url).then(function(json) {
        json.features.forEach(function(f) {
          that._each(f);
        });
      });
    },
    _each: function(feature) {
      if (feature.properties.annoCtg.indexOf("町字") == -1)
        return;
      this.addLayer(L.marker(L.GeoJSON.coordsToLatLng(feature.geometry.coordinates), {
        icon: L.divIcon({
          className: "geojson-anno",
          html: feature.properties.knj
        })
      }));
    }
  });

  var map = L.map("map", {
    maxZoom: 20,
    minZoom: 2,
    zoom: 15,
    center: [35.6707, 139.7852]
  });
  map.zoomControl.setPosition("bottomright");
  L.hash(map);

  L.control.layers({
    "オルソ画像": L.tileLayer(tmpl, {
      "id": "ort",
      "ext": "jpg",
      "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html#ort'>写真(地理院タイル)</a>"
    }).addTo(map),
    "標準地図": L.tileLayer(tmpl, {
      "id": "std",
      "ext": "png",
      "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html#std'>標準地図(地理院タイル)</a>"
    })
  }, {
    "注記": new MyAnnoLayer().addTo(map)
  }).addTo(map);

  json.layers.forEach(function(a) {
    var li = $("<li/>").attr("id", a.id).text(a.title);
    $("#layers").append(li);
    if(L.Browser.touch) {
			a.maskWidth = 256;
			a.maskHeight = 256;
		}
    li.data("layer", L.tileOverlay.mask(a.url, a));
  });

  map.on(L.Browser.touch ? "click" : "mousemove", function(event) {
    var layer = $("li.focus").data("layer");
    if (layer)
      layer.setCenter(event.containerPoint);
  }).on("moveend viewreset zoomend", function() {
    var coords = map.project(map.getCenter()).divideBy(256).floor();
    coords.z = map.getZoom();
    coords.id = "cocotile";
    coords.ext = "csv";
    $.get(L.Util.template(tmpl, coords)).then(function(txt) {
      var a = txt.split(",").concat("Kanto_Rapid-900913-L");
      $("#layers li").each(function() {
        if (a.indexOf($(this).attr("id")) == -1)
          $(this).removeClass("active");
        else
          $(this).addClass("active");
      });
    });
  });

  $("#layers li").on("click", function() {
    if ($(this).is(".focus"))
      return;
    $(".focus").each(function() {
      map.removeLayer($(this).data("layer"));
      $(this).removeClass("focus");
    });
    $(this).addClass("focus");
    var layer = $(this).data("layer");
    map.addLayer(layer);
    layer._update();
  }).first().click();

});
