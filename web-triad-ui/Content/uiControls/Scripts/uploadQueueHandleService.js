var UploadQueueHandleService = (function () {
    var uploadItems = [];
    var container;
    var isUploadInProgress = null;
    var onUploadCompleted = [];

    var Statuses = { Pending: "Pending", InProgress: "InProgress", Completed: "Completed", Failed: "Failed" };

    return{
        init: function (_container) {
            isUploadInProgress = false;
            uploadItems = [];
            onUploadCompleted = [];
            container = _container;
        },
        addNewTask: function (files) {

            if (isUploadInProgress === null)
                throw new "Error. UploadQueueService was not initialized before using. Please call method init(_cotainer) to initialize the service.";

            var guidOfFileset = getGuid();
            var uploadTask = new UploadTask(files, guidOfFileset);

            var newUploadItem = { id: guidOfFileset, task: uploadTask, status: Statuses.Pending };
            uploadItems.push(newUploadItem);

            container.append(uploadTask.getHtml());
            uploadTask.bindEvents(container.find("tr[data-fileset-uid='" + newUploadItem.id + "']"));

            uploadTask.onRetryRequested = retryUpload;

            if (!isUploadInProgress) triggerUpload();
        },
        addOnUploadCompletedHandler: function(onUploadCompletedFunc) {
            onUploadCompleted.push(onUploadCompletedFunc);
        }
    }

    function triggerUpload() {
        var uploadItem = pullUploadItemFromQueue();
        
        if (uploadItem == null) {
            isUploadInProgress = false;
            return;
        }

        var taskExecutionPromise = uploadItem.task.execute();
        $.when(taskExecutionPromise)
            .done(function () {
                uploadItem.status = Statuses.Completed;
                onUploadCompleted.forEach(function (func) { func(); });
            })
            .fail(function () {
                uploadItem.status = Statuses.Failed;
            })
            .always(function () {
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
        return task.status === Statuses.Pending;
    }

    function getGuid() {
        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        return (s4() + s4() + "-" + s4() + "-4" + s4().substr(0, 3) +
            "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
    }
}());