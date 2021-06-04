//polyfill Array.prototype.findIndex
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

function UploadTask(files, guidOfFilesSet, uploadParameters, webService, onErrorEvent) {

    let waitingStatusText = "In Queue";

    this._guidOfFilesSet = guidOfFilesSet;
    this._files = files;
    this._uploadParameters = uploadParameters;
    this._webService = webService;
    this._onErrorEvent = onErrorEvent;
    this._isUploadInProgress = false;

    this._uploadStatusComponent;

    this._isCanceled = false;
    this._cancelToken = null;

    this._data = {
        uploading: null
    };

    this.onRetryRequested = function (guidOfFilesSet) { console.log("Default on retry requested event handler: upload retry was requested for: " + guidOfFilesSet) };

    this.getHtml = function () {
        let self = this;

        var fileNames = self._getFileNames();
        return "<tr data-fileset-uid='" + self._guidOfFilesSet + "'>" +
            "<td style='padding-left: 15px;'><div style='text-overflow: ellipsis;overflow: hidden;'>" +
            fileNames +
            "</div></td>" +
            "<td style='text-align: center;'>" + self._files.length + "</td>" +
            "<td class='tc-upload-status' style='text-align: center;'><p></p></td>" +
            "<td style='text-align: center;'><span title='' class='tc-cancel-or-remove-upload-from-queue'></span></td>" +
            "</tr>";
    }

    this.bindEvents = function (uploadRowElement) {
        let self = this;

        var removeOrCancelButton = uploadRowElement.find("span.tc-cancel-or-remove-upload-from-queue");

        removeOrCancelButton.click(function () {
            if (self._isUploadInProgress) self._cancelUpload();
            else uploadRowElement.remove();
        });

        removeOrCancelButton.mousemove(function () {
            if (self._isUploadInProgress) removeOrCancelButton.attr("title", "Cancel Upload");
            else removeOrCancelButton.attr("title", "Remove Selection");
        });

        self._uploadStatusComponent = new UploadStatusComponent(uploadRowElement.find("td.tc-upload-status>p"));
        self._uploadStatusComponent.showStatus(waitingStatusText);
    }

    this.execute = function () {
        let self = this;

        self._data.uploading = $.Deferred();
        self._uploadFilesToServer();
        self._data.uploading.promise();

        return self._data;
    }

    this._uploadFilesToServer = function () {
        let self = this;

        self._isUploadInProgress = true;

        self._uploadStatusComponent.showProgressBar();

        self._cancelToken = self._webService.submitFiles(files, self._uploadParameters,
            function (result) { self._handleUploadProgress(result, self._data); });
    }

    this._cancelUpload = function () {
        let self = this;

        self._isCanceled = true;
        self._isUploadInProgress = false;
        self._data.uploading.reject();

        self._webService.cancelUploadAndSubmitListOfFiles(self._cancelToken,
            function (data) {
                if (data.processStatus == ProcessStatus.Error) {
                    self._onErrorEvent(self._errorMessage(data));
                }
            });

        self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
    }

    this._retry = function (self) {
        self._isCanceled = false;
        self._uploadStatusComponent.showStatus(waitingStatusText);
        self.onRetryRequested(self._guidOfFilesSet);
    }

    this._getFileNames = function () {
        let self = this;

        var count = self._files.length > 11 ? 10 : self._files.length;
        var filesNames = self._files[0].name;
        for (let i = 1; i < count; i++) {
            filesNames += ", " + self._files[i].name;
        }

        return filesNames;
    }

    this._getFileAttributes = function () {
        let self = this;

        var filesAttributes = [];
        for (let i = 0; i < self._files.length; i++) {
            var item = {
                name: self._files[i].name,
                size: self._files[i].size
            }
            filesAttributes.push(item);
        }

        return filesAttributes;
    }

    this._handleUploadProgress = function (result, defer) {
        let self = this;

        switch (result.processStatus) {
            case ProcessStatus.Success:
                switch (result.processStep) {
                    case ProcessStep.Uploading:
                        self._uploadStatusComponent.updateProgressBar(result.progress);
                        self._isUploadInProgress = false;
                        defer.uploading.resolve(self._getFileAttributes());
                        break;
                    case ProcessStep.Canceling:
                        defer.uploading.reject();
                        break;
                }
                break;
            case ProcessStatus.InProgress:
                if (result.processStep == ProcessStep.Processing) {
                    break;
                }
                self._uploadStatusComponent.updateProgressBar(result.progress);
                break;
            case ProcessStatus.Error:
                self._isUploadInProgress = false;
                self._uploadStatusComponent.showStatusWithRetryButton("Failed", function () { self._retry(self); });
                defer.uploading.reject();

                self._onErrorEvent(self._errorMessage(result));

                break;
            default:
        }
    }

    this._hideRemoveOrCancelButton = function () {
        let self = this;
        var removeOrCancelButton = $("tr[data-fileset-uid='" + self._guidOfFilesSet + "'] span.tc-cancel-or-remove-upload-from-queue");
        removeOrCancelButton.addClass("tc-not-allowed");
    }

    this._showRemoveOrCancelButton = function () {
        let self = this;
        var removeOrCancelButton = $("tr[data-fileset-uid='" + self._guidOfFilesSet + "'] span.tc-cancel-or-remove-upload-from-queue");
        removeOrCancelButton.removeClass("tc-not-allowed");
    }

    this._errorMessage = function (data) {
        var errObj = {};
        errObj.date = new Date();
        errObj.step = ProcessStep[data.processStep];
        errObj.statusText = data.statusCode + " " + data.statusText;
        errObj.message = data.details;

        switch (data.processStep) {
            case ProcessStep.Uploading:
                break;
            case ProcessStep.Processing:
                break;
            case ProcessStep.Canceling:
                break;
        }

        return errObj;
    }
}