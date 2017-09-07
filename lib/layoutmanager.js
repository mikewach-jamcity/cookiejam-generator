/*
 * Cookie Jam: Layout Manager
 * Copyright (c) 2017 Jam City. All rights reserved
 * @author Michael Wach
 */

(function () {
    "use strict";

    /**
     * The Layout Manager renders XML for a given document
     * 
     * @constructor
     * @param {Logger} logger
     * @param {Document} document
     * @param {FileManager} fileManager
     */
    function LayoutManager(logger, document, fileManager) {
        this._logger = logger;
        this._document = document;
        this._fileManager = fileManager;
    }

    /**
     * Render Layout XML using each layer inside document
     * 
     * @private
     * @param {Document} document
     */
    LayoutManager.prototype.render = function(document) {
        var tabify = function(depth) {
            var tabstr = "";
            for(var t = 0; t<depth; t++) {
                tabstr = tabstr.concat("\t");
            }
            return tabstr;
        };
        var fetchSubObjectValues = function(layer) {
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
        var fetchSubObjects = function(layergroup, depth) {
            var result = "";
            layergroup.layers.forEach(function (layer) {
                // fetch subobject values
                var sub = fetchSubObjectValues(layer);

                // recurse through layer groups
                if(layer.type == "layerSection") {
                    // concat subobject layer group             
                    result = result.concat(tabify(depth) + `<SubObject name="${sub.name}" x="${sub.x}" y="${sub.y}" width="${sub.width}" height="${sub.height}">` + "\n");
                    result = result.concat(fetchSubObjects(layer, depth+1));
                    result = result.concat(tabify(depth) + `</SubObject>` + "\n");
                    return;
                }
                
                // concat subobject layer
                result = result.concat(tabify(depth) + `<SubObject name="${sub.name}" x="${sub.x}" y="${sub.y}" width="${sub.width}" height="${sub.height}" />` + "\n");
            });
            return result;
        };

        var layout = 
            '<?xml version="1.0" encoding="UTF-8"?>' + "\n" +
            `<Layout width="${document.bounds.right * 0.5}" height="${document.bounds.bottom * 0.5}">` + "\n" +
            fetchSubObjects(document.layers, 1) +
            '</Layout>';
        
        // write layout xml to file
        this._fileManager.writeFileAbsolute(this._fileManager.layoutsPath, layout);
    };

    module.exports = LayoutManager;
}());