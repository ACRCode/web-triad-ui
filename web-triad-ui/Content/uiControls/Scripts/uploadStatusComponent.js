function UploadStatusComponent(container) {
    this._container = container;

    this.showProgressBar = function () {
        let self = this;

        self._container.empty();
        self._container.append("<div class='tc-progress-bar tc-upload-progress'><span class='tc-upload-progress-val'></span><span class='tc-upload-progress-bar'></span></div>");
    }

    this.updateProgressBar = function (processedValue) {
        let self = this;

        if (self._progressBarMaxValue === null)
            throw new "Error. Progress bar component was not initialized. Please call showProgressBar function before updateProgressBar";

        self._container.find(".tc-upload-progress > .tc-upload-progress-bar").width(processedValue + "%");
        self._container.find(".tc-upload-progress > .tc-upload-progress-val").html(processedValue + "%");
    }

    this.showStatus = function (status) {
        let self = this;

        self._container.empty();
        self._container.html(status);
    }

    this.showStatusWithRetryButton = function (status, retryCallback) {
        let self = this;

        self.showStatus(status);
        self._container.append("<span title='Retry' class='tc-retry-upload'></span>");
        self._container.find("span.tc-retry-upload").click(retryCallback);
    }
}