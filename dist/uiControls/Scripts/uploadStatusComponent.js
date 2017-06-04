function UploadStatusComponent(container) {
    this._container = container;

    this._progressBarMaxValue = null;

    this.showProgressBar = function(maxValue) {
        let self = this;

        self._progressBarMaxValue = maxValue;
        self._container.empty();
        self._container.append("<div class='tc-progress-bar tc-upload-progress'><span></span></div>");
    }

    this.updateProgressBar = function (processedValue) {
        let self = this;

        if (self._progressBarMaxValue === null)
            throw new "Error. Progress bar component was not initialized. Please call showProgressBar function before updateProgressBar";

        self._container.find(".tc-parsing-progress span").width(processedValue / self._progressBarMaxValue * 100);
    }
}