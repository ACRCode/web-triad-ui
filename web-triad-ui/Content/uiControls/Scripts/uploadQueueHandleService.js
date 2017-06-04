var UploadQueueHandleService = (function () {
    var tasks = [];
    var container;
    var isUploadInProgress;

    var Statuses = { Pending: "Pending", InProgress: "InProgress", Completed: "Completed" };

    return{
        init: function (_container) {
            isUploadInProgress = false;
            tasks = [];
            container = _container;
        },
        addNewTask: function (files) {

            if (isUploadInProgress === null) throw new "Error. UploadQueueService was not initialized before using. Please call method init(_cotainer) to initialize the service.";

            var guidOfFileset = getGuid();
            var uploadTask = new UploadTask(files, guidOfFileset);

            tasks.push({ id: guidOfFileset, task: uploadTask, status: Statuses.Pending });
            container.append(uploadTask.getHtml());

            if (!isUploadInProgress) triggerUpload();
        }
    }

    function triggerUpload() {
        console.log("Upload was started.");
    }

    function getGuid() {
        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        return (s4() + s4() + "-" + s4() + "-4" + s4().substr(0, 3) +
            "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
    }
}());