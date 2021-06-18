(function ($, window, document, undefined) {
    $.widget("acr.uploaderFiles", {
        options: {
            uploadData: null,
            serviceParam: {
                serverApiUrl: "http://localhost:57808/api",
                numberOfFilesInPackage: 10,
                sizeChunk: 1024 * 1024,
                numberOfConnection: 6
            },
            getSecurityToken: function () {
                console.log("getSecurityToken() is not implemented");
                return null;
            },
            onFilesUploaded: function () {
                console.log("On uploaded event handler was not added");
            },
            onErrorEvent: function () {
                console.log("On error event handler was not added");
            },
            securityToken: null
        },

        _service: null,

        _create: function () {
            let self = this;

            var upload_queue_E = $(self._upload_queue_T);
            self.element.html(upload_queue_E);

            self._service = new WebTriadService(self.options.serviceParam);

            var token = self.options.getSecurityToken();
            self.setSecurityToken(token);

            var parsingPanel = this.element.find(".tc-uploadingPanel");
            UploadQueueHandleService.init(self._service, parsingPanel.find("tbody"), self.options.onErrorEvent);
            UploadQueueHandleService.addOnUploadCompletedHandler(function (result) {
                self.options.onFilesUploaded(result);
            });
            UploadQueueHandleService.addOnQueueEmptiedHandler(function () { parsingPanel.hide(); });
        },

        /////////////////////////////////////////////////////////////////////////

        _destroy: function () {
            this.element.html("");
        },

        /////////////////////////////////////////////////////////////////////////

        _upload_queue_T:
            "<div class='tc-uploadingPanel' style='display: none'>" +
            "<div class='tc-uploadingPanelLabel'>" +
            "<span class='tc-stop-icon'></span>" +
            "<span style='display: block; padding-top: 10px; font-weight: bold;'>Uploading Status...</span>" +
            "<span>Please do not navigate away or close the page until all files have been uploaded successfully.</span>" +
            "</div>" +
            "<table class='tc-table-uploadingPanel'>" +
            "<thead><tr>" +
            "<th style='padding-left: 15px;' width='55%'>Files</th>" +
            "<th style='text-align: center' width='6%'>#Files</th>" +
            "<th style='text-align: center' width='33%'>Upload Status</th>" +
            "<th style='text-align: center' width='6%'></th>" +
            "</tr></thead>" +
            "<tbody></tbody>" +
            "</table>" +
            "</div>",

        /////////////////////////////////////////////////////////////////////////

        setSecurityToken: function (token) {
            if (token === null) return;
            let self = this;
            self.options.securityToken = token;
            self._service.setSecurityToken(self.options.securityToken);
        },

        /////////////////////////////////////////////////////////////////////////

        addFiles: function (files) {
            if (files.length == 0) return;
            let self = this;
            self.element.find(".tc-uploadingPanel").show();

            var uploadParameters = self.options.uploadData;

            UploadQueueHandleService.addNewTask(files, uploadParameters);
        },

        /////////////////////////////////////////////////////////////////////////

        getProcessingStatus: function () {
            return UploadQueueHandleService.getProcessingStatus();
        }
    });
})(jQuery, window, document);
