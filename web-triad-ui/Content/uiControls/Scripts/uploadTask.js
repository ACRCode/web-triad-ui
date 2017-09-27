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

function UploadTask(files, guidOfFilesSet, uploadParameters, webService) {

    let waitingStatusText = "In Queue";

    this._guidOfFilesSet = guidOfFilesSet;
    this._files = files;
    this._uploadParameters = uploadParameters;
    this._webService = webService;

    this._isUploadInProgress = false;

    this._uploadStatusComponent;

    this._isCanceled = false;
    this._cancelToken = null;

    this._uploadPromise;

    this._skippedFiles = {
        NumberOfStudies: 0,
        NumberOfDicoms: 0,
        NumberOfCorruptedDicoms: 0,
        NumberOfNonDicoms: 0,
        TotalFileCount: 0,
        Studies: []
    };

    this.onRetryRequested = function (guidOfFilesSet) { console.log("Default on retry requested event handler: upload retry was requested for: " + guidOfFilesSet) };

    this.getHtml = function () {
        let self = this;

        var fileNames = self._getFileNames();
        return "<tr data-fileset-uid='" + self._guidOfFilesSet + "'>" +
            "<td style='padding-left: 15px;'><div style='text-overflow: ellipsis;overflow: hidden;width: 300px;white-space: nowrap;'>" +
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

        self._uploadPromise = $.Deferred();

        self._uploadFilesToServer();

        return self._uploadPromise.promise();
    }

    this._uploadFilesToServer = function () {
        let self = this;

        self._isUploadInProgress = true;

        self._uploadStatusComponent.showProgressBar();

        self._cancelToken = self._webService.submitFiles(files, self._uploadParameters,
            function (result) { self._handleUploadProgress(result, self._uploadPromise); });

        //self._fakeUploadWithSuccessResultFunction(1, defer);
        //self._fakeUploadWithFailedResultFunction(1, defer);
    }

    this._cancelUpload = function () {
        let self = this;

        self._isCanceled = true;
        self._isUploadInProgress = false;
        self._skippedFiles = {
            NumberOfStudies: 0,
            NumberOfDicoms: 0,
            NumberOfCorruptedDicoms: 0,
            NumberOfNonDicoms: 0,
            TotalFileCount: 0,
            Studies: []
        };

        self._uploadPromise.reject();

        self._webService.cancelUploadAndSubmitListOfFiles(self._cancelToken,
            function () { console.log("File within upload with id = " + self._cancelToken + " was removed."); });

        self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
    }

    this._retry = function (self) {
        self._skippedFiles = {
            NumberOfStudies: 0,
            NumberOfDicoms: 0,
            NumberOfCorruptedDicoms: 0,
            NumberOfNonDicoms: 0,
            TotalFileCount: 0,
            Studies: []
        };
        self._isCanceled = false;
        self._uploadStatusComponent.showStatus(waitingStatusText);
        self.onRetryRequested(self._guidOfFilesSet);
    }

    this._getFileNames = function () {
        let self = this;

        var count = self._files.length > 4 ? 3 : self._files.length;
        var filesNames = self._files[0].name;
        for (let i = 1; i < count; i++) {
            filesNames += ", " + self._files[i].name;
        }

        return filesNames;
    }

    this._handleUploadProgress = function (result, defer) {
        let self = this;

        if (result.hasOwnProperty("skippedFiles")) {
            self._addSkippedFiles(result.skippedFiles);
        }

        switch (result.status) {
        case ProcessStatus.Success:
            self._uploadStatusComponent.updateProgressBar(result.progress);
            if (result.message != "CancelSubmit") {
                var statusString = self._files.length - self._skippedFiles.TotalFileCount + " file(s) uploaded successfully. ";
                if (self._skippedFiles.TotalFileCount != 0) statusString += self._skippedFiles.TotalFileCount + " file(s) rejected to upload";
                self._uploadStatusComponent.showStatus(statusString);
            }
            self._isUploadInProgress = false;
            defer.resolve(self._skippedFiles);
            break;
        case ProcessStatus.InProgress:
            self._uploadStatusComponent.updateProgressBar(result.progress);
            break;
        case ProcessStatus.Error:
            self._isUploadInProgress = false;
            self._uploadStatusComponent.showStatusWithRetryButton("Failed", function () { self._retry(self); });
            defer.reject();
            break;
        default:
        }
    }

    this._fakeUploadWithSuccessResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        self._uploadStatusComponent.updateProgressBar(counter / 4 * 100);
        if (counter++ === 4 || self._isCanceled) {
            defer.resolve("Done");
            self._isUploadInProgress = false;
            if (self._isCanceled) self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
            else self._uploadStatusComponent.showStatus("Completed");
        }
        else setTimeout(function () { self._fakeUploadWithSuccessResultFunction(counter, defer) }, 1000);
    }

    this._fakeUploadWithFailedResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        self._uploadStatusComponent.updateProgressBar(counter / 4 * 100);
        if (counter++ === 4 || self._isCanceled) {
            defer.reject();
            self._isUploadInProgress = false;
            if (self._isCanceled) self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
            else self._uploadStatusComponent.showStatus("Failed");
        }
        else setTimeout(function () { self._fakeUploadWithFailedResultFunction(counter, defer) }, 1000);
    }


    this._addSkippedFiles = function (skippedFiles) {
        let self = this;

        for (var i = 0; i < skippedFiles.length; i++) {
            if (skippedFiles[i].IsDicom == true) {

                self._skippedFiles.TotalFileCount++;

                if (skippedFiles[i].IsCorrectDicom == false) {
                    self._skippedFiles.NumberOfCorruptedDicoms++;
                    continue;
                }

                self._skippedFiles.NumberOfDicoms++;

                var index = self._skippedFiles.Studies.findIndex(function (item) {
                    return item.StudyInstanceUID == skippedFiles[i].StudyInstanceUID;
                });
                if (index == -1) {
                    self._skippedFiles.NumberOfStudies++;
                    self._skippedFiles.Studies.push(
                        {
                            StudyInstanceUID: skippedFiles[i].StudyInstanceUID,
                            StudyDescription: skippedFiles[i].StudyDescription,
                            NumberOfFiles: 1,
                            NumberOfSeries: 1,
                            Series: [{
                                NumberOfFiles: 1,
                                SeriesInstanceUID: skippedFiles[i].SeriesInstanceUID,
                                SeriesDescription: skippedFiles[i].SeriesDescription
                            }]
                        }
                    );

                } else {
                    self._skippedFiles.Studies[index].NumberOfFiles++;
                    var indexOfSeries = self._skippedFiles.Studies[index].Series.findIndex(function (item) {
                        return item.SeriesInstanceUID == skippedFiles[i].SeriesInstanceUID;
                    });
                    if (indexOfSeries == -1) {
                        self._skippedFiles.Studies[index].NumberOfSeries++;
                        self._skippedFiles.Studies[index].Series.push(
                            {
                                NumberOfFiles: 1,
                                SeriesInstanceUID: skippedFiles[i].SeriesInstanceUID,
                                SeriesDescription: skippedFiles[i].SeriesDescription
                            });
                    } else {
                        self._skippedFiles.Studies[index].Series[indexOfSeries].NumberOfFiles++;
                    }
                }
            } else {
                self._skippedFiles.NumberOfNonDicoms++;
                self._skippedFiles.TotalFileCount++;
            }
        };
    }
}