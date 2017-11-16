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
                console.log("On updated event handler was not added");
            },
            securityToken: null
        },

        _service: null,

        _create: function () {
            let self = this;

            var studies_E = $(self._studies_T);
            self.element.html(studies_E);

            self._service = new WebTriadService(self.options.serviceParam);

            var token = self.options.getSecurityToken();
            self.setSecurityToken(token);

            var parsingPanel = this.element.find(".tc-uploadingPanel");
            UploadQueueHandleService.init(self._service, parsingPanel.find("tbody"));
            UploadQueueHandleService.addOnUploadCompletedHandler(function (result) {
                self._update(self, result);
            });
            UploadQueueHandleService.addOnQueueEmptiedHandler(function () { parsingPanel.hide(); });
        },

        /////////////////////////////////////////////////////////////////////////

        _destroy: function () {
            this.element.html("");
        },

        /////////////////////////////////////////////////////////////////////////

        _update: function (self, result) {
            self.options.onFilesUploaded(result);
        },

        /////////////////////////////////////////////////////////////////////////

        _studies_T:
            "<div class='tc-uploadingPanel' style='display: none'>" +
                "<table class='tc-table-uploadingPanel'>" +
                "<thead><tr>" +
                "<th style='padding-left: 15px;'>Files</th>" +
                "<th style='width: 100px; text-align: center'># of Files</th>" +
                "<th style='width: 300px; text-align: center'>Upload Status</th>" +
                "<th style='width: 50px; text-align: center'></th>" +
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
            return UploadQueueHandleService.getProcessingStaus();
        }
    });
})(jQuery, window, document);
