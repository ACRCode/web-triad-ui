var WebTriadService = (function () {
    //////////////////////////////////////////////////////////////////////////
    function WebTriadService(serviceSettings) {
        this.self = this;
        this.fileApiUrl = "/files";
        this.dicomViewerUrl = "/dicomViewerUrl";
        this.anonymizationProfileUrl = "/anonymizationProfile";
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
        this.anonymizationProfileUrl = serverApiUrl + this.anonymizationProfileUrl;
        this.listsOfFiles = {};
    }
    ////////////////////////////////////////////
    WebTriadService.prototype.submitFiles = function (files, metadata, uploadAndSubmitListOfFilesProgress) {
        var id = this.addListOfFilesForUpload(files);
        var progressData = new SubmissionProgressData();
        progressData.listOfFilesId = id;
        uploadAndSubmitListOfFilesProgress(progressData);
        this.uploadAndSubmitListOfFiles(id, metadata, uploadAndSubmitListOfFilesProgress);
        return id;
    };
    ////////////////////////////////////////////
    WebTriadService.prototype.addListOfFilesForUpload = function (files) {
        var listOfFilesId = this.getGuid();
        this.listsOfFiles[listOfFilesId] = {
            submissionPackage: null,
            files: [],
            size: 0,
            isCanceled: false,
            submits: []
        };
        if (files.length > 0) {
            var sizeOfFiles = 0;
            for (var i = 0; i < files.length; i++) {
                files[i].number = i;
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
        var submissionPackage = new SubmissionPackage();
        var currentPackage = new PackageOfFilesForUpload();
        var progressData = new SubmissionProgressData();
        progressData.listOfFilesId = listOfFilesId;
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
            listOfFiles.submissionPackage = data.submissionPackage;
            submissionPackage = data.submissionPackage;
            processingNextPackage();
        }
        function processingNextPackage() {
            currentPackage.files = getNextFilesForPackage();
            if (currentPackage.files.length === 0)
                return;
            currentPackage.numberOfFiles = currentPackage.files.length;
            currentPackage.numberOfUploadedFiles = 0;
            currentPackage.packageSize = self.getSizeOfListFiles(currentPackage.files);
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
                        progressData.processStatus = ProcessStatus.Success;
                        progressData.message = "CancelSubmit";
                        progressData.progress = 0;
                        progressData.progressBytes = 0;
                        uploadAndSubmitListOfFilesProgress(progressData);
                        return;
                    }
                    numberOfUploadedBytes += uploadData.currentUploadedChunkSize;
                    progressData.processStatus = ProcessStatus.InProgress;
                    progressData.message = "InProgress";
                    progressData.progress = Math.ceil(numberOfUploadedBytes / listOfFiles.size * 100);
                    progressData.progressBytes = numberOfUploadedBytes;
                    currentPackage.urisOfUploadedFiles.push(uploadData.fileUri);
                    currentPackage.numberOfUploadedFiles++;
                    if (currentPackage.numberOfUploadedFiles === currentPackage.numberOfFiles) {
                        var parameters = currentPackage.urisOfUploadedFiles;
                        listOfFiles.submits.push($.Deferred());
                        self.addDicomFilesToExistingSubmissionPackage(submissionPackage.Id, parameters, addDicomFilesProgress);
                        return;
                    }
                    uploadAndSubmitListOfFilesProgress(progressData);
                    uploadNextFileFromPackage();
                    break;
                case ProcessStatus.InProgress:
                    numberOfUploadedBytes += uploadData.currentUploadedChunkSize;
                    progressData.processStatus = ProcessStatus.InProgress;
                    progressData.message = "InProgress";
                    progressData.progress = Math.ceil(numberOfUploadedBytes / listOfFiles.size * 100);
                    progressData.progressBytes = numberOfUploadedBytes;
                    uploadAndSubmitListOfFilesProgress(progressData);
                    break;
                case ProcessStatus.Error:
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "Error";
                    uploadAndSubmitListOfFilesProgress(progressData);
                    break;
                default:
            }
        }
        function addDicomFilesProgress(data) {
            var def = listOfFiles.submits.pop().resolve().promise();
            listOfFiles.submits.push(def);
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
                    self.submitSubmissionPackage(submissionPackage.Id, uploadAndSubmitListOfFilesProgress);
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
        $.ajax({
            url: this.submissionFileInfoApiUrl,
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(parameters),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr) {
                progressData.processStatus = ProcessStatus.Error;
                progressData.message = "Error Submit Create SubmitPackage";
                progressData.details = jqXhr.responseText;
                progressData.statusCode = jqXhr.status;
                submitFilesProgress(progressData);
            },
            success: function (result, textStatus, jqXhr) {
                progressData.statusCode = jqXhr.status;
                progressData.processStatus = ProcessStatus.Success;
                progressData.message = "Success Create SubmitPackage";
                progressData.submissionPackage = result;
                submitFilesProgress(progressData);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.addDicomFilesToExistingSubmissionPackage = function (uri, parameters, addDicomFilesProgress) {
        var self = this;
        var progressData = new SubmissionProgressData();
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
                progressData.message = jqXhr.responseText;
                submissionProgress(progressData);
            },
            success: function (result, text, jqXhr) {
                progressData.processStatus = ProcessStatus.InProgress;
                submissionProgress(progressData);
                self.waitForProcessingStudiesByServer(uri, submissionProgress);
            }
        });
    };
    //////////////////////////////Waiting for processing the studies by the server
    WebTriadService.prototype.waitForProcessingStudiesByServer = function (uri, submissionProgress) {
        var self = this;
        var rejectedAndCorruptedData;
        getSubmissionPackage(uri, callback);
        function getSubmissionPackage(uri, getSubmissionPackageProgress) {
            var progressData = new SubmissionProgressData();
            progressData.processStep = ProcessStep.Processing;
            $.ajax({
                url: self.submissionFileInfoApiUrl + "/" + uri,
                type: "GET",
                dataType: "json",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                },
                error: function (jqXhr, textStatus, errorThrown) {
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = jqXhr.responseText;
                    getSubmissionPackageProgress(progressData);
                },
                success: function (result, text, jqXhr) {
                    progressData.processStatus = ProcessStatus.Success;
                    progressData.additionalData = result;
                    getSubmissionPackageProgress(progressData);
                }
            });
        }
        function callback(progressData) {
            switch (progressData.processStatus) {
                case ProcessStatus.Error:
                    submissionProgress(progressData);
                    break;
                case ProcessStatus.Success:
                    if (studiesAreProcessed(progressData.additionalData)) {
                        rejectedAndCorruptedData = prepareRejectedAndCorruptedData(progressData.additionalData);
                        progressData.rejectedAndCorruptedData = rejectedAndCorruptedData;
                        submissionProgress(progressData);
                    }
                    else {
                        setTimeout(getSubmissionPackage(uri, callback), 3000);
                    }
                    break;
            }
        }
        ;
        function studiesAreProcessed(data) {
            if (data.Status !== "Complete")
                return false;
            for (var i = 0; i < data.Submissions; i++) {
                if (data.Submissions[i].Status === "None" ||
                    data.Submissions[i].Status === "InProgress" ||
                    data.Submissions[i].Status === "NotStarted") {
                    return false;
                }
            }
            return true;
        }
        ;
        function prepareRejectedAndCorruptedData(data) {
            return {
                NumberOfCorruptedDicoms: data.DicomSummary.CorruptedCount,
                NumberOfRejectedNonDicoms: data.NonDicomsSummary.RejectedCount,
                NumberOfRejectedDicomDir: data.DicomDirSummary.RejectedCount,
                CorruptedDicoms: data.DicomSummary.Corrupted,
                RejectedNonDicoms: data.NonDicomsSummary.Rejected
            };
        }
        ;
    };
    //////////////////////////////
    //////////////////////////////
    WebTriadService.prototype.cancelUploadAndSubmitListOfFiles = function (listOfFilesId, cancelSubmitProgress) {
        var _this = this;
        var self = this;
        var listOfFiles = self.listsOfFiles[listOfFilesId];
        var progressData = new SubmissionProgressData();
        progressData.listOfFilesId = listOfFilesId;
        listOfFiles.isCanceled = true;
        $.when.apply($, listOfFiles.submits).done(function () {
            for (var i = 0; i < listOfFiles.files.length; i++) {
                if (listOfFiles.files[i].status === FileStatus.Uploaded) {
                    listOfFiles.files[i].status = FileStatus.Canceling;
                    listOfFiles.files[i].cancelUploadFileProgress = cancelSubmitProgress;
                    _this.deleteFileFromStage(listOfFiles.files[i]);
                }
            }
            //check!!
            //$.when(listOfFiles.receiptTransactionUid).done(() => {
            $.ajax({
                url: _this.submissionFileInfoApiUrl + "/" + listOfFiles.submissionPackage.Id,
                type: "DELETE",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                },
                error: function (jqXhr, textStatus, errorThrown) {
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "Error cancelSubmit";
                    progressData.details = jqXhr.responseText;
                    progressData.statusCode = jqXhr.status;
                    cancelSubmitProgress(progressData);
                },
                success: function (result, textStatus, jqXhr) {
                    progressData.statusCode = jqXhr.status;
                    progressData.processStatus = ProcessStatus.Success;
                    progressData.message = "Success cancelSubmit";
                    cancelSubmitProgress(progressData);
                }
            });
        });
    };
    /////////////////////////////////////////
    WebTriadService.prototype.getStudiesDetails = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        $.ajax({
            url: this.submittedStudiesDetailsUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                var data = {};
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (data, textStatus, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.deleteStudy = function (studyId, callback) {
        var self = this;
        var data = {};
        $.ajax({
            url: this.submittedStudiesDetailsUrl + "/" + studyId,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, textStatus, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.getSeriesDetails = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        $.ajax({
            url: this.submittedSeriesDetailsUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                var data = {};
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (data, textStatus, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ///////////////////////////
    WebTriadService.prototype.deleteSeries = function (seriesId, callback) {
        var self = this;
        var data = {};
        $.ajax({
            url: this.submittedSeriesDetailsUrl + "/" + seriesId,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, textStatus, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ////////////////////////////
    WebTriadService.prototype.setSecurityToken = function (token) {
        this.securityToken = token;
    };
    ////////////////////////////addNonDicomFilesToExistingSubmissionPackage() is not used
    WebTriadService.prototype.addNonDicomFilesToExistingSubmissionPackage = function (parameters, submitFilesProgress) {
        var self = this;
        var isContainsTransactionUid = false;
        for (var i = 0; i < parameters.Metadata.length; i++) {
            if (parameters.Metadata[i].Name === "TransactionUID") {
                isContainsTransactionUid = true;
                break;
            }
        }
        if (!isContainsTransactionUid) {
            parameters.Metadata.push({
                Name: "TransactionUID",
                Value: this.getGuid()
            });
        }
        var data = {};
        $.ajax({
            url: this.submissionFileInfoApiUrl,
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(parameters),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr) {
                data.status = ProcessStatus.Error;
                data.message = "Error attachFiles";
                data.details = jqXhr.responseText;
                data.statusCode = jqXhr.status;
                submitFilesProgress(data);
            },
            success: function (result, textStatus, jqXhr) {
                data.statusCode = jqXhr.status;
                data.status = ProcessStatus.Success;
                data.message = "Success attachFiles";
                submitFilesProgress(data);
            }
        });
    };
    ////////////////////////////getFileListByStudyId() is not used
    WebTriadService.prototype.getFileListByStudyId = function (studyId, callback) {
        var self = this;
        var parameters = {};
        if (studyId !== undefined) {
            parameters["DicomDataStudyID"] = studyId;
        }
        parameters["ParentLevel"] = "Study";
        $.ajax({
            url: this.submittedFilesDetailsUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: 'json',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                var data = {};
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (data, textStatus, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
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
    /////////////////////////////deleteFile() is not used
    WebTriadService.prototype.deleteFile = function (id, callback) {
        var self = this;
        var data = {};
        $.ajax({
            url: this.submittedFilesDetailsUrl + "/" + id,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, text, jqXhr) {
                data.status = ProcessStatus.Success;
                callback(data);
            }
        });
    };
    ////////////////////////////getAnonymizationProfile() is not used
    WebTriadService.prototype.getAnonymizationProfile = function (parameters, callback) {
        var self = this;
        parameters = this.arrayOfNameValueToDictionary(parameters);
        $.ajax({
            url: this.anonymizationProfileUrl + "?" + $.param(parameters),
            type: "GET",
            dataType: 'json',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                var data = {};
                data.status = ProcessStatus.Error;
                data.message = jqXhr.responseText;
                callback(data);
            },
            success: function (result, textStatus, jqXhr) {
                var data = {
                    message: result,
                    status: ProcessStatus.Success
                };
                callback(data);
            }
        });
    };
    ///////////////////////////////////////////////////////////////////////////////////
    WebTriadService.prototype.deleteFileFromStage = function (file) {
        var self = this;
        var callback = file.cancelUploadFileProgress;
        var data = {};
        data.listOfFilesId = file.listOfFilesId;
        $.ajax({
            url: this.fileApiUrl + "/" + file.uri,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", self.securityToken);
            },
            error: function (jqXhr, textStatus, errorThrown) {
                data.status = ProcessStatus.Error;
                data.message = "ERROR CANCEL UPLOAD FILE";
                data.details = jqXhr.responseText;
                data.statusCode = jqXhr.status;
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
    };
    ////////////////////////////
    WebTriadService.prototype.uploadFile = function (file, uploadFileProgress) {
        var self = this;
        var progressData = new FileProgressData();
        self.setFileStatus(file, FileStatus.Uploading);
        var numberOfChunks;
        if (file.size === 0)
            numberOfChunks = 1;
        else
            numberOfChunks = Math.ceil(file.size / this.settings.sizeChunk);
        var start = this.settings.sizeChunk;
        var end = start + this.settings.sizeChunk;
        var numberOfSuccessfulUploadedChunks = 0;
        var numberOfUploadedBytes = 0;
        var pendingRequests = 0;
        var fileUri;
        createFileResource(createFileResourceProgress);
        function createFileResource(callback) {
            var chunk = file.slice(0, self.settings.sizeChunk);
            $.ajax({
                url: self.fileApiUrl,
                type: "POST",
                contentType: "application/octet-stream",
                processData: false,
                data: chunk,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                    xhr.setRequestHeader("Content-Range", "bytes " + 0 + "-" + (chunk.size - 1) + "/" + file.size);
                    xhr.setRequestHeader("Content-Disposition", 'attachment; filename=' + encodeURIComponent(file.name));
                },
                error: function (jqXhr) {
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "File is not uploaded";
                    progressData.details = jqXhr.responseText;
                    uploadFileProgress(progressData);
                },
                success: function (result, textStatus, jqXhr) {
                    progressData.currentUploadedChunkSize = chunk.size;
                    numberOfUploadedBytes += chunk.size;
                    callback(result);
                }
            });
        }
        ;
        function createFileResourceProgress(data) {
            numberOfSuccessfulUploadedChunks++;
            fileUri = data.PublicId;
            file.uri = fileUri;
            progressData.fileUri = fileUri;
            if (numberOfChunks === 1) {
                self.setFileStatus(file, FileStatus.Uploaded);
                if (self.listsOfFiles[file.listOfFilesId].isCanceled) {
                    file.cancelUploadFileProgress = uploadFileProgress;
                    self.deleteFileFromStage(file);
                }
                progressData.processStatus = ProcessStatus.Success;
                progressData.message = "File is uploaded";
                progressData.progress = 100;
                progressData.progressBytes = numberOfUploadedBytes;
                uploadFileProgress(progressData);
                return;
            }
            self.setFileStatus(file, FileStatus.Uploading);
            progressData.processStatus = ProcessStatus.InProgress;
            progressData.message = "File is uploading";
            progressData.progress = Math.ceil(numberOfUploadedBytes / file.size * 100);
            progressData.progressBytes = numberOfUploadedBytes;
            uploadFileProgress(progressData);
            for (var i = 2; i <= self.settings.numberOfConnection + 1; i++) {
                if (start >= file.size)
                    return;
                sendChunk(start, end, i);
                start = i * self.settings.sizeChunk;
                end = start + self.settings.sizeChunk;
            }
        }
        ;
        function sendChunk(start, end, chunkNumber) {
            if (!addRequest()) {
                return;
            }
            pendingRequests++;
            var chunk = file.slice(start, end);
            $.ajax({
                url: self.fileApiUrl + "/" + fileUri,
                data: chunk,
                contentType: "application/octet-stream",
                processData: false,
                type: "PUT",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", self.securityToken);
                    xhr.setRequestHeader("Content-Range", "bytes " + start + "-" + (start + chunk.size - 1) + "/" + file.size);
                    xhr.setRequestHeader("Content-Disposition", 'attachment; filename=' + encodeURIComponent(file.name));
                },
                error: function (jqXhr) {
                    pendingRequests--;
                    self.setFileStatus(file, FileStatus.UploadError);
                    progressData.processStatus = ProcessStatus.Error;
                    progressData.message = "File is not uploaded";
                    progressData.details = jqXhr.responseText;
                    uploadFileProgress(progressData);
                },
                success: function (result, textStatus, jqXhr) {
                    pendingRequests--;
                    progressData.currentUploadedChunkSize = chunk.size;
                    numberOfUploadedBytes += chunk.size;
                    uploadHandler(jqXhr, chunkNumber);
                }
            });
        }
        ;
        function uploadHandler(jqXhr, chunkNumber) {
            numberOfSuccessfulUploadedChunks++;
            if (numberOfSuccessfulUploadedChunks === numberOfChunks) {
                self.setFileStatus(file, FileStatus.Uploaded);
                if (self.listsOfFiles[file.listOfFilesId].isCanceled) {
                    file.cancelUploadFileProgress = uploadFileProgress;
                    self.deleteFileFromStage(file);
                }
                progressData.message = "File is uploaded";
                progressData.processStatus = ProcessStatus.Success;
                progressData.progress = 100;
                progressData.progressBytes = numberOfUploadedBytes;
                uploadFileProgress(progressData);
                return;
            }
            progressData.processStatus = ProcessStatus.InProgress;
            progressData.message = "File is uploading";
            if (file.size === 0)
                progressData.progress = 100;
            else
                progressData.progress = Math.ceil(numberOfUploadedBytes / file.size * 100);
            progressData.progressBytes = numberOfUploadedBytes;
            uploadFileProgress(progressData);
            chunkNumber += self.settings.numberOfConnection;
            if (chunkNumber > numberOfChunks)
                return;
            start = (chunkNumber - 1) * self.settings.sizeChunk;
            end = start + self.settings.sizeChunk;
            sendChunk(start, end, chunkNumber);
        }
        function addRequest() {
            if (!self.listsOfFiles[file.listOfFilesId].isCanceled)
                return true;
            if (pendingRequests === 0) {
                file.cancelUploadFileProgress = uploadFileProgress;
                console.log("addRequest delete");
                self.deleteFileFromStage(file);
            }
            return false;
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
    ////////////////////////////
    WebTriadService.prototype.getSizeOfListFiles = function (list) {
        var size = 0;
        for (var i = 0; i < list.length; i++) {
            size += list[i].size;
        }
        return size;
    };
    ////////////////////////////isDicom() is not used
    WebTriadService.prototype.isDicom = function (file) {
        var deferred = $.Deferred();
        var chunk = file.slice(128, 132);
        var reader = new FileReader();
        reader.onload = function () {
            var blob = reader.result;
            var byteArray = new Uint8Array(blob);
            var result = "";
            var byte;
            for (var i = 0; i < 4; i++) {
                byte = byteArray[i];
                if (byte === 0) {
                    break;
                }
                result += String.fromCharCode(byte);
            }
            if (result !== "DICM") {
                deferred.resolve(false);
            }
            else {
                deferred.resolve(true);
            }
        };
        reader.readAsArrayBuffer(chunk);
        return deferred.promise();
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
var SubmissionProgressData = (function () {
    function SubmissionProgressData() {
    }
    return SubmissionProgressData;
}());
var FileProgressData = (function () {
    function FileProgressData() {
    }
    return FileProgressData;
}());
var ListOfFilesForUpload = (function () {
    function ListOfFilesForUpload() {
    }
    return ListOfFilesForUpload;
}());
var PackageOfFilesForUpload = (function () {
    function PackageOfFilesForUpload() {
    }
    return PackageOfFilesForUpload;
}());
var InitialSubmissionPackageResource = (function () {
    function InitialSubmissionPackageResource() {
    }
    return InitialSubmissionPackageResource;
}());
var SubmissionPackage = (function () {
    function SubmissionPackage() {
    }
    return SubmissionPackage;
}());
var SubmissionPackageStatus;
(function (SubmissionPackageStatus) {
    SubmissionPackageStatus[SubmissionPackageStatus["Pending"] = 0] = "Pending";
    SubmissionPackageStatus[SubmissionPackageStatus["Submitting"] = 1] = "Submitting";
    SubmissionPackageStatus[SubmissionPackageStatus["Complete"] = 2] = "Complete";
})(SubmissionPackageStatus || (SubmissionPackageStatus = {}));
var ItemData = (function () {
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