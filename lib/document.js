/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

(function () {
    "use strict";

    var util = require("util"),
        assert = require("assert"),
        events = require("events");

    var createLayer = require("./layer").createLayer;

    function Document(raw) {
        this.version = raw.version;
        this.timeStamp = raw.timeStamp;
        this.count = raw.count;
        this.id = raw.id;

        this.setFile(raw.file);

        if (raw.hasOwnProperty("bounds")) {
            this.setBounds(raw.bounds);
        }

        if (raw.hasOwnProperty("selection")) {
            this.setSelection(raw.selection);
        }

        this.resolution = raw.resolution;
        this.globalLight = raw.globalLight;
        this.generatorSettings = raw.generatorSettings; // FIXME

        this.layers = createLayer(null, raw);

        this.placed = raw.placed;
        this.comps = raw.comps;
    }

    util.inherits(Document, events.EventEmitter);

    Document.prototype.setSelection = function (selection) {
        var previousSelection = Object.keys(this.selection || {}),
            disequal = previousSelection.length !== selection.length ||
                previousSelection.some(function (sel, ind) {
                    return sel !== selection[ind];
                });

        if (disequal) {
            this.selection = selection.reduce(function (prev, curr) {
                prev[curr] = true;
                return prev;
            }.bind(this), {});
            this.emit("selection", this.selection, previousSelection);
        }
    };

    Document.prototype.setBounds = function (bounds) {
        var previousBounds = this.bounds || {},
            disequal = previousBounds.top !== bounds.top ||
                previousBounds.right !== bounds.right ||
                previousBounds.bottom !== bounds.bottom ||
                previousBounds.left !== bounds.left;

        if (disequal) {
            this.bounds = bounds;
            this.emit("bounds", this.bounds, bounds);
        }
    };

    Document.prototype.setFile = function (file) {
        var previousFile = this.file;
        if (previousFile !== file) {
            this.file = file;
            this.emit("file", file, previousFile);
        }
    };

    Document.prototype.setClosed = function (closed) {
        var prevClosed = this.closed;

        if (prevClosed !== closed) {
            this.closed = closed;
            this.emit("closed", this.closed);
        }
    };

    Document.prototype.collectAffectedLayers = function (rawLayerChanges, init) {
        init = init || {};

        rawLayerChanges.sort(function (l1, l2) {
            return l1.index - l2.index;
        });

        return rawLayerChanges.reduce(function (removed, rawLayerChange) {
            if (!rawLayerChange.hasOwnProperty("index") && !rawLayerChange.removed) {
                return removed;;
            }

            if (rawLayerChange.hasOwnProperty("layers")) {
                this.collectAffectedLayers(rawLayerChange.layers, removed);
            }

            if (!rawLayerChange.hasOwnProperty("added")) {
                var id = rawLayerChange.id,
                    result = this.layers.findLayer(id);

                if (!result) {
                    if (!rawLayerChange.removed) {
                        throw new Error("Can't find changed layer:", id);
                    } else {
                        return removed;
                    }
                }

                removed[id] = result;
            }

            return removed;
        }.bind(this), init);
    };

    Document.prototype.removeAffectedLayers = function (affectedLayers) {
        var layers = Object.keys(affectedLayers).map(function (id) {
            return affectedLayers[id];
        });

        layers.sort(function (l1, l2) {
            return l1.index - l2.index;
        });

        layers.forEach(function (layerRec) {
            var layer = layerRec.layer,
                id = layer.id;

            // remove the layer from its current position
            var parent = layer.group,
                index = -1;

            parent.layers.some(function (child, i) {
                if (child.id === id) {
                    index = i;
                    return true;
                }
            });

            assert(index > -1, "Can't find layer to remove!");

            parent.layers.splice(index, 1);
        });
    };

    Document.prototype.applyChange = function (change) {
        assert.strictEqual(this.id, change.id, "Document ID mismatch");
        assert.strictEqual(this.version, change.version, "Version mismatch.");

        if (change.count <= this.count) {
            console.warn("Skipping out of order change.");
            return;
        }

        assert(this.timeStamp <= change.timeStamp, "Out of order timestamp.");

        this.count = change.count;
        this.timeStamp = change.timeStamp;

        if (change.hasOwnProperty("file")) {
            this.setFile(change.file);
        }

        if (change.hasOwnProperty("selection")) {
            this.setSelection(change.selection);
        }

        if (change.hasOwnProperty("bounds")) {
            this.setBounds(change.bounds);
        }

        if (change.hasOwnProperty("closed")) {
            this.setClosed(change.closed);
        }

        if (change.hasOwnProperty("layers")) {
            var affectedLayers = this.collectAffectedLayers(change.layers);

            this.removeAffectedLayers(affectedLayers);

            this.layers.applyChanges(affectedLayers, change.layers);
        }
    };

    Document.prototype.toString = function () {
        return "Document " + this.id + ": " + this.layers.toString();
    };

    module.exports = Document;
}());