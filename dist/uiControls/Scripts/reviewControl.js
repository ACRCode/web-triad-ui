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

            _service: null,

            _create: function () {
                this.update(this.options);
            },

            /////////////////////////////////////////////////////////////////////////

            _destroy: function () {
                this.element.html("");
            },

            /////////////////////////////////////////////////////////////////////////

            _getStudiesDetailsDef: function () {
                let self = this;
                var deferred = $.Deferred();
                /////////
                /////////
                /////////
                var token = self.options.getSecurityToken();
                self.setSecurityToken(token);

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
                self.setSecurityToken(token);

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

            _bindEvent: function () {
                var self = this;
                ///////////////////////////////////////

                self.element.find(".tc-collapse").each(function () {
                    var that = $(this);
                    that.click(function () {
                        that.toggleClass("tc-expanded");
                        self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-id")] =
                            !self._dictionaryStateOfCollapse[that.closest("tr").attr("data-study-id")];
                        that.closest("tr").next().find(".tc-series").slideToggle(100);

                    });
                });

                ///////////////////////////////////////

                self.element.find(".tc-open-image").each(function () {
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
                        self.setSecurityToken(token);

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

                self.element.find(".tc-delete-study").each(function () {
                    var that = $(this);
                    that.click(function () {

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
                                    self.setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteStudy(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            that.removeClass("tc-loader");
                                            console.log(data.message);
                                            return;
                                        } else {
                                            self.update();
                                        }
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                ///////////////////////////////////////

                self.element.find(".tc-delete-series").each(function () {
                    var that = $(this);
                    that.click(function () {
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
                                    self.setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteSeries(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                            return;
                                        } else {
                                            self.update();
                                        }
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                self.element.find(".tc-delete-non-dicom").each(function () {
                    var that = $(this);
                    that.click(function () {
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
                                    self.setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteNonDicom(deleteUrl, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                            return;
                                        } else {
                                            self.update();
                                        }
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });

                self.element.find(".tc-delete-non-dicoms").each(function () {
                    var that = $(this);
                    that.click(function () {
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
                                    self.setSecurityToken(token);
                                    that.addClass("tc-loader");
                                    self._service.deleteNonDicoms(deleteIds, callback);

                                    function callback(data) {
                                        if (data.processStatus === ProcessStatus.Error) {
                                            self.options.onErrorEvent(self._errorMessage(data));
                                            console.log(data.message);
                                            that.removeClass("tc-loader");
                                            return;
                                        } else {
                                            self.update();
                                        }
                                    }

                                    $(this).dialog("destroy");
                                },
                                "No": function () {
                                    $(this).dialog("destroy");
                                }
                            }
                        });
                    });
                });
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

            _spinner_T:
                "<div class='tc-spinner'>" +
                    "<div class='tc-loader'></div>" +
                    "</div>",

            _studies_T:
                "<div class='tc-wrapper'>" +
                    "<table class='tc-table-study'>" +
                    "<caption>Uploaded DICOM Files</caption>" +
                    "<thead><tr>" +
                    "<th></th>" +
                    "<th>Study Description</th>" +
                    "<th style='width: 150px; text-align: center'>Study Date</th>" +
                    "<th style='width: 200px; text-align: center'>Study Size</th>" +
                    "<th id='studyImageViewColumnHeader' style='width: 100px; text-align: center'>Image</th>" +
                    "<th id='studyRemoveColumnHeader' style='width: 100px; text-align: center' class='tc-action-th'>Action</th>" +
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
                    "<th id='fileRemoveColumnHeader' style='width: 100px; text-align: center' class='tc-action-th'>Action</th>" +
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
                    "<th style='width: 300px; text-align: center'>File Type</th>" +
                    "<th style='width: 200px; text-align: center'>Size</th>" +
                    "<th style='width: 100px; text-align: center' class='tc-action-th'></th>" +
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
                    "<th style='width: 150px; text-align: center'>Modality</th>" +
                    "<th style='width: 150px; text-align: center'>Series Date</th>" +
                    "<th style='width: 200px; text-align: center'>No. of Files</th>" +
                    "<th style='width: 100px; text-align: center' class='tc-action-th'></th>" +
                    "</tr></thead>" +
                    "<tbody></tbody>" +
                    "</table>" +
                    "</div>" +
                    "</td></tr>",

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

            update: function (options) {
                let self = this;

                let deleteDicomDisabledMessage = "Processing study data. 'Delete' will be enabled after processing is complete.";
                let deleteNonDicomDisabledMessage = "Processing data. 'Delete' will be enabled after processing is complete.";

                $.extend(self.options, options);

                var studies_E = $(self._studies_T);
                var non_dicoms_E = $(self._non_dicoms_T);

                if (!self.options.isImagesViewingAllowed) {
                    studies_E.find("#studyImageViewColumnHeader").remove();
                }

                if (!self.options.isImagesRemovingAllowed) {
                    studies_E.find("#studyRemoveColumnHeader").remove();
                    non_dicoms_E.find("#fileRemoveColumnHeader").remove();
                }

                self._service = new WebTriadService(self.options.serviceParam);

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
                                            "title = '" + deleteDicomDisabledMessage + "'>" +
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
                                        data[i].Series[j].Metadata.NoOfObjects +
                                        "</td>" +
                                        ((self.options.isImagesRemovingAllowed)
                                            ? (isDeleteLink
                                                ? "<td style='text-align: center;'><span class='tc-delete-series' data-delete-link ='" +
                                                data[i].Series[j]._links.delete.href +
                                                "'></span></td>"
                                                : "<td style='text-align: center;' " +
                                                "title = '" + deleteDicomDisabledMessage + "'>" +
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
                                        ? "<td style='text-align: center; width: 100px'><span class='tc-delete-non-dicoms' data-delete-links ='" +
                                        deleteLinks +
                                        "'></span></td>"
                                        : "<td style='text-align: center; width: 100px' " +
                                        "title = '" + deleteNonDicomDisabledMessage + "'>" +
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
                                    size +
                                    "</td>" +
                                    ((self.options.isImagesRemovingAllowed)
                                        ? (isDeleteLink
                                            ? "<td style='text-align: center;'><span class='tc-delete-non-dicom' data-delete-link ='" +
                                            data[i]._links.delete.href +
                                            "'></span></td>"
                                            : "<td style='text-align: center;' " +
                                            "title = '" + deleteNonDicomDisabledMessage + "'>" +
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

                $.when(deferredGetStudies, deferredGetNonDicoms).done(function (dicomData, nonDicomData) {
                    if (dicomData == null && nonDicomData == null) {
                        self.element.html("");
                        return;
                    }
                    var isEmpty = true;
                    if (dicomData != null) {
                        self.element.html(dicomData);
                        isEmpty = false;
                    }
                    if (nonDicomData != null) {
                        if (isEmpty) {
                            self.element.html(nonDicomData);
                        } else {
                            self.element.append(nonDicomData);
                        }
                    }
                    self._bindEvent();
                });
            },

            /////////////////////////////////////////////////////////////////////////

            setSecurityToken: function (token) {
                if (token === null) return;
                let self = this;
                self.options.securityToken = token;
                self._service.setSecurityToken(self.options.securityToken);
            }

        });
})(jQuery, window, document);
