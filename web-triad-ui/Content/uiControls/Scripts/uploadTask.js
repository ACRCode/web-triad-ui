function UploadTask(files, guidOfFilesSet) {
    this.guidOfFilesSet = guidOfFilesSet;
    this.files = files;
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
               "<td style='text-align: center;'><span class='tc-delete-series'></span></td>" +
               "</tr>";
    }

    this.bindEvents = function (uploadRowElement) {
        let self = this;
        uploadRowElement.find("span.tc-delete-series").click(function () { self.onRetryRequested(self.guidOfFilesSet); });
    }

    this.execute = function() {
        var defer = $.Deferred();

        this._uploadFilesToServer(defer);

        return defer.promise();
    }

    this._uploadFilesToServer= function(defer) {
        this._fakeUploadWithSuccessResultFunction(0, defer);
        //this._fakeUploadWithFailedResultFunction(0, defer);
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
        var self = this;
        console.log("counter: " + counter);
        if (counter++ === 2) defer.resolve("Done");
        else setTimeout(function () { self._fakeUploadWithSuccessResultFunction(counter, defer) }, 1000);
    }

    this._fakeUploadWithFailedResultFunction = function (counter, defer) {
        var self = this;
        console.log("counter: " + counter);
        if (counter++ === 2) defer.reject();
        else setTimeout(function () { self._fakeUploadWithFailedResultFunction(counter, defer) }, 1000);
    }

}