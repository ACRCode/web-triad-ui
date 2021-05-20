(function ($, window, document, undefined) {
    $.widget("acr.reviewerSubmittedFiles",
        {
            options: {
                reviewData: null,
                serviceParam: {
                    serverApiUrl: "http://localhost:57808/api",
                    numberOfFilesInPackage: 4,
                    sizeChunk: 1024 * 1024 * 2,
                    numberOfConnection: 6,
                    dicomsDisabled: false,
                    nonDicomsDisabled: false
                },
                getSecurityToken: function () {
                    console.log("getSecurityToken() is not implemented");
                    return null;
                },
                onErrorEvent: function () {
                    console.log("On error event handler was not added");
                },
                securityToken: null,
                isImagesViewingAllowed: false,
                isImagesRemovingAllowed: false
            },

            _uploadedFilesGrid: null,
            _packagesGrid: null,

            _currentReceivingPackagesSessionId: null,
            _updatePackagesTimer: null,
            _canUpdatePackages: true,

            _currentReceivingStudiesSessionId: null,
            _updateStudiesTimer: null,
            _canUpdateStudies: true,

            _service: null,

            _create: function () {
                this._uploadedFilesGrid = $("<div id='uploadedFilesGrid'></div>");
                this._packagesGrid = $("<div id='packagesGrid'></div>");
                this._packagesGrid.html($(this._spinner_T));
                this._uploadedFilesGrid.html($(this._spinner_T));
                this.element.append(this._packagesGrid);
                this.element.append(this._uploadedFilesGrid);
                this._service = new WebTriadService(this.options.serviceParam);
                this._setReceivingPackages();
                this._setReceivingStudies();
            },

            /////////////////////////////////////////////////////////////////////////

            _destroy: function () {
                clearTimeout(this._updateStudiesTimer);
                clearTimeout(this._updatePackagesTimer);
                this._currentReceivingPackagesSessionId = null;
                this._currentReceivingStudiesSessionId = null;
                this.element.html("");
            },

            /////////////////////////////////////////////////////////////////////////

            _getPackagesDetailsDef: function () {
                let self = this;
                var deferred = $.Deferred();
                /////////
                /////////
                /////////
                var token = self.options.getSecurityToken();
                self._setSecurityToken(token);

                self._service.getPackagesDetails(self.options.reviewData, callback);

                function callback(data) {
                    if (data.processStatus === ProcessStatus.Error) {
                        self.options.onErrorEvent(self._errorMessage(data));
                        console.log(data.message);
                        return;
                    }
                    data = data.data;
                    deferred.resolve(data);
                }

                return deferred.promise();
            },

            /////////////////////////////////////////////////////////////////////////

            _getStudiesDetailsDef: function () {
                let self = this;
                var deferred = $.Deferred();
                /////////
                /////////
                /////////
                var token = self.options.getSecurityToken();
                self._setSecurityToken(token);

                self._service.getStudiesDetails(self.options.reviewData, callback);

                function callback(data) {
                    if (data.processStatus === ProcessStatus.Error) {
                        self.options.onErrorEvent(self._errorMessage(data));
                        console.log(data.message);
                        return;
                    }
                    data = data.data;
                    if (data.length > 0) {
                        for (let i = 0; i < data.length; i++) {
                            data[i].Metadata = self._arrayOfNameValueToDictionary(data[i].Metadata);
                            for (var j = 0; j < data[i].Series.length; j++) {
                                data[i].Series[j].Metadata =
                                    self._arrayOfNameValueToDictionary(data[i].Series[j].Metadata);
                            }
                        }
                    }
                    deferred.resolve(data);
                }

                return deferred.promise();
            },

            /////////////////////////////////////////////////////////////////////////

            _getNonDicomsDetailsDef: function () {
                let self = this;
                var deferred = $.Deferred();
                /////////
                /////////
                /////////
                var token = self.options.getSecurityToken();
                self._setSecurityToken(token);

                self._service.getNonDicomsDetails(self.options.reviewData, callback);

                function callback(data) {
                    if (data.processStatus === ProcessStatus.Error) {
                        self.options.onErrorEvent(self._errorMessage(data));
                        console.log(data.message);
                        return;
                    }
                    data = data.data;
                    if (data.length > 0) {
                        for (let i = 0; i < data.length; i++) {
                            data[i].Metadata = self._arrayOfNameValueToDictionary(data[i].Metadata);
                        }
                    }
                    deferred.resolve(data);
                }

                return deferred.promise();
            },

            /////////////////////////////////////////////////////////////////////////

            _bindPackagesEvent: function () {
                var self = this;
                ///////////////////////////////////////
                self._packagesGrid.find(".tc-hide-package").each(function () {
                    var that = $(this);
                    that.click(function () {
                        self._canUpdatePackages = false;
                        var hideUrl = that.attr("data-delete-link");
                        var token = self.options.getSecurityToken();
                        self._setSecurityToken(token);
                        that.addClass("tc-loader");
                        self._service.hidePackage(hideUrl, callback);
                        function callback(data) {
                            if (data.processStatus === ProcessStatus.Error) {
                                self.options.onErrorEvent(self._errorMessage(data));
                                that.removeClass("tc-loader");
                                console.log(data.message);
                            } else {
                                self._setReceivingPackages();
                            }
                            self._canUpdatePackages = true;
                        }
                    });
                });
            },


            /////////////////////////////////////////////////////////////////////////

            _bindStudiesEvent: function () {
                var self = this;
                ///////////////////////////////////////

                self._uploadedFilesGrid.find(".tc-collapse").each(function () {
                    var that = $(this);
                    that.click(function () {
                        that.toggleClass("tc-expanded");
                        self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-id")] =
                            !self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-id")];
                        that.closest("tr").next().find(".tc-series").slideToggle(100);

                    });
                });

                ///////////////////////////////////////

                self._uploadedFilesGrid.find(".tc-open-image").each(function () {
                    var that = $(this);
                    that.click(function () {

                        var studyId =
                        {
                            Name: "DicomDataStudyID",
                            Value: that.closest("tr").attr("data-study-id")
                        };

                        var params = self.options.reviewData.concat(studyId);

                        /////////
                        /////////
                        /////////
                        var token = self.options.getSecurityToken();
                        self._setSecurityToken(token);

                        self._service.openViewer(params, callback);

                        function callback(data) {
                            if (data.status === ProcessStatus.Error) {
                                //alert(data.message);
                                console.log(data.message);
                                return;
                            }
                        }
                    });
                });

                ///////////////////////////////////////

                self._uploadedFilesGrid.find(".tc-delete-study").each(function () {
                    var that = $(this);
                    that.click(function () {
                        self._canUpdateStudies = false;
                        var study_E = $(self._confirm_delete_studies_T);

                        study_E.dialog({
                            dialogClass: "no-close",
                            resizable: false,
                            height: "auto",
                            width: 400,
                            modal: true,
                            buttons: {
                                "Yes": function () {
                                    var deleteUrl = that.attr("data-delete-link");
                                    var token = self.options.getSecurityToken();
                                    self._setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteStudy(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            that.removeClass("tc-loader");
                                            console.log(data.message);
                                        } else {
                                            self._setReceivingStudies();
                                        }
                                        self._canUpdateStudies = true;
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    self._canUpdateStudies = true;
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                ///////////////////////////////////////

                self._uploadedFilesGrid.find(".tc-delete-series").each(function () {
                    var that = $(this);
                    that.click(function () {
                        self._canUpdateStudies = false;
                        var series_E = $(self._confirm_delete_series_T);
                        series_E.dialog({
                            dialogClass: "no-close",
                            resizable: false,
                            height: "auto",
                            width: 400,
                            modal: true,
                            buttons: {
                                "Yes": function () {
                                    var deleteUrl = that.attr("data-delete-link");
                                    var token = self.options.getSecurityToken();
                                    self._setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteSeries(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                        } else {
                                            self._setReceivingStudies();
                                        }
                                        self._canUpdateStudies = true;
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    self._canUpdateStudies = true;
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                self._uploadedFilesGrid.find(".tc-delete-non-dicom").each(function () {
                    var that = $(this);
                    that.click(function () {
                        self._canUpdateStudies = false;
                        let dialog = $(self._confirm_delete_non_dicom_T);
                        dialog.dialog({
                            dialogClass: "no-close",
                            resizable: false,
                            height: "auto",
                            width: 400,
                            modal: true,
                            buttons: {
                                "Yes": function () {
                                    var deleteUrl = that.attr("data-delete-link");
                                    var token = self.options.getSecurityToken();
                                    self._setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteNonDicom(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                        } else {
                                            self._setReceivingStudies();
                                        }
                                        self._canUpdateStudies = true;
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    self._canUpdateStudies = true;
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                self._uploadedFilesGrid.find(".tc-delete-non-dicoms").each(function () {
                    var that = $(this);
                    that.click(function () {
                        self._canUpdateStudies = false;
                        let dialog = $(self._confirm_delete_non_dicoms_T);
                        dialog.dialog({
                            dialogClass: "no-close",
                            resizable: false,
                            height: "auto",
                            width: 400,
                            modal: true,
                            buttons: {
                                "Yes": function () {
                                    var deleteIds = that.attr("data-delete-links").split(" ");
                                    var token = self.options.getSecurityToken();
                                    self._setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteNonDicoms(deleteIds, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                        } else {
                                            self._setReceivingStudies();
                                        }
                                        self._canUpdateStudies = true;
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    self._canUpdateStudies = true;
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });
            },

            /////////////////////////////////////////////////////////////////////////

            _studies_T:
                "<div class='tc-wrapper'>" +
                "<table class='tc-table-study'>" +
                "<caption>Uploaded DICOM Files</caption>" +
                "<thead><tr>" +
                "<th></th>" +
                "<th>Study Description</th>" +
                "<th style='width: 120px; text-align: center'>Study Date</th>" +
                "<th style='width: 120px; text-align: center'>Submitted Date</th>" +
                "<th style='width: 150px; text-align: center'>Study Size</th>" +
                "<th id='studyImageViewColumnHeader' style='width: 100px; text-align: center'>Image</th>" +
                "<th width='6%' id='studyRemoveColumnHeader' style='text-align: center' class='tc-action-th'>Action</th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>",

            _non_dicoms_T:
                "<div class='tc-wrapper'>" +
                "<table class='tc-table-study'>" +
                "<caption>Uploaded Non-DICOM Files</caption>" +
                "<thead style='display: none'><tr>" +
                "<th></th>" +
                "<th></th>" +
                "<th style='width: 200px;'></th>" +
                "<th width='6%' id='fileRemoveColumnHeader' style='text-align: center' class='tc-action-th'>Action</th>" +
                "</tr></thead>" +
                "<tbody>" +
                "</tbody>" +
                "</table>" +
                "</div>",

            _each_non_dicom_T:
                "<tr><td colspan='7'>" +
                "<div class='tc-series'>" +
                "<table class='tc-table-series'>" +
                "<thead><tr>" +
                "<th></th>" +
                "<th>File Name</th>" +
                "<th style='width: 200px; text-align: center'>File Type</th>" +
                "<th style='width: 120px; text-align: center'>Submitted Date</th>" +
                "<th style='width: 150px; text-align: center'>Size</th>" +
                "<th width='6%' style='text-align: center' class='tc-action-th'></th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>" +
                "</td></tr>",

            _series_T:
                "<tr><td colspan='7'>" +
                "<div class='tc-series'>" +
                "<table class='tc-table-series'>" +
                "<thead><tr>" +
                "<th></th>" +
                "<th>Series Description</th>" +
                "<th style='width: 80px; text-align: center'>Modality</th>" +
                "<th style='width: 120px; text-align: center'>Series Date</th>" +
                "<th style='width: 120px; text-align: center'>Submitted Date</th>" +
                "<th style='width: 150px; text-align: center'>No. of Files</th>" +
                "<th width='6%' style='text-align: center' class='tc-action-th'></th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>" +
                "</td></tr>",

            _packages_T:
                "<div class='tc-packagesPanel' >" +
                "<table class='tc-table-packagesPanel'>" +
                "<thead><tr>" +
                "<th style='padding-left: 15px;' width='55%'>Files</th>" +
                "<th style='text-align: center' width='6%'># of Files</th>" +
                "<th style='text-align: center' width='13%'>Upload Date</th>" +
                "<th style='text-align: center' width='20%'>Status</th>" +
                "<th style='text-align: center' width='6%'></th>" +
                "</tr></thead>" +
                "<tbody></tbody>" +
                "</table>" +
                "</div>",

            _confirm_delete_studies_T:
                "<div id='dialog-confirm' style='display: none;'>" +
                "<p>All the series in this study will be deleted from this case. Please confirm.</p>" +
                "</div>",

            _confirm_delete_series_T:
                "<div id='dialog-confirm' style='display: none;'>" +
                "<p>Selected series will be deleted from this case. Please confirm.</p>" +
                "</div>",

            _confirm_delete_non_dicom_T:
                "<div id='dialog-confirm' style='display: none;'>" +
                "<p>This file will be deleted from the system. Please confirm.</p>" +
                "</div>",

            _confirm_delete_non_dicoms_T:
                "<div id='dialog-confirm' style='display: none;'>" +
                "<p>All the non-DICOM files will be deleted from the system. Please confirm.</p>" +
                "</div>",

            _spinner_T:
                "<div style='display: block; margin: auto; min-height: 30px'><div class='tc-loader'></div></div>",

            _dictionaryStateOfCollapse: {},

            _errorMessage: function (data) {
                var errObj = {};
                errObj.date = new Date();
                errObj.step = ReviewProcessStep[data.processStep];
                errObj.statusText = data.statusCode + " " + data.statusText;
                errObj.message = data.details;

                switch (data.processStep) {
                    case ReviewProcessStep.GettingStudies:
                        break;
                    case ReviewProcessStep.GettingNonDicomFiles:
                        break;
                    case ReviewProcessStep.DeletingStudies:
                        break;
                    case ReviewProcessStep.DeletingSeries:
                        break;
                    case ReviewProcessStep.DeletingNonDicomFiles:
                        break;
                }

                return errObj;
            },

            /////////////////////////////////////////////////////////////////////////

            _updatePackages: function(id) {
                let self = this;

                var packages_E = $(self._packages_T);

                var deferredGetPackages =
                    $.when(self._getPackagesDetailsDef()).then(function(data) {
                        if (data.length === 0) {
                            return $.Deferred().resolve(null).promise();
                        }
                        var tbody = packages_E.find("tbody");

                        for (let i = 0; i < data.length; i++) {

                            let isHideLink = data[i]._links.hide == null ? false : true;
                            tbody.append(
                                "<tr data-fileset-uid='" +
                                data[i].Id +
                                "'>" +
                                "<td style='padding-left: 15px;'>" +
                                "<div style='text-overflow: ellipsis;overflow: hidden;'>" +
                                data[i].SummaryOfFiles +
                                "</div>" +
                                "</td>" +
                                "<td style='text-align: center;'>" +
                                data[i].TotalFilesCount +
                                "</td>" +
                                "<td style='text-align: center;'>" +
                                data[i].UploadTime +
                                "</td>" +
                                "<td class='tc-upload-status' style='text-align: center; white-space: nowrap;'><p>" +
                                (data[i].Status !== SubmissionPackageStatus[SubmissionPackageStatus.Complete]
                                    ? data[i].Status
                                    : self._prepareRejectedAndCorruptedFilesNotification(data[i])) +
                                "</p></td>" +
                                (isHideLink
                                    ? "<td style='text-align: center;' title='Remove'><span class='tc-hide-package' data-delete-link ='" +
                                    data[i]._links.hide.href +
                                    "'></span></td>"
                                    : "<td></td>"
                                ) +
                                "</tr>"
                            );
                        }
                        return $.Deferred().resolve(packages_E).promise();
                    });

                return $.when(deferredGetPackages).done(function(packagesData) {
                    if (!self._canUpdatePackages ||
                    (self._currentReceivingPackagesSessionId != null &&
                        self._currentReceivingPackagesSessionId !== id)) {
                        return;
                    }
                    if (packagesData == null) {
                        self._packagesGrid.html("");
                    } else {
                        self._packagesGrid.html(packagesData);
                        self._bindPackagesEvent();
                    }
                });
            },

            _updateStudies: function (id) {
                let self = this;

                let deleteDicomDisabledMessage =
                    "Processing study data. 'Delete' will be enabled after processing is complete.";
                let deleteNonDicomDisabledMessage =
                    "Processing data. 'Delete' will be enabled after processing is complete.";

                var studies_E = $(self._studies_T);
                var non_dicoms_E = $(self._non_dicoms_T);

                if (!self.options.isImagesViewingAllowed) {
                    studies_E.find("#studyImageViewColumnHeader").remove();
                }

                if (!self.options.isImagesRemovingAllowed) {
                    studies_E.find("#studyRemoveColumnHeader").remove();
                    non_dicoms_E.find("#fileRemoveColumnHeader").remove();
                }

                var deferredGetStudies;

                if (self.options.serviceParam.dicomsDisabled) {
                    deferredGetStudies = $.Deferred().resolve(null).promise();
                } else {
                    deferredGetStudies =
                        $.when(self._getStudiesDetailsDef()).then(function (data) {

                            if (data.length === 0) {
                                return $.Deferred().resolve(null).promise();
                            }

                            var tbody = studies_E.find("tbody");

                            for (let i = 0; i < data.length; i++) {

                                var isExpanded = self._dictionaryStateOfCollapse[data[i].Id];
                                if (isExpanded === undefined) {
                                    self._dictionaryStateOfCollapse[data[i].Id] = true;
                                    isExpanded = true;
                                }
                                var str = isExpanded === true ? "tc-expanded" : "";
                                var size = (Math.round((data[i].Metadata.StudySize / (1024 * 1024)) * 100) / 100) +
                                    " MB";
                                if (size == "0 MB")
                                    size = (Math.round((data[i].Metadata.StudySize / (1024)) * 100) / 100) + " KB";

                                let isDeleteLink = data[i]._links.delete == null ? false : true;
                                tbody.append(
                                    "<tr data-study-id='" +
                                    data[i].Id +
                                    "'>" +
                                    "<td><span class='tc-collapse " +
                                    str +
                                    "'></span></td>" +
                                    "<td>" +
                                    data[i].Metadata.StudyDescription +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    data[i].Metadata.StudyDate +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    data[i].Metadata.SubmittedDate +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    size +
                                    "</td>" +
                                    ((self.options.isImagesViewingAllowed)
                                        ? "<td><span class='tc-open-image'></span></td>"
                                        : "") +
                                    ((self.options.isImagesRemovingAllowed)
                                        ? (isDeleteLink
                                            ? "<td style='text-align: center;'><span class='tc-delete-study' data-delete-link ='" +
                                            data[i]._links.delete.href +
                                            "'></span></td>"
                                            : "<td style='text-align: center;' " +
                                            'title = "' +
                                            deleteDicomDisabledMessage +
                                            '">' +
                                            "<span class='tc-delete-study tc-not-allowed'></span></td>"
                                        )
                                        : "") +
                                    "</tr>"
                                );

                                var series_E = $(self._series_T);

                                if (!self.options.isImagesRemovingAllowed) {
                                    series_E.find(".tc-action-th").remove();
                                }

                                isExpanded === true
                                    ? series_E.find(".tc-series").show()
                                    : series_E.find(".tc-series").hide();
                                var tbodySeries = series_E.find("tbody");

                                for (let j = 0; j < data[i].Series.length; j++) {
                                    let isDeleteLink = data[i].Series[j]._links.delete == null ? false : true;
                                    tbodySeries.append(
                                        "<tr for-data-study-id='" +
                                        data[i].Id +
                                        "' data-series-id='" +
                                        data[i].Series[j].Id +
                                        "'>" +
                                        "<td></td>" +
                                        "<td>" +
                                        data[i].Series[j].Metadata.SeriesDescription +
                                        "</td>" +
                                        "<td style='text-align: center;'>" +
                                        data[i].Series[j].Metadata.Modality +
                                        "</td>" +
                                        "<td style='text-align: center;'>" +
                                        data[i].Series[j].Metadata.SeriesDate +
                                        "</td>" +
                                        "<td style='text-align: center;'>" +
                                        data[i].Series[j].Metadata.SubmittedDate +
                                        "</td>" +
                                        "<td style='text-align: center;'>" +
                                        data[i].Series[j].Metadata.NoOfObjects +
                                        "</td>" +
                                        ((self.options.isImagesRemovingAllowed)
                                            ? (isDeleteLink
                                                ? "<td style='text-align: center;'><span class='tc-delete-series' data-delete-link ='" +
                                                data[i].Series[j]._links.delete.href +
                                                "'></span></td>"
                                                : "<td style='text-align: center;' " +
                                                'title = "' +
                                                deleteDicomDisabledMessage +
                                                '">' +
                                                "<span class='tc-delete-series tc-not-allowed'>" +
                                                "</span></td>"
                                            )
                                            : "") +
                                        "</tr>"
                                    );
                                }
                                tbody.append(series_E);
                            }
                            return $.Deferred().resolve(studies_E).promise();
                        });
                }

                var deferredGetNonDicoms;

                if (self.options.serviceParam.nonDicomsDisabled) {
                    deferredGetNonDicoms = $.Deferred().resolve(null).promise();
                } else {
                    deferredGetNonDicoms =
                        $.when(self._getNonDicomsDetailsDef()).then(function (data) {

                            if (data.length === 0) {
                                return $.Deferred().resolve(null).promise();
                            }

                            var tbody = non_dicoms_E.find("tbody");

                            var totalSize = 0;
                            let canDeleteAllFiles = true;
                            var deleteLinks = "";
                            for (let i = 0; i < data.length; i++) {
                                totalSize += parseInt(data[i].Metadata.Size);
                                if (data[i]._links.delete == null) {
                                    canDeleteAllFiles = false;
                                } else {
                                    deleteLinks += data[i].Id + " ";
                                }
                            }
                            deleteLinks = deleteLinks.trim();
                            var roundTotalSize = (Math.round((totalSize / (1024 * 1024)) * 100) / 100) + " MB";
                            if (roundTotalSize == "0 MB")
                                roundTotalSize = (Math.round((totalSize / (1024)) * 100) / 100) + " KB";

                            var isExpanded = self._dictionaryStateOfCollapse["xxx"];
                            if (isExpanded === undefined) {
                                self._dictionaryStateOfCollapse["xxx"] = true;
                                isExpanded = true;
                            }
                            var str = isExpanded === true ? "tc-expanded" : "";

                            var uploadedFilesStr;
                            if (data.length == 1) {
                                uploadedFilesStr = "1 file has been uploaded";
                            } else {
                                uploadedFilesStr = data.length + " files have been uploaded";
                            }

                            tbody.append(
                                "<tr data-study-id='" +
                                "xxx" +
                                "'>" +
                                "<td><span class='tc-collapse " +
                                str +
                                "'></span></td>" +
                                "<td>" +
                                uploadedFilesStr +
                                "</td>" +
                                "<td style='text-align: center; width: 200px ;'>" +
                                "Total Size: " +
                                roundTotalSize +
                                "</td>" +
                                ((self.options.isImagesRemovingAllowed)
                                    ? (canDeleteAllFiles
                                        ? "<td width='6%' style='text-align: center;'><span class='tc-delete-non-dicoms' data-delete-links ='" +
                                        deleteLinks +
                                        "'></span></td>"
                                        : "<td width='6%' style='text-align: center;' " +
                                        'title = "' +
                                        deleteNonDicomDisabledMessage +
                                        '">' +
                                        "<span class='tc-delete-non-dicoms tc-not-allowed'>" +
                                        "</span></td>"
                                    )
                                    : "") +
                                "</tr>"
                            );

                            var each_non_dicom_E = $(self._each_non_dicom_T);

                            if (!self.options.isImagesRemovingAllowed) {
                                each_non_dicom_E.find(".tc-action-th").remove();
                            }

                            isExpanded === true
                                ? each_non_dicom_E.find(".tc-series").show()
                                : each_non_dicom_E.find(".tc-series").hide();
                            var tbodyNonDicom = each_non_dicom_E.find("tbody");

                            for (let i = 0; i < data.length; i++) {

                                var size = (Math.round((data[i].Metadata.Size / (1024 * 1024)) * 100) / 100) + " MB";
                                if (size == "0 MB")
                                    size = (Math.round((data[i].Metadata.Size / (1024)) * 100) / 100) + " KB";
                                let isDeleteLink = data[i]._links.delete == null ? false : true;
                                tbodyNonDicom.append(
                                    "<tr data-study-id='" +
                                    data[i].Id +
                                    "'>" +
                                    "<td></td>" +
                                    "<td>" +
                                    data[i].Metadata.Name +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    data[i].Metadata.Type +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    data[i].Metadata.SubmittedDate +
                                    "</td>" +
                                    "<td style='text-align: center;'>" +
                                    size +
                                    "</td>" +
                                    ((self.options.isImagesRemovingAllowed)
                                        ? (isDeleteLink
                                            ? "<td style='text-align: center;'><span class='tc-delete-non-dicom' data-delete-link ='" +
                                            data[i]._links.delete.href +
                                            "'></span></td>"
                                            : "<td style='text-align: center;' " +
                                            'title = "' +
                                            deleteNonDicomDisabledMessage +
                                            '">' +
                                            "<span class='tc-delete-non-dicom tc-not-allowed'>" +
                                            "</span></td>"
                                        )
                                        : "") +
                                    "</tr>"
                                );
                            }
                            tbody.append(each_non_dicom_E);
                            return $.Deferred().resolve(non_dicoms_E).promise();
                        });
                }

                return $.when(deferredGetStudies, deferredGetNonDicoms).done(function (dicomData, nonDicomData) {
                    if (!self._canUpdateStudies ||
                        (self._currentReceivingStudiesSessionId != null && self._currentReceivingStudiesSessionId !== id)) {
                        return;
                    }

                    if (dicomData == null && nonDicomData == null) {
                        self._uploadedFilesGrid.html("");
                        return;
                    }

                    var isEmpty = true;

                    if (dicomData != null) {
                        self._uploadedFilesGrid.html(dicomData);
                        isEmpty = false;
                    }
                    if (nonDicomData != null) {
                        if (isEmpty) {
                            self._uploadedFilesGrid.html(nonDicomData);
                        } else {
                            self._uploadedFilesGrid.append(nonDicomData);
                        }
                    }
                    self._bindStudiesEvent();
                });
            },

            /////////////////////////////////////////////////////////////////////////

            _prepareRejectedAndCorruptedFilesNotification: function (data) {
                let totalRejectedFiles = data.DicomSummary.CorruptedCount +
                    data.DicomSummary.RejectedCount +
                    data.NonDicomsSummary.RejectedCount +
                    data.DicomDirSummary.RejectedCount;
                let totalIgnoredFiles = data.DicomSummary.DuplicateCount;
                let statusString = data.TotalFilesCount -
                    totalRejectedFiles -
                    totalIgnoredFiles +
                    " file(s) uploaded successfully. ";
                if (totalRejectedFiles !== 0) statusString += totalRejectedFiles + " file(s) rejected to upload. ";
                if (totalIgnoredFiles !== 0) statusString += totalIgnoredFiles + " duplicate file(s) were ignored.";
                return statusString;
            },

            /////////////////////////////////////////////////////////////////////////

            _setReceivingPackages: function () {
                let self = this;
                this._currentReceivingPackagesSessionId = self._generateId();
                clearTimeout(this._updatePackagesTimer);
                let id = this._currentReceivingPackagesSessionId;
                this._updatePackagesTimer = setTimeout(function request() {
                    $.when(self._updatePackages(id)).always(function () {
                        if (id === self._currentReceivingPackagesSessionId) {
                            self._updatePackagesTimer = setTimeout(request, 5000);
                        }
                    });
                },
                    100);
            },

            /////////////////////////////////////////////////////////////////////////

            _setReceivingStudies: function () {
                let self = this;
                this._currentReceivingStudiesSessionId = self._generateId();
                clearTimeout(this._updateStudiesTimer);
                let id = this._currentReceivingStudiesSessionId;
                this._updateStudiesTimer = setTimeout(function request() {
                    $.when(self._updateStudies(id)).always(function () {
                        if (id === self._currentReceivingStudiesSessionId) {
                            self._updateStudiesTimer = setTimeout(request, 5000);
                        }
                    });
                },
                    100);
            },

            /////////////////////////////////////////////////////////////////////////

            _generateId: function () {
                return '_' + Math.random().toString(36).substr(2, 9);
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

            _setSecurityToken: function (token) {
                if (token === null) return;
                let self = this;
                self.options.securityToken = token;
                self._service.setSecurityToken(self.options.securityToken);
            }

        });
})(jQuery, window, document);
