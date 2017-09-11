/*
 * Cookie Jam: Layout Manager
 * Copyright (c) 2017 Jam City. All rights reserved
 * @author Michael Wach
 */

(function () {
    "use strict";

    /**
     * The Layout Manager renders XML for components inside a given document
     * 
     * @constructor
     * @param {Logger} logger
     * @param {Document} document
     * @param {FileManager} fileManager
     * @param {ComponentManager} componentManager
     */
    function LayoutManager(logger, document, fileManager, componentManager) {
        this._logger = logger;
        this._document = document;
        this._fileManager = fileManager;
        this._componentManager = componentManager;
    }

    /**
     * Render Layout XML using each component inside allComponents
     * 
     * @private
     */
    LayoutManager.prototype.render = function() {
        var layout = 
            '<?xml version="1.0" encoding="UTF-8"?>' + "\n" +
            `<Layout width="${this._document.bounds.right * 0.5}" height="${this._document.bounds.bottom * 0.5}">` + "\n" +
            this._fetchSubObjects(this._document.layers, 1) +
            '</Layout>';
        
        // write layout xml to file
        this._fileManager.writeFileAbsolute(this._fileManager.layoutsPath, layout);
    };

    LayoutManager.prototype._tabify = function(depth) {
        var tabstr = "";
        for(var t = 0; t<depth; t++) {
            tabstr = tabstr.concat("\t");
        }
        return tabstr;
    };

    LayoutManager.prototype._fetchSubObjectValues = function(layer) {
        // get layer & parent layer's dimensions from bounds
        var width = (layer.bounds.right - layer.bounds.left);
        var height = (layer.bounds.bottom - layer.bounds.top);
        var parentWidth = (layer._group.hasOwnProperty("_bounds")) ? (layer._group.bounds.right - layer._group.bounds.left) : (layer._document.bounds.right - layer._document.bounds.left);
        var parentHeight = (layer._group.hasOwnProperty("_bounds")) ? (layer._group.bounds.bottom - layer._group.bounds.top) : (layer._document.bounds.bottom - layer._document.bounds.top);
        
        // get layer & parent layer's x & y
        var parentX = (layer._group.hasOwnProperty("_bounds")) ? layer._group.bounds.left : layer._document.bounds.left;
        var parentY = (layer._group.hasOwnProperty("_bounds")) ? layer._group.bounds.top : layer._document.bounds.top;
        var x = ((layer.bounds.left - parentX) + (width / 2)) / parentWidth;
        var y = ((layer.bounds.top - parentY) + (height / 2)) / parentHeight;

        // return values object
        return {
            x: x,
            y: y,
            width: width * 0.5,
            height: height * 0.5,
            name: layer.name
        };
    }

    LayoutManager.prototype._fetchSubObjects = function(layergroup, depth) {
        var result = "";
        layergroup.layers.forEach(function (layer) {
            // fetch subobject values
            var sub = this._fetchSubObjectValues(layer);

            // recurse through layer groups
            if(layer.type == "layerSection") {
                // concat subobject layer group             
                result = result.concat(this._tabify(depth) + `<SubObject name="${sub.name}" x="${sub.x}" y="${sub.y}" width="${sub.width}" height="${sub.height}">` + "\n");
                result = result.concat(this._fetchSubObjects(layer, depth+1));
                result = result.concat(this._tabify(depth) + `</SubObject>` + "\n");
                return;
            }
            
            // concat subobject layer
            result = result.concat(this._tabify(depth) + `<SubObject name="${sub.name}" x="${sub.x}" y="${sub.y}" width="${sub.width}" height="${sub.height}" />` + "\n");
        }, this);
        return result;
    };

    module.exports = LayoutManager;
}());