function UploadTask(files, guidOfFilesSet) {
    this.guidOfFilesSet = guidOfFilesSet;
    this.files = files;
    this.isUploadInProgress = false;

    this.onRetryRequested = function (guidOfFilesSet){ console.log("Default on retry requested event handler: upload retry was requested for: " + guidOfFilesSet)};

    this.getHtml = function () {
        let self = this;

        var fileNames = self._getFileNames();
        return "<tr data-fileset-uid='" + self.guidOfFilesSet + "'>" +
               "<td style='padding-left: 15px;'><div style='text-overflow: ellipsis;overflow: hidden;width: 300px;white-space: nowrap;'>" +
               fileNames +
               "</div></td>" +
               "<td style='text-align: center;'>" + self.files.length + "</td>" +
               "<td class='tc-parsing-progress' style='text-align: center;'></td>" +
               "<td style='text-align: center;'><span title='' class='tc-cancel-or-remove-upload-from-queue'></span></td>" +
               "</tr>";
    }

    this.bindEvents = function (uploadRowElement) {
        let self = this;

        var removeOrCancelButton = uploadRowElement.find("span.tc-cancel-or-remove-upload-from-queue");

        removeOrCancelButton.click(function () {
            if (self.isUploadInProgress) self._cancelUpload();
            else uploadRowElement.remove();
        });

        removeOrCancelButton.mousemove(function () {
            if (self.isUploadInProgress) removeOrCancelButton.attr("title", "Cancel Upload");
            else removeOrCancelButton.attr("title", "Remove Selection");
        });
    }

    this.execute = function() {
        var defer = $.Deferred();

        this._uploadFilesToServer(defer);

        return defer.promise();
    }

    this._uploadFilesToServer = function (defer) {
        this.isUploadInProgress = true;
        this._fakeUploadWithSuccessResultFunction(0, defer);
        //this._fakeUploadWithFailedResultFunction(0, defer);
    }

    this._cancelUpload = function () {
        let self = this;
        console.log("Upload was canceled for " + self.guidOfFilesSet);
    }

    this._retry = function (){
        this.onRetryRequested(this.guidOfFilesSet);
    }

    this._getFileNames = function () {
        let self = this;

        var count = self.files.length > 4 ? 3 : self.files.length;
        var filesNames = self.files[0].name;
        for (let i = 1; i < count; i++) {
            filesNames += ", " + self.files[i].name;
        }

        return filesNames;
    }

    this._fakeUploadWithSuccessResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        if (counter++ === 4) {
            defer.resolve("Done");
            self.isUploadInProgress = false;
        }
        else setTimeout(function () { self._fakeUploadWithSuccessResultFunction(counter, defer) }, 1000);
    }

    this._fakeUploadWithFailedResultFunction = function (counter, defer) {
        let self = this;
        console.log("counter: " + counter);
        if (counter++ === 4) {
            defer.reject();
            self.isUploadInProgress = false;
        }
        else setTimeout(function () { self._fakeUploadWithFailedResultFunction(counter, defer) }, 1000);
    }

}