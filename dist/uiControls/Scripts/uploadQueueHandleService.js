var UploadQueueHandleService = (function () {
    var uploadItems = [];
    var container;
    var isUploadInProgress;
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

            if (isUploadInProgress === null) throw new "Error. UploadQueueService was not initialized before using. Please call method init(_cotainer) to initialize the service.";

            var guidOfFileset = getGuid();
            var uploadTask = new UploadTask(files, guidOfFileset);

            uploadItems.push({ id: guidOfFileset, task: uploadTask, status: Statuses.Pending });
            container.append(uploadTask.getHtml());

            if (!isUploadInProgress) triggerUpload();
        },
        addOnUploadCompletedHandler: function(onUploadCompletedFunc) {
            onUploadCompleted.push(onUploadCompletedFunc);
        }
    }

    function triggerUpload() {
        var uploadItem = pullUploadItemFromQueue();
        
        if (uploadItem == null || typeof uploadItem == "undefined") {
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
                container.find("tr[data-fileset-uid='" + uploadItem.id + "']> td.tc-parsing-progress").html(uploadItem.status);
                triggerUpload();
            });
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