queryFileMetadataTest = "";
var WebTriadService = /** @class */ (function () {
    //////////////////////////////////////////////////////////////////////////
    /**
    * Initialize Web TRIAD Client
    * @param {IServiceSettings} serviceSettings
    */
    function WebTriadService(serviceSettings) {
        this.self = this;
        this.fileApiUrl = "/files";
        this.dicomViewerUrl = "/dicomViewerUrl";
        this.nonDicomsUrl = "/nonDicoms";
        this.submissionFileInfoApiUrl = "/submissionPackages";
        this.submittedSeriesDetailsUrl = "/series";
        this.submittedStudiesDetailsUrl = "/studies";
        this.submittedFilesDetailsUrl = "/submittedPackageFiles";
        this.securityToken = null;
        this.settings = $.extend({
            serverApiUrl: "http://cuv-triad-app.restonuat.local/api",
            numberOfFilesInPackage: 4,
            sizeChunk: 1024 * 1024 * 2,
            numberOfConnection: 6,
            dicomsDisabled: false,
            nonDicomsDisabled: false
        }, serviceSettings);
        var serverApiUrl = this.settings.serverApiUrl;
        this.fileApiUrl = serverApiUrl + this.fileApiUrl;
        this.submissionFileInfoApiUrl = serverApiUrl + this.submissionFileInfoApiUrl;
        this.submittedStudiesDetailsUrl = serverApiUrl + this.submittedStudiesDetailsUrl;
        this.submittedSeriesDetailsUrl = serverApiUrl + this.submittedSeriesDetailsUrl;
        this.submittedFilesDetailsUrl = serverApiUrl + this.submittedFilesDetailsUrl;
        this.dicomViewerUrl = serverApiUrl + this.dicomViewerUrl;
        this.nonDicomsUrl = serverApiUrl + this.nonDicomsUrl;
        this.listsOfFiles = {};
    }
    ////////////////////////////////////////////
    /**
    * Sends files to Web TRIAD
    * @param {IFileExt[]} files
    * @param {ItemData[]} metadata
    * @param {(progressData: SubmissionProgressData) => void} uploadAndSubmitListOfFilesProgress
    * @returns {string}
    */
    WebTriadService.prototype.submitFiles = function (files, metadata, uploadAndSubmitListOfFilesProgress) {
        var id = this.addListOfFilesForUpload(files);
        this.uploadAndSubmitListOfFiles(id, metadata, uploadAndSubmitListOfFilesProgress);
        return id;
    };
    ////////////////////////////////////////////
    WebTriadService.prototype.addListOfFilesForUpload = function (files) {
        var listOfFilesId = this.getGuid();
        this.listsOfFiles[listOfFilesId] = {
            submissionPackageId: null,
            deferredCreatingSubmissionPackage: $.Deferred(),
            files: [],
            size: 0,
            isCanceled: false,
            defferedSubmits: {}
        };
        if (files.length > 0) {
            var sizeOfFiles = 0;
            for (var i = 0; i < files.length; i++) {
                files[i].listOfFilesId = listOfFilesId;
                this.setFileStatus(files[i], FileStatus.Ready);
                this.listsOfFiles[listOfFilesId].files.push(files[i]);
                sizeOfFiles += files[i].size;
            }
            this.listsOfFiles[listOfFilesId].size = sizeOfFiles;
        }
        return listOfFilesId;
    };
    ////////////////////////////////////////////
    WebTriadService.prototype.uploadAndSubmitListOfFiles = function (listOfFilesId, metadata, uploadAndSubmitListOfFilesProgress) {
        var self = this;
        var listOfFiles = self.listsOfFiles[listOfFilesId];
        var startFileNumberInPackage = 0;
        var finishFileNumberInPackage = 0;
        var numberOfUploadedBytes = 0;
        var currentPackage = new PackageOfFilesForUpload();
        currentPackage.id = self.getGuid();
        var progressData = new SubmissionProgressData();
        var initialSubmissionPackageResource = {
            DicomsDisabled: self.settings.dicomsDisabled,
            NonDicomsDisabled: self.settings.nonDicomsDisabled,
            Metadata: metadata
        };
        self.createSubmissionPackage(initialSubmissionPackageResource, createSubmissionPackageProgress);
        function createSubmissionPackageProgress(data) {
            if (data.processStatus === ProcessStatus.Error) {
                uploadAndSubmitListOfFilesProgress(data);
                return;
            }
            listOfFiles.submissionPackageId = data.submissionPackage.Id;
            listOfFiles.deferredCreatingSubmissionPackage.resolve().promise();
            processingNextPackage();
        }
        function processingNextPackage() {
            currentPackage.files = getNextFilesForPackage();
            if (currentPackage.files.length === 0)
                return;
            currentPackage.numberOfFiles = currentPackage.files.length;
            currentPackage.numberOfUploadedFiles = 0;
            currentPackage.urisOfUploadedFiles = [];
            uploadNextFileFromPackage();
        }
        function uploadNextFileFromPackage() {
            if (listOfFiles.isCanceled)
                return;
            var file = currentPackage.files.splice(0, 1)[0];
            self.uploadFile(file, uploadFileProgress);
        }
        function getNextFilesForPackage() {
            startFileNumberInPackage = finishFileNumberInPackage;
            finishFileNumberInPackage += self.settings.numberOfFilesInPackage;
            return listOfFiles.files.slice(startFileNumberInPackage, finishFileNumberInPackage);
        }
        function uploadFileProgress(uploadData) {
            progressData.processStep = ProcessStep.Uploading;
            switch (uploadData.processStatus) {
                case ProcessStatus.Success:
                    if (listOfFiles.isCanceled) {
                        progressData.processStep = ProcessStep.Canceling;
                        progressData.statusCode = uploadData.statusCode;
                        progressData.details = uploadData.details;
                        progressData.message = uploadData.message;
                        progressData.processStatus = ProcessStatus.Success;
                        progressData.message = "CancelSubmit";
                        progressData.progress = 0;
                        progressData.progressBytes = 0;
                        uploadAndSubmitListOfFilesProgress(progressData);
                        return;
                    }
                    numberOfUploadedBytes += uploadData.currentUploadedChunkSize;
                    progressData.statusCode = uploadData.statusCode;
                    progressData.processStatus = ProcessStatus.InProgress;
                    progressData.details = uploadData.details;
                    progressData.message = uploadData.message;
                    progressData.progress = Math.ceil(numberOfUploadedBytes / listOfFiles.size * 100);
                    progressData.progressBytes = numberOfUploadedBytes;
                    currentPackage.urisOfUploadedFiles.push(uploadData.fileUri);
                    currentPackage.numberOfUploadedFiles++;
                    if (currentPackage.numberOfUploadedFiles === currentPackage.numberOfFiles) {
                        var parameters = currentPackage.urisOfUploadedFiles;
                        listOfFiles.defferedSubmits[currentPackage.id] = $.Deferred();
                        self.addDicomFilesToExistingSubmissionPackage(listOfFiles.submissionPackageId, parameters, addDicomFilesProgress);
                        for (var _i = 0, _a = listOfFiles.files; _i < _a.length; _i++) {
                            var file = _a[_i];
                            if (parameters.indexOf(file.uri) > -1)
                                file.isAttached = true;
                        }
                        return;
                    }
                    uploadAndSubmitListOfFilesProgress(progressData);
                    uploadNextFileFromPackage();
                    break;
                case ProcessStatus.InProgress:
                    numberOfUploadedBytes += uploadData.currentUploadedChunkSize;
                    progressData.statusCode = uploadData.statusCode;
                    progressData.processStatus = ProcessStatus.InProgress;
                    progressData.details = uploadData.details;
                    progressData.message = uploadData.message;
                    progressData.progress = Math.ceil(numberOfUploadedBytes / listOfFiles.size * 100);
                    progressData.progressBytes = numberOfUploadedBytes;
                    uploadAndSubmitListOfFilesProgress(progressData);
                    break;
                case ProcessStatus.Error:
                    progressData.statusCode = uploadData.statusCode;
                    progressData.statusText = uploadData.statusText;
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.details = uploadData.details;
                    progressData.message = uploadData.message;
                    uploadAndSubmitListOfFilesProgress(progressData);
                    break;
            }
        }
        function addDicomFilesProgress(data) {
            listOfFiles.defferedSubmits[currentPackage.id].resolve().promise();
            progressData.processStep = ProcessStep.Uploading;
            progressData.statusCode = data.statusCode;
            switch (data.processStatus) {
                case ProcessStatus.Success:
                    if (finishFileNumberInPackage < listOfFiles.files.length) {
                        progressData.processStatus = ProcessStatus.InProgress;
                        progressData.message = "InProgress";
                        uploadAndSubmitListOfFilesProgress(progressData);
                        processingNextPackage();
                        return;
                    }
                    progressData.processStatus = ProcessStatus.Success;
                    progressData.message = "Success";
                    uploadAndSubmitListOfFilesProgress(progressData);
                    self.submitSubmissionPackage(listOfFiles.submissionPackageId, uploadAndSubmitListOfFilesProgress);
                    break;
                case ProcessStatus.Error:
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "Error";
                    uploadAndSubmitListOfFilesProgress(progressData);
                    break;
                default:
            }
        }
    };
    ////////////////////////////
    WebTriadService.prototype.createSubmissionPackage = function (parameters, submitFilesProgress) {
        var self = this;
        var progressData = new SubmissionProgressData();
        progressData.processStep = ProcessStep.Uploading;
        $.ajax({
            url: this.submissionFileInfoApiUrl,
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(parameters),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr) {
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.processStatus = ProcessStatus.Error;
                progressData.message = "Error createSubmissionPackage";
                progressData.details = jqXhr.responseText;
                submitFilesProgress(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.statusCode = jqXhr.status;
                progressData.processStatus = ProcessStatus.Success;
                progressData.message = "Success createSubmissionPackage";
                progressData.submissionPackage = result;
                submitFilesProgress(progressData);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.addDicomFilesToExistingSubmissionPackage = function (uri, parameters, addDicomFilesProgress) {
        var self = this;
        var progressData = new SubmissionProgressData();
        progressData.processStep = ProcessStep.Uploading;
        var filesUris = [];
        for (var _i = 0, parameters_1 = parameters; _i < parameters_1.length; _i++) {
            var uri_1 = parameters_1[_i];
            filesUris.push({ Id: uri_1 });
        }
        $.ajax({
            url: this.submissionFileInfoApiUrl + "/" + uri + "/files",
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(filesUris),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.message = "Error additionalSubmit";
                progressData.details = jqXhr.responseText;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                addDicomFilesProgress(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.statusCode = jqXhr.status;
                progressData.processStatus = ProcessStatus.Success;
                progressData.message = "Success additionalSubmit";
                addDicomFilesProgress(progressData);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.submitSubmissionPackage = function (uri, submissionProgress) {
        var self = this;
        var progressData = new SubmissionProgressData();
        progressData.processStep = ProcessStep.Processing;
        $.ajax({
            url: this.submissionFileInfoApiUrl + "/" + uri + "/submit",
            type: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.message = "Error submitSubmissionPackage";
                progressData.details = jqXhr.responseText;
                progressData.statusText = jqXhr.statusText;
                progressData.statusCode = jqXhr.status;
                submissionProgress(progressData);
            },
            success: function (result, text, jqXhr) {
                progressData.processStatus = ProcessStatus.InProgress;
                progressData.statusCode = jqXhr.status;
                submissionProgress(progressData);
            }
        });
    };
    //////////////////////////////
    WebTriadService.prototype.cancelUploadAndSubmitListOfFiles = function (listOfFilesId, cancelSubmitProgress) {
        var _this = this;
        var self = this;
        var listOfFiles = self.listsOfFiles[listOfFilesId];
        listOfFiles.isCanceled = true;
        var progressData = new SubmissionProgressData();
        progressData.processStep = ProcessStep.Canceling;
        $.when(listOfFiles.deferredCreatingSubmissionPackage).done(function () {
            var defs = [];
            for (var def in listOfFiles.defferedSubmits) {
                if (listOfFiles.defferedSubmits.hasOwnProperty(def)) {
                    defs.push(listOfFiles.defferedSubmits[def]);
                }
            }
            $.when.apply($, defs).done(function () {
                $.ajax({
                    url: _this.submissionFileInfoApiUrl + "/" + listOfFiles.submissionPackageId,
                    type: "DELETE",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", self.securityToken);
                    },
                    error: function (jqXhr, textStatus, errorThrown) {
                        progressData.processStatus = ProcessStatus.Error;
                        progressData.statusCode = jqXhr.status;
                        progressData.statusText = jqXhr.statusText;
                        progressData.message = "Error cancelUploadAndSubmitListOfFiles";
                        progressData.details = jqXhr.responseText;
                        cancelSubmitProgress(progressData);
                    },
                    success: function (result, textStatus, jqXhr) {
                        progressData.processStatus = ProcessStatus.Success;
                        progressData.statusCode = jqXhr.status;
                        progressData.message = "Success cancelUploadAndSubmitListOfFiles";
                        cancelSubmitProgress(progressData);
                    }
                });
                for (var i = 0; i < listOfFiles.files.length; i++) {
                    if (!listOfFiles.files[i].isAttached && listOfFiles.files[i].status !== FileStatus.Ready) {
                        listOfFiles.files[i].status = FileStatus.Canceling;
                        listOfFiles.files[i].cancelUploadFileProgress = cancelSubmitProgress;
                        if (listOfFiles.files[i] !== undefined)
                            _this.deleteFileFromStage(listOfFiles.files[i]);
                    }
                }
            });
        });
    };
    /////////////////////////////////////////
    WebTriadService.prototype.getPackagesDetails = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.GettingPackages;
        $.ajax({
            url: this.submissionFileInfoApiUrl + "/uploaded?" + $.param(parameters),
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error getPackagesDetails()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (data, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                progressData.data = data;
                callback(progressData);
            }
        });
    };
    /////////////////////////////////////////
    WebTriadService.prototype.getStudiesDetails = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.GettingStudies;
        $.ajax({
            url: this.submittedStudiesDetailsUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error getStudiesDetails()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (data, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                progressData.data = data;
                callback(progressData);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.deleteStudy = function (deleteUrl, callback) {
        var self = this;
        var url = self.settings.serverApiUrl;
        if (deleteUrl.indexOf("/api/") > -1) {
            url = self.settings.serverApiUrl.replace("/api", "");
        }
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.DeletingStudies;
        $.ajax({
            url: url + deleteUrl,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error deleteStudy()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                callback(progressData);
            }
        });
    };
    ///////////////////////////
    WebTriadService.prototype.deleteSeries = function (deleteUrl, callback) {
        var self = this;
        var url = self.settings.serverApiUrl;
        if (deleteUrl.indexOf("/api/") > -1) {
            url = self.settings.serverApiUrl.replace("/api", "");
        }
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.DeletingSeries;
        $.ajax({
            url: url + deleteUrl,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error deleteSeries()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                callback(progressData);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.deleteNonDicom = function (deleteUrl, callback) {
        var self = this;
        var url = self.settings.serverApiUrl;
        if (deleteUrl.indexOf("/api/") > -1) {
            url = self.settings.serverApiUrl.replace("/api", "");
        }
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.DeletingNonDicomFiles;
        $.ajax({
            url: url + deleteUrl,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error deleteNonDicom()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                callback(progressData);
            }
        });
    };
    ///////////////////////////
    WebTriadService.prototype.deleteNonDicoms = function (ids, callback) {
        var self = this;
        var arr = splitArray(ids, 300);
        var _loop_1 = function (batch) {
            var idsStr = batch.join();
            var progressData = new ReviewProgressData();
            progressData.processStep = ReviewProcessStep.DeletingNonDicomFiles;
            $.ajax({
                url: self.nonDicomsUrl + "?ids=" + idsStr,
                type: "DELETE",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                },
                error: function (jqXhr, textStatus, errorThrown) {
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.statusCode = jqXhr.status;
                    progressData.statusText = jqXhr.statusText;
                    progressData.message = "Error deleteNonDicoms()";
                    progressData.details = jqXhr.responseText;
                    callback(progressData);
                },
                success: function (result, textStatus, jqXhr) {
                    progressData.processStatus = ProcessStatus.Success;
                    callback(progressData);
                }
            });
        };
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var batch = arr_1[_i];
            _loop_1(batch);
        }
        ;
        function splitArray(arr, size) {
            var obj = [];
            var start = 0;
            var end = size;
            do {
                obj.push(arr.slice(start, end));
                start = end;
                end += size;
            } while (start < arr.length);
            return obj;
        }
        ;
    };
    ////////////////////////////
    WebTriadService.prototype.hidePackage = function (hideUrl, callback) {
        var self = this;
        var url = self.settings.serverApiUrl;
        if (hideUrl.indexOf("/api/") > -1) {
            url = self.settings.serverApiUrl.replace("/api", "");
        }
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.HidingPackages;
        $.ajax({
            url: url + hideUrl,
            type: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error hidePackage()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                callback(progressData);
            }
        });
    };
    ///////////////////////////
    WebTriadService.prototype.setSecurityToken = function (token) {
        this.securityToken = token;
    };
    /////////////////////////////////////////
    WebTriadService.prototype.getNonDicomsDetails = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        var progressData = new ReviewProgressData();
        progressData.processStep = ReviewProcessStep.GettingNonDicomFiles;
        $.ajax({
            url: this.nonDicomsUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.statusCode = jqXhr.status;
                progressData.statusText = jqXhr.statusText;
                progressData.message = "Error getNonDicomsDetails()";
                progressData.details = jqXhr.responseText;
                callback(progressData);
            },
            success: function (data, textStatus, jqXhr) {
                progressData.processStatus = ProcessStatus.Success;
                progressData.data = data;
                callback(progressData);
            }
        });
    };
    ////////////////////////////openViewer() is not used
    WebTriadService.prototype.openViewer = function (parameters, callback) {
        var self = this;
        var data = {};
        $.ajax({
            url: this.dicomViewerUrl,
            type: "PUT",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(parameters),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, textStatus, jqXhr) {
                var url = jqXhr.getResponseHeader("Location");
                var newwindow = window.open(url, 'temp window to test Claron integration', 'left=(screen.width/2)-400,top=(screen.height/2) - 180,width=800,height=360,toolbar=1,location =1,resizable=1,fullscreen=0');
                newwindow.focus();
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ////////////////////////////downloadFile() is not used
    WebTriadService.prototype.downloadFile = function (id, callback) {
        var self = this;
        var data = {};
        $.ajax({
            url: this.submittedFilesDetailsUrl + "/" + id + "/downloadUrl",
            type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, text, jqXhr) {
                var uri = jqXhr.getResponseHeader("Location");
                window.location.href = self.submittedFilesDetailsUrl + "/" + uri;
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ///////////////////////////////////////////////////////////////////////////////////
    WebTriadService.prototype.deleteFileFromStage = function (file) {
        var _this = this;
        var self = this;
        var callback = file.cancelUploadFileProgress;
        var data = {};
        var defs = [];
        for (var def in file.defferedUploadChunks) {
            if (file.defferedUploadChunks.hasOwnProperty(def)) {
                defs.push(file.defferedUploadChunks[def]);
            }
        }
        $.when.apply($, defs).done(function () {
            $.ajax({
                url: _this.fileApiUrl + "/" + file.uri,
                type: "DELETE",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                },
                error: function (jqXhr, textStatus, errorThrown) {
                    data.status = ProcessStatus.Error;
                    data.message = "ERROR CANCEL UPLOAD FILE";
                    data.details = jqXhr.responseText;
                    data.statusCode = jqXhr.status;
                    data.statusText = jqXhr.statusText;
                    callback(data);
                },
                success: function (result, textStatus, jqXhr) {
                    data.statusCode = jqXhr.status;
                    data.status = ProcessStatus.Success;
                    data.progress = 0;
                    data.progressBytes = 0;
                    data.message = "CANCEL UPLOAD FILE";
                    callback(data);
                }
            });
        });
    };
    ////////////////////////////
    WebTriadService.prototype.uploadFile = function (file, uploadFileProgress) {
        var self = this;
        var progressData = new FileProgressData();
        file.defferedUploadChunks = {};
        self.setFileStatus(file, FileStatus.Uploading);
        var numberOfChunks;
        if (file.size === 0)
            numberOfChunks = 1;
        else
            numberOfChunks = Math.ceil(file.size / this.settings.sizeChunk);
        var start = this.settings.sizeChunk;
        var end = start + this.settings.sizeChunk;
        var numberOfSuccessfulUploadedChunks = 0;
        createFileResource(createFileResourceProgress);
        function createFileResource(callback) {
            var chunk = file.slice(0, self.settings.sizeChunk);
            file.defferedUploadChunks[1] = $.Deferred();
            var fileProgressData = new FileProgressData();
            $.ajax({
                url: self.fileApiUrl + queryFileMetadataTest,
                type: "POST",
                contentType: "application/octet-stream",
                processData: false,
                data: chunk,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                    xhr.setRequestHeader("Content-Range", "bytes " + 0 + "-" + (chunk.size - 1) + "/" + file.size);
                    xhr.setRequestHeader("Content-Disposition", 'attachment; filename="' + file.name + '"');
                },
                error: function (jqXhr) {
                    file.defferedUploadChunks[1].resolve().promise();
                    fileProgressData.statusCode = jqXhr.status;
                    fileProgressData.statusText = jqXhr.statusText;
                    fileProgressData.processStatus = ProcessStatus.Error;
                    fileProgressData.message = "File is not uploaded";
                    fileProgressData.details = jqXhr.responseText;
                    uploadFileProgress(fileProgressData);
                },
                success: function (result, textStatus, jqXhr) {
                    file.defferedUploadChunks[1].resolve().promise();
                    fileProgressData.statusCode = jqXhr.status;
                    fileProgressData.processStatus = ProcessStatus.Success;
                    fileProgressData.message = "File is created";
                    fileProgressData.details = jqXhr.responseText;
                    fileProgressData.currentUploadedChunkSize = chunk.size;
                    fileProgressData.fileUri = result.PublicId;
                    callback(fileProgressData);
                }
            });
        }
        ;
        function createFileResourceProgress(data) {
            numberOfSuccessfulUploadedChunks++;
            file.uri = data.fileUri;
            progressData.fileUri = file.uri;
            progressData.statusCode = data.statusCode;
            progressData.details = data.details;
            progressData.currentUploadedChunkSize = data.currentUploadedChunkSize;
            if (self.listsOfFiles[file.listOfFilesId].isCanceled)
                return;
            if (numberOfChunks === 1) {
                self.setFileStatus(file, FileStatus.Uploaded);
                progressData.processStatus = ProcessStatus.Success;
                progressData.message = "File is uploaded";
                uploadFileProgress(progressData);
                return;
            }
            self.setFileStatus(file, FileStatus.Uploading);
            progressData.processStatus = ProcessStatus.InProgress;
            progressData.message = "File is uploading";
            uploadFileProgress(progressData);
            for (var i = 2; i <= self.settings.numberOfConnection + 1; i++) {
                if (start >= file.size)
                    return;
                file.defferedUploadChunks[i] = $.Deferred();
                sendChunk(start, end, i);
                start = i * self.settings.sizeChunk;
                end = start + self.settings.sizeChunk;
            }
        }
        ;
        function sendChunk(start, end, chunkNumber) {
            if (self.listsOfFiles[file.listOfFilesId].isCanceled)
                return;
            var chunk = file.slice(start, end);
            $.ajax({
                url: self.fileApiUrl + "/" + file.uri,
                data: chunk,
                contentType: "application/octet-stream",
                processData: false,
                type: "PUT",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                    xhr.setRequestHeader("Content-Range", "bytes " + start + "-" + (start + chunk.size - 1) + "/" + file.size);
                    xhr.setRequestHeader("Content-Disposition", 'attachment; filename="' + file.name + '"');
                },
                error: function (jqXhr) {
                    file.defferedUploadChunks[chunkNumber].resolve().promise();
                    self.setFileStatus(file, FileStatus.UploadError);
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "File is not uploaded";
                    progressData.details = jqXhr.responseText;
                    progressData.statusCode = jqXhr.status;
                    progressData.statusText = jqXhr.statusText;
                    uploadFileProgress(progressData);
                },
                success: function (result, textStatus, jqXhr) {
                    file.defferedUploadChunks[chunkNumber].resolve().promise();
                    progressData.currentUploadedChunkSize = chunk.size;
                    uploadHandler(jqXhr, chunkNumber);
                }
            });
        }
        ;
        function uploadHandler(jqXhr, chunkNumber) {
            if (self.listsOfFiles[file.listOfFilesId].isCanceled)
                return;
            numberOfSuccessfulUploadedChunks++;
            if (numberOfSuccessfulUploadedChunks === numberOfChunks) {
                self.setFileStatus(file, FileStatus.Uploaded);
                progressData.message = "File is uploaded";
                progressData.processStatus = ProcessStatus.Success;
                uploadFileProgress(progressData);
                return;
            }
            progressData.processStatus = ProcessStatus.InProgress;
            progressData.message = "File is uploading";
            uploadFileProgress(progressData);
            chunkNumber += self.settings.numberOfConnection;
            if (chunkNumber > numberOfChunks)
                return;
            start = (chunkNumber - 1) * self.settings.sizeChunk;
            end = start + self.settings.sizeChunk;
            file.defferedUploadChunks[chunkNumber] = $.Deferred();
            sendChunk(start, end, chunkNumber);
        }
    };
    ////////////////////////////
    WebTriadService.prototype.getGuid = function () {
        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        return (s4() + s4() + "-" + s4() + "-4" + s4().substr(0, 3) +
            "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
    };
    ////////////////////////////
    WebTriadService.prototype.setFileStatus = function (file, status) {
        file.status = status;
        switch (status) {
            case FileStatus.Ready:
                file.isAttached = false;
                break;
            case FileStatus.Uploading:
                break;
            case FileStatus.Uploaded:
                break;
            case FileStatus.UploadError:
                break;
            case FileStatus.Canceling:
                break;
            case FileStatus.Canceled:
                break;
            case FileStatus.CancelError:
                break;
            default:
                break;
        }
    };
    WebTriadService.prototype.arrayOfNameValueToDictionary = function (data) {
        var result = {};
        for (var i = 0; i < data.length; i++) {
            result[data[i].Name] = data[i].Value;
        }
        return result;
    };
    return WebTriadService;
}());
////////////////////////////////////////////////////////////////////////////////////
var SubmissionProgressData = /** @class */ (function () {
    function SubmissionProgressData() {
    }
    return SubmissionProgressData;
}());
var FileProgressData = /** @class */ (function () {
    function FileProgressData() {
    }
    return FileProgressData;
}());
var ReviewProgressData = /** @class */ (function () {
    function ReviewProgressData() {
    }
    return ReviewProgressData;
}());
var ListOfFilesForUpload = /** @class */ (function () {
    function ListOfFilesForUpload() {
    }
    return ListOfFilesForUpload;
}());
var PackageOfFilesForUpload = /** @class */ (function () {
    function PackageOfFilesForUpload() {
    }
    return PackageOfFilesForUpload;
}());
var InitialSubmissionPackageResource = /** @class */ (function () {
    function InitialSubmissionPackageResource() {
    }
    return InitialSubmissionPackageResource;
}());
var SubmissionPackage = /** @class */ (function () {
    function SubmissionPackage() {
    }
    return SubmissionPackage;
}());
var SubmissionPackageStatus;
(function (SubmissionPackageStatus) {
    SubmissionPackageStatus[SubmissionPackageStatus["Pending"] = 0] = "Pending";
    SubmissionPackageStatus[SubmissionPackageStatus["Submitting"] = 1] = "Submitting";
    SubmissionPackageStatus[SubmissionPackageStatus["Complete"] = 2] = "Complete";
    SubmissionPackageStatus[SubmissionPackageStatus["Failed"] = 3] = "Failed";
    SubmissionPackageStatus[SubmissionPackageStatus["LongWaitFailed"] = 4] = "LongWaitFailed";
})(SubmissionPackageStatus || (SubmissionPackageStatus = {}));
var ItemData = /** @class */ (function () {
    function ItemData() {
    }
    return ItemData;
}());
var FileStatus;
(function (FileStatus) {
    FileStatus[FileStatus["Ready"] = 0] = "Ready";
    FileStatus[FileStatus["Uploading"] = 1] = "Uploading";
    FileStatus[FileStatus["Uploaded"] = 2] = "Uploaded";
    FileStatus[FileStatus["UploadError"] = 3] = "UploadError";
    FileStatus[FileStatus["Canceling"] = 4] = "Canceling";
    FileStatus[FileStatus["Canceled"] = 5] = "Canceled";
    FileStatus[FileStatus["CancelError"] = 6] = "CancelError";
})(FileStatus || (FileStatus = {}));
var ProcessStatus;
(function (ProcessStatus) {
    ProcessStatus[ProcessStatus["InProgress"] = 0] = "InProgress";
    ProcessStatus[ProcessStatus["Success"] = 1] = "Success";
    ProcessStatus[ProcessStatus["Error"] = 2] = "Error";
})(ProcessStatus || (ProcessStatus = {}));
var ProcessStep;
(function (ProcessStep) {
    ProcessStep[ProcessStep["Uploading"] = 0] = "Uploading";
    ProcessStep[ProcessStep["Processing"] = 1] = "Processing";
    ProcessStep[ProcessStep["Canceling"] = 2] = "Canceling";
})(ProcessStep || (ProcessStep = {}));
var ReviewProcessStep;
(function (ReviewProcessStep) {
    ReviewProcessStep[ReviewProcessStep["GettingStudies"] = 0] = "GettingStudies";
    ReviewProcessStep[ReviewProcessStep["GettingPackages"] = 1] = "GettingPackages";
    ReviewProcessStep[ReviewProcessStep["GettingNonDicomFiles"] = 2] = "GettingNonDicomFiles";
    ReviewProcessStep[ReviewProcessStep["DeletingStudies"] = 3] = "DeletingStudies";
    ReviewProcessStep[ReviewProcessStep["DeletingSeries"] = 4] = "DeletingSeries";
    ReviewProcessStep[ReviewProcessStep["DeletingNonDicomFiles"] = 5] = "DeletingNonDicomFiles";
    ReviewProcessStep[ReviewProcessStep["HidingPackages"] = 6] = "HidingPackages";
})(ReviewProcessStep || (ReviewProcessStep = {}));
var SubmissionTransactionStatus;
(function (SubmissionTransactionStatus) {
    SubmissionTransactionStatus[SubmissionTransactionStatus["NotStarted"] = 0] = "NotStarted";
    SubmissionTransactionStatus[SubmissionTransactionStatus["InProgress"] = 1] = "InProgress";
    SubmissionTransactionStatus[SubmissionTransactionStatus["InvaliidArgumentForUpload"] = 2] = "InvaliidArgumentForUpload";
    SubmissionTransactionStatus[SubmissionTransactionStatus["FolderNotAccessibleDuringUpload"] = 3] = "FolderNotAccessibleDuringUpload";
    SubmissionTransactionStatus[SubmissionTransactionStatus["FileSaveErrorDuringUpload"] = 4] = "FileSaveErrorDuringUpload";
    SubmissionTransactionStatus[SubmissionTransactionStatus["IncompleteAfterLongTimeSinceUpload"] = 5] = "IncompleteAfterLongTimeSinceUpload";
    SubmissionTransactionStatus[SubmissionTransactionStatus["DicomParseErrorDuringProcessing"] = 6] = "DicomParseErrorDuringProcessing";
    SubmissionTransactionStatus[SubmissionTransactionStatus["DatabaseErrorDuringProcessing"] = 7] = "DatabaseErrorDuringProcessing";
    SubmissionTransactionStatus[SubmissionTransactionStatus["MsmqInsertErrorDuringProcessing"] = 8] = "MsmqInsertErrorDuringProcessing";
    SubmissionTransactionStatus[SubmissionTransactionStatus["MsmqRetrieveErrorDuringProcessing"] = 9] = "MsmqRetrieveErrorDuringProcessing";
    SubmissionTransactionStatus[SubmissionTransactionStatus["UserCancelledSubmission"] = 10] = "UserCancelledSubmission";
    SubmissionTransactionStatus[SubmissionTransactionStatus["None"] = 11] = "None";
    SubmissionTransactionStatus[SubmissionTransactionStatus["Success"] = 12] = "Success";
})(SubmissionTransactionStatus || (SubmissionTransactionStatus = {}));
//# sourceMappingURL=webTriadService.js.map