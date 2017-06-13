(function ($, window, document, undefined) {
    $.widget("acr.reviewerSubmittedFiles", {
        options: {
            reviewData: null,
            serviceParam: {
                serverApiUrl: "http://localhost:57808/api",
                numberOfFilesInPackage: 4,
                sizeChunk: 1024 * 1024 * 2,
                numberOfConnection: 6
            },
            getSecurityToken: function () {
                console.log("getSecurityToken() not implemented");
                return null;
            },
            securityToken: null,
            isImagesViewingAllowed: true,
            isImagesRemovingAllowed: false
        },

        _service: null,

        setSecurityToken: function (token) {
            if (token === null) return;
            let self = this;
            self.options.securityToken = token;
            self._service.setSecurityToken(self.options.securityToken);
        },

        /////////////////////////////////////////////////////////////////////////

        _create: function () {
            this.update(this.options);
        },

        /////////////////////////////////////////////////////////////////////////

        _destroy: function () {
            this.element.html("");
        },

        /////////////////////////////////////////////////////////////////////////

        update: function (options) {
            let self = this;
            //var spinner_E = $(self._spinner_T);
            //self.element.html(spinner_E);

            $.extend(self.options, options);

            var studies_E = $(self._studies_T);

            if (!self.options.isImagesViewingAllowed) {
                studies_E.find("#studyImageViewColumnHeader").remove();
            }

            if (!self.options.isImagesRemovingAllowed) {
                studies_E.find("#studyRemoveColumnHeader").remove();
            }

            self._service = new WebTriadService(self.options.serviceParam);

            var deferred1 = $.Deferred();
            $.when(self._getStudiesDetailsDef()).then(function (data) {

                if (data.length === 0) {
                    self.element.html("no files");
                    return;
                }

                var tbody = studies_E.find("tbody");

                for (let i = 0; i < data.length; i++) {

                    var isExpanded = self._dictionaryStateOfCollapse[data[i].Metadata.DicomDataStudyID];
                    if (isExpanded === undefined) {
                        self._dictionaryStateOfCollapse[data[i].Metadata.DicomDataStudyID] = true;
                        isExpanded = true;
                    }
                    var str = isExpanded === true ? "tc-expanded" : "";
                    var size = Math.round((data[i].Metadata.StudySize / (1024 * 1024)) * 100) / 100;
                    tbody.append(
                        "<tr data-study-id='" + data[i].Metadata.DicomDataStudyID + "'>" +
                        "<td><span class='tc-collapse " + str + "'></span></td>" +
                        "<td>" + data[i].Metadata.StudyDescription + "</td>" +
                        "<td style='text-align: center;'>" + data[i].Metadata.StudyDate + "</td>" +
                        "<td style='text-align: center;'>" + size + "mb </td>" +
                        ((self.options.isImagesViewingAllowed) ? "<td><span class='tc-open-image'></span></td>" : "") +
                        ((self.options.isImagesRemovingAllowed) ? "<td style='text-align: center;'><span class='tc-delete-study'></span></td>" : "") +
                        "</tr>"
                    );

                    var series_E = (self.options.isImagesRemovingAllowed) ? $(self._series_with_remove_action_T) : $(self._series_T);
                    isExpanded === true ? series_E.find(".tc-series").show() : series_E.find(".tc-series").hide();
                    var tbodySeries = series_E.find("tbody");

                    for (let j = 0; j < data[i].Series.length; j++) {
                        tbodySeries.append(
                            "<tr for-data-study-id='" + data[i].Metadata.DicomDataStudyID +
                            "' data-series-id='" + data[i].Series[j].Metadata.SeriesId + "'>" +
                            "<td></td>" +
                            "<td>" + data[i].Series[j].Metadata.SeriesDescription + "</td>" +
                            "<td style='text-align: center;'>" + data[i].Series[j].Metadata.Modality + "</td>" +
                            "<td style='text-align: center;'>" + data[i].Series[j].Metadata.SeriesDate + "</td>" +
                            "<td style='text-align: center;'>" + data[i].Series[j].Metadata.NoOfObjects + "</td>" +
                            ((self.options.isImagesRemovingAllowed) ? "<td style='text-align: center;'><span class='tc-delete-series'></span></td>" : "") +
                            "</tr>"
                        );
                    }
                    tbody.append(series_E);
                }
                deferred1.resolve().promise();
            });

            $.when(deferred1).then(function () {
                self.element.html(studies_E);
                self._bindEvent();
            });
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
                if (data.status === ProcessStatus.Error) {
                    //alert(data.message);
                    console.log(data.message);
                    return;
                }
                if (data.length > 0) {
                    for (let i = 0; i < data.length; i++) {
                        data[i].Metadata = self._arrayOfNameValueToDictionary(data[i].Metadata);
                        for (var j = 0; j < data[i].Series.length; j++) {
                            data[i].Series[j].Metadata = self._arrayOfNameValueToDictionary(data[i].Series[j].Metadata);
                        }
                    }
                }
                deferred.resolve(data);
            }

            return deferred.promise();
        },

        /////////////////////////////////////////////////////////////////////////

        _getSeriesDetailsDef: function (studyId) {
            let self = this;
            var deferred = $.Deferred();
            var params = [{ Name: "DicomDataStudyID", "Value": studyId }];

            /////////
            /////////
            /////////
            var token = self.options.getSecurityToken();
            self.setSecurityToken(token);

            self._service.getSeriesDetails(params, callback);


            function callback(data) {
                if (data.status === ProcessStatus.Error) {
                    //alert(data.message);
                    console.log(data.message);
                    return;
                }
                if (data.length > 0) {
                    for (let i = 0; i < data.length; i++) {
                        data[i].Metadata = self._arrayOfNameValueToDictionary(data[i].Metadata);

                    }
                    data.DicomDataStudyID = studyId;
                }
                deferred.resolve(data);
            }

            return deferred.promise();
        },

        /////////////////////////////////////////////////////////////////////////


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
                    var studyId = that.closest("tr").attr("data-study-id");

                    /////////
                    /////////
                    /////////
                    var token = self.options.getSecurityToken();
                    self.setSecurityToken(token);

                    self._service.deleteStudy(studyId, callback);

                    function callback(data) {
                        if (data.status === ProcessStatus.Error) {
                            //alert(data.message);
                            console.log(data.message);
                            return;
                        } else {
                            self.update();
                        }
                    }
                });
            });

            ///////////////////////////////////////

            self.element.find(".tc-delete-series").each(function () {
                var that = $(this);
                that.click(function () {
                    var seriesId = that.closest("tr").attr("data-series-id");

                    /////////
                    /////////
                    /////////
                    var token = self.options.getSecurityToken();
                    self.setSecurityToken(token);

                    self._service.deleteSeries(seriesId, callback);

                    function callback(data) {
                        if (data.status === ProcessStatus.Error) {
                            //alert(data.message);
                            console.log(data.message);
                            return;
                        } else {
                            self.update();
                        }
                    }
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
                "<caption>Uploaded Files</caption>" +
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

        _series_with_remove_action_T:
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
               "</tr></thead>" +
               "<tbody></tbody>" +
               "</table>" +
               "</div>" +
               "</td></tr>",

        _dictionaryStateOfCollapse: {}
    });
})(jQuery, window, document);
