/**
 * @require ParkingManager.js
 */

ParkingManager.StreetViewInfo = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = app_streetviewinfo */
    ptype: "app_streetviewinfo",
    
    /** api: config[outputTarget]
     *  ``String`` Popups created by this tool are added to the map by default.
     */
    outputTarget: "map",

    /** api: config[tolerance]
     *  ``Number`` 
     *  Optional pixel tolerance to use when selecting features.  By default,
     *  the server decides whether a pixel click intersects a feature based on 
     *  its own rules.  If a pixel tolerance is provided, it will be included in
     *  requests for features to inform the server to look in a buffer around 
     *  features.
     */
    
    /** private: property[toleranceParameters]
     *  ``Array``
     *  List of parameter names to use in a GetFeatureInfo request when a 
     * ``tolerance`` is provided.  Default is ["BUFFER", "RADIUS"].
     */
    toleranceParameters: ["BUFFER", "RADIUS"],
    
    /** private: property[popup]
     *  ``GeoExt.Popup``
     */
    popup: null,

    /** api: config[popupTitle]
     *  ``String``
     *  Text for feature info window title (i18n).
     */
    popupTitle: "Parking Space Info",

    /** api: config[infoActionTip]
     *  ``String``
     *  Text for feature info action tooltip (i18n).
     */
    infoActionTip: "Get Info",

    /** api: config[streetViewTitle]
     *  ``String``
     *  Title for street view tab (i18n).
     */
    streetViewTitle: "Street View",

    /** api: config[nameColumnHeader]
     *  ``String``
     *  Header for the name column in details grid (i18n).
     */
    nameColumnHeader: "Name",

    /** api: config[valueColumnHeader]
     *  ``String``
     *  Header for the value column in details grid (i18n).
     */
    valueColumnHeader: "Value",

    /** api: config[detailsTitle]
     *  ``String``
     *  Title for details tab (i18n).
     */
    detailsTitle: "Details",

    /** api: config[headingAttribute]
     *  ``String``
     *  Optional feature attribute name with heading information.  Values should
     *  be degrees clockwise relative to north.  If present, this value will be
     *  used to orient the camera in the street view.
     */
    headingAttribute: null,

    /** api: config[fields]
     *  ``Array``
     *  List of field config objects corresponding to feature attributes.  If
     *  not provided, fields will be derived from attributes.
     */
    
    /** api: method[addActions]
     */
    addActions: function() {        

        if (!this.layer) {
            throw new Error("Configure StreetViewInfo with layer config.");
        }
        var vendorParams;
        if (typeof this.tolerance === "number") {
            vendorParams = {};
            for (var i=0, ii=this.toleranceParameters.length; i<ii; ++i) {
                vendorParams[this.toleranceParameters[i]] = this.tolerance;
            }
        }
        
        var action = new GeoExt.Action({
            tooltip: this.infoActionTip,
            iconCls: "gxp-icon-getfeatureinfo",
            toggleGroup: this.toggleGroup,
            enableToggle: true,
            allowDepress: true,
            map: this.target.mapPanel.map,
            control: new OpenLayers.Control.WMSGetFeatureInfo({
                maxFeatures: 1,
                infoFormat: "application/vnd.ogc.gml",
                queryVisible: false,
                layers: [],
                vendorParams: vendorParams,
                eventListeners: {
                    getfeatureinfo: this.displayPopup,
                    scope: this
                }
            })
        });
        
        this.target.createLayerRecord(this.layer, function(record) {
            action.control.layers = [record.getLayer()];
        });

        return ParkingManager.StreetViewInfo.superclass.addActions.call(this, [action]);
    },

    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     */
    displayPopup: function(event) {
        if (this.popup) {
            this.popup.close();
        }
        var feature = event.features && event.features[0];
        if (feature) {
            this.popup = this.addOutput({
                xtype: "gx_popup",
                title: this.popupTitle,
                location: event.xy,
                map: this.target.mapPanel,
                maximizable: true,
                width: 310,
                height: 325,
                layout: "fit",
                items: [{
                    xtype: "tabpanel",
                    border: false,
                    activeTab: 0,
                    items: [{
                        xtype: "grid",
                        title: this.detailsTitle,
                        store: this.getAttributeStore(feature),
                        enableHdMenu: false,
                        columns: [
                            {header: this.nameColumnHeader, dataIndex: this.nameColumnHeader, sortable: false, width: 50},
                            {header: this.valueColumnHeader, dataIndex: this.valueColumnHeader, sortable: false}
                        ],
                        viewConfig: {
                            forceFit: true
                        }
                    }, {
                        xtype: "gxp_googlestreetviewpanel",
                        title: this.streetViewTitle,
                        heading: this.getOrientationForFeature(feature),
                        zoom: 1
                    }]
                }]
            });
        }
    },
    
    /** private: method[getOrientationForFeature]
     *  :arg feature:
     *
     *  Return the orientation of a feature based on the case insensitive
     *  `headingAttribute` property.
     */
    getOrientationForFeature: function(feature) {
        var orientation = 0;
        if (this.headingAttribute) {
            for (var attr in feature.attributes) {
                if (attr.toUpperCase() === this.headingAttribute.toUpperCase()) {
                    orientation = Number(feature.attributes[attr]);
                    break;
                }
            }
        }
        return orientation;
    },
    
    /** private: method[getAttributeStore]
     *  :arg feature:
     *
     *  Return a store with records corresponding to attribute names and 
     *  values.  Fields will be derived from the ``fields`` config property
     *  if given.  Only supporting field names now.  TODO: support field config.
     */
    getAttributeStore: function(feature) {
        var fields = this.fields;
        if (!fields) {
            fields = [];
            for (var name in feature.attributes) {
                fields.push(name);
            }
        }
        var len = fields.length;
        var data = new Array(len);
        for (var i=0; i<len; ++i) {
            name = fields[i];
            data[i] = [name, feature.attributes[name]];
        }
        
        return new Ext.data.ArrayStore({
            autoDestroy: true,
            fields: [this.nameColumnHeader, this.valueColumnHeader],
            data: data
        });
    }
    
});

Ext.preg(ParkingManager.StreetViewInfo.prototype.ptype, ParkingManager.StreetViewInfo);
