(function ($, window, document, undefined) {
    $.widget("acr.uploaderFiles", {
        options: {
            uploadData: null,
            serviceParam: {
                serverApiUrl: "http://localhost:57808/api",
                numberOfFilesInPackage: 10,
                sizeChunk: 1024 * 1024,
                numberOfConnection: 6
            },
            setAvailabilityStatusAddingFiles: function (isAvailable) {
                console.log("AvailabilityStatusAddingFiles: " + isAvailable);
            },
            getSecurityToken: function () {
                console.log("getSecurityToken() not implemented");
                return null;
            },
            securityToken: null
        },
        

        /*_service: null,

        _studies: {},

        _filesProcessing: {},

        _studiesUploading: {},

        _dictionaryStateOfCollapse: {},*/

        /////////////////////////////////////////////////////////////////////////
        setSecurityToken: function (token) {
            if (token === null) return;
            let self = this;
            self.options.securityToken = token;
            self._service.setSecurityToken(self.options.securityToken);
        },

        _create: function () {
           /* this._studies = {};
            this._filesProcessing = {};
            this._studiesUploading = {};
            this._dictionaryStateOfCollapse = {};
            this._checkAvailabilityStatusAddingFiles();*/
            var studies_E = $(this._studies_T);
            this.element.html(studies_E);
            let self = this;
            var webTriadService = new WebTriadService(self.options.serviceParam);
            UploadQueueHandleService.init(webTriadService, this.element.find(".tc-parsingPanel tbody"));
            UploadQueueHandleService.addOnUploadCompletedHandler(this._fakeUpdate);
        },

        /////////////////////////////////////////////////////////////////////////

        _destroy: function () {
            this.element.html("");
        },

        /////////////////////////////////////////////////////////////////////////

        addFiles: function (files) {
            let self = this;
            self.element.find(".tc-parsingPanel").show();
            UploadQueueHandleService.addNewTask(files);
        },

        /////////////////////////////////////////////////////////////////////////

        _fakeUpdate: function () {
            console.log("update review after upload completion");
            $("div.tc-wrapper").show().append("Review update!");
        },

     /*   _update: function () {
            let self = this;
            self._service = new WebTriadService(self.options.serviceParam);
            self.element.find(".tc-wrapper").show();
            var studies = self._studies;
            var tbodyStudy = self.element.find(".tc-table-study tbody");
            tbodyStudy.html("");
            for (let studyUid in studies) {
                if (studies.hasOwnProperty(studyUid)) {
                    var isExpanded = self._dictionaryStateOfCollapse[studies[studyUid]["StudyInstanceUid"]];
                    if (isExpanded === undefined) {
                        self._dictionaryStateOfCollapse[studies[studyUid]["StudyInstanceUid"]] = true;
                        isExpanded = true;
                    }
                    var str = isExpanded === true ? "tc-expanded" : "";
                    var size = Math.round((studies[studyUid]["StudySize"] / (1024 * 1024)) * 100) / 100;
                    tbodyStudy.append(
                        "<tr data-study-uid='" + studyUid + "'>" +
                        "<td><span class='tc-collapse " + str + "'></span></td>" +
                        "<td>" + studies[studyUid]["StudyId"] + "</td>" +
                        "<td>" + studies[studyUid]["StudyDescription"] + "</td>" +
                        "<td style='text-align: center;'>" + studies[studyUid]["StudyDate"] + "</td>" +
                        "<td style='text-align: center;'>" + size + "mb </td>" +
                        "<td><span class='tc-anonymization'></span></td>" +
                        "<td class='tc-actions-td' style='text-align: center;'><span class='tc-upload-study'></span>" +
                        "<span class='tc-cancel-study' style='display: none;'></span>" +
                        "<span class='tc-delete-study'></span></td>" +
                        "</tr>"
                    );
                    var progressBar_E = $(self._progressBar_T).addClass("tc-progress-uploading");
                    self.element.find("tr[data-study-uid='" + studyUid + "']" + " .tc-actions-td").append(progressBar_E);
                    var series_E = $(self._series_T);
                    isExpanded === true ? series_E.find(".tc-series").show() : series_E.find(".tc-series").hide();
                    var tbodySeries = series_E.find("tbody");
                    var series = studies[studyUid].series;
                    for (let seriesId in series) {
                        if (series.hasOwnProperty(seriesId)) {
                            tbodySeries.append(
                                "<tr for-data-study-uid='" + studyUid +
                                "' data-series-number='" + series[seriesId]["SeriesNumber"] + "'>" +
                                "<td></td>" +
                                "<td>" + series[seriesId]["SeriesDescription"] + "</td>" +
                                "<td style='text-align: center;'>" + series[seriesId]["Modality"] + "</td>" +
                                "<td style='text-align: center;'>" + series[seriesId]["SeriesNumber"] + "</td>" +
                                "<td style='text-align: center;'>" + series[seriesId].files.length + "</td>" +
                                "<td style='text-align: center;'><span class='tc-delete-series'></span></td>" +
                                "</tr>"
                            );
                        }
                    }
                    tbodyStudy.append(series_E);
                }
            }
            self._bindEvent();
        },

        /////////////////////////////////////////////////////////////////////////

        _delete_study_bind: function (element) {
            var self = this;
            var trStudy = element.closest("tr");
            var trSeries = trStudy.next("tr");
            var studyUid = trStudy.attr("data-study-uid");
            trStudy.fadeOut(600, function () {
                trStudy.remove();
            });
            trSeries.fadeOut(600, function () {
                trSeries.remove();
            });
            delete self._studies[studyUid];
            delete self._dictionaryStateOfCollapse[studyUid];
            if (Object.keys(self._studies).length === 0) {
                self.element.find(".tc-wrapper").fadeOut(600);
            }
        },

        /////////////////////////////////////////////////////////////////////////

        _delete_series_bind: function (element) {
            var self = this;
            var trSeries = element.closest("tr");
            var studyUid = trSeries.attr("for-data-study-uid");
            var seriesNumber = trSeries.attr("data-series-number");
            var trStudy = $("tr[data-study-uid='" + studyUid + "']");
            trSeries.fadeOut(600, function () {
                trSeries.remove();
            });
            delete self._studies[studyUid].series[seriesNumber];
            if (Object.keys(self._studies[studyUid].series).length === 0) {
                delete self._studies[studyUid];
                delete self._dictionaryStateOfCollapse[studyUid];
                trStudy.next("tr").fadeOut(600, function () {
                    trStudy.next("tr").remove();
                });
                trStudy.fadeOut(600, function () {
                    trStudy.remove();
                });
                if (Object.keys(self._studies).length === 0) {
                    self.element.find(".tc-wrapper").fadeOut(600);
                }
            }
        },

        /////////////////////////////////////////////////////////////////////////

        _uploadAll_bind: function () {
            self.element.find(".tc-upload-study").each(function () {
                $(this).trigger("click");
            });
        },

        /////////////////////////////////////////////////////////////////////////

        _bindEvent: function () {
            var self = this;
            ///////////////////////////////////////

            self.element.find("#uploadAll").click(function () {
                self.element.find(".tc-upload-study").each(function () {
                    $(this).trigger("click");
                });
            });



            self.element.find(".tc-collapse").each(function () {
                var that = $(this);
                that.click(function () {
                    that.toggleClass("tc-expanded");
                    self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-uid")] =
                        !self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-uid")];
                    that.closest("tr").next().find(".tc-series").slideToggle(100);

                });
            });

            self.element.find(".tc-delete-study").each(function () {
                var that = $(this);
                that.click(function () {
                    self._delete_study_bind(that);
                });
            });

            self.element.find(".tc-delete-series").each(function () {
                var that = $(this);
                that.click(function () {
                    self._delete_series_bind(that);
                });
            });

            self.element.find(".tc-upload-study").each(function () {
                var that = $(this);
                var trStudy = that.closest("tr");
                var studyUid = trStudy.attr("data-study-uid");
                var cancelBtn = that.siblings(".tc-cancel-study");
                var deleteStudyBtns = that.siblings(".tc-delete-study");
                var deleteSeriesBtns = trStudy.next("tr").find(".tc-delete-series");
                that.click(function () {
                    self._studiesUploading[studyUid] = true;
                    self._checkAvailabilityStatusAddingFiles();
                    that.hide();
                    cancelBtn.show();
                    trStudy.find(".tc-progress-uploading").show();
                    deleteStudyBtns.each(function () {
                        $(this).unbind('click');
                        $(this).addClass("tc-not-allowed");
                    });
                    deleteSeriesBtns.each(function () {
                        $(this).unbind('click');
                        $(this).addClass("tc-not-allowed");
                    });
                    var series = self._studies[studyUid].series;
                    var files = [];
                    for (let seriesId in series) {
                        if (series.hasOwnProperty(seriesId)) {
                            files = files.concat(series[seriesId].files);
                        }
                    }
                    var typeSubmitData =
                    {
                        Name: "TypeOfSubmit",
                        Value: TypeOfSubmit.CreateSubmissionPackage
                    };
                    var data = self.options.uploadData.concat(typeSubmitData);

                    /////////
                    /////////
                    /////////
                    var token = self.options.getSecurityToken();
                    self.setSecurityToken(token);



                    self._service.submitFiles(files, data, uploadHandler);
                });

                cancelBtn.click(function () {
                    delete self._studiesUploading[studyUid];
                    self._checkAvailabilityStatusAddingFiles();
                    that.show();
                    cancelBtn.hide();
                    deleteStudyBtns.each(function () {
                        var btn = $(this);
                        btn.click(function () {
                            self._delete_study_bind(btn);
                        });
                        btn.removeClass("tc-not-allowed");
                    });
                    deleteSeriesBtns.each(function () {
                        var btn = $(this);
                        btn.click(function () {
                            self._delete_series_bind(btn);
                        });
                        btn.removeClass("tc-not-allowed");
                    });
                    var listOfFilesId = trStudy.attr("data-listOfFilesId");

                    /////////
                    /////////
                    /////////
                    var token = self.options.getSecurityToken();
                    self.setSecurityToken(token);

                    self._service.cancelUploadAndSubmitListOfFiles(listOfFilesId, uploadHandler);
                    trStudy.find(".tc-progress-uploading").hide();
                });

                function uploadHandler(result) {
                    trStudy.attr("data-listOfFilesId", result.listOfFilesId);
                    switch (result.status) {
                        case ProcessStatus.Success:
                            updateProgress(result.progress);
                            break;
                        case ProcessStatus.InProgress:
                            updateProgress(result.progress);
                            break;
                        case ProcessStatus.Error:
                            updateProgress(result.progress);
                            break;
                        default:
                    }
                }

                function updateProgress(value) {
                    var progressUploading = trStudy.find(".tc-progress-uploading span");
                    progressUploading.width(value + "%");
                    if (value === 100) {
                        delete self._studiesUploading[studyUid];
                        self._checkAvailabilityStatusAddingFiles();
                        var trSeries = trStudy.next("tr");
                        trStudy.fadeOut(600, function () {
                            trStudy.remove();
                        });
                        trSeries.fadeOut(600, function () {
                            trSeries.remove();
                        });
                        delete self._studies[studyUid];
                        delete self._dictionaryStateOfCollapse[studyUid];
                        if (Object.keys(self._studies).length === 0) {
                            self.element.find(".tc-wrapper").fadeOut(600);
                        }
                    }
                }
            });
        },

        /////////////////////////////////////////////////////////////////////////

        _checkAvailabilityStatusAddingFiles: function () {
            let self = this;
            var uploadAllBtn = self.element.find("#uploadAll");
            if (Object.keys(self._studiesUploading).length === 0) {
                self.options.setAvailabilityStatusAddingFiles(true);
                uploadAllBtn.prop("disabled", false);
                uploadAllBtn.removeClass("tc-not-allowed");
                uploadAllBtn.click(function () {
                    self.element.find(".tc-upload-study").each(function () {
                        $(this).trigger("click");
                    });
                });

            } else {
                self.options.setAvailabilityStatusAddingFiles(false);
                uploadAllBtn.prop("disabled", true);
                uploadAllBtn.unbind('click');
                uploadAllBtn.addClass("tc-not-allowed");
            }
        },

        /////////////////////////////////////////////////////////////////////////

        _arrayOfNameValueToDictionary: function (data) {
            var result = {};
            for (let i = 0; i < data.length; i++) {
                result[data[i].Name] = data[i].Value;
            }
            return result;
        },

        /////////////////////////////////////////////////////////////////////////

        _getSizeOfListFiles: function (list) {
            let size = 0;
            for (let i = 0; i < list.length; i++) {
                size += list[i].size;
            }
            return size;
        },

        /////////////////////////////////////////////////////////////////////////

        _getGuid: function () {
            function s4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }

            return (s4() + s4() + "-" + s4() + "-4" + s4().substr(0, 3) +
                "-" + s4() + "-" + s4() + s4() + s4()).toLowerCase();
        },

        /////////////////////////////////////////////////////////////////////////

        _getDicomInfoFromFileDef: function (file, callback) {
            var deferred = $.Deferred();
            var data = {
                file: file,
                studyDescription: "none",
                studyDate: "none",
                studyTime: "none",
                patientName: "none",
                studyInstanceUid: "none",
                studyId: "none",
                seriesDescription: "none",
                modality: "none",
                seriesNumber: "none"
            }
            data.studyDescription = "none";
            deferred.resolve(data);
            callback(file.guidOfFileset);

            return deferred.promise();
        }, */

        /////////////////////////////////////////////////////////////////////////

        _studies_T:
            "<div class='tc-parsingPanel' style='display: none'>" +
                "<table class='tc-table-parsingPanel'>" +
                "<thead><tr>" +
                "<th style='padding-left: 15px;'>Files</th>" +
                "<th style='width: 100px; text-align: center'># of Files</th>" +
                "<th style='width: 300px; text-align: center'>Upload Status</th>" +
                "<th style='width: 50px; text-align: center'></th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>" +
                "<div class='tc-wrapper tc-upload' style='display: none'>" +
                "<table class='tc-table-study'>" +
                "<caption>Files ready for upload</caption>" +
                "<thead><tr>" +
                "<th></th>" +
                "<th>DICOM Study ID</th>" +
                "<th>Study Description</th>" +
                "<th style='width: 200px; text-align: center'>Study Date</th>" +
                "<th style='width: 200px; text-align: center'>Study Size</th>" +
                "<th style='width: 100px; text-align: center'>Anonymization</th>" +
                "<th style='width: 200px; text-align: center' class='tc-action-th'>Actions</th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "<button type='button' id='uploadAll' class='tc-btn'>" +
                "<span class='tc-btn-icon'></span>Upload All</button>" +
                "</div>"
/*
        _series_T:
            "<tr><td colspan='7'>" +
                "<div class='tc-series'>" +
                "<table class='tc-table-series'>" +
                "<thead><tr>" +
                "<th></th>" +
                "<th>Series Description</th>" +
                "<th style='width: 150px; text-align: center'>Modality</th>" +
                "<th style='width: 150px; text-align: center'>Series Number</th>" +
                "<th style='width: 250px; text-align: center'>No. of Files</th>" +
                "<th style='width: 200px; text-align: center' class='tc-action-th'></th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>" +
                "</td></tr>",

        _progressBar_T:
            "<div class='tc-progress-bar'>" +
                "<span></span>" +
                "</div>"*/
    });
})(jQuery, window, document);
