function UploadTask(files, guidOfFilesSet) {

    this._guidOfFilesSet = guidOfFilesSet;
    this._files = files;
    this._isUploadInProgress = false;
    this._uploadStatusComponent;
    this._isCanceled = false;
    let waitingStatusText = "In Queue";

    this.onRetryRequested = function (guidOfFilesSet){ console.log("Default on retry requested event handler: upload retry was requested for: " + guidOfFilesSet)};

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

    this.execute = function() {
        var defer = $.Deferred();

        this._uploadFilesToServer(defer);

        return defer.promise();
    }

    this._uploadFilesToServer = function (defer) {
        let self = this;

        self._isUploadInProgress = true;

        self._uploadStatusComponent.showProgressBar(4);

        self._fakeUploadWithSuccessResultFunction(1, defer);
        //self._fakeUploadWithFailedResultFunction(1, defer);
    }

    this._cancelUpload = function () {
        let self = this;
        self._isCanceled = true;
        console.log("Upload was canceled for " + self._guidOfFilesSet);
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

    this._fakeUploadWithSuccessResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        self._uploadStatusComponent.updateProgressBar(counter);
        if (counter++ === 4 || self._isCanceled) {
            defer.resolve("Done");
            self._isUploadInProgress = false;
            if (self._isCanceled) self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function() { self._retry(self); });
            else self._uploadStatusComponent.showStatus("Completed");
        }
        else setTimeout(function () { self._fakeUploadWithSuccessResultFunction(counter, defer) }, 1000);
    }

    this._fakeUploadWithFailedResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        self._uploadStatusComponent.updateProgressBar(counter);
        if (counter++ === 4 || self._isCanceled) {
            defer.reject();
            self._isUploadInProgress = false;
            if (self._isCanceled) self._uploadStatusComponent.showStatusWithRetryButton("Canceled", function () { self._retry(self); });
            else self._uploadStatusComponent.showStatus("Failed");
        }
        else setTimeout(function () { self._fakeUploadWithFailedResultFunction(counter, defer) }, 1000);
    }
}