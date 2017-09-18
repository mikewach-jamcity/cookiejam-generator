/*
 * Cookie Jam: Net Manager
 * Copyright (c) 2017 Jam City. All rights reserved
 * @author Michael Wach
 */

(function () {
    "use strict";
    
    var net = require('net'),
        Q = require('q');
    
    NetManager.prototype._port = 8124;
    NetManager.prototype._hasDocuments = false;
    NetManager.prototype._hasEnabled = false;
    NetManager.prototype._hasRendering = false;

    /**
     * The Net Manager creates a server for Cookie Jam
     * plugins to communicate with
     * 
     * @constructor
     * @param {Logger} logger
     * @param {RenderManager} renderManager
     */
    function NetManager(logger, stateManager, documentManager, renderManager) {
        // store constructor params
        this._logger = logger;
        this._stateManager = stateManager;
        this._documentManager = documentManager;
        this._renderManager = renderManager;

        // start net server
        this._server = net.createServer(this._handleClientConnection.bind(this));

        // handle error events
        this._server.on('error', this._handleServerError.bind(this));

        // make server listen to specified port
        this._server.listen(this._port, this._handleServerBound.bind(this));
        
        // listen for state manager events
        this._hasEnabled = this._stateManager.enabled;
        this._stateManager.on('enabled', this._handleStateEnabled.bind(this));
        this._stateManager.on('disabled', this._handleStateDisabled.bind(this));

        // listen for document manager events
        this._hasDocuments = this._documentManager.getActiveDocumentID() != null;
        this._documentManager.on("activeDocumentChanged", this._handleActiveDocumentChanged.bind(this));
        this._documentManager.on("openDocumentsChanged", this._handleOpenDocumentsChanged.bind(this));

        // listen for render manager events
        this._renderManager.on('active', this._handleRenderActive.bind(this));
        this._renderManager.on('idle', this._handleRenderIdle.bind(this));
    }

    NetManager.prototype._handleClientConnection = function(socket) {
        // store this reference to socket
        this.socket = socket;

        // handle client data
        var handleClientData = (function(data) {
            var result = JSON.parse(data);
            this._logger.debug(`RECEIVED: ${JSON.stringify(result)}`);
            switch(result.type) {
                case "request":
                    // only process requests when there's a document
                    if(this._hasDocuments) {
                        if(result.data == "disable") this._stateManager.deactivate(this._stateManager._activeDocumentId);
                        else if(result.data == "enable") this._stateManager.activate(this._stateManager._activeDocumentId);
                        this._hasEnabled = this._stateManager.enabled;
                    }
                    break;
            }
        }).bind(this);
    
        // handle client disconnect
        var handleClientEnd = (function() {
            this._logger.debug('A client was disconnected');
        }).bind(this);

        // send client raw data string
        var send = (function(data) {
            socket.write(data);
            this._logger.debug(`SENT: ${data}`);
        }).bind(this);

        // send client a status message
        var sendStatus = (function() {
            var status = this._hasDocuments ? this._hasEnabled ? this._hasRendering ? "active" 
                                                                                    : "idle" 
                                                               : "disabled"
                                            : "document_null";
            send(this._makeMessage("status", status));
        }).bind(this);

        // send client a log message
        var sendLog = (function(value) {
            send(this._makeMessage("log", value));
        }).bind(this);

        // 'connection' listener
        this._logger.debug('A client was connected');

        // add connection event handlers
        socket.on('end', handleClientEnd);
        socket.on('data', handleClientData);

        // send status updates on state manager events
        this._stateManager.on('enabled', sendStatus);
        this._stateManager.on('disabled', sendStatus);

        // listen for document manager events
        this._documentManager.on("activeDocumentChanged", sendStatus);
        this._documentManager.on("openDocumentsChanged", sendStatus);

        // send status updates on render manager events
        this._renderManager.on('active', sendStatus);
        this._renderManager.on('idle', sendStatus);

        // always send status to new client connection
        sendStatus();
    };

    NetManager.prototype._handleServerBound = function() {
        this.online = true;
        this._logger.debug(`Cookie Jam server bound to port ${this._port}`);
    };

    NetManager.prototype._handleServerError = function(err) {
        this._logger.debug(err);
    };

    NetManager.prototype._handleStateEnabled = function() {
        this._hasEnabled = true;
        this._logger.debug("*StateEnabled*");
    };

    NetManager.prototype._handleStateDisabled = function() {
        this._hasEnabled = false;
        this._logger.debug("*StateDisabled*");
    };

    /**
     * Handle the activeDocumentChanged event emitted by the DocumentManager.
     * Updates the 'enabled' state.
     * 
     * @private
     * @param {?number} id The ID of the new currently active document, or null if
     *      there is none.
     */
    NetManager.prototype._handleActiveDocumentChanged = function (id) {
        this._hasDocuments = (id != null);
        this._logger.debug(`*ActiveDocumentChanged* ${this._hasDocuments}`);
    };
        
    /**
     * Handle the openDocumentsChanged event emitted by the DocumentManager.
     * Updates the 'enabled' state
     * 
     * @private
     * @param {Array.<number>} all The complete set of open document IDs
     * @param {Array.<number>=} opened The set of newly opened document IDs
     * @param {Array.<number>=} closed The set of newly closed documentIDs
     */
    NetManager.prototype._handleOpenDocumentsChanged = function (all, opened, closed) {
        this._hasDocuments = !(all.length === 0);
        this._logger.debug(`*OpenDocumentsChanged* ${this._hasDocuments}`);
    };

    NetManager.prototype._handleRenderActive = function() {
        this._hasRendering = true;
        this._logger.debug("*RenderActive*");
    };

    NetManager.prototype._handleRenderIdle = function() {
        this._hasRendering = false;
        this._logger.debug("*RenderIdle*");
    };

    NetManager.prototype._makeMessage = function(type, data) {
        return JSON.stringify({
            type: type,
            data: data
        });
    }

    module.exports = NetManager;
}());