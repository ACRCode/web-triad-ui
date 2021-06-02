//polyfill Array.prototype.find
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
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
                return value;
            }
        }
        return undefined;
    };
}

var UploadQueueHandleService = (function () {
    var uploadItems = [];
    var container;
    var isUploadInProgress = null;
    var onUploadCompleted = [];
    var onQueueEmptied = [];
    var webService = null;
    var onErrorEvent;

    var Statuses = { Pending: "Pending", InProgress: "InProgress", Completed: "Completed", Failed: "Failed" };

    return {
        init: function (_webService, _container, _onErrorEvent) {
            isUploadInProgress = false;
            uploadItems = [];
            onUploadCompleted = [];
            container = _container;
            webService = _webService;
            onErrorEvent = _onErrorEvent;
        },
        addNewTask: function (files, uploadParameters) {

            if (isUploadInProgress === null || webService === null)
                throw new "Error. UploadQueueService was not initialized before using. Please call method init to initialize the service.";

            var guidOfFileset = getGuid();
            var uploadTask = new UploadTask(files, guidOfFileset, uploadParameters, webService, onErrorEvent);

            var newUploadItem = { id: guidOfFileset, task: uploadTask, status: Statuses.Pending };
            uploadItems.push(newUploadItem);

            container.append(uploadTask.getHtml());

            var uploadRowElment = container.find("tr[data-fileset-uid='" + newUploadItem.id + "']");
            uploadRowElment.on("remove", function () {
                let item = uploadItems.find(function (i) { return i.id === newUploadItem.id });
                item.status = Statuses.Completed;
                if (container.find("tr").length <= 1)
                    onQueueEmptied.forEach(function (func) { func(); });
            });

            uploadTask.bindEvents(uploadRowElment);

            uploadTask.onRetryRequested = retryUpload;

            if (!isUploadInProgress) triggerUpload();
        },
        addOnUploadCompletedHandler: function (onUploadCompletedFunc) {
            onUploadCompleted.push(onUploadCompletedFunc);
        },
        addOnQueueEmptiedHandler: function (onQueueEmptiedFunc) {
            onQueueEmptied.push(onQueueEmptiedFunc);
        },
        getProcessingStatus: function () {
            if (isUploadInProgress === null || webService === null)
                throw new "Error. UploadQueueService was not initialized before using. Please call method init to initialize the service.";
            return isUploadInProgress;
        }
    }

    function triggerUpload() {
        isUploadInProgress = true;

        var uploadItem = pullUploadItemFromQueue();

        if (uploadItem == null) {
            isUploadInProgress = false;
            return;
        }

        var data = uploadItem.task.execute();

        $.when(data.uploading)
            .done(function(result) {
                uploadItem.status = Statuses.Completed;
                let isUploadQueueEmpty = pullUploadItemFromQueue() == null ? true : false;
                onUploadCompleted.forEach(function(func) { func({ files: result, isUploadQueueEmpty }); });
            })
            .fail(function() {
                uploadItem.status = Statuses.Failed;
            })
            .always(function() {
                triggerUpload();
            });
    }

    function retryUpload(id) {
        var uploadItemToRetry = uploadItems.find(function (item) { return item.id === id });
        if (uploadItemToRetry == null) return;
        uploadItemToRetry.status = Statuses.Pending;
        if (!isUploadInProgress) triggerUpload();
    }

    function pullUploadItemFromQueue() {
        return uploadItems.find(pendingTaskPredicate);
    }

    function pendingTaskPredicate(task) {
        return task.status == Statuses.Pending;
    }

    function getGuid() {
        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        return (s4() + s4() + "-" + s4() + "-4" + s4().substr(0, 3) +
            "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
    }
}());