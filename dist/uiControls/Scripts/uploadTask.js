function UploadTask(files, guidOfFilesSet, webService) {

    let waitingStatusText = "In Queue";

    this._guidOfFilesSet = guidOfFilesSet;
    this._files = files;
    this._isUploadInProgress = false;

    this._uploadStatusComponent;

    this._isCanceled = false;
    this._cancelToken = null;

    this._webService = webService;

    this._uploadPromise;


    this.onRetryRequested = function (guidOfFilesSet) { console.log("Default on retry requested event handler: upload retry was requested for: " + guidOfFilesSet) };

    this.getHtml = function () {
        let self = this;

        var fileNames = self._getFileNames();
        return "<tr data-fileset-uid='" + self._guidOfFilesSet + "'>" +
               "<td style='padding-left: 15px;'><div style='text-overflow: ellipsis;overflow: hidden;width: 300px;white-space: nowrap;'>" +
               fileNames +
               "</div></td>" +
               "<td style='text-align: center;'>" + self._files.length + "</td>" +
               "<td class='tc-upload-status' style='text-align: center;'></td>" +
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

        self._uploadStatusComponent = new UploadStatusComponent(uploadRowElement.find("td.tc-upload-status"));
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

        var fakeMetadata = [{ "Name": "SiteID", "Value": "1" },
                            { "Name": "SubjectID", "Value": "testSub" },
                            { "Name": "SubmissionType", "Value": "ClinicalTrial" },
                            { "Name": "TimePointDescription", "Value": "" },
                            { "Name": "TimePointID", "Value": "2" },
                            { "Name": "ProjectID", "Value": "1" },
                            { "Name": "GroupID", "Value": "1" },
                            { "Name": "TrialID", "Value": "1" }];

        self._cancelToken = self._webService.submitFiles(files, fakeMetadata, function (result) { self._handleUploadProgress(result, self._uploadPromise); });

        //self._fakeUploadWithSuccessResultFunction(1, defer);
        //self._fakeUploadWithFailedResultFunction(1, defer);
    }

    this._cancelUpload = function () {
        let self = this;

        self._isCanceled = true;
        self._isUploadInProgress = false;

        self._uploadPromise.resolve();

        self._webService.cancelUploadAndSubmitListOfFiles(self._cancelToken,
            function () { console.log("File within upload with id = " + self._cancelToken + " was removed."); });

        self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
    }

    this._retry = function (self) {
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

        switch (result.status) {
            case ProcessStatus.Success:
                self._uploadStatusComponent.updateProgressBar(result.progress);
                if (result.message != "CancelSubmit") self._uploadStatusComponent.showStatus("Completed");
                self._isUploadInProgress = false;
                defer.resolve();
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
}